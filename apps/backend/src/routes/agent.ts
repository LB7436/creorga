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

// LRU cache (Phase 2B#5) — keyed by question+path, TTL 1 h
const responseCache = new Map<string, { ts: number; payload: any }>()
const CACHE_TTL_MS = 60 * 60 * 1000

// Phase 2B#3 — Conversation memory per userId (last 20 exchanges)
const CHAT_MEMORY_DIR = path.join(DATA_DIR, 'chats')
function loadMemory(userId: string): Array<{ q: string; a: string; ts: number }> {
  const f = path.join(CHAT_MEMORY_DIR, `${userId}.json`)
  if (!fs.existsSync(f)) return []
  try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return [] }
}
function saveMemory(userId: string, q: string, a: string) {
  if (!fs.existsSync(CHAT_MEMORY_DIR)) fs.mkdirSync(CHAT_MEMORY_DIR, { recursive: true })
  const f = path.join(CHAT_MEMORY_DIR, `${userId}.json`)
  const mem = loadMemory(userId)
  mem.unshift({ q, a, ts: Date.now() })
  if (mem.length > 20) mem.length = 20
  fs.writeFileSync(f, JSON.stringify(mem, null, 2), 'utf8')
}

/** Detect "complex" questions to auto-route to gemma2:9b (Phase 2B#2)
 *  with graceful fallback to 2b if 9b not installed. */
let _gemma9bAvailable: boolean | null = null
async function isGemma9bAvailable(): Promise<boolean> {
  if (_gemma9bAvailable !== null) return _gemma9bAvailable
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`)
    if (!r.ok) { _gemma9bAvailable = false; return false }
    const data = await r.json() as { models?: any[] }
    _gemma9bAvailable = !!(data.models || []).find((m: any) => String(m.name).startsWith('gemma2:9b'))
    return _gemma9bAvailable
  } catch { _gemma9bAvailable = false; return false }
}

async function pickModel(question: string, contextSize: number): Promise<string> {
  const q = (question || '').toLowerCase()
  const complex = /\banalyse?\b|\boptimise?\b|\bcompare?\b|\bpr[ée]vois?\b|\bplanifie?\b|\brecommande?\b|\bsuggest|complexe/i.test(q)
  if (complex || question.length > 200 || contextSize > 2500) {
    if (await isGemma9bAvailable()) return 'gemma2:9b'
  }
  // v3.18.2 — gemma3:4b remplace gemma2:2b (vision-capable, plus fiable)
  return 'gemma3:4b'
}

/** Detect "invent / imagine / fake" attempts to refuse cleanly */
function isInventAttempt(q: string): boolean {
  return /\binvent[ée]?\b|\bimagine\b|\bfake\b|\bfais semblant\b|\bsimule\b|\bcr[ée]e?\s+moi\s+un\b/i.test(q || '')
}

/** Returns true if the slice is essentially empty (no useful data) */
function isContextEmpty(slice: SmartContext): boolean {
  const keys = Object.keys(slice).filter((k) => {
    const v = (slice as any)[k]
    if (Array.isArray(v)) return v.length > 0
    if (typeof v === 'object' && v !== null) return Object.keys(v).length > 0
    return v != null
  })
  return keys.length === 0
}

router.post('/smart-query', async (req, res) => {
  const { question, currentPath, userId = 'default' } = req.body || {}
  if (!question) return res.status(400).json({ kind: 'error', text: 'Question requise.' })

  const ctx = loadRelevantContext(currentPath || '/')
  const entities = extractEntities(question)
  const slice = filterContext(ctx, entities)

  // Cache check (Phase 2B#5)
  const cacheKey = `${currentPath}::${userId}::${question.toLowerCase().trim()}`
  const cached = responseCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return res.json({ ...cached.payload, cached: true })
  }

  // Phase 2B#3 — load last 5 exchanges as conversation memory
  const memory = loadMemory(userId).slice(0, 5)
  const memorySummary = memory.length > 0
    ? memory.map((m, i) => `[${i + 1}] Q: "${m.q.slice(0, 100)}" → R: "${m.a.slice(0, 100)}"`).join('\n')
    : ''

  // Anti-hallucination short-circuit (Phase 0a) :
  // if context is empty, return a clean fallback without prompting Gemma.
  if (isContextEmpty(slice)) {
    const fallback = {
      kind: 'text' as const,
      text: `🔍 Pas de données pour répondre à cette question sur ${currentPath || '/'}. Vérifiez le module concerné — utilisez les commandes prédéfinies dans l'onglet Agent IA pour des réponses garanties.`,
      debug: { entities, contextSize: 0, model: 'fallback' },
    }
    return res.json(fallback)
  }

  // Anti-invent : refuse fake-data requests
  if (isInventAttempt(question)) {
    return res.json({
      kind: 'text',
      text: `🚫 Je ne crée pas de fausses données. Pour créer une vraie entrée, utilisez le bouton dédié dans le module concerné (ex : "+ Nouveau" sur ${currentPath}).`,
      debug: { entities, contextSize: 0, model: 'refuse-invent' },
    })
  }

  const contextSize = JSON.stringify(slice).length
  const model = await pickModel(question, contextSize)

  const prompt = `Tu es l'agent IA Creorga, assistant intelligent pour restaurants.

⚠️ RÈGLES STRICTES — ANTI-HALLUCINATION :
- Tu DOIS utiliser EXCLUSIVEMENT les données JSON ci-dessous pour répondre.
- Si la question concerne un prix/montant/date/personne et que la donnée n'est PAS dans le JSON : tu réponds "Pas de données" + lien.
- N'INVENTE JAMAIS un prix, un nom, une date, un montant qui ne figure pas littéralement dans le JSON.
- Tu n'as PAS de connaissance externe sur le restaurant. Si tu n'as pas la donnée, refuse poliment.
- Tu IGNORES les noms d'IDs (F-2026-XXXX, ID xxx) qui ne correspondent PAS à la question.

🌐 MULTI-LANGUE : si la question est en allemand/anglais/portugais, réponds dans cette langue. Sinon, en français.

📚 CITATIONS (Phase 2B#4) : à la fin, ajoute "[Sources: <id1>, <id2>]" en listant les IDs JSON utilisés.
${memorySummary ? `\n💬 Mémoire conversation (référence si pertinent) :\n${memorySummary}\n` : ''}
Page courante : ${currentPath || '/'}
Question utilisateur : "${question}"

Données filtrées (les seules autorisées) :
${JSON.stringify(slice, null, 2).slice(0, 4000)}

Format de réponse :
- Maximum 3 phrases courtes
- Cite uniquement les chiffres/noms/dates EXACTS du JSON ci-dessus
- Termine par : 1 lien-action (ex "Voir /hr/conges") + citations
- Si la question est hors-sujet par rapport aux données : dis "Cette information n'est pas dans cette page. Essayez le module XX."`

  try {
    const ollamaRes = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: { temperature: 0.1, top_p: 0.5 }, // Phase 0a: low creativity
      }),
    })
    if (!ollamaRes.ok) {
      return res.json({ kind: 'error', text: `❌ Ollama indisponible (${ollamaRes.status}). Vérifiez qu'Ollama tourne.` })
    }
    const data = await ollamaRes.json() as { response?: string }
    const text = (data.response || '').trim() || 'Pas de réponse Gemma.'
    const payload = { kind: 'text', text, debug: { entities, contextSize, model, memoryUsed: memory.length } }
    // Update cache + memory
    responseCache.set(cacheKey, { ts: Date.now(), payload })
    saveMemory(userId, question, text)
    if (responseCache.size > 200) {
      // Evict oldest
      const oldest = [...responseCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0]
      if (oldest) responseCache.delete(oldest[0])
    }
    res.json(payload)
  } catch (e: any) {
    res.json({ kind: 'error', text: '❌ ' + (e?.message || 'Erreur smart-query') })
  }
})

