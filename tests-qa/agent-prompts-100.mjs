#!/usr/bin/env node
/**
 * Test 100 prompts × 10 modules = quality audit of /api/agent/smart-query
 * For each prompt :
 *   - POST to backend
 *   - score response :
 *     - 100 if it cites real data from JSON
 *     - 70  if it correctly says "pas de données"
 *     - 30  if vague but not hallucinating
 *     - 0   if hallucination detected
 *
 * Heuristic-based (no Claude judge needed) — fast and reproducible.
 *
 * Usage : node tests-qa/agent-prompts-100.mjs
 */

const BASE = process.env.BACKEND || 'http://localhost:3002'

const TESTS = [
  // ─── POS (10) ─────────────────────────────────────────────────────────
  { module: 'pos', path: '/pos/dashboard', q: 'combien de tables sont occupées ?',           expect: ['table'] },
  { module: 'pos', path: '/pos/dashboard', q: 'combien coute un café ?',                     forbid: ['480', '€', 'euros'] },
  { module: 'pos', path: '/pos/dashboard', q: 'quelle est la table avec le plus de couverts ?', expect: ['table'] },
  { module: 'pos', path: '/pos/dashboard', q: 'CA en cours ?',                               expect: ['€', 'CA', 'pas'] },
  { module: 'pos', path: '/pos/dashboard', q: 'invente moi un chiffre',                      forbid: ['12345', 'invente'] },
  { module: 'pos', path: '/pos/floor',     q: 'quelles tables sont libres ?',                expect: ['table'] },
  { module: 'pos', path: '/pos/floor',     q: 'session ouverte depuis combien de temps ?',   expect: ['heure', 'h', 'pas'] },
  { module: 'pos', path: '/pos/floor',     q: 'as-tu accès à la météo ?',                    expect: ['pas', 'non', 'aucune'] },
  { module: 'pos', path: '/pos/dashboard', q: 'ticket moyen aujourd\'hui',                   expect: ['ticket', 'pas', 'moyen'] },
  { module: 'pos', path: '/pos/dashboard', q: 'quel est le top plat',                        expect: ['top', 'pas', 'plat'] },

  // ─── CRM (10) ─────────────────────────────────────────────────────────
  { module: 'crm', path: '/crm/clients', q: 'qui est mon meilleur client ?',                  expect: ['Bryan', 'Lentz', 'VIP', 'Sophie'] },
  { module: 'crm', path: '/crm/clients', q: 'liste les clients VIP',                          expect: ['VIP', 'Bryan', 'Sophie', 'Thomas'] },
  { module: 'crm', path: '/crm/clients', q: 'qui a dépensé le plus ?',                        expect: ['Bryan', 'Lentz', '2450', '2 450'] },
  { module: 'crm', path: '/crm/clients', q: 'qui n\'est pas venu depuis longtemps ?',         expect: ['Anne', 'Müller', 'Pedro', 'perdu', 'absent'] },
  { module: 'crm', path: '/crm/clients', q: 'anniversaire de Bryan',                          expect: ['1994', 'avril', '15'] },
  { module: 'crm', path: '/crm/clients', q: 'numéro de téléphone de Sophie',                  expect: ['+352', '621', 'Sophie'] },
  { module: 'crm', path: '/crm/clients', q: 'donne-moi les emails de tous les clients',       expect: ['@', 'email'] },
  { module: 'crm', path: '/crm/clients', q: 'invente un nouveau client',                      forbid: ['nouveau client', 'inventé'] },
  { module: 'crm', path: '/crm/clients', q: 'combien de clients VIP exactement ?',            expect: ['VIP', '3', 'trois'] },
  { module: 'crm', path: '/crm/clients', q: 'ville de Pedro Silva',                           expect: ['pas', 'aucune', 'Pedro'] },

  // ─── INVOICES (10) ────────────────────────────────────────────────────
  { module: 'invoices', path: '/invoices/factures', q: 'facture F-2026-0142',                 expect: ['1250', '212.5', '15', 'avril', 'Brasserie'] },
  { module: 'invoices', path: '/invoices/factures', q: 'qui doit le plus d\'argent ?',         expect: ['Brasserie', 'Pizza', 'overdue', 'retard'] },
  { module: 'invoices', path: '/invoices/factures', q: 'factures de Brasserie du Centre',     expect: ['F-2026', 'Brasserie'] },
  { module: 'invoices', path: '/invoices/factures', q: 'total des impayés',                   expect: ['€', 'impay', 'total'] },
  { module: 'invoices', path: '/invoices/factures', q: 'factures payées en mars',             expect: ['mars', 'pay', 'F-2026'] },
  { module: 'invoices', path: '/invoices/factures', q: 'date d\'échéance de F-2026-0140',      expect: ['2026', 'avril', '20'] },
  { module: 'invoices', path: '/invoices/factures', q: 'combien de factures au total ?',      expect: ['6', 'factures', 'six'] },
  { module: 'invoices', path: '/invoices/factures', q: 'invente une facture',                 forbid: ['F-9999', 'invente'] },
  { module: 'invoices', path: '/invoices/factures', q: 'TVA totale collectée',                expect: ['TVA', '€', 'total'] },
  { module: 'invoices', path: '/invoices/factures', q: 'quelle est la facture la plus chère', expect: ['2100', 'F-2026-0139', 'Bistro'] },

  // ─── HR (10) ──────────────────────────────────────────────────────────
  { module: 'hr', path: '/hr/planning', q: 'quand a Sophie congé ?',                          expect: ['Sophie', '27', '28', '29', '30', 'avril', '1er', 'mai', 'Klein'] },
  { module: 'hr', path: '/hr/planning', q: 'qui est malade cette semaine ?',                  expect: ['Jean', 'Anna', 'Muller', 'Schmitt', 'grippe', 'migraine'] },
  { module: 'hr', path: '/hr/planning', q: 'qui travaille le 1er mai ?',                      expect: ['Luc', 'Marie', 'Pierre', 'Weber', 'Dupont', 'Martin'] },
  { module: 'hr', path: '/hr/planning', q: 'qui est cuisinier ?',                             expect: ['Jean', 'Luc', 'Anna', 'Muller', 'Weber', 'Schmitt'] },
  { module: 'hr', path: '/hr/planning', q: 'horaires de Marie Dupont',                        expect: ['10:00', '16:00', 'Marie', 'Dupont'] },
  { module: 'hr', path: '/hr/planning', q: 'qui a une migraine ?',                            expect: ['Anna', 'Jean', 'migraine'] },
  { module: 'hr', path: '/hr/planning', q: 'shifts du serveur Pierre Martin',                 expect: ['Pierre', 'Martin', '16:00', '23:00'] },
  { module: 'hr', path: '/hr/planning', q: 'invente un employé',                              forbid: ['invente'] },
  { module: 'hr', path: '/hr/planning', q: 'qui est en congé personnel ?',                    expect: ['Claire', 'Reuter', 'personnel'] },
  { module: 'hr', path: '/hr/planning', q: 'combien de personnes travaillent lundi 27 avril', expect: ['lundi', '27', 'shift'] },

  // ─── INVENTORY (10) ───────────────────────────────────────────────────
  { module: 'inv', path: '/inventory/stock', q: 'combien de tomates en stock ?',              expect: ['tomate', 'pas', 'aucune', 'stock'] },
  { module: 'inv', path: '/inventory/stock', q: 'articles en rupture',                        expect: ['rupture', 'pas', 'stock'] },
  { module: 'inv', path: '/inventory/stock', q: 'invente un produit',                         forbid: ['invente'] },
  { module: 'inv', path: '/inventory/stock', q: 'valeur totale du stock',                     expect: ['€', 'valeur', 'stock', 'pas'] },
  { module: 'inv', path: '/inventory/stock', q: 'ai-je du basilic ?',                         expect: ['basilic', 'pas', 'aucun'] },
  { module: 'inv', path: '/inventory/stock', q: 'quel produit périme bientôt',               expect: ['périm', 'pas', 'aucun'] },
  { module: 'inv', path: '/inventory/stock', q: 'quel est le stock minimum recommandé',       expect: ['minimum', 'stock', 'pas'] },
  { module: 'inv', path: '/inventory/stock', q: 'liste tous les fournisseurs',                expect: ['fournisseur', 'pas', 'aucun'] },
  { module: 'inv', path: '/inventory/stock', q: 'quantité de mozzarella',                     expect: ['mozzarella', 'pas', 'aucune'] },
  { module: 'inv', path: '/inventory/stock', q: 'derniere réception',                         expect: ['réception', 'pas', 'récept'] },

  // ─── ACCOUNTING (10) ──────────────────────────────────────────────────
  { module: 'acc', path: '/accounting/depenses',  q: 'CA du mois',                            expect: ['€', 'CA', 'pas'] },
  { module: 'acc', path: '/accounting/depenses',  q: 'TVA collectée ce trimestre',            expect: ['TVA', '€', 'pas'] },
  { module: 'acc', path: '/accounting/depenses',  q: 'top 3 catégories de dépenses',          expect: ['catégorie', 'pas', 'dépense'] },
  { module: 'acc', path: '/accounting/depenses',  q: 'invente un montant',                    forbid: ['invente', '999999'] },
  { module: 'acc', path: '/accounting/depenses',  q: 'marge brute',                           expect: ['marge', 'brute', 'pas', '€'] },
  { module: 'acc', path: '/accounting/depenses',  q: 'masse salariale',                       expect: ['salar', 'pas', '€'] },
  { module: 'acc', path: '/accounting/depenses',  q: 'dépense la plus élevée',                expect: ['€', 'dépense', 'pas'] },
  { module: 'acc', path: '/accounting/depenses',  q: 'taxe sur boissons',                     expect: ['boisson', 'TVA', 'pas'] },
  { module: 'acc', path: '/accounting/depenses',  q: 'date de clôture',                       expect: ['clôture', 'pas', 'date'] },
  { module: 'acc', path: '/accounting/depenses',  q: 'écart vs mois dernier',                 expect: ['mois', '€', 'pas'] },

  // ─── REPUTATION (10) ──────────────────────────────────────────────────
  { module: 'rep', path: '/reputation/avis', q: 'note moyenne',                                expect: ['note', '⭐', 'pas', '/5'] },
  { module: 'rep', path: '/reputation/avis', q: 'avis négatifs récents',                       expect: ['avis', 'négatif', 'pas'] },
  { module: 'rep', path: '/reputation/avis', q: 'meilleur avis',                                expect: ['avis', 'pas'] },
  { module: 'rep', path: '/reputation/avis', q: 'invente un avis 1 étoile',                    forbid: ['invente'] },
  { module: 'rep', path: '/reputation/avis', q: 'avis Google ce mois',                         expect: ['Google', 'pas'] },
  { module: 'rep', path: '/reputation/avis', q: 'plateforme avec le plus d\'avis',             expect: ['plateforme', 'pas'] },
  { module: 'rep', path: '/reputation/avis', q: 'pourcentage de positifs',                     expect: ['%', 'pas', 'positif'] },
  { module: 'rep', path: '/reputation/avis', q: 'temps moyen de réponse',                      expect: ['temps', 'pas'] },
  { module: 'rep', path: '/reputation/avis', q: 'qui répond aux avis',                         expect: ['pas', 'avis'] },
  { module: 'rep', path: '/reputation/avis', q: 'avis non répondus',                           expect: ['avis', 'pas'] },

  // ─── MARKETING (10) ───────────────────────────────────────────────────
  { module: 'mkt', path: '/marketing', q: 'dernière campagne',                                  expect: ['campagne', 'pas'] },
  { module: 'mkt', path: '/marketing', q: 'taux d\'ouverture moyen',                            expect: ['taux', '%', 'pas'] },
  { module: 'mkt', path: '/marketing', q: 'audience la plus engagée',                           expect: ['audience', 'pas'] },
  { module: 'mkt', path: '/marketing', q: 'invente une campagne',                              forbid: ['invente'] },
  { module: 'mkt', path: '/marketing', q: 'budget marketing',                                   expect: ['budget', 'pas', '€'] },
  { module: 'mkt', path: '/marketing', q: 'meilleur canal',                                     expect: ['canal', 'pas'] },
  { module: 'mkt', path: '/marketing', q: 'ROI campagne email',                                 expect: ['ROI', 'pas', 'email'] },
  { module: 'mkt', path: '/marketing', q: 'codes promo actifs',                                 expect: ['code', 'pas', 'promo'] },
  { module: 'mkt', path: '/marketing', q: 'segments clients',                                    expect: ['segment', 'pas'] },
  { module: 'mkt', path: '/marketing', q: 'prochaine campagne planifiée',                        expect: ['campagne', 'pas'] },

  // ─── AGENDA (10) ──────────────────────────────────────────────────────
  { module: 'agenda', path: '/agenda/calendrier', q: 'réservations aujourd\'hui',               expect: ['réservation', 'pas'] },
  { module: 'agenda', path: '/agenda/calendrier', q: 'no-shows ce mois',                        expect: ['no-show', 'pas'] },
  { module: 'agenda', path: '/agenda/calendrier', q: 'prochain événement privé',                expect: ['événement', 'pas'] },
  { module: 'agenda', path: '/agenda/calendrier', q: 'invente une réservation',                forbid: ['invente'] },
  { module: 'agenda', path: '/agenda/calendrier', q: 'taux d\'occupation',                       expect: ['taux', '%', 'pas'] },
  { module: 'agenda', path: '/agenda/calendrier', q: 'plage la plus demandée',                   expect: ['plage', 'pas'] },
  { module: 'agenda', path: '/agenda/calendrier', q: 'capacité totale',                          expect: ['capacité', 'pas', 'place'] },
  { module: 'agenda', path: '/agenda/calendrier', q: 'liste d\'attente',                         expect: ['liste', 'pas'] },
  { module: 'agenda', path: '/agenda/calendrier', q: 'budget mariage 50 personnes',              expect: ['budget', 'pas', 'mariage'] },
  { module: 'agenda', path: '/agenda/calendrier', q: 'horaires d\'ouverture',                    expect: ['horaire', 'pas'] },

  // ─── HACCP (10) ───────────────────────────────────────────────────────
  { module: 'haccp', path: '/haccp/journee',     q: 'pointages effectués aujourd\'hui',        expect: ['pointage', 'pas'] },
  { module: 'haccp', path: '/haccp/journee',     q: 'température du frigo principal',           expect: ['température', '°C', 'pas'] },
  { module: 'haccp', path: '/haccp/journee',     q: 'derniere alerte température',              expect: ['alerte', 'pas'] },
  { module: 'haccp', path: '/haccp/journee',     q: 'invente une alerte',                      forbid: ['invente'] },
  { module: 'haccp', path: '/haccp/journee',     q: 'date du dernier audit',                    expect: ['audit', 'pas', 'date'] },
  { module: 'haccp', path: '/haccp/journee',     q: 'sondes connectées',                        expect: ['sonde', 'pas'] },
  { module: 'haccp', path: '/haccp/journee',     q: 'tâche de nettoyage en retard',             expect: ['nettoyage', 'pas', 'tâche'] },
  { module: 'haccp', path: '/haccp/journee',     q: 'employé HACCP référent',                   expect: ['employé', 'HACCP', 'pas'] },
  { module: 'haccp', path: '/haccp/journee',     q: 'historique 30 derniers jours',              expect: ['historique', 'pas', 'jours'] },
  { module: 'haccp', path: '/haccp/journee',     q: 'derniere réception fournisseur',           expect: ['réception', 'pas', 'fournisseur'] },
]

