#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])
const SAFE_URL_OPTIONS = new Set(['schema', 'sslmode', 'connection_limit', 'pool_timeout', 'connect_timeout', 'socket_timeout', 'application_name'])
const PAGE_SIZE = 25

class VerificationError extends Error {
  constructor(code, message) { super(message); this.code = code }
}

function fail(code, message) { throw new VerificationError(code, message) }
function sha256(value) { return createHash('sha256').update(value).digest('hex') }
function multisetHash(hashes) {
  const digest = createHash('sha256').update('creorga:sha256-multiset:v1\n')
  for (const hash of hashes.sort()) digest.update(hash).update('\n')
  return digest.digest('hex')
}

/** Identifiants issus uniquement du catalogue, puis contrôlés avant composition SQL. */
export function quoteIdentifier(value) {
  if (typeof value !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(value)) {
    fail('UNSUPPORTED_IDENTIFIER', 'Le catalogue contient un identifiant SQL hors du format accepté.')
  }
  return `"${value}"`
}

export function validateDatabaseUrl(raw) {
  if (!raw) fail('MISSING_DATABASE_URL', 'Définir les deux URL privées dans les variables d’environnement prévues.')
  let url
  try { url = new URL(raw) } catch { fail('INVALID_DATABASE_URL', 'URL PostgreSQL invalide.') }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) fail('INVALID_PROTOCOL', 'Seules les connexions PostgreSQL sont acceptées.')
  if (!LOOPBACK_HOSTS.has(url.hostname.toLowerCase())) fail('NON_LOOPBACK_HOST', 'La vérification exige deux bases accessibles sur une adresse loopback.')
  if (url.hash) fail('INVALID_DATABASE_URL', 'Une URL de base ne peut pas contenir de fragment.')
  for (const [key] of url.searchParams) {
    if (!SAFE_URL_OPTIONS.has(key) || url.searchParams.getAll(key).length !== 1) {
      fail('UNSUPPORTED_URL_OPTION', 'Une option de connexion est inconnue, répétée ou peut changer la destination.')
    }
  }
  let database
  try { database = decodeURIComponent(url.pathname.slice(1)) } catch { fail('INVALID_DATABASE_NAME', 'Nom de base invalide.') }
  if (!database || /[\x00-\x1f/\\]/.test(database)) fail('INVALID_DATABASE_NAME', 'Un nom de base explicite et valide est requis.')
  const port = Number(url.port || '5432')
  if (!Number.isInteger(port) || port < 1 || port > 65535) fail('INVALID_DATABASE_URL', 'Port PostgreSQL invalide.')
  return { database, port }
}

export function validateDatabasePair(sourceUrl, restoredUrl) {
  const source = validateDatabaseUrl(sourceUrl)
  const restored = validateDatabaseUrl(restoredUrl)
  // localhost, IPv4 et IPv6 peuvent désigner le même serveur. Refus conservateur,
  // même si les comptes ou le paramètre schema diffèrent.
  if (source.database === restored.database && source.port === restored.port) {
    fail('SAME_DATABASE', 'La base restaurée doit être distincte de la base source.')
  }
  return { source, restored }
}

function readMaxRows(value) {
  if (value === undefined) return 1_000_000
  if (!/^[1-9][0-9]*$/.test(value) || Number(value) > 10_000_000) fail('INVALID_MAX_ROWS', 'CREORGA_VERIFY_MAX_ROWS doit être compris entre 1 et 10000000.')
  return Number(value)
}

