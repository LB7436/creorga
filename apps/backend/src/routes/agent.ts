import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { getFloorState } from './floorState'

/**
 * Agent execution endpoint — runs commands defined in the Help Center catalog.
 *
 *   POST /api/agent/execute
 *   { commandId: 'inv.find-by-number', input: { number: 'F-2026-0142' } }
 *
 * Returns either { kind: 'data', data, ui? } for structured results
 * or { kind: 'text', text } for narrative responses.
 *
 * Each handler reads from the same JSON files used by the rest of the backend
 * and returns a small UI hint so the chat can render a download link / link / table.
 */

const router = Router()
const DATA_DIR = path.resolve(process.cwd(), 'data')

interface AgentResult {
  kind: 'data' | 'text' | 'error'
  text?: string
  data?: any
  ui?: {
    type: 'download' | 'link' | 'list' | 'kpi'
    href?: string
    label?: string
    items?: Array<{ label: string; value: string; href?: string }>
  }
}

function loadJson<T = any>(filename: string, fallback: T): T {
  const p = path.join(DATA_DIR, filename)
  if (!fs.existsSync(p)) return fallback
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) as T } catch { return fallback }
}

const HANDLERS: Record<string, (input: any) => AgentResult | Promise<AgentResult>> = {

  // ─── HOME / DAY SUMMARY ─────────────────────────────────────────────
  'home.day-summary': () => {
    const floor = getFloorState()
    const occupied = floor.tables.filter((t) => t.status === 'OCCUPEE').length
    const totalRevenue = floor.tables.reduce((sum, t) => sum + (t.items || []).reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0), 0)
                       + floor.chairs.reduce((sum, c) => sum + (c.items || []).reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0), 0)
    return {
      kind: 'data',
      text: `📊 **Résumé du jour** : ${occupied} tables occupées, ${totalRevenue.toFixed(2)} € en cours.`,
      data: { occupiedTables: occupied, currentRevenueOpen: totalRevenue },
      ui: {
        type: 'list',
        items: [
          { label: 'Tables occupées', value: `${occupied} / ${floor.tables.length}` },
          { label: 'CA en cours (tickets ouverts)', value: `${totalRevenue.toFixed(2)} €` },
        ],
      },
    }
  },

  // ─── POS ─────────────────────────────────────────────────────────────
  'pos.day-stats': () => HANDLERS['home.day-summary']({}),
  'pos.open-tables': () => {
    const floor = getFloorState()
    const open = floor.tables.filter((t) => t.status === 'OCCUPEE')
    return {
      kind: 'data',
      text: `🪑 ${open.length} table(s) ouverte(s) actuellement.`,
      ui: {
        type: 'list',
        items: open.map((t) => {
          const total = (t.items || []).reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0)
          const hours = t.openedAt ? ((Date.now() - t.openedAt) / 3600_000).toFixed(1) : '?'
          return { label: `${t.name} (${t.section})`, value: `${total.toFixed(2)} € · ${hours} h` }
        }),
      },
    }
  },
  'pos.stale-sessions': () => {
    const floor = getFloorState()
    const cutoff = Date.now() - 4 * 3600_000
    const stale = floor.tables.filter((t) => t.openedAt && t.openedAt < cutoff && t.status === 'OCCUPEE')
    if (stale.length === 0) return { kind: 'text', text: '✅ Aucune session > 4 h. Janitor actif.' }
    return {
      kind: 'data',
      text: `⏱️ ${stale.length} table(s) ouverte(s) depuis > 4 h. Janitor auto-clôt à 8 h.`,
      ui: {
        type: 'list',
        items: stale.map((t) => ({
          label: t.name,
          value: t.openedAt ? `${((Date.now() - t.openedAt) / 3600_000).toFixed(1)} h` : '?',
        })),
      },
    }
  },

  // ─── INVOICES ────────────────────────────────────────────────────────
  'inv.find-by-number': (input) => {
    const number = String(input?.number || '').trim()
    if (!number) return { kind: 'error', text: 'Numéro de facture requis (ex : F-2026-0142).' }
    const invoices = loadJson<any[]>('invoices.json', [])
    const found = invoices.find((i: any) =>
      String(i.number || i.invoiceNumber || '').toLowerCase().includes(number.toLowerCase())
    )
    if (!found) {
      return {
        kind: 'text',
        text: `🔍 Aucune facture "${number}" trouvée. Vérifiez le format ou consultez /invoices.`,
      }
    }
    return {
      kind: 'data',
      text: `✅ Facture **${found.number || number}** trouvée — ${found.customer || found.client || 'Client'} · ${found.total || 0} €`,
      data: found,
      ui: {
        type: 'download',
        href: `/api/invoices/${found.id || found.number}/pdf`,
        label: `Télécharger ${found.number || number}.pdf`,
      },
    }
  },
  'inv.find-by-client': (input) => {
    const name = String(input?.name || '').trim().toLowerCase()
    if (!name) return { kind: 'error', text: 'Nom du client requis.' }
    const invoices = loadJson<any[]>('invoices.json', [])
    const matches = invoices.filter((i: any) =>
      String(i.customer || i.client || '').toLowerCase().includes(name)
    )
    if (matches.length === 0) return { kind: 'text', text: `Aucune facture pour "${name}".` }
    return {
      kind: 'data',
      text: `📋 ${matches.length} facture(s) trouvée(s) pour "${name}".`,
      ui: {
        type: 'list',
        items: matches.slice(0, 10).map((i: any) => ({
          label: i.number || 'F-?',
          value: `${i.total || 0} € · ${i.status || ''}`,
          href: `/invoices/${i.id || i.number}`,
        })),
      },
    }
  },
  'inv.overdue': () => {
    const invoices = loadJson<any[]>('invoices.json', [])
    const now = Date.now()
    const overdue = invoices.filter((i: any) => {
      if (i.status === 'paid') return false
      const due = i.dueDate ? new Date(i.dueDate).getTime() : 0
      return due > 0 && due < now - 30 * 86400_000
    })
    if (overdue.length === 0) return { kind: 'text', text: '✅ Aucune facture en retard de plus de 30 jours.' }
    return {
      kind: 'data',
      text: `⏰ ${overdue.length} facture(s) en retard > 30 j.`,
      ui: {
        type: 'list',
        items: overdue.slice(0, 10).map((i: any) => ({
          label: i.number || 'F-?',
          value: `${i.total || 0} € · ${i.customer || ''}`,
        })),
      },
    }
  },
  'inv.unpaid-total': () => {
    const invoices = loadJson<any[]>('invoices.json', [])
    const unpaid = invoices.filter((i: any) => i.status !== 'paid')
    const total = unpaid.reduce((s: number, i: any) => s + (i.total || 0), 0)
    return {
      kind: 'data',
      text: `💶 Total impayé : **${total.toFixed(2)} €** sur ${unpaid.length} facture(s).`,
      ui: { type: 'kpi', label: 'Total impayé', items: [{ label: 'Montant', value: `${total.toFixed(2)} €` }] },
    }
  },

  // ─── INVENTORY ───────────────────────────────────────────────────────
  'inv.low-stock': () => {
    const stock = loadJson<any[]>('inventory-stock.json', [])
    const low = stock.filter((s: any) => (s.qty || 0) <= (s.minQty || 5))
    if (low.length === 0) return { kind: 'text', text: '✅ Aucun article sous le seuil minimum.' }
    return {
      kind: 'data',
      text: `⚠️ ${low.length} article(s) sous seuil :`,
      ui: {
        type: 'list',
        items: low.slice(0, 15).map((s: any) => ({
          label: s.name || '?',
          value: `${s.qty || 0} ${s.unit || ''} (min ${s.minQty || 5})`,
        })),
      },
    }
  },
  'inv.find-product': (input) => {
    const name = String(input?.name || '').trim().toLowerCase()
    if (!name) return { kind: 'error', text: 'Nom de produit requis.' }
    const stock = loadJson<any[]>('inventory-stock.json', [])
    const matches = stock.filter((s: any) => String(s.name || '').toLowerCase().includes(name))
    if (matches.length === 0) return { kind: 'text', text: `Aucun produit "${name}" trouvé.` }
    return {
      kind: 'data',
      text: `🔍 ${matches.length} produit(s) trouvé(s) :`,
      ui: {
        type: 'list',
        items: matches.slice(0, 10).map((s: any) => ({
          label: s.name,
          value: `${s.qty || 0} ${s.unit || ''} · ${s.unitPrice || 0} €/u`,
        })),
      },
    }
  },
  'inv.value': () => {
    const stock = loadJson<any[]>('inventory-stock.json', [])
    const total = stock.reduce((s: number, x: any) => s + (x.qty || 0) * (x.unitPrice || 0), 0)
    return {
      kind: 'data',
      text: `💶 Valeur totale du stock : **${total.toFixed(2)} €** (${stock.length} références).`,
    }
  },
  'inv.expiring': () => {
    const stock = loadJson<any[]>('inventory-stock.json', [])
    const cutoff = Date.now() + 7 * 86400_000
    const exp = stock.filter((s: any) => s.expiresAt && new Date(s.expiresAt).getTime() < cutoff)
    if (exp.length === 0) return { kind: 'text', text: '✅ Aucun article ne périme dans les 7 jours.' }
    return {
      kind: 'data',
      text: `📅 ${exp.length} article(s) à consommer dans 7 j.`,
      ui: {
        type: 'list',
        items: exp.map((s: any) => ({
          label: s.name,
          value: `Périme le ${new Date(s.expiresAt).toLocaleDateString('fr-LU')}`,
        })),
      },
    }
  },

  // ─── CRM ─────────────────────────────────────────────────────────────
  'crm.find-customer': (input) => {
    const q = String(input?.query || '').trim().toLowerCase()
    if (!q) return { kind: 'error', text: 'Nom ou email requis.' }
    const customers = loadJson<any[]>('customers.json', [])
    const matches = customers.filter((c: any) =>
      String(`${c.firstName || ''} ${c.lastName || ''} ${c.email || ''} ${c.phone || ''}`).toLowerCase().includes(q)
    )
    if (matches.length === 0) return { kind: 'text', text: `Aucun client "${q}".` }
    return {
      kind: 'data',
      text: `👤 ${matches.length} client(s) :`,
      ui: {
        type: 'list',
        items: matches.slice(0, 10).map((c: any) => ({
          label: `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Anonyme',
          value: c.email || c.phone || '',
          href: `/crm/clients/${c.id}`,
        })),
      },
    }
  },
  'crm.vip-list': () => {
    const customers = loadJson<any[]>('customers.json', [])
    const vips = customers
      .filter((c: any) => (c.tier === 'VIP') || (c.score || 0) >= 80)
      .slice(0, 10)
    if (vips.length === 0) return { kind: 'text', text: '✅ Aucun client encore classé VIP. Lancez "IA Clients → Score" pour calculer.' }
    return {
      kind: 'data',
      text: `⭐ Top ${vips.length} VIP :`,
      ui: {
        type: 'list',
        items: vips.map((c: any) => ({
          label: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
          value: `Score ${c.score || '?'} · ${c.totalSpent || 0} €`,
        })),
      },
    }
  },
  'crm.lost-customers': () => {
    const customers = loadJson<any[]>('customers.json', [])
    const cutoff = Date.now() - 60 * 86400_000
    const lost = customers.filter((c: any) => c.lastVisit && new Date(c.lastVisit).getTime() < cutoff)
    return {
      kind: 'data',
      text: `🥺 ${lost.length} client(s) absent(s) depuis > 60 j.`,
      ui: {
        type: 'list',
        items: lost.slice(0, 15).map((c: any) => ({
          label: `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Anonyme',
          value: c.lastVisit ? `Dernière visite : ${new Date(c.lastVisit).toLocaleDateString('fr-LU')}` : '',
        })),
      },
    }
  },
  'crm.birthdays': () => {
    const customers = loadJson<any[]>('customers.json', [])
    const month = new Date().getMonth() + 1
    const matches = customers.filter((c: any) => c.birthday && new Date(c.birthday).getMonth() + 1 === month)
    if (matches.length === 0) return { kind: 'text', text: '🎂 Aucun anniversaire ce mois-ci.' }
    return {
      kind: 'data',
      text: `🎂 ${matches.length} anniversaire(s) ce mois :`,
      ui: {
        type: 'list',
        items: matches.map((c: any) => ({
          label: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
          value: new Date(c.birthday).toLocaleDateString('fr-LU'),
        })),
      },
    }
  },

  // ─── HR ──────────────────────────────────────────────────────────────
  'hr.who-today': () => {
    const shifts = loadJson<any[]>('shifts.json', [])
    const today = new Date().toISOString().slice(0, 10)
    const todayShifts = shifts.filter((s: any) => (s.date || '').slice(0, 10) === today)
    if (todayShifts.length === 0) return { kind: 'text', text: '🕐 Aucun shift planifié aujourd\'hui (ou data absente).' }
    return {
      kind: 'data',
      text: `🕐 ${todayShifts.length} shift(s) aujourd\'hui :`,
      ui: {
        type: 'list',
        items: todayShifts.map((s: any) => ({
          label: s.employee || '?',
          value: `${s.start || '?'} - ${s.end || '?'} (${s.role || 'service'})`,
        })),
      },
    }
  },
  'hr.overtime-alerts': () => {
    const shifts = loadJson<any[]>('shifts.json', [])
    const weekStart = Date.now() - 7 * 86400_000
    const byEmployee: Record<string, number> = {}
    for (const s of shifts) {
      if (!s.date || !s.start || !s.end) continue
      const d = new Date(s.date).getTime()
      if (d < weekStart) continue
      const [h1, m1] = String(s.start).split(':').map(Number)
      const [h2, m2] = String(s.end).split(':').map(Number)
      const hours = (h2 + (m2 || 0) / 60) - (h1 + (m1 || 0) / 60)
      byEmployee[s.employee] = (byEmployee[s.employee] || 0) + Math.max(0, hours)
    }
    const over = Object.entries(byEmployee).filter(([, h]) => h > 40)
    if (over.length === 0) return { kind: 'text', text: '✅ Personne au-dessus de 40 h cette semaine.' }
    return {
      kind: 'data',
      text: `⚠️ ${over.length} employé(s) > 40 h :`,
      ui: { type: 'list', items: over.map(([e, h]) => ({ label: e, value: `${h.toFixed(1)} h` })) },
    }
  },
  'hr.coverage-check': () => ({
    kind: 'text',
    text: '🛡️ Coverage check : module en bêta. Croisement CA prévis × shifts arrive en v3.7.',
  }),

  // ─── ACCOUNTING ──────────────────────────────────────────────────────
  'acc.month-summary': () => {
    const invoices = loadJson<any[]>('invoices.json', [])
    const expenses = loadJson<any[]>('expenses.json', [])
    const monthStart = new Date()
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
    const ms = monthStart.getTime()
    const ca = invoices.filter((i: any) => i.date && new Date(i.date).getTime() >= ms)
                       .reduce((s: number, i: any) => s + (i.total || 0), 0)
    const dep = expenses.filter((e: any) => e.date && new Date(e.date).getTime() >= ms)
                        .reduce((s: number, e: any) => s + (e.amount || 0), 0)
    return {
      kind: 'data',
      text: `📊 Mois en cours :`,
      ui: {
        type: 'list',
        items: [
          { label: 'CA',       value: `${ca.toFixed(2)} €` },
          { label: 'Dépenses', value: `${dep.toFixed(2)} €` },
          { label: 'Marge',    value: `${(ca - dep).toFixed(2)} €` },
        ],
      },
    }
  },
  'acc.tva-current': () => {
    const invoices = loadJson<any[]>('invoices.json', [])
    const month = new Date().getMonth(), year = new Date().getFullYear()
    const quarterStart = new Date(year, month - (month % 3), 1).getTime()
    const tva = invoices.filter((i: any) => i.date && new Date(i.date).getTime() >= quarterStart)
                        .reduce((s: number, i: any) => s + (i.vatTotal || (i.total || 0) * 0.17), 0)
    return {
      kind: 'data',
      text: `📑 TVA collectée ce trimestre : **${tva.toFixed(2)} €**`,
    }
  },
  'acc.expense-by-cat': () => {
    const expenses = loadJson<any[]>('expenses.json', [])
    const byCat: Record<string, number> = {}
    for (const e of expenses) byCat[e.category || 'Autre'] = (byCat[e.category || 'Autre'] || 0) + (e.amount || 0)
    const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1])
    if (sorted.length === 0) return { kind: 'text', text: 'Aucune dépense enregistrée.' }
    return {
      kind: 'data',
      text: `🥧 Top dépenses par catégorie :`,
      ui: { type: 'list', items: sorted.slice(0, 8).map(([c, v]) => ({ label: c, value: `${v.toFixed(2)} €` })) },
    }
  },

  // ─── REPUTATION ──────────────────────────────────────────────────────
  'rep.recent': () => {
    const reviews = loadJson<any[]>('reviews.json', [])
    const sorted = [...reviews].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    if (sorted.length === 0) return { kind: 'text', text: 'Aucun avis ingéré pour le moment.' }
    return {
      kind: 'data',
      text: `🆕 ${Math.min(7, sorted.length)} avis récents :`,
      ui: {
        type: 'list',
        items: sorted.slice(0, 7).map((r: any) => ({
          label: `${'⭐'.repeat(r.rating || 0)} ${r.platform || ''}`,
          value: `${(r.text || '').slice(0, 60)}…`,
        })),
      },
    }
  },
  'rep.negative': () => {
    const reviews = loadJson<any[]>('reviews.json', [])
    const neg = reviews.filter((r: any) => (r.rating || 5) < 3 && !r.responded)
    if (neg.length === 0) return { kind: 'text', text: '✅ Aucun avis négatif sans réponse.' }
    return {
      kind: 'data',
      text: `😞 ${neg.length} avis négatif(s) sans réponse :`,
      ui: {
        type: 'list',
        items: neg.slice(0, 10).map((r: any) => ({
          label: `${r.rating}/5 · ${r.platform}`,
          value: (r.text || '').slice(0, 60),
        })),
      },
    }
  },
  'rep.avg-rating': () => {
    const reviews = loadJson<any[]>('reviews.json', [])
    if (reviews.length === 0) return { kind: 'text', text: 'Aucun avis ingéré.' }
    const avg = reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviews.length
    return { kind: 'data', text: `⭐ Note moyenne : **${avg.toFixed(2)} / 5** sur ${reviews.length} avis.` }
  },

  // ─── MARKETING ───────────────────────────────────────────────────────
  'mkt.last-campaign': () => {
    const campaigns = loadJson<any[]>('campaigns.json', [])
    if (campaigns.length === 0) return { kind: 'text', text: 'Aucune campagne envoyée.' }
    const last = [...campaigns].sort((a: any, b: any) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())[0]
    return {
      kind: 'data',
      text: `📈 Dernière campagne : **${last.name || '?'}**`,
      ui: {
        type: 'list',
        items: [
          { label: 'Envoyée à',     value: `${last.recipients || '?'} contacts` },
          { label: 'Taux ouverture', value: `${last.openRate || '?'} %` },
          { label: 'Clics',         value: `${last.clickRate || '?'} %` },
        ],
      },
    }
  },
  'mkt.audience-suggest': () => ({
    kind: 'text',
    text: '✨ Pour suggérer une audience IA, allez dans /marketing → bouton "IA Marketing → Cible".',
  }),

  // ─── AI ──────────────────────────────────────────────────────────────
  'ai.list-actions': () => ({
    kind: 'text',
    text: '📚 15 actions IA disponibles : score-client, relance-message, campaign, categorize-expense, optimize-shifts, respond-review, budget-estimate, suggest-min-stock, suggest-pairing, allergens, recommend-menu, quiz-haccp, daily-summary, parse-shifts-ocr, help-guide.',
  }),
  'ai.test-gemma': (async () => {
    try {
      const r = await fetch('http://localhost:11434/api/tags')
      if (!r.ok) return { kind: 'error' as const, text: '❌ Ollama ne répond pas (port 11434).' }
      const data = await r.json() as { models?: any[] }
      const list = (data.models || []).map((m: any) => m.name).join(', ')
      return { kind: 'text' as const, text: `✅ Ollama OK · modèles installés : ${list || 'aucun'}` }
    } catch (e: any) {
      return { kind: 'error' as const, text: '❌ Connexion Ollama échouée : ' + (e?.message || 'unknown') }
    }
  }) as any,
}

