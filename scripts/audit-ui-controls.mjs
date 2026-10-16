/**
 * Source inventory, not a browser audit. Every discovered control remains NOT RUN.
 * No evaluation, imports from application code, database calls, or runtime data reads.
 *
 *   node scripts/audit-ui-controls.mjs [--root=<repo>] [--output=<report.json>]
 */
import ts from 'typescript'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ALGORITHM_VERSION = 'creorga-jsx-controls-v1'
const DEFAULT_APPS = ['web', 'pos', 'guest', 'superadmin', 'marketing']
const NATIVE_CONTROLS = new Set(['button', 'a', 'area', 'form', 'input', 'select', 'textarea', 'option', 'summary', 'details'])
const CUSTOM_CONTROLS = /(?:^|\.)(?:Button|IconButton|Link|NavLink|Form|Input|Select|Textarea|Checkbox|Radio|Switch|Slider|Toggle|MenuItem|Tab|DialogTrigger)$/
const SKIP_DIRECTORIES = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', 'test-results', 'playwright-report', '__tests__', '__fixtures__'])
const LIMITATIONS = [
  'Static JSX source only: not evidence of rendering, reachability, permission, persistence, success or failure.',
  'Repeated map/flatMap JSX are templates, not counted runtime instances.',
  'Routes are lexical JSX Route declarations; dynamic routers, imperative navigation and cross-file component reuse are unresolved.',
  'Spread props, dynamic labels, handlers forwarded by custom components and imperative DOM/createElement controls require runtime review.',
  'Source can include inactive features, dead code and conditional controls; no discovered entry is automatically PASS.',
  'Labels and URLs are deliberately reduced; field values, placeholders, handler arguments and executable source are never exported.',
]

function normalizedFile(file) { return file.replaceAll('\\', '/') }

function safeText(value) {
  return value
    .replace(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL_REDACTED]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
    .replace(/\s+/g, ' ').trim().slice(0, 240)
}

// URL query / fragment / userinfo can carry tokens; never retain them in a report.
function safeDestination(value) {
  const input = value.trim()
  if (/^mailto:/i.test(input)) return 'mailto:[REDACTED]'
  if (/^(tel|sms):/i.test(input)) return `${input.split(':')[0].toLowerCase()}:[REDACTED]`
  if (/^(javascript|data|vbscript):/i.test(input)) return 'DYNAMIC'
  const query = input.indexOf('?')
  const fragment = input.indexOf('#')
  const end = Math.min(query < 0 ? input.length : query, fragment < 0 ? input.length : fragment)
  let destination = input.slice(0, end)
  if (/^(https?:)?\/\//i.test(destination)) {
    try {
      const protocolRelative = destination.startsWith('//')
      const url = new URL(protocolRelative ? `https:${destination}` : destination)
      destination = `${protocolRelative ? '//' : `${url.protocol}//`}${url.host}${url.pathname}`
    } catch { return 'DYNAMIC' }
  }
  return safeText(destination) + (query >= 0 ? '?[REDACTED]' : fragment >= 0 ? '#[REDACTED]' : '')
}

function nameOf(node) {
  if (ts.isIdentifier(node)) return node.text
  if (ts.isPropertyAccessExpression(node)) {
    const parent = nameOf(node.expression)
    return parent === 'DYNAMIC' ? 'DYNAMIC' : `${parent}.${node.name.text}`
  }
  if (ts.isJsxNamespacedName(node)) return `${node.namespace.text}:${node.name.text}`
  return 'DYNAMIC'
}

function unwrap(node) {
  while (node && (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node) || ts.isSatisfiesExpression(node)))
    node = node.expression
  return node
}

function attributeValue(attribute) {
  if (!attribute) return null
  if (!attribute.initializer) return true
  const initializer = attribute.initializer
  if (ts.isStringLiteral(initializer)) return initializer.text
  if (ts.isJsxExpression(initializer)) {
    const expression = unwrap(initializer.expression)
    if (expression && (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression))) return expression.text
    if (expression?.kind === ts.SyntaxKind.TrueKeyword) return true
    if (expression?.kind === ts.SyntaxKind.FalseKeyword) return false
  }
  return 'DYNAMIC'
}

function attributesOf(opening) {
  const values = new Map()
  let spread = false
  for (const property of opening.attributes.properties) {
    if (ts.isJsxSpreadAttribute(property)) spread = true
    else values.set(property.name.text, property)
  }
  return { values, spread }
}