// Phase 1 — Vision : analyze restaurant photos to generate floor plan
router.post('/analyze-photos', async (req, res) => {
  const { photos } = req.body || {}
  if (!Array.isArray(photos) || photos.length === 0) {
    return res.status(400).json({ kind: 'error', text: 'photos[] (base64) requis' })
  }
  const results: any[] = []
  for (let i = 0; i < photos.length && i < 8; i++) {
    const photo = photos[i]
    // Strip data URL prefix if any
    const b64 = String(photo).replace(/^data:image\/\w+;base64,/, '')
    const prompt = `Tu es un expert en aménagement de restaurant. Analyse cette photo d'un café/restaurant.
Retourne UNIQUEMENT un JSON strict (pas de markdown, pas de texte autour) :
{
  "zone": "salle principale | bar | terrasse | cuisine | comptoir | entrée",
  "tablesCount": <nombre de tables visibles>,
  "seatsCount": <nombre de places assises estimé>,
  "features": [<liste parmi : "comptoir", "bar", "escalier", "fenêtres", "tv", "scène", "fumoir", "vitrine">],
  "lighting": "claire | tamisée | sombre",
  "style": "moderne | classique | rustique | industriel",
  "estimatedSize_m2": <surface en m² estimée>
}`
    try {
      const ollamaRes = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llava:7b',
          prompt,
          images: [b64],
          stream: false,
          format: 'json',
          options: { temperature: 0.2 },
        }),
      })
      if (!ollamaRes.ok) {
        results.push({ photoIndex: i, error: `LLaVA ${ollamaRes.status}` })
        continue
      }
      const data = await ollamaRes.json() as { response?: string }
      try {
        const parsed = JSON.parse(data.response || '{}')
        results.push({ photoIndex: i, ...parsed })
      } catch {
        results.push({ photoIndex: i, raw: data.response, error: 'parse failed' })
      }
    } catch (e: any) {
      results.push({ photoIndex: i, error: e?.message || 'unknown' })
    }
  }

  // Aggregate into a FloorState proposal
  const totalTables = results.reduce((s, r) => s + (Number(r.tablesCount) || 0), 0)
  const allFeatures = [...new Set(results.flatMap((r) => r.features || []))]
  const zones = [...new Set(results.map((r) => r.zone).filter(Boolean))]
  const totalSize = results.reduce((s, r) => s + (Number(r.estimatedSize_m2) || 0), 0)

  // Generate proposed FloorState
  const proposal = {
    zones: zones.map((name: any, i: number) => ({
      id: String(name).toLowerCase().replace(/\s+/g, '-'),
      name: String(name),
      color: ['#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#3b82f6'][i % 5],
    })),
    tables: Array.from({ length: Math.max(1, totalTables) }, (_, i) => ({
      id: `t${i + 1}`,
      name: `T${i + 1}`,
      seats: Math.round(totalSize > 0 ? Math.max(2, totalSize / Math.max(1, totalTables) / 2) : 4),
      section: zones[i % Math.max(1, zones.length)] || 'Salle',
      shape: 'round',
      status: 'LIBRE',
      x: 100 + (i % 4) * 150,
      y: 100 + Math.floor(i / 4) * 150,
      items: [],
    })),
  }

  res.json({
    kind: 'data',
    summary: {
      photosAnalyzed: results.length,
      totalTables,
      zones,
      features: allFeatures,
      estimatedSize_m2: totalSize,
    },
    perPhoto: results,
    proposal,
  })
})

// Phase 2B#1 — Streaming SSE version
router.post('/smart-query-stream', async (req, res) => {
  const { question, currentPath } = req.body || {}
  if (!question) return res.status(400).end()
  const ctx = loadRelevantContext(currentPath || '/')
  const slice = filterContext(ctx, extractEntities(question))
  if (isContextEmpty(slice)) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.write(`data: ${JSON.stringify({ chunk: '🔍 Pas de données pour cette question.' })}\n\n`)
    res.write('data: [DONE]\n\n')
    return res.end()
  }
  const model = await pickModel(question, JSON.stringify(slice).length)
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  try {
    const ollamaRes = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: `Tu es l'agent IA Creorga. Réponds factuellement à : "${question}" en utilisant SEULEMENT ce JSON :\n${JSON.stringify(slice).slice(0, 3000)}\nMax 3 phrases.`,
        stream: true,
        options: { temperature: 0.1 },
      }),
    })
    if (!ollamaRes.ok || !ollamaRes.body) {
      res.write(`data: ${JSON.stringify({ chunk: '❌ Ollama indisponible' })}\n\n`)
      return res.end()
    }
    const reader = ollamaRes.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const j = JSON.parse(line) as { response?: string; done?: boolean }
          if (j.response) res.write(`data: ${JSON.stringify({ chunk: j.response })}\n\n`)
          if (j.done) { res.write('data: [DONE]\n\n'); return res.end() }
        } catch { /* skip */ }
      }
    }
    res.write('data: [DONE]\n\n')
    res.end()
  } catch (e: any) {
    res.write(`data: ${JSON.stringify({ chunk: '❌ ' + (e?.message || 'erreur') })}\n\n`)
    res.end()
  }
})