router.post('/execute', async (req, res) => {
  const { commandId, input } = req.body || {}
  if (!commandId || !HANDLERS[commandId]) {
    return res.status(400).json({ kind: 'error', text: `Commande inconnue : ${commandId}` })
  }
  try {
    const result = await Promise.resolve(HANDLERS[commandId](input || {}))
    res.json(result)
  } catch (e: any) {
    res.status(500).json({ kind: 'error', text: e?.message || 'Erreur serveur' })
  }
})

router.get('/commands', (_req, res) => {
  res.json({ commands: Object.keys(HANDLERS) })
})

// ═══════════════════════════════════════════════════════════════════════
// SMART QUERY — Gemma + auto-loaded DB context based on currentPath
//
//   POST /api/agent/smart-query
//   { question: 'quand a sophie congé', currentPath: '/hr/planning' }
//
// 1. Detects entities in the question (names, dates, numbers)
// 2. Loads relevant data files based on currentPath
// 3. Filters them by entity match
// 4. Re-prompts Gemma with the filtered DB slice as context
// 5. Returns precise, factual answer
// ═══════════════════════════════════════════════════════════════════════

const OLLAMA_URL = (process.env.OLLAMA_URL as string) || 'http://localhost:11434'

interface SmartContext {
  shifts?: any[]
  invoices?: any[]
  customers?: any[]
  stock?: any[]
  expenses?: any[]
  reviews?: any[]
  campaigns?: any[]
  floor?: any
}