function visibleText(node) {
  if (!ts.isJsxElement(node) && !ts.isJsxFragment(node)) return ''
  const parts = []
  for (const child of node.children) {
    if (ts.isJsxText(child)) parts.push(child.text)
    else if (ts.isJsxElement(child) || ts.isJsxFragment(child)) {
      // A script/style body is not a label, even in malformed application source.
      if (ts.isJsxElement(child) && ['script', 'style'].includes(nameOf(child.openingElement.tagName))) continue
      parts.push(visibleText(child))
    }
    // Never copy a JS expression, even if it contains a string literal.
  }
  return safeText(parts.join(' '))
}

function handlerInfo(attribute) {
  const calls = new Set()
  const references = new Set()
  let dynamic = false
  const initializer = attribute.initializer
  const expression = ts.isJsxExpression(initializer ?? {}) ? unwrap(initializer.expression) : null
  if (!expression) return { name: attribute.name.text, calls: [], references: [], dynamic: true }
  function reference(node) {
    node = unwrap(node)
    if (!node) return
    if (ts.isConditionalExpression(node)) { reference(node.whenTrue); reference(node.whenFalse); return }
    if (ts.isBinaryExpression(node) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind)) {
      reference(node.right)
      return
    }
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) return
    const name = nameOf(node)
    if (name === 'DYNAMIC') dynamic = true
    else references.add(name)
  }
  reference(expression)
  function visit(node) {
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      const name = nameOf(node.expression)
      if (name === 'DYNAMIC') dynamic = true
      else calls.add(name)
    }
    ts.forEachChild(node, visit)
  }
  visit(expression)
  return { name: attribute.name.text, calls: [...calls].sort(), references: [...references].sort(), dynamic }
}

function componentOf(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if ((ts.isFunctionDeclaration(parent) || ts.isFunctionExpression(parent)) && parent.name) return parent.name.text
    if ((ts.isArrowFunction(parent) || ts.isFunctionExpression(parent)) && ts.isVariableDeclaration(parent.parent) && ts.isIdentifier(parent.parent.name)) return parent.parent.name.text
    if (ts.isClassDeclaration(parent) && parent.name) return parent.name.text
  }
  return null
}

function sourceContext(node) {
  const templates = new Set()
  let conditional = false
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isCallExpression(parent) && ts.isPropertyAccessExpression(parent.expression) && ['map', 'flatMap'].includes(parent.expression.name.text)) templates.add(parent.expression.name.text)
    if (ts.isConditionalExpression(parent) || ts.isIfStatement(parent) || ts.isCaseClause(parent)) conditional = true
    if (ts.isBinaryExpression(parent) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(parent.operatorToken.kind)) conditional = true
  }
  return { template: templates.size > 0, templateSources: [...templates].sort(), conditional }
}

function kindOf(tag, attributes, handlers) {
  const leaf = tag.split('.').at(-1)
  if (NATIVE_CONTROLS.has(leaf)) return leaf === 'a' || leaf === 'area' ? 'link' : leaf
  if (CUSTOM_CONTROLS.test(tag)) return leaf.endsWith('Link') || leaf === 'Link' ? 'link' : leaf.toLowerCase()
  if (attributes.has('role')) return 'role'
  if (handlers.length) return 'handler'
  if (attributes.has('contentEditable') && attributeValue(attributes.get('contentEditable')) !== false) return 'editable'
  return null
}

function fullRoutePath(path, index, parent) {
  if (path === 'DYNAMIC' || parent?.fullPath === 'DYNAMIC') return 'DYNAMIC'
  if (index || path === null) return parent?.fullPath ?? null
  if (typeof path !== 'string') return 'DYNAMIC'
  if (path.startsWith('/')) return path
  return `${parent?.fullPath ?? ''}/${path}`.replace(/\/{2,}/g, '/')
}