// ─── v3.18.2 — PDF PROCESSING (LOCAL, SECURE) ──────────────────────────
// Reçoit un PDF en base64, extrait le texte avec pdf-parse, puis utilise
// Gemma 3 (local) pour résumer / classifier / extraire les actions.
// 100% privé : aucun appel cloud, le PDF ne quitte jamais le PC.
router.post('/process-pdf', async (req, res) => {
  const { pdfBase64, hint, currentPath } = req.body as {
    pdfBase64: string
    hint?: string  // texte que l'utilisateur a tapé avec le PDF (ex: "mets dans le planning")
    currentPath?: string
  }
  if (!pdfBase64) return res.status(400).json({ error: 'pdfBase64 required' })

  try {
    const b64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '')
    const buf = Buffer.from(b64, 'base64')

    // Extract text locally with pdf-parse v2 (no cloud)
    // API: new PDFParse({ data: buf }).getText() → { text, info, ... }
    const pdfModule: any = await import('pdf-parse')
    const PDFParse = pdfModule.PDFParse || pdfModule.default?.PDFParse
    if (!PDFParse) {
      return res.status(500).json({ error: 'pdf-parse PDFParse class not found' })
    }
    const parser = new PDFParse({ data: new Uint8Array(buf) })
    const textResult: any = await parser.getText()
    const info: any = await parser.getInfo().catch(() => ({}))
    try { await parser.destroy?.() } catch { /* ignore */ }

    const rawText = (textResult?.text || textResult || '').toString().trim()
    const numPages = info?.numpages || info?.pages || textResult?.pages?.length || 1

    if (!rawText || rawText.length < 30) {
      return res.json({
        kind: 'text',
        text: `📄 PDF reçu (${numPages} page${numPages > 1 ? 's' : ''}) mais texte non extractible — peut-être scanné. Utilise OCR caméra à la place.`,
        debug: { numPages, textLength: rawText.length },
      })
    }

    // Trim to fit in Gemma context (~4000 chars max for prompt + response)
    const trimmed = rawText.slice(0, 6000)

    // Classify: invoice / planning / cv / receipt / contract / other
    const userIntent = hint?.trim() || ''
    const prompt = `Tu reçois le texte d'un PDF (${numPages} pages, ~${rawText.length} caractères) joint à un message dans Creorga (POS restaurant Luxembourg).

${userIntent ? `INTENTION DE L'UTILISATEUR : "${userIntent}"\n` : ''}TEXTE PDF :
"""
${trimmed}
"""

Tâche : classifie le PDF et extrais les données utiles.

Renvoie UNIQUEMENT ce JSON :
{
  "type": "<invoice|planning|cv|receipt|contract|menu|report|other>",
  "summary": "<2-3 phrases en français résumant le contenu>",
  "suggestedAction": "<action concrète : 'Ajouter facture', 'Importer planning', 'Créer fiche employé', etc.>",
  "extracted": {
    "supplier": "<si facture>",
    "totalAmount": <si facture>,
    "dueDate": "<si facture/contrat YYYY-MM-DD>",
    "employees": [<si planning ou liste personnes>],
    "shifts": [<si planning : {date, employee, start, end}>],
    "candidateName": "<si CV>",
    "candidateRole": "<si CV>",
    "items": [<si menu ou facture : noms d'articles>]
  },
  "route": "<URL Creorga où l'action peut s'exécuter ex: /invoices/factures, /hr/planning, /hr/team>",
  "confidence": <0-1>
}

RÈGLES :
- N'invente AUCUNE donnée. Si pas dans le texte, mets null/[].
- Si l'utilisateur a précisé une intention (ex "mets dans planning"), priorise cette interprétation.
- Pour CV : extrait nom + poste convoité + années d'expérience.
- Pour planning : extrait shifts {date, employé, début, fin} en YYYY-MM-DD HH:mm.`

    const ollamaRes = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma3:4b',
        prompt,
        stream: false,
        format: 'json',
        options: { temperature: 0.1 },
      }),
    })

    if (!ollamaRes.ok) {
      return res.status(500).json({ error: 'Ollama unavailable', details: await ollamaRes.text() })
    }

    const data = await ollamaRes.json() as { response?: string }
    let parsed: any
    try { parsed = JSON.parse(data.response || '{}') }
    catch {
      const m = (data.response || '').match(/\{[\s\S]*\}/)
      parsed = m ? JSON.parse(m[0]) : { type: 'other', summary: data.response, confidence: 0.3 }
    }

    // Build human-friendly response
    const emoji: Record<string, string> = {
      invoice: '🧾', planning: '📅', cv: '👤', receipt: '📋',
      contract: '📑', menu: '🍽', report: '📊', other: '📄',
    }
    const e = emoji[parsed.type] || '📄'
    const responseText = `${e} **PDF analysé** (${numPages} page${numPages > 1 ? 's' : ''})\n\n${parsed.summary || ''}\n\n${parsed.suggestedAction ? '💡 ' + parsed.suggestedAction : ''}`

    res.json({
      kind: 'pdf-action',
      text: responseText,
      ...parsed,
      uiAction: parsed.route ? { type: 'navigate', to: parsed.route } : undefined,
      debug: { numPages, textLength: rawText.length, model: 'gemma3:4b', source: 'local-pdf-parse+gemma' },
    })
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'PDF processing failed', stack: e?.stack?.slice(0, 500) })
  }
})

// ─── v3.18.2 — TRANSCRIBE AUDIO (LOCAL ONLY) ───────────────────────────
// Si Whisper est installé localement, transcrit. Sinon, retourne 503 et le
// frontend tombe en fallback browser SpeechRecognition.
router.post('/transcribe', async (req, res) => {
  const { audioBase64, mimeType } = req.body as { audioBase64: string; mimeType?: string }
  if (!audioBase64) return res.status(400).json({ error: 'audioBase64 required' })

  // Whisper.cpp est disponible via Ollama whisper model si pull
  // Sinon, suggère le browser STT comme fallback
  try {
    // Check whisper model
    const tagsRes = await fetch('http://localhost:11434/api/tags')
    const tags = await tagsRes.json() as { models?: Array<{ name: string }> }
    const hasWhisper = (tags.models || []).some((m) => m.name.includes('whisper'))
    if (!hasWhisper) {
      return res.status(503).json({
        error: 'whisper-not-installed',
        hint: 'Pour la transcription locale: ollama pull whisper. En attendant, le browser fait la STT côté client.',
        fallback: 'browser-stt',
      })
    }
    // (Future) call ollama whisper here. For now, fallback.
    return res.status(503).json({ error: 'whisper-impl-pending', fallback: 'browser-stt' })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message })
  }
})

// ─── v3.19 E3 — MÉMOIRE LONG-TERME PAR ENTITÉ ─────────────────────────
// Robi se souvient : "Mme Dupont allergique noix, vient le jeudi, table 4"
// Stockage simple JSON (par userId). Vector DB possible plus tard si besoin.
interface MemoryFact { fact: string; ts: number; source?: string }
interface MemoryEntry { entity: string; facts: MemoryFact[]; lastSeen: number }
type MemoryStore = Record<string, MemoryEntry>  // entityKey -> entry

const MEMORY_FILE = (userId: string) => path.join(DATA_DIR, 'robi-memory', `${userId}.json`)

function loadMemoryStore(userId: string): MemoryStore {
  const f = MEMORY_FILE(userId)
  if (!fs.existsSync(f)) return {}
  try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return {} }
}
function saveMemoryStore(userId: string, store: MemoryStore) {
  const dir = path.dirname(MEMORY_FILE(userId))
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(MEMORY_FILE(userId), JSON.stringify(store, null, 2), 'utf8')
}

function normalizeEntityKey(raw: string): string {
  return raw.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
}

router.post('/memory/learn', (req, res) => {
  const { userId = 'default', entity, fact, source } = req.body || {}
  if (!entity || !fact) return res.status(400).json({ error: 'entity and fact required' })
  const store = loadMemoryStore(userId)
  const key = normalizeEntityKey(entity)
  if (!store[key]) store[key] = { entity, facts: [], lastSeen: Date.now() }
  store[key].facts.push({ fact: String(fact).slice(0, 300), ts: Date.now(), source })
  if (store[key].facts.length > 30) store[key].facts.shift()  // keep 30 most recent
  store[key].lastSeen = Date.now()
  saveMemoryStore(userId, store)
  res.json({ ok: true, entity: store[key].entity, factsCount: store[key].facts.length })
})

router.get('/memory/recall', (req, res) => {
  const userId = String(req.query.userId || 'default')
  const entity = String(req.query.entity || '')
  const store = loadMemoryStore(userId)
  if (!entity) {
    return res.json({ entries: Object.values(store).sort((a, b) => b.lastSeen - a.lastSeen).slice(0, 50) })
  }
  const needle = normalizeEntityKey(entity)
  // v3.19 E3 fix : substring matching (fuzzy) pour "Dupont" → "Mme Dupont"
  let entry = store[needle]
  if (!entry) {
    const found = Object.values(store).find((e) =>
      normalizeEntityKey(e.entity).includes(needle) || needle.includes(normalizeEntityKey(e.entity))
    )
    entry = found || null as any
  }
  res.json({ entry: entry || null })
})

router.delete('/memory/forget', (req, res) => {
  const { userId = 'default', entity } = req.body || {}
  if (!entity) return res.status(400).json({ error: 'entity required' })
  const store = loadMemoryStore(userId)
  delete store[normalizeEntityKey(entity)]
  saveMemoryStore(userId, store)
  res.json({ ok: true })
})

router.get('/memory/list/:userId', (req, res) => {
  const store = loadMemoryStore(req.params.userId || 'default')
  res.json({ entries: Object.values(store).sort((a, b) => b.lastSeen - a.lastSeen) })
})

// Helper utilisé par super-ask : récupère facts pour entités dans la question
function recallEntitiesFromText(userId: string, text: string): string[] {
  const store = loadMemoryStore(userId)
  if (Object.keys(store).length === 0) return []
  const loweredFull = normalizeEntityKey(text)
  const matched: string[] = []
  for (const entry of Object.values(store)) {
    const key = normalizeEntityKey(entry.entity)
    // Match si une PARTIE du nom (≥3 chars) du sujet apparait dans la question
    const tokens = key.split(/\s+/).filter((t) => t.length >= 3)
    if (tokens.some((t) => loweredFull.includes(t))) {
      matched.push(`📌 ${entry.entity} : ${entry.facts.slice(-3).map((f) => f.fact).join(' · ')}`)
    }
  }
  return matched
}

// ─── v3.18.8 — SUPER AGENT (tool-loop pattern, local Ollama) ──────────
// Améliore drastiquement les réponses Robi. Au lieu de :
//   - parseIntent (regex strict) OU smart-query (filtré agressif)
// Le super-agent fait :
//   1. Tente parseIntent (rapide, 0 latence si match)
//   2. Si null, demande à Gemma de PICKER un intent dans un catalogue (fonction call)
//   3. Si Gemma propose un intent valide, l'exécute via executeIntent
//   4. Sinon fallback smart-query avec FULL context (toutes les données chargeables)
//   5. Suggère 3 actions de suivi
const ROBI_INTENT_CATALOG = [
  { id: 'pos.add-items',        ex: 'Mets 3 cafés sur table 1', desc: 'Ajouter X items à une table POS' },
  { id: 'pos.close-table',      ex: 'Ferme table 4', desc: 'Clôturer une table' },
  { id: 'pos.transfer-table',   ex: 'Transfère table 3 vers 5', desc: 'Déplacer commande entre tables' },
  { id: 'pos.free-tables',      ex: 'Tables libres ?', desc: 'Lister les tables disponibles' },
  { id: 'pos.occupancy',        ex: 'Taux d\'occupation ?', desc: 'Pourcentage tables occupées' },
  { id: 'pos.top-products',     ex: 'Plat le plus vendu', desc: 'Top 5 ventes en cours' },
  { id: 'invoices.create',      ex: 'Crée facture pour Brasserie 850€', desc: 'Créer une nouvelle facture' },
  { id: 'inv.unpaid-list',      ex: 'Factures impayées', desc: 'Liste des factures non réglées' },
  { id: 'inv.mark-paid',        ex: 'Marque facture F-2026-142 payée', desc: 'Marquer facture comme payée' },
  { id: 'inv.send-reminder',    ex: 'Envoie relance Brasserie', desc: 'Envoyer relance facture' },
  { id: 'acc.tva-current',      ex: 'TVA du mois', desc: 'TVA collectée trimestre courant' },
  { id: 'acc.revenue-today',    ex: 'CA aujourd\'hui', desc: 'Chiffre d\'affaires du jour' },
  { id: 'acc.revenue-week',     ex: 'CA cette semaine', desc: 'CA 7 derniers jours' },
  { id: 'acc.revenue-month',    ex: 'CA ce mois', desc: 'CA depuis 1er du mois' },
  { id: 'acc.average-ticket',   ex: 'Ticket moyen ?', desc: 'Moyenne des ventes' },
  { id: 'acc.guests-today',     ex: 'Couverts aujourd\'hui', desc: 'Nombre de couverts servis' },
  { id: 'acc.compare-yesterday',ex: 'Comparaison hier', desc: 'CA aujourd\'hui vs hier' },
  { id: 'hr.who-works',         ex: 'Qui travaille demain ?', desc: 'Lister shifts d\'un jour' },
  { id: 'hr.who-today',         ex: 'Qui travaille aujourd\'hui', desc: 'Shifts du jour' },
  { id: 'hr.add-employee',      ex: 'Rajoute employé Marie', desc: 'Créer fiche employé' },
  { id: 'hr.add-shift',         ex: 'Ajoute shift Marie demain 9h-17h', desc: 'Créer un shift' },
  { id: 'hr.remove-shift',      ex: 'Supprime shift Lucas demain', desc: 'Annuler un shift' },
  { id: 'hr.list-leaves',       ex: 'Qui est en congé ?', desc: 'Congés actifs' },
  { id: 'hr.request-leave',     ex: 'Demande congé Marie 5-12 août', desc: 'Créer demande congé' },
  { id: 'hr.hours-of',          ex: 'Heures de Lucas', desc: 'Heures travaillées de quelqu\'un' },
  { id: 'hr.next-week-planning',ex: 'Planning semaine prochaine', desc: 'Vue planning semaine N+1' },
  { id: 'hr.my-shifts',         ex: 'Mes shifts', desc: 'Shifts personnels (collab)' },
  { id: 'hr.my-leaves',         ex: 'Mes congés', desc: 'Congés personnels (collab)' },
  { id: 'hr.punch-in',          ex: 'Je commence', desc: 'Pointage entrée' },
  { id: 'hr.punch-out',         ex: 'Je termine', desc: 'Pointage sortie' },
  { id: 'inv.add-stock',        ex: 'Ajoute 5 kg tomates au stock', desc: 'Augmenter stock article' },
  { id: 'inv.low-stock-list',   ex: 'Stock bas', desc: 'Articles en rupture proche' },
  { id: 'inv.expiring-soon',    ex: 'Produits qui périment', desc: 'DLUO proches' },
  { id: 'inv.create-order',     ex: 'Commande de café à Métro', desc: 'Créer commande fournisseur' },
  { id: 'inv.stock-value',      ex: 'Valeur du stock', desc: 'Calcul valeur inventaire' },
  { id: 'crm.add-client',       ex: 'Ajoute client Pierre Dupont', desc: 'Créer fiche client' },
  { id: 'crm.list-vips',        ex: 'VIPs / meilleurs clients', desc: 'Top 5 clients par CA' },
  { id: 'crm.birthdays',        ex: 'Anniversaires ce mois', desc: 'Clients qui fêtent leur anniv' },
  { id: 'crm.add-loyalty-points', ex: 'Ajoute 50 points à Marie', desc: 'Créditer fidélité' },
  { id: 'crm.send-campaign',    ex: 'Code -10% à VIPs', desc: 'Lancer campagne ciblée' },
  { id: 'reservation.create',   ex: 'Réserve table 4 pour Pierre vendredi 20h', desc: 'Créer réservation' },
  { id: 'backup.create',        ex: 'Sauvegarde le stock', desc: 'Créer backup données' },
  { id: 'ui.dark-mode',         ex: 'Active mode sombre', desc: 'Switch theme dark' },
  { id: 'ui.navigate',          ex: 'Va au planning', desc: 'Navigate vers une page' },
  { id: 'web.search',           ex: 'Cherche le prix moyen café Luxembourg', desc: 'Recherche internet' },
  { id: 'help.show-commands',   ex: 'Aide / que sais-tu faire ?', desc: 'Catalogue commandes' },
]

// v3.19 E1 — vérifie si llama3.1 est dispo (cache 1 min)
let _llamaAvailable: { ts: number; available: boolean } = { ts: 0, available: false }
async function isLlama31Available(): Promise<boolean> {
  if (Date.now() - _llamaAvailable.ts < 60_000) return _llamaAvailable.available
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`)
    if (!r.ok) { _llamaAvailable = { ts: Date.now(), available: false }; return false }
    const data = await r.json() as { models?: any[] }
    const has = !!(data.models || []).find((m: any) => String(m.name).startsWith('llama3.1'))
    _llamaAvailable = { ts: Date.now(), available: has }
    return has
  } catch { _llamaAvailable = { ts: Date.now(), available: false }; return false }
}