function loadRelevantContext(path: string): SmartContext {
  const ctx: SmartContext = {}
  // Load files matching the current module
  if (path.startsWith('/hr')) {
    ctx.shifts = loadJson<any[]>('shifts.json', [])
  }
  if (path.startsWith('/invoices') || path.startsWith('/accounting')) {
    ctx.invoices = loadJson<any[]>('invoices.json', [])
    ctx.expenses = loadJson<any[]>('expenses.json', [])
  }
  if (path.startsWith('/crm') || path.startsWith('/marketing')) {
    ctx.customers = loadJson<any[]>('customers.json', [])
  }
  if (path.startsWith('/inventory') || path.startsWith('/haccp')) {
    ctx.stock = loadJson<any[]>('inventory-stock.json', [])
  }
  if (path.startsWith('/reputation')) {
    ctx.reviews = loadJson<any[]>('reviews.json', [])
  }
  if (path.startsWith('/marketing')) {
    ctx.campaigns = loadJson<any[]>('campaigns.json', [])
  }
  if (path.startsWith('/pos') || path.startsWith('/owner') || path === '/' || path.startsWith('/modules')) {
    try { ctx.floor = getFloorState() } catch { /* skip */ }
  }
  return ctx
}

/** Best-effort entity extraction from user question (names, numbers, dates) */
function extractEntities(question: string): { names: string[]; numbers: string[] } {
  const q = question || ''
  // Names: capitalised words (FR)
  const nameMatches = q.match(/\b[A-ZÀ-Ý][a-zà-ÿ]{2,}\b/g) || []
  const stop = new Set(['Comment', 'Quand', 'Quelle', 'Quel', 'Combien', 'Quels', 'Quelles', 'Pourquoi', 'Qui'])
  const names = nameMatches.filter((n) => !stop.has(n))
  // Numbers / IDs (e.g. F-2026-0142)
  const numbers = (q.match(/[A-Z]?-?\d{2,}[\d\-]*/g) || [])
  return { names, numbers }
}