async function scanDatabase(client, maxRows) {
  return client.$transaction(async tx => {
    // SET TRANSACTION précède toute lecture. Les snapshots sont cohérents dans
    // chaque base ; arrêter les écrivains avant le dump reste indispensable.
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
    await tx.$executeRawUnsafe("SET LOCAL timezone = 'UTC'")
    await tx.$executeRawUnsafe("SET LOCAL datestyle = 'ISO, YMD'")
    await tx.$executeRawUnsafe("SET LOCAL intervalstyle = 'iso_8601'")
    await tx.$executeRawUnsafe("SET LOCAL bytea_output = 'hex'")
    await tx.$executeRawUnsafe('SET LOCAL extra_float_digits = 3')
    await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '120s'")
    const [environment] = await tx.$queryRawUnsafe(`SELECT current_setting('server_version_num')::int AS version,
      current_setting('transaction_read_only') AS readonly,
      host(inet_server_addr()) AS address, inet_server_port() AS port, current_database() AS database`)
    if (environment.readonly !== 'on') fail('READ_ONLY_NOT_CONFIRMED', 'Le serveur ne confirme pas la transaction en lecture seule.')
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(environment.address)) {
      fail('SERVER_NOT_LOOPBACK', 'Le serveur PostgreSQL ne confirme pas une connexion loopback.')
    }
    const tables = await tx.$queryRawUnsafe(`SELECT table_schema AS schema, table_name AS name
      FROM information_schema.tables
      WHERE table_type = 'BASE TABLE' AND table_schema <> 'information_schema'
        AND table_schema NOT LIKE 'pg_%'
      ORDER BY table_schema COLLATE "C", table_name COLLATE "C"`)
    // information_schema masque les tables inaccessibles. Le catalogue permet
    // de refuser une comparaison qui semblerait complète avec un compte limité.
    const catalog = await tx.$queryRawUnsafe(`SELECT n.nspname AS schema, c.relname AS name,
      has_table_privilege(c.oid, 'SELECT') AS readable, row_security_active(c.oid) AS filtered
      FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind IN ('r', 'p') AND n.nspname <> 'information_schema' AND n.nspname NOT LIKE 'pg_%'`)
    const visible = new Set(tables.map(table => `${table.schema}.${table.name}`))
    if (!catalog.length || catalog.some(table => !table.readable || table.filtered || !visible.has(`${table.schema}.${table.name}`))) {
      fail('INCOMPLETE_TABLE_ACCESS', 'Le compte ne peut pas vérifier toutes les tables ou une politique filtre les lignes.')
    }
    const results = []
    for (const table of tables) {
      const qualified = `${quoteIdentifier(table.schema)}.${quoteIdentifier(table.name)}`
      const columns = await tx.$queryRawUnsafe(`SELECT column_name AS name, ordinal_position AS position,
        data_type AS type, udt_schema AS udt_schema, udt_name AS udt_name, is_nullable AS nullable,
        numeric_precision AS precision, numeric_scale AS scale, datetime_precision AS datetime_precision,
        character_maximum_length AS max_length, column_default AS default_value,
        is_identity AS identity, identity_generation AS identity_generation,
        is_generated AS generated, generation_expression AS generation_expression
        FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position`, table.schema, table.name)
      for (const column of columns) quoteIdentifier(column.name)
      const columnNames = new Set(columns.map(column => column.name))
      const verifyPdf = table.name === 'Invoice' && columnNames.has('issuedPdf') && columnNames.has('issuedPdfHash')
      const rows = []
      const pdfHashes = []
      const pdf = verifyPdf ? { status: 'checked', count: 0, totalBytes: 0, storedHashMismatches: 0, nonPdfHeaders: 0, missingBinaryWithHash: 0 } : null
      let cursor = null
      for (;;) {
        // tableoid/ctid servent seulement au parcours du snapshot, jamais à son
        // empreinte : ils peuvent changer normalement après une restauration.
        const page = await tx.$queryRawUnsafe(`SELECT tableoid::text AS cursor_oid, ctid::text AS cursor_tid,
          to_jsonb(t)::text AS canonical_row${verifyPdf ? ', "issuedPdf" AS pdf_bytes, "issuedPdfHash" AS pdf_hash' : ''}
          FROM ${qualified} AS t
          ${cursor ? 'WHERE (tableoid, ctid) > ($1::oid, $2::tid)' : ''}
          ORDER BY tableoid, ctid LIMIT ${PAGE_SIZE}`, ...(cursor || []))
        if (!page.length) break
        for (const row of page) {
          if (rows.length >= maxRows) fail('ROW_LIMIT_EXCEEDED', 'Limite de lignes dépassée : vérification interrompue sans résultat de réussite.')
          rows.push(sha256(row.canonical_row))
          if (pdf && row.pdf_bytes != null) {
            const bytes = Buffer.from(row.pdf_bytes)
            const actual = sha256(bytes)
            pdf.count++
            pdf.totalBytes += bytes.length
            pdfHashes.push(actual)
            if (actual !== row.pdf_hash) pdf.storedHashMismatches++
            if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') pdf.nonPdfHeaders++
          } else if (pdf && row.pdf_hash != null) pdf.missingBinaryWithHash++
        }
        const last = page.at(-1)
        cursor = [last.cursor_oid, last.cursor_tid]
      }
      results.push({ schema: table.schema, table: table.name, count: rows.length,
        sha256: multisetHash(rows), columnsSha256: sha256(JSON.stringify(columns)),
        ...(pdf ? { issuedPdf: { ...pdf, sha256: multisetHash(pdfHashes) } } : {}) })
    }
    return { postgresMajor: Math.floor(environment.version / 10000), readOnly: true, tables: results,
      privateIdentity: { database: environment.database, port: environment.port } }
  }, { isolationLevel: 'RepeatableRead', maxWait: 10_000, timeout: 600_000 })
}