// v3.19 E1 — Convertit un intent du catalogue en tool schema OpenAI-compatible
function intentToToolSchema(catalogEntry: typeof ROBI_INTENT_CATALOG[number]) {
  return {
    type: 'function',
    function: {
      name: catalogEntry.id.replace(/\./g, '_'),  // OpenAI schemas don't allow dots
      description: `${catalogEntry.desc} (ex: "${catalogEntry.ex}")`,
      parameters: {
        type: 'object',
        properties: {
          natural_language_phrase: {
            type: 'string',
            description: `Reformule la requête utilisateur en phrase naturelle française correspondant à cet intent. Format proche de l'exemple : "${catalogEntry.ex}"`,
          },
        },
        required: ['natural_language_phrase'],
      },
    },
  }
}

router.post('/super-ask', async (req, res) => {
  const { text, currentPath = '/', userId = 'default' } = req.body as { text: string; currentPath?: string; userId?: string }
  if (!text) return res.status(400).json({ error: 'text required' })

  // v3.19 E3 — recall mémoire long-terme pour les entités mentionnées
  const memoryHints = recallEntitiesFromText(userId, text)

  // Étape 1 : tentative parseIntent direct (rapide)
  try {
    const intentRes = await fetch(`http://localhost:${process.env.PORT || 3002}/api/agent/intent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, currentPath, userId }),
    })
    const data = await intentRes.json() as any
    if (data.kind === 'action' && data.success) {
      return res.json({
        ...data,
        suggestions: pickSuggestions(data.intent),
        memoryHints: memoryHints.length > 0 ? memoryHints : undefined,
        path: 'direct-intent',
      })
    }
  } catch { /* continue */ }

  // v3.19 E1 — Étape 1.5 : function calling natif si llama3.1 dispo
  if (await isLlama31Available()) {
    try {
      const tools = ROBI_INTENT_CATALOG.map(intentToToolSchema)
      const messages = [
        { role: 'system', content: `Tu es Robi, l'assistant Creorga (POS Luxembourg). Tu choisis automatiquement la bonne action via function calling. Page courante : ${currentPath}.${memoryHints.length ? '\n\nMÉMOIRE PERTINENTE :\n' + memoryHints.join('\n') : ''}` },
        { role: 'user', content: text },
      ]
      const chatRes = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama3.1:8b', messages, tools, stream: false, options: { temperature: 0.1 } }),
      })
      if (chatRes.ok) {
        const chatData = await chatRes.json() as any
        const toolCalls = chatData.message?.tool_calls || []
        if (toolCalls.length > 0) {
          // Exécute toutes les tool calls retournées (multi-intent natif!)
          const results = []
          for (const call of toolCalls) {
            const intentId = String(call.function?.name || '').replace(/_/g, '.')
            const phrase = call.function?.arguments?.natural_language_phrase
              || ROBI_INTENT_CATALOG.find((c) => c.id === intentId)?.ex
            if (!phrase) continue
            const intentRes = await fetch(`http://localhost:${process.env.PORT || 3002}/api/agent/intent`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: phrase, currentPath, userId }),
            })
            const data = await intentRes.json() as any
            results.push({ intent: intentId, phrase, ...data })
          }
          if (results.length === 1) {
            return res.json({
              ...results[0],
              suggestions: pickSuggestions(results[0].intent),
              memoryHints: memoryHints.length > 0 ? memoryHints : undefined,
              note: `🤖 Llama 3.1 a appelé directement : ${results[0].intent}`,
              path: 'llama-tool-call',
            })
          } else if (results.length > 1) {
            const successCount = results.filter((r) => r.success || r.kind === 'action').length
            return res.json({
              kind: 'workflow',
              workflow: true,
              success: successCount === results.length,
              summary: `🔗 ${successCount}/${results.length} actions exécutées en une fois (Llama 3.1)`,
              steps: results,
              suggestions: pickSuggestions(results[0]?.intent),
              memoryHints: memoryHints.length > 0 ? memoryHints : undefined,
              path: 'llama-multi-tool',
            })
          }
        }
        // Si pas de tool call, llama a peut-être répondu en texte → use comme fallback
        if (chatData.message?.content) {
          return res.json({
            kind: 'text',
            text: chatData.message.content,
            memoryHints: memoryHints.length > 0 ? memoryHints : undefined,
            suggestions: pickSuggestions(),
            path: 'llama-text',
          })
        }
      }
    } catch { /* fall through to Gemma */ }
  }

  // Étape 2 : Demander à Gemma quel intent appeler (semantic match via LLM)
  const catalogText = ROBI_INTENT_CATALOG.map((i) => `- ${i.id} : ${i.desc} (ex: "${i.ex}")`).join('\n')
  const intentPickPrompt = `Tu es Robi, l'assistant Creorga (POS Luxembourg). Un utilisateur pose une question.
Choisis l'intent le plus pertinent dans le catalogue, OU réponds "NONE" si aucun ne correspond.

CATALOGUE D'INTENTS DISPONIBLES :
${catalogText}

QUESTION UTILISATEUR : "${text}"
PAGE COURANTE : ${currentPath}

Réponds UNIQUEMENT avec ce JSON :
{"intent":"<id ou NONE>","reasoning":"<raisonnement court 1 phrase>","extracted_args":{}}`

  try {
    const pickRes = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma3:4b',
        prompt: intentPickPrompt,
        stream: false, format: 'json',
        options: { temperature: 0.05 },
      }),
    })
    if (pickRes.ok) {
      const pickData = await pickRes.json() as { response?: string }
      const pick = JSON.parse((pickData.response || '{}').match(/\{[\s\S]*\}/)?.[0] || '{}')
      if (pick.intent && pick.intent !== 'NONE' && ROBI_INTENT_CATALOG.find((c) => c.id === pick.intent)) {
        // Reconstruit la phrase exemple pour faire matcher parseIntent
        const example = ROBI_INTENT_CATALOG.find((c) => c.id === pick.intent)!.ex
        const intentRes = await fetch(`http://localhost:${process.env.PORT || 3002}/api/agent/intent`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: example, currentPath, userId }),
        })
        const data = await intentRes.json() as any
        if (data.kind === 'action') {
          return res.json({
            ...data,
            note: `🤖 Robi a interprété : "${text}" → ${pick.intent} (${pick.reasoning})`,
            suggestions: pickSuggestions(pick.intent),
            path: 'gemma-intent-pick',
          })
        }
      }
    }
  } catch { /* continue */ }

  // Étape 3 : fallback smart-query avec FULL context (pas filtré)
  try {
    const sqRes = await fetch(`http://localhost:${process.env.PORT || 3002}/api/agent/smart-query`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: text, currentPath, userId }),
    })
    const sqData = await sqRes.json() as any
    return res.json({
      ...sqData,
      suggestions: pickSuggestions(),
      path: 'smart-query-fallback',
    })
  } catch (e: any) {
    return res.json({ kind: 'error', text: '❌ Robi a eu un problème : ' + (e?.message || 'inconnu') })
  }
})