/** Filter DB context by entities so we send Gemma a small, relevant slice */
function filterContext(ctx: SmartContext, entities: { names: string[]; numbers: string[] }): SmartContext {
  const filtered: SmartContext = {}
  const names = entities.names.map((n) => n.toLowerCase())
  const numbers = entities.numbers

  if (ctx.shifts) {
    if (names.length > 0) {
      filtered.shifts = ctx.shifts.filter((s: any) =>
        names.some((n) => String(s.employee || '').toLowerCase().includes(n))
      ).slice(0, 30)
    } else {
      filtered.shifts = ctx.shifts.slice(0, 20)
    }
  }
  if (ctx.invoices) {
    if (numbers.length > 0) {
      filtered.invoices = ctx.invoices.filter((i: any) =>
        numbers.some((n) => String(i.number || i.invoiceNumber || '').includes(n))
      ).slice(0, 10)
    } else if (names.length > 0) {
      filtered.invoices = ctx.invoices.filter((i: any) =>
        names.some((n) => String(i.customer || i.client || '').toLowerCase().includes(n))
      ).slice(0, 10)
    } else {
      filtered.invoices = ctx.invoices.slice(0, 5)
    }
  }
  if (ctx.customers) {
    if (names.length > 0) {
      filtered.customers = ctx.customers.filter((c: any) =>
        names.some((n) =>
          String(c.firstName || '').toLowerCase().includes(n) ||
          String(c.lastName  || '').toLowerCase().includes(n) ||
          String(c.email     || '').toLowerCase().includes(n)
        )
      ).slice(0, 10)
    } else {
      filtered.customers = ctx.customers.slice(0, 5)
    }
  }
  if (ctx.stock) {
    if (names.length > 0) {
      filtered.stock = ctx.stock.filter((s: any) =>
        names.some((n) => String(s.name || '').toLowerCase().includes(n))
      ).slice(0, 20)
    } else {
      filtered.stock = ctx.stock.slice(0, 10)
    }
  }
  if (ctx.expenses)  filtered.expenses  = ctx.expenses.slice(0, 5)
  if (ctx.reviews)   filtered.reviews   = ctx.reviews.slice(0, 5)
  if (ctx.campaigns) filtered.campaigns = ctx.campaigns.slice(0, 3)
  if (ctx.floor) {
    filtered.floor = {
      tablesOccupied: ctx.floor.tables?.filter((t: any) => t.status === 'OCCUPEE').length || 0,
      tablesFree:     ctx.floor.tables?.filter((t: any) => t.status === 'LIBRE').length    || 0,
      openTables:     ctx.floor.tables?.filter((t: any) => t.status === 'OCCUPEE').map((t: any) => ({
        name: t.name, items: (t.items || []).length, openedAt: t.openedAt,
      })).slice(0, 10),
    }
  }
  return filtered
}