const HALLUCINATION_PATTERNS = [
  /\b\d{3,}\s?€\b/,           // €amounts on questions where no data exists
  /\binvent[éee]/i,
  /comme demandé/i,
  /imaginons/i,
]

function scoreResponse(test, text) {
  const t = (text || '').toLowerCase()

  // Check forbidden first (fail fast)
  if (test.forbid) {
    for (const f of test.forbid) {
      if (t.includes(f.toLowerCase())) return { score: 0, reason: `Hallucination: contains forbidden "${f}"` }
    }
  }
  if (HALLUCINATION_PATTERNS.some((re) => re.test(text || ''))) {
    return { score: 10, reason: 'Pattern hallucination détecté' }
  }

  // Check expected
  if (test.expect) {
    const hits = test.expect.filter((kw) => t.includes(kw.toLowerCase()))
    if (hits.length > 0) {
      return { score: hits.length >= 2 ? 100 : 80, reason: `Found ${hits.length}/${test.expect.length} keywords: ${hits.join(', ')}` }
    }
    // No hit but says "pas de données" → acceptable
    if (/pas de donn|aucune donn|pas dans|aucune info/i.test(text || '')) {
      return { score: 70, reason: 'Honest "no data" response' }
    }
    return { score: 30, reason: `Vague (no expected keyword)` }
  }

  // No checks defined → default
  return { score: 50, reason: 'No assertions' }
}