/** Parse one source; result identifiers refer to a source position, never a runtime instance. */
export function scanSource(source, { file = 'source.tsx', app = 'unknown' } = {}) {
  const normalized = normalizedFile(file)
  const extension = extname(normalized).toLowerCase()
  const scriptKind = extension === '.jsx' ? ts.ScriptKind.JSX : ['.ts', '.mts', '.cts'].includes(extension) ? ts.ScriptKind.TS : ts.ScriptKind.TSX
  const parsed = ts.createSourceFile(normalized, source, ts.ScriptTarget.Latest, true, scriptKind)
  const controls = []
  const routes = []
  const routeStack = []
  const associatedLabels = new Map()

  function position(node, tag, prefix) {
    const start = node.getStart(parsed)
    const where = parsed.getLineAndCharacterOfPosition(start)
    return {
      id: `${prefix}:${createHash('sha256').update(`${normalized}\0${start}\0${tag}`).digest('hex').slice(0, 24)}`,
      app, file: normalized, line: where.line + 1, column: where.character + 1,
    }
  }

  function collectLabels(node) {
    if (ts.isJsxElement(node) && nameOf(node.openingElement.tagName) === 'label') {
      const { values } = attributesOf(node.openingElement)
      const target = attributeValue(values.get('htmlFor'))
      if (typeof target === 'string' && target !== 'DYNAMIC') associatedLabels.set(target, visibleText(node))
    }
    ts.forEachChild(node, collectLabels)
  }
  collectLabels(parsed)

  function visit(node) {
    const opening = ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null
    let route = null
    if (opening) {
      const tag = nameOf(opening.tagName)
      const { values, spread } = attributesOf(opening)
      const handlers = [...values.values()].filter(attribute => /^on[A-Z]/.test(attribute.name.text)).map(handlerInfo)
      const context = sourceContext(node)
      if (tag.split('.').at(-1) === 'Route') {
        const path = attributeValue(values.get('path'))
        const index = attributeValue(values.get('index')) === true
        const parent = routeStack.at(-1)
        const components = new Set()
        const element = values.get('element')?.initializer
        if (element) {
          const findComponents = child => {
            if (ts.isJsxOpeningElement(child) || ts.isJsxSelfClosingElement(child)) {
              const name = nameOf(child.tagName)
              if (/^[A-Z]/.test(name)) components.add(name)
            }
            ts.forEachChild(child, findComponents)
          }
          findComponents(element)
        }
        const component = attributeValue(values.get('Component'))
        if (component === 'DYNAMIC') {
          const initializer = values.get('Component')?.initializer
          const reference = ts.isJsxExpression(initializer ?? {}) ? nameOf(unwrap(initializer.expression) ?? {}) : 'DYNAMIC'
          if (reference !== 'DYNAMIC') components.add(reference)
        }
        route = {
          ...position(node, tag, 'route'), tag,
          path: typeof path === 'string' ? safeDestination(path) : path,
          fullPath: fullRoutePath(typeof path === 'string' ? safeDestination(path) : path, index, parent),
          index, parentRouteId: parent?.id ?? null, component: componentOf(node), components: [...components].sort(),
          ...context, status: 'NOT RUN', evidence: [], reasons: ['STATIC_SOURCE_NOT_EXECUTED', 'LEXICAL_ROUTE_ONLY'],
        }
        routes.push(route)
        routeStack.push(route)
      }
      const kind = kindOf(tag, values, handlers)
      if (kind) {
        const text = visibleText(node)
        const aria = attributeValue(values.get('aria-label'))
        const title = attributeValue(values.get('title'))
        const id = attributeValue(values.get('id'))
        let wrappingLabel = null
        for (let parent = node.parent; parent; parent = parent.parent) {
          if (ts.isJsxElement(parent) && nameOf(parent.openingElement.tagName) === 'label') { wrappingLabel = visibleText(parent); break }
          if (ts.isFunctionLike(parent)) break
        }
        const label = typeof aria === 'string' && aria !== 'DYNAMIC' ? safeText(aria)
          : text || (typeof title === 'string' && title !== 'DYNAMIC' ? safeText(title) : '') || associatedLabels.get(id) || wrappingLabel || null
        const disabled = attributeValue(values.get('disabled'))
        const entry = {
          ...position(node, tag, 'control'), tag, kind, component: componentOf(node),
          label, ariaLabel: typeof aria === 'string' ? safeText(aria) : aria,
          title: typeof title === 'string' ? safeText(title) : title,
          inputType: tag.split('.').at(-1).toLowerCase() === 'input' ? attributeValue(values.get('type')) : null,
          role: typeof attributeValue(values.get('role')) === 'string' ? safeText(attributeValue(values.get('role'))) : attributeValue(values.get('role')),
          disabled,
          href: typeof attributeValue(values.get('href')) === 'string' ? safeDestination(attributeValue(values.get('href'))) : attributeValue(values.get('href')),
          to: typeof attributeValue(values.get('to')) === 'string' ? safeDestination(attributeValue(values.get('to'))) : attributeValue(values.get('to')),
          handlers, spreadAttributes: spread, ...context, routeIds: routeStack.map(parent => parent.id),
          status: 'NOT RUN', evidence: [], reasons: ['STATIC_SOURCE_NOT_EXECUTED'],
        }
        if (context.template) entry.reasons.push('REPEATED_TEMPLATE')
        if (context.conditional) entry.reasons.push('CONDITIONAL_RENDER')
        if (spread) entry.reasons.push('SPREAD_ATTRIBUTES_UNRESOLVED')
        if (disabled === true) entry.reasons.push('DISABLED_STATIC')
        if (/^[A-Z]/.test(tag) || tag.includes('.')) entry.reasons.push('CUSTOM_COMPONENT')
        if (!label || aria === 'DYNAMIC') entry.reasons.push('LABEL_UNRESOLVED_OR_PARTIAL')
        if ([entry.disabled, entry.href, entry.to, entry.role, entry.inputType].includes('DYNAMIC')) entry.reasons.push('DYNAMIC_ATTRIBUTES')
        if (handlers.some(handler => handler.dynamic)) entry.reasons.push('DYNAMIC_HANDLER')
        controls.push(entry)
      }
    }
    ts.forEachChild(node, visit)
    if (route) routeStack.pop()
  }
  visit(parsed)
  const diagnostics = parsed.parseDiagnostics.map(diagnostic => {
    const where = parsed.getLineAndCharacterOfPosition(diagnostic.start ?? 0)
    return { file: normalized, line: where.line + 1, column: where.character + 1, code: diagnostic.code, category: ts.DiagnosticCategory[diagnostic.category] }
  })
  return { controls, routes, diagnostics, metadata: { algorithmVersion: ALGORITHM_VERSION, completeParse: diagnostics.length === 0, runtimeVerified: false } }
}