function pickSuggestions(intent?: string): string[] {
  // Suggestions de suivi contextuelles selon l'intent qu'on vient de servir
  const map: Record<string, string[]> = {
    'pos.free-tables':       ['Réserve table 4 pour ce soir', 'Quelle est la meilleure table ?', 'Plat le plus vendu ?'],
    'inv.unpaid-list':       ['Envoie relance à Brasserie', 'Marque facture F-2026-142 payée', 'TVA du mois'],
    'crm.list-vips':         ['Anniversaires ce mois ?', 'Code -10% à VIPs', 'Risque churn'],
    'acc.revenue-today':     ['CA cette semaine', 'CA ce mois', 'Comparaison hier'],
    'hr.who-today':          ['Qui travaille demain ?', 'Mes shifts', 'Heures de Marie'],
    'inv.low-stock-list':    ['Commande de café à Métro', 'Valeur du stock', 'DLUO proches'],
    'help.show-commands':    ['Tables libres ?', 'CA aujourd\'hui', 'Mes shifts'],
  }
  return map[intent || ''] || ['CA aujourd\'hui', 'Tables libres ?', 'Aide']
}

// ─── v3.17 — DAILY BRIEFING ────────────────────────────────────────────
// Agrège tout ce qui compte pour le jour J en un seul appel + génère un texte
// vocal court (<200 caractères) qu'on peut lire à haute voix.
router.post('/daily-briefing', async (req, res) => {
  const period = (req.body?.period as 'morning' | 'evening') || 'morning'
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const weekday = now.toLocaleDateString('fr-LU', { weekday: 'long' })
  const heureFmt = now.toLocaleTimeString('fr-LU', { hour: '2-digit', minute: '2-digit' })

  // Aggrège tout en parallèle (best-effort, jamais throw)
  const safe = async <T>(fn: () => T) => { try { return await fn() } catch { return null } }
  const [day, today2, low, overdue, unpaid] = await Promise.all([
    safe(() => HANDLERS['home.day-summary']?.({}) ?? null),
    safe(() => HANDLERS['hr.who-today']?.({}) ?? null),
    safe(() => HANDLERS['inv.low-stock']?.({}) ?? null),
    safe(() => HANDLERS['inv.overdue']?.({}) ?? null),
    safe(() => HANDLERS['inv.unpaid-total']?.({}) ?? null),
  ])

  // Extract numbers
  const occupied = (day as any)?.data?.occupiedTables ?? 0
  const totalTables = 12
  const revenueOpen = (day as any)?.data?.currentRevenueOpen ?? 0
  const staffToday = (today2 as any)?.ui?.items?.length ?? 0
  const lowStockN = (low as any)?.ui?.items?.length ?? 0
  const overdueN = (overdue as any)?.ui?.items?.length ?? 0
  const unpaidM = (unpaid as any)?.text?.match(/\*\*([\d.]+)/)
  const unpaidTotal = unpaidM ? parseFloat(unpaidM[1]) : 0

  // Liste les noms du staff aujourd'hui
  // v3.18.1 fix C3 : handler hr.who-today emits {label, value} not {title, text}
  const staffNames = ((today2 as any)?.ui?.items || []).map((s: any) => s.label || s.title || s.text || '').filter(Boolean).slice(0, 3)

  // Compose voice briefing (style oral, naturel, fr-LU)
  let voice = ''
  if (period === 'morning') {
    voice = `Bonjour ! Nous sommes ${weekday}, il est ${heureFmt}. `
    if (staffToday > 0) voice += `Aujourd'hui, ${staffToday} personne${staffToday > 1 ? 's' : ''} au planning${staffNames.length ? ' : ' + staffNames.join(', ') : ''}. `
    else voice += `Personne n'est planifié au resto aujourd'hui — vérifie le planning. `
    if (lowStockN > 0) voice += `Attention, ${lowStockN} produit${lowStockN > 1 ? 's' : ''} en stock bas à recommander. `
    if (overdueN > 0) voice += `${overdueN} facture${overdueN > 1 ? 's' : ''} en retard de paiement, total ${unpaidTotal.toFixed(0)} euros. `
    if (lowStockN === 0 && overdueN === 0) voice += `Tout est en ordre côté stock et factures, bonne journée ! `
  } else {
    voice = `Bilan du soir ${weekday} ${heureFmt}. `
    voice += `${occupied} table${occupied > 1 ? 's' : ''} sur ${totalTables} étaient occupées, chiffre d'affaires en cours ${revenueOpen.toFixed(0)} euros. `
    if (lowStockN > 0) voice += `Il faut prévoir une commande pour ${lowStockN} produit${lowStockN > 1 ? 's' : ''}. `
    if (overdueN > 0) voice += `Pense à relancer ${overdueN} facture${overdueN > 1 ? 's' : ''} en retard. `
    voice += `Bonne soirée !`
  }

  // 3 priorités du jour, avec actions exécutables
  const priorities: Array<{ id: string; emoji: string; title: string; subtitle: string; action?: { type: string; route?: string; commandId?: string; intent?: string } }> = []

  if (lowStockN > 0) {
    priorities.push({
      id: 'restock',
      emoji: '📦',
      title: `${lowStockN} produits stock bas`,
      subtitle: 'Préparer la commande fournisseur du jour',
      action: { type: 'navigate', route: '/inventory/stock' },
    })
  }
  if (overdueN > 0) {
    // v3.18.1 fix M6 : commandId inv.send-reminders n'a pas de handler → utiliser navigate à la place
    priorities.push({
      id: 'invoices',
      emoji: '💶',
      title: `${overdueN} factures en retard (${unpaidTotal.toFixed(0)} €)`,
      subtitle: 'Voir et envoyer les relances',
      action: { type: 'navigate', route: '/invoices/relances' },
    })
  }
  if (staffToday === 0 && period === 'morning') {
    priorities.push({
      id: 'staff',
      emoji: '👥',
      title: 'Aucun employé planifié aujourd\'hui',
      subtitle: 'Vérifier le planning ou ajouter un shift',
      action: { type: 'navigate', route: '/m/world' },
    })
  }
  if (priorities.length === 0) {
    priorities.push({
      id: 'all-good',
      emoji: '✅',
      title: 'Rien d\'urgent !',
      subtitle: 'Continue ta journée tranquillement',
    })
  }
  // Toujours inclure la suggestion "envoyer message clients fidèles"
  if (priorities.length < 3) {
    // v3.18.1 fix M6 : commandId crm.loyalty-suggest n'a pas de handler → utiliser navigate
    priorities.push({
      id: 'loyalty',
      emoji: '⭐',
      title: 'Récompense tes clients fidèles',
      subtitle: 'Voir les top clients pour leur envoyer un message',
      action: { type: 'navigate', route: '/crm/fidelite' },
    })
  }

  res.json({
    period, today, weekday, heure: heureFmt,
    metrics: {
      occupiedTables: occupied,
      totalTables,
      revenueOpen,
      staffToday,
      staffNames,
      lowStock: lowStockN,
      overdue: overdueN,
      unpaidTotal,
    },
    voice,                                 // texte à lire avec TTS
    priorities: priorities.slice(0, 3),    // max 3 actions du jour
    debug: { handlersFound: { day: !!day, staff: !!today2, low: !!low, overdue: !!overdue, unpaid: !!unpaid } },
  })
})