export function compareSnapshots(source, restored) {
  const differences = []
  if (source.postgresMajor !== restored.postgresMajor) differences.push({ kind: 'POSTGRES_MAJOR_MISMATCH' })
  const key = table => `${table.schema}.${table.table}`
  const sourceTables = new Map(source.tables.map(table => [key(table), table]))
  const restoredTables = new Map(restored.tables.map(table => [key(table), table]))
  for (const name of [...new Set([...sourceTables.keys(), ...restoredTables.keys()])].sort()) {
    const left = sourceTables.get(name), right = restoredTables.get(name)
    if (!left || !right) { differences.push({ table: name, kind: !left ? 'ONLY_IN_RESTORED' : 'MISSING_IN_RESTORED' }); continue }
    for (const field of ['count', 'sha256', 'columnsSha256']) {
      if (left[field] !== right[field]) differences.push({ table: name, kind: `${field.toUpperCase()}_MISMATCH` })
    }
    if (JSON.stringify(left.issuedPdf) !== JSON.stringify(right.issuedPdf)) differences.push({ table: name, kind: 'ISSUED_PDF_MISMATCH' })
    for (const [side, table] of [['source', left], ['restored', right]]) {
      if (table.issuedPdf && ['storedHashMismatches', 'nonPdfHeaders', 'missingBinaryWithHash'].some(field => table.issuedPdf[field] > 0)) {
        differences.push({ table: name, side, kind: 'ISSUED_PDF_INTEGRITY_FAILED' })
      }
    }
  }
  return differences
}