/** Read only production source under the named apps. Test/build/dependency trees are excluded. */
export function scanWorkspace(root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), { apps = DEFAULT_APPS } = {}) {
  const repository = resolve(root)
  const controls = []
  const routes = []
  const diagnostics = []
  const byApp = {}
  const byType = {}
  let files = 0
  const missingApps = []
  function scanDirectory(directory, app) {
    const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0)
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue
      const path = join(directory, entry.name)
      if (entry.isDirectory()) {
        if (!SKIP_DIRECTORIES.has(entry.name) && !entry.name.startsWith('.')) scanDirectory(path, app)
      } else if (entry.isFile() && /\.(?:tsx|jsx|ts|js|mts|mjs|cts|cjs)$/i.test(entry.name) && !/(?:\.d\.ts|\.(?:test|spec|stories)\.[^.]+)$/i.test(entry.name)) {
        const result = scanSource(readFileSync(path, 'utf8'), { file: normalizedFile(relative(repository, path)), app })
        controls.push(...result.controls)
        routes.push(...result.routes)
        diagnostics.push(...result.diagnostics)
        files++
        byApp[app].files++
        byApp[app].controls += result.controls.length
        byApp[app].routes += result.routes.length
      }
    }
  }
  for (const app of apps) {
    if (!/^[a-zA-Z0-9_-]+$/.test(app)) throw new Error('Invalid app name')
    const directory = join(repository, 'apps', app, 'src')
    if (!existsSync(directory)) { missingApps.push(app); continue }
    byApp[app] = { files: 0, controls: 0, routes: 0 }
    scanDirectory(directory, app)
  }
  for (const control of controls) byType[control.kind] = (byType[control.kind] ?? 0) + 1
  const metadata = {
    algorithmVersion: ALGORITHM_VERSION, generatedAt: new Date().toISOString(), runtimeVerified: false,
    completeParse: diagnostics.length === 0,
    totals: { files, controls: controls.length, routes: routes.length, parseDiagnostics: diagnostics.length, templates: controls.filter(control => control.template).length },
    byApp, byType, missingApps, limitations: LIMITATIONS,
  }
  return { metadata, controls, routes, diagnostics }
}

function main(argv) {
  const options = {}
  for (const arg of argv) {
    if (arg.startsWith('--root=')) options.root = arg.slice('--root='.length)
    else if (arg.startsWith('--output=')) options.output = arg.slice('--output='.length)
    else throw new Error('Usage: node scripts/audit-ui-controls.mjs [--root=<repo>] [--output=<report.json>]')
  }
  const report = scanWorkspace(options.root)
  if (options.output) {
    const path = resolve(options.output)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  }
  // Console output is deliberately aggregate-only; use an explicit output file for control details.
  process.stdout.write(`${JSON.stringify(report.metadata, null, 2)}\n`)
  if (!report.metadata.completeParse) process.exitCode = 1
}

const invokedFile = process.argv[1] && resolve(process.argv[1])
if (invokedFile && invokedFile.toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  try { main(process.argv.slice(2)) }
  catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1 }
}