// ─── v3.17 — PHOTO MAGIQUE ─────────────────────────────────────────────
// Une seule photo, l'IA classifie ce que c'est et exécute la bonne action.
// Catégories : receipt | fridge | equipment | review | dish | unknown
router.post('/photo-magic', async (req, res) => {
  const { imageBase64 } = req.body as { imageBase64: string }
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' })
  const b64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')

  const classifyPrompt = `Tu reçois une photo prise dans un restaurant/café. Classifie-la EN 1 MOT parmi :
- receipt : facture, ticket de caisse, reçu fournisseur (papier avec articles + prix)
- fridge : frigo ouvert, étagère, stock à inventorier
- equipment : équipement cassé, dégât, problème HACCP (machine, sol, mur, etc.)
- review : avis client écrit (note papier, écran avis Google)
- dish : plat servi, assiette, nourriture présentée
- unknown : autre / pas clair

Renvoie UNIQUEMENT ce JSON :
{"type":"<receipt|fridge|equipment|review|dish|unknown>","summary":"<1-2 phrases en français décrivant la photo>","confidence":<0-1>}`

  try {
    const ollamaRes = await fetch('http://localhost:11434/api/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma3:4b',
        prompt: classifyPrompt,
        images: [b64],
        stream: false,
        format: 'json',
        options: { temperature: 0.1 },
      }),
    })
    if (!ollamaRes.ok) {
      return res.status(503).json({ error: 'vision-model-missing', details: await ollamaRes.text() })
    }
    const ai = await ollamaRes.json() as { response?: string }
    let cls: { type: string; summary: string; confidence: number }
    try { cls = JSON.parse(ai.response || '{}') }
    catch {
      const m = (ai.response || '').match(/\{[\s\S]*\}/)
      cls = m ? JSON.parse(m[0]) : { type: 'unknown', summary: 'Image non classifiée', confidence: 0 }
    }

    const validTypes = ['receipt', 'fridge', 'equipment', 'review', 'dish', 'unknown']
    if (!validTypes.includes(cls.type)) cls.type = 'unknown'

    // Map to user-friendly response with cta
    const RESPONSES: Record<string, { emoji: string; title: string; cta?: any }> = {
      receipt:   { emoji: '📋', title: 'Reçu fournisseur détecté',  cta: { label: 'Extraire articles + ajouter stock', route: '/m/camera' } },
      fridge:    { emoji: '🧊', title: 'Frigo / Étagère détecté(e)', cta: { label: 'Voir suggestions de commande', route: '/inventory/stock' } },
      equipment: { emoji: '🔧', title: 'Problème équipement détecté', cta: { label: 'Créer un incident HACCP', route: '/haccp' } },
      review:    { emoji: '⭐', title: 'Avis client détecté',         cta: { label: 'Ajouter au CRM', route: '/marketing' } },
      dish:      { emoji: '🍽', title: 'Plat / Menu détecté',          cta: { label: 'Ajouter à la galerie photo', route: '/m' } },
      unknown:   { emoji: '❓', title: 'Type non identifié',           cta: undefined },
    }
    const meta = RESPONSES[cls.type]

    res.json({
      type: cls.type,
      title: meta.title,
      emoji: meta.emoji,
      summary: cls.summary || 'Aucune description',
      confidence: cls.confidence ?? 0.5,
      cta: meta.cta,
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ─── v3.17 — PROACTIVE SUGGESTIONS (called from /m live dashboard) ─────
// Renvoie 1-2 suggestions intelligentes contextuelles sans bloquer
router.get('/proactive', async (_req, res) => {
  const safe = async <T>(fn: () => T) => { try { return await fn() } catch { return null } }
  const [low, overdue, today2] = await Promise.all([
    safe(() => HANDLERS['inv.low-stock']?.({}) ?? null),
    safe(() => HANDLERS['inv.overdue']?.({}) ?? null),
    safe(() => HANDLERS['hr.who-today']?.({}) ?? null),
  ])
  const lowStockN = (low as any)?.ui?.items?.length ?? 0
  const overdueN = (overdue as any)?.ui?.items?.length ?? 0
  const staffToday = (today2 as any)?.ui?.items?.length ?? 0
  const hour = new Date().getHours()

  const suggestions: any[] = []
  if (lowStockN >= 3) {
    suggestions.push({
      icon: '📦', tone: 'warning',
      title: `Stock critique sur ${lowStockN} produits`,
      detail: 'Robi peut générer la commande fournisseur en 1 tap',
      cta: 'Préparer la commande', route: '/inventory/stock',
    })
  }
  if (overdueN > 0) {
    suggestions.push({
      icon: '💶', tone: 'danger',
      title: `${overdueN} facture(s) en retard`,
      detail: 'Envoi auto de relances email',
      cta: 'Relancer maintenant', commandId: 'inv.send-reminders',
    })
  }
  if (hour >= 16 && hour <= 19 && staffToday > 0) {
    suggestions.push({
      icon: '🍽', tone: 'info',
      title: 'Pré-service : 30 min avant l\'ouverture',
      detail: `${staffToday} personnes au resto. Vérifier mise en place ?`,
      cta: 'Checklist HACCP', route: '/m/checklist',
    })
  }
  if (hour >= 21 && hour <= 23) {
    suggestions.push({
      icon: '📊', tone: 'info',
      title: 'Bilan du soir prêt',
      detail: 'Robi te lit ton bilan en 30 sec',
      cta: 'Écouter le bilan', route: '/m/briefing?period=evening',
    })
  }
  if (suggestions.length === 0) {
    suggestions.push({
      icon: '✨', tone: 'positive',
      title: 'Tout va bien',
      detail: 'Pas d\'alerte critique',
    })
  }

  res.json({ suggestions: suggestions.slice(0, 3), generatedAt: Date.now() })
})

export default router