async function selfTest() {
  const { default: assert } = await import('node:assert/strict')
  let checks = 0
  const rejects = (run, code) => { assert.throws(run, error => error.code === code); checks++ }
  assert.equal(quoteIdentifier('Invoice'), '"Invoice"'); checks++
  assert.equal(quoteIdentifier('_prisma_migrations'), '"_prisma_migrations"'); checks++
  for (const identifier of ['Invoice"; DROP TABLE x', 'public.Invoice', '../data', '', 'a'.repeat(64)]) rejects(() => quoteIdentifier(identifier), 'UNSUPPORTED_IDENTIFIER')
  const fixture = name => `postgresql://fixture:fixture@127.0.0.1:5450/${name}`
  validateDatabasePair(fixture('source'), fixture('restored')); checks++
  rejects(() => validateDatabasePair(fixture('source'), 'postgres://other:other@localhost:5450/source?schema=other'), 'SAME_DATABASE')
  rejects(() => validateDatabaseUrl('postgres://x:x@example.invalid/source'), 'NON_LOOPBACK_HOST')
  rejects(() => validateDatabaseUrl(fixture('source') + '?host=example.invalid'), 'UNSUPPORTED_URL_OPTION')
  rejects(() => validateDatabaseUrl(fixture('source') + '?options=unsafe'), 'UNSUPPORTED_URL_OPTION')
  rejects(() => validateDatabaseUrl(fixture('source') + '?schema=a&schema=b'), 'UNSUPPORTED_URL_OPTION')
  rejects(() => validateDatabaseUrl('https://127.0.0.1/source'), 'INVALID_PROTOCOL')
  rejects(() => validateDatabaseUrl('postgres://x:x@127.0.0.1/'), 'INVALID_DATABASE_NAME')
  rejects(() => validateDatabaseUrl('postgres://x:x@127.0.0.1/a%2Fb'), 'INVALID_DATABASE_NAME')
  rejects(() => validateDatabaseUrl(undefined), 'MISSING_DATABASE_URL')
  const table = { schema: 'public', table: 'Invoice', count: 1, sha256: 'same', columnsSha256: 'same', issuedPdf: { storedHashMismatches: 1 } }
  const snapshot = { postgresMajor: 16, tables: [table] }
  assert.equal(compareSnapshots(snapshot, snapshot).filter(diff => diff.kind === 'ISSUED_PDF_INTEGRITY_FAILED').length, 2); checks++
  assert.equal(multisetHash(['a', 'b', 'a']), multisetHash(['b', 'a', 'a'])); checks++
  assert.notEqual(multisetHash(['a', 'b', 'a']), multisetHash(['b', 'a'])); checks++
  process.stdout.write(JSON.stringify({ selfTest: 'passed', checks }) + '\n')
}

async function main() {
  if (process.argv.includes('--self-test')) { await selfTest(); return }
  const sourceUrl = process.env.CREORGA_VERIFY_SOURCE_URL
  const restoredUrl = process.env.CREORGA_VERIFY_RESTORED_URL
  validateDatabasePair(sourceUrl, restoredUrl)
  const maxRows = readMaxRows(process.env.CREORGA_VERIFY_MAX_ROWS)
  const { PrismaClient } = await import('@prisma/client')
  const sourceClient = new PrismaClient({ datasources: { db: { url: sourceUrl } }, log: [], errorFormat: 'minimal' })
  const restoredClient = new PrismaClient({ datasources: { db: { url: restoredUrl } }, log: [], errorFormat: 'minimal' })
  try {
    const results = await Promise.allSettled([scanDatabase(sourceClient, maxRows), scanDatabase(restoredClient, maxRows)])
    const rejected = results.find(result => result.status === 'rejected')
    if (rejected) throw rejected.reason
    const [source, restored] = results.map(result => result.value)
    if (source.privateIdentity.database === restored.privateIdentity.database && source.privateIdentity.port === restored.privateIdentity.port) {
      fail('SAME_DATABASE', 'Les serveurs confirment une même base source et restaurée.')
    }
    delete source.privateIdentity
    delete restored.privateIdentity
    const differences = compareSnapshots(source, restored)
    process.stdout.write(JSON.stringify({ format: 'creorga-restoration-comparison-v1', checkedAt: new Date().toISOString(),
      status: differences.length ? 'mismatch' : 'equal', readonly: true, loopbackOnly: true,
      canonicalization: 'PostgreSQL JSONB / UTC / ISO dates / hex bytea; SHA-256 per row then sorted multiset',
      source, restored, differences }, null, 2) + '\n')
    if (differences.length) process.exitCode = 1
  } finally { await Promise.allSettled([sourceClient.$disconnect(), restoredClient.$disconnect()]) }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    // Les erreurs Prisma peuvent contenir SQL, paramètres ou URL : ne jamais
    // les sérialiser. Une interruption reste un échec, jamais « aucune différence ».
    const trusted = error instanceof VerificationError
    process.stderr.write(JSON.stringify({ status: 'error', code: trusted ? error.code : 'DATABASE_OR_SCAN_ERROR',
      message: trusted ? error.message : 'Connexion ou lecture interrompue ; aucun résultat de restauration validée.' }) + '\n')
    process.exitCode = 2
  })
}