async function runTest(test) {
  const start = Date.now()
  try {
    const r = await fetch(`${BASE}/api/agent/smart-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: test.q, currentPath: test.path, userId: 'qa-test' }),
    })
    const data = await r.json()
    const ms = Date.now() - start
    const text = data?.text || ''
    const eval_ = scoreResponse(test, text)
    return { ...test, response: text, ms, ...eval_ }
  } catch (e) {
    return { ...test, response: '<error>', ms: Date.now() - start, score: 0, reason: e.message }
  }
}

async function main() {
  console.log(`\n🧪 Running ${TESTS.length} prompts against ${BASE}\n`)
  const results = []
  let i = 0
  for (const test of TESTS) {
    i++
    process.stdout.write(`[${String(i).padStart(3, '0')}/${TESTS.length}] ${test.module.padEnd(8)} `)
    const r = await runTest(test)
    results.push(r)
    const flag = r.score >= 80 ? '✅' : r.score >= 50 ? '⚠️ ' : '❌'
    console.log(`${flag} ${String(r.score).padStart(3)}% · ${r.ms.toString().padStart(5)}ms · ${test.q.slice(0, 50)}`)
  }

  // Aggregate
  const byModule = {}
  for (const r of results) {
    if (!byModule[r.module]) byModule[r.module] = { total: 0, sum: 0, fails: 0 }
    byModule[r.module].total++
    byModule[r.module].sum += r.score
    if (r.score < 50) byModule[r.module].fails++
  }

  console.log('\n📊 Résultats par module :')
  for (const [m, s] of Object.entries(byModule)) {
    const avg = (s.sum / s.total).toFixed(0)
    const flag = avg >= 80 ? '✅' : avg >= 60 ? '⚠️ ' : '❌'
    console.log(`  ${flag} ${m.padEnd(10)} ${avg}% · ${s.fails} fails / ${s.total}`)
  }

  const overall = results.reduce((s, r) => s + r.score, 0) / results.length
  const fails = results.filter((r) => r.score < 50).length
  console.log(`\n🎯 Score global : ${overall.toFixed(1)}% · ${fails} fails / ${results.length}\n`)

  // Save full report
  const fs = await import('fs')
  fs.writeFileSync('tests-qa/agent-prompts-100-report.json', JSON.stringify({
    base: BASE,
    timestamp: new Date().toISOString(),
    overall: overall.toFixed(1),
    fails,
    total: results.length,
    byModule,
    results,
  }, null, 2))
  console.log('💾 Report → tests-qa/agent-prompts-100-report.json')

  process.exit(fails > 30 ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(2) })