router.post('/smart-query', async (req, res) => {
  const { question, currentPath } = req.body || {}
  if (!question) return res.status(400).json({ kind: 'error', text: 'Question requise.' })

  const ctx = loadRelevantContext(currentPath || '/')
  const entities = extractEntities(question)
  const slice = filterContext(ctx, entities)

  const prompt = `Tu es l'agent IA Creorga, assistant intelligent pour restaurants.
On te pose une question. Tu as accès à la base de données filtrée ci-dessous.
Réponds de manière FACTUELLE en t'appuyant sur les données réelles.
Si l'info n'est pas dans les données, dis-le franchement et propose où chercher.

Page courante : ${currentPath || '/'}
Question utilisateur : "${question}"

Données disponibles (JSON, déjà filtrées par les entités détectées) :
${JSON.stringify(slice, null, 2).slice(0, 4000)}

Règles :
- Maximum 4 phrases
- Cite les noms / dates / chiffres exacts trouvés dans les données
- Termine par 1 lien-action si pertinent (ex : "Voir /hr/conges pour gérer.")
- Si données vides, dis : "Aucune donnée pour répondre. Allez dans /xxx pour créer."`

  try {
    const ollamaRes = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gemma2:2b', prompt, stream: false }),
    })
    if (!ollamaRes.ok) {
      return res.json({ kind: 'error', text: `❌ Ollama indisponible (${ollamaRes.status}). Vérifiez qu'Ollama tourne.` })
    }
    const data = await ollamaRes.json() as { response?: string }
    const text = (data.response || '').trim() || 'Pas de réponse Gemma.'
    res.json({ kind: 'text', text, debug: { entities, contextSize: JSON.stringify(slice).length } })
  } catch (e: any) {
    res.json({ kind: 'error', text: '❌ ' + (e?.message || 'Erreur smart-query') })
  }
})

export default router
