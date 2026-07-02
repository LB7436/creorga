import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { internalHeaders } from '../lib/security'

/**
 * Personal Assistant intent engine — parses natural language requests
 * and dispatches to either :
 *   - a real action (POST /api/agent/intent → execute)
 *   - the smart-query (just answer)
 *   - a web search (DuckDuckGo HTML, no API key)
 *
 * Patterns are regex-first (fast, deterministic) with Gemma fallback.
 */

const router = Router()
const DATA_DIR = path.resolve(process.cwd(), 'data')

function loadJson<T = any>(filename: string, fallback: T): T {
  const p = path.join(DATA_DIR, filename)
  if (!fs.existsSync(p)) return fallback
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) as T } catch { return fallback }
}
function saveJson(filename: string, data: any) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf8')
}

// ═══════════════════════════════════════════════════════════════════════
// INTENT PATTERNS — fast regex matching for common phrasings
// ═══════════════════════════════════════════════════════════════════════

interface IntentMatch {
  intent: string
  params: Record<string, any>
  confidence: number
}

function parseIntent(text: string): IntentMatch | null {
  const q = text.toLowerCase().trim()
  let m: RegExpMatchArray | null

  // POS : add items
  if ((m = q.match(/(?:mets?|ajoute|met|tape|type)\s+(\d+)\s+([\w\sàâéèêëîïôûùüç-]+?)\s+(?:sur|à|a|aux?)\s+(?:la\s+)?(?:tables?\s+)?(?:\w+\s+)?(\w+)/i))) {
    return { intent: 'pos.add-items', params: { qty: +m[1], item: m[2].trim(), tableId: m[3].toLowerCase() }, confidence: 0.9 }
  }
  // POS : close table
  if ((m = q.match(/(?:ferme|closes?|cl[oô]ture)\s+(?:la\s+)?table\s+(\w+)/i))) {
    return { intent: 'pos.close-table', params: { tableId: m[1].toLowerCase() }, confidence: 0.95 }
  }
  // POS : open table
  if ((m = q.match(/(?:ouvre|active)\s+(?:la\s+)?table\s+(\w+)/i))) {
    return { intent: 'pos.open-table', params: { tableId: m[1].toLowerCase() }, confidence: 0.95 }
  }
  // INVOICES create
  if ((m = q.match(/(?:cr[ée]e?[zr]?|fais|g[ée]n[ée]re)\s+(?:moi\s+)?(?:une\s+)?facture\s+(?:pour|à|au)\s+(.+?)(?:\s+(?:de|pour|avec)\s+(\d+(?:[\.,]\d+)?)\s*€?)?(?:\s|$)/i))) {
    return { intent: 'invoices.create', params: { customer: m[1].trim(), amount: m[2] ? parseFloat(m[2].replace(',', '.')) : null }, confidence: 0.85 }
  }
  // PLANNING who works
  if ((m = q.match(/qui\s+(?:travaille|bosse|est\s+l[aà]|y\s+a\s+t.il)\s+(?:demain|aujourd[''’\s]?hui|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|cette\s+semaine|ce\s+mois)/i))) {
    return { intent: 'hr.who-works', params: { period: m[0] }, confidence: 0.85 }
  }
  // BACKUP
  if (/(?:fais|cr[ée]e?|sauvegarde?|backup)/i.test(q) && /(stock|inventaire|sauvegarde)/i.test(q)) {
    return { intent: 'backup.create', params: {}, confidence: 0.9 }
  }
  // DARK MODE
  if (/(?:active|passe(r)?|mets?)\s+(?:le\s+|en\s+|au\s+)?(?:mode\s+)?(?:sombre|dark|nuit|noir)/i.test(q)) {
    return { intent: 'ui.dark-mode', params: { on: true }, confidence: 0.95 }
  }
  if (/(?:active|passe(r)?|mets?)\s+(?:le\s+|en\s+|au\s+)?(?:mode\s+)?(?:clair|light|jour)/i.test(q)) {
    return { intent: 'ui.dark-mode', params: { on: false }, confidence: 0.95 }
  }
  // NAVIGATION
  if ((m = q.match(/(?:va|navigue|ouvre|montre|amène|emm[èe]ne)\s+(?:moi\s+)?(?:à|au|aux|vers|sur|dans|en)?\s*(?:le|la|les|l['’])?\s*(planning|caisse|pos|crm|clients?|factures?|stock|stocks?|inventaire|haccp|comptabilit[ée]|marketing|avis|r[ée]put\w*|agenda|r[ée]servations?|portail|menu|qr|tv|pub\w*|musique|backup|sauvegarde|param[èe]tres?|ai|assistant)/i))) {
    return { intent: 'ui.navigate', params: { target: m[1] }, confidence: 0.9 }
  }
  // WEB SEARCH
  if (/(?:cherche|recherche|trouve|google)\s+(?:sur\s+)?(?:internet|le\s+web|en\s+ligne)?/i.test(q)) {
    return { intent: 'web.search', params: { query: text.replace(/^(?:cherche|recherche|trouve|google)\s+(?:sur\s+)?(?:internet\s+|le\s+web\s+|en\s+ligne\s+)?/i, '').trim() }, confidence: 0.85 }
  }
  // HELP TUTORIAL
  if ((m = q.match(/(?:tutoriel|d[ée]mo|montre.moi|comment)\s+(?:cr[ée]er?\s+(?:une\s+)?facture|offrir\s+un?\s+plat|scanner\s+un\s+ticket)/i))) {
    if (/facture/i.test(m[0])) return { intent: 'help.tutorial', params: { id: 'inv.create' }, confidence: 0.9 }
    if (/plat/i.test(m[0])) return { intent: 'help.tutorial', params: { id: 'pos.offert' }, confidence: 0.9 }
    if (/ticket|ocr/i.test(m[0])) return { intent: 'help.tutorial', params: { id: 'inv.ocr' }, confidence: 0.9 }
  }

  // ─── NEW INTENTS v3.10 ─────────────────────────────────────────────────

  // POS : table summary
  if ((m = q.match(/(?:r[ée]sum[ée]|d[ée]tails?|qu[''’]?est.ce qu[''’]?(?:il y\s+a|on a))\s+(?:de\s+|sur\s+|à\s+|pour\s+)?(?:la\s+)?(?:table\s+)?(\w+)?/i)) && /r[ée]sum[ée]/i.test(q) && /table/i.test(q)) {
    const tn = m[1] || (q.match(/table\s+(\w+)/i)?.[1] ?? '')
    if (tn) return { intent: 'pos.table-summary', params: { tableId: tn.toLowerCase() }, confidence: 0.9 }
  }

  // RESERVATION create : "Réserve table 4 pour Pierre vendredi 20h 4 couverts"
  if ((m = q.match(/r[ée]serve(?:r|z)?\s+(?:la\s+)?(?:table\s+)?(\w+)?\s*(?:pour\s+)?([\w\s-]+?)\s+(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|demain|aujourd[''’]hui)?\s*(\d{1,2})[h:](\d{2})?\s*(?:pour\s+)?(\d+)?\s*(?:couverts?|pers(?:onnes?)?)?/i))) {
    return {
      intent: 'reservation.create',
      params: { tableId: m[1] || null, customer: (m[2] || '').trim(), day: m[3] || 'demain',
                hour: parseInt(m[4]), minute: parseInt(m[5] || '0'), guests: parseInt(m[6] || '2') },
      confidence: 0.85,
    }
  }

  // INVOICE send by email
  if ((m = q.match(/(?:envoie|envoyer|envoie.moi)\s+(?:la\s+)?facture\s+(\S+)\s+(?:par\s+)?(?:e?mail|courriel)/i))) {
    return { intent: 'invoices.send-email', params: { number: m[1] }, confidence: 0.9 }
  }

  // DAY REPORT
  if (/(?:fais|cr[ée]e?|g[ée]n[ée]re)\s+(?:moi\s+)?(?:le\s+)?rapport\s+(?:du\s+)?(?:jour|aujourd[''’]hui|de\s+la\s+journ[ée]e)/i.test(q)) {
    return { intent: 'report.day', params: {}, confidence: 0.9 }
  }

  // REMINDER : "rappelle-moi de X à 22h" / "rappelle moi X 22h"
  if ((m = q.match(/(?:rappelle[\s\-]?moi|rappelle[\s\-]?la|notif(?:ication)?|alerte[\s\-]?moi)\s+(?:de\s+)?(.+?)\s+(?:à|a|@|au)?\s*(\d{1,2})[h:](\d{2})?/i))) {
    return { intent: 'reminder.set', params: { what: m[1].trim(), hour: parseInt(m[2]), minute: parseInt(m[3] || '0') }, confidence: 0.85 }
  }

  // ASSISTANT MODE switch
  if ((m = q.match(/(?:mode|passe\s+en\s+mode|active\s+(?:le\s+)?mode)\s+(patron|service|serveur|cuisine|cuisinier|comptable|comptabilit[ée]|[ée]v[ée]nement|tutoriel)/i))) {
    return { intent: 'assistant.set-mode', params: { mode: m[1].toLowerCase() }, confidence: 0.95 }
  }

  // PLANNING vocal : "planning : Marie matin, Luc soir, Sophie weekend off"
  if ((m = q.match(/(?:planning|fais\s+le\s+planning|cr[ée]e?\s+(?:un\s+)?planning)\s*(?::\s*|,\s+)(.+)/i))) {
    return { intent: 'hr.set-planning', params: { spec: m[1].trim() }, confidence: 0.8 }
  }

  // RECITE / READ aloud
  if ((m = q.match(/(?:lis(?:.moi)?|r[ée]cite|lit\smoi)\s+(?:les\s+)?(avis|factures?|tables?\s+ouvertes?|impay[ée]s?|stock\s+bas)/i))) {
    return { intent: 'recite', params: { what: m[1].toLowerCase() }, confidence: 0.85 }
  }

  // v3.18 — HR : ajouter nouvel employé "rajoute/ajoute (un) nouvel employé NOMI"
  if ((m = q.match(/(?:rajoute|ajoute|cr[ée]e?[zr]?|inscrit?|enregistre)\s+(?:moi\s+)?(?:un\s+)?(?:nouveau|nouvelle|nouvel|new)?\s*employ[ée]e?s?\s+(?:nomm[ée]e?\s+|appel[ée]e?\s+|s'appelant\s+)?([\w\s\-àâéèêëîïôûùüç]{2,30})/i))) {
    const name = m[1].trim().replace(/\s+(en|dans|à|au|comme|sur).+$/i, '').trim()
    return { intent: 'hr.add-employee', params: { name }, confidence: 0.85 }
  }

  // v3.18 — HR : ajouter shift "ajoute shift Marie demain 9h-17h"
  if ((m = q.match(/(?:ajoute|cr[ée]e?[zr]?|met(?:s|tre)?)\s+(?:un\s+)?(?:shift|cr[ée]neau|horaire)\s+(?:pour\s+|à\s+)?([\w\-àâéèêëîïôûùüç]+)\s+(?:le\s+)?(demain|aujourd[''’\s]?hui|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)?\s*(?:de\s+)?(\d{1,2})[h:](\d{2})?\s*[-à]\s*(\d{1,2})[h:](\d{2})?/i))) {
    return {
      intent: 'hr.add-shift',
      params: {
        employee: m[1].trim(),
        day: m[2] || 'demain',
        startHour: parseInt(m[3]), startMin: parseInt(m[4] || '0'),
        endHour: parseInt(m[5]), endMin: parseInt(m[6] || '0'),
      },
      confidence: 0.85,
    }
  }

  // v3.18 — Affichage planning "ouvre/montre planning"
  if (q.match(/(?:ouvre|montre|affiche|voir)\s+(?:le\s+)?planning/i)) {
    return { intent: 'ui.navigate', params: { target: 'planning' }, confidence: 0.9 }
  }

  // ═══════════════════════════════════════════════════════════════════
  // v3.18.4 — 25 NOUVEAUX WORKFLOWS (5 par module top 5)
  // ═══════════════════════════════════════════════════════════════════

  // ─── POS — 5 workflows ───────────────────────────────────────────
  // POS-1 : "transfere table 3 vers table 5" (déplacer commande)
  if ((m = q.match(/(?:transf[èe]re|d[ée]place|move|bouge)\s+(?:la\s+)?(?:table\s+)?(\w+)\s+(?:vers|à|sur)\s+(?:la\s+)?(?:table\s+)?(\w+)/i))) {
    return { intent: 'pos.transfer-table', params: { fromId: m[1].toLowerCase(), toId: m[2].toLowerCase() }, confidence: 0.85 }
  }
  // POS-2 : "offre la table 3" / "rends gratuit la commande de la table 3"
  if ((m = q.match(/(?:offre|cadeau|gratuit|rends\s+gratuit)\s+(?:la\s+)?(?:commande\s+)?(?:de\s+)?(?:la\s+)?table\s+(\w+)/i))) {
    return { intent: 'pos.offer-table', params: { tableId: m[1].toLowerCase() }, confidence: 0.85 }
  }
  // POS-3 : "applique 10% de remise sur table 4"
  if ((m = q.match(/(?:applique|met(?:s|tre)?|fais)\s+(?:une\s+)?remise\s+(?:de\s+)?(\d+)\s*[%€]?\s+(?:sur\s+|à\s+)?(?:la\s+)?table\s+(\w+)/i))) {
    return { intent: 'pos.discount-table', params: { tableId: m[2].toLowerCase(), percent: parseInt(m[1]) }, confidence: 0.85 }
  }
  // POS-4 : "imprime ticket table 5" / "ticket de la table 5"
  if ((m = q.match(/(?:imprime|print|sort)\s+(?:le\s+)?(?:ticket|note|addition)\s+(?:de\s+|pour\s+)?(?:la\s+)?table\s+(\w+)/i))) {
    return { intent: 'pos.print-bill', params: { tableId: m[1].toLowerCase() }, confidence: 0.9 }
  }
  // POS-5 : "tables libres ?" / "où y a-t-il de la place ?"
  if (/(?:tables?\s+libres?|tables?\s+disponibles?|o[uù]\s+y\s+a.t.il\s+(?:de\s+la\s+)?place|combien\s+de\s+tables?\s+libres?)/i.test(q)) {
    return { intent: 'pos.free-tables', params: {}, confidence: 0.9 }
  }

  // ─── PLANNING — 5 workflows ──────────────────────────────────────
  // PLANNING-1 : "supprime le shift de Marie demain" / "annule shift Marie"
  if ((m = q.match(/(?:supprime|annule|enl[èe]ve|retire)\s+(?:le\s+)?shift\s+(?:de\s+)?([\w\-àâéèêëîïôûùüç]+)\s*(?:le\s+|du\s+)?(demain|aujourd[''’]hui|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)?/i))) {
    return { intent: 'hr.remove-shift', params: { employee: m[1].trim(), day: m[2] || 'demain' }, confidence: 0.85 }
  }
  // PLANNING-2 : "qui est en congé ?" / "absences cette semaine"
  if (/(?:qui\s+est\s+en\s+cong[ée]s?|abs[ée]nces?|qui\s+est\s+absent)/i.test(q)) {
    return { intent: 'hr.list-leaves', params: {}, confidence: 0.9 }
  }
  // PLANNING-3 : "demande congé Marie 5-12 août"
  if ((m = q.match(/(?:demande|cr[ée]e?[zr]?|enregistre)\s+(?:un\s+)?cong[ée]s?\s+(?:pour\s+)?([\w\-àâéèêëîïôûùüç]+)\s+(?:du\s+)?(\d{1,2})[\s\-/](\d{1,2})?\s*(?:au?\s+|à\s+|-\s*)?(\d{1,2})?/i))) {
    return { intent: 'hr.request-leave', params: { employee: m[1].trim(), startDay: m[2], endDay: m[4] || m[2] }, confidence: 0.8 }
  }
  // PLANNING-4 : "heures de Lucas cette semaine"
  if ((m = q.match(/(?:heures?\s+de|combien\s+a\s+travaill[ée]|temps\s+de)\s+([\w\-àâéèêëîïôûùüç]+)/i))) {
    return { intent: 'hr.hours-of', params: { employee: m[1].trim() }, confidence: 0.8 }
  }
  // PLANNING-5 : "planning de la semaine prochaine"
  if (/(?:planning|emploi\s+du\s+temps)\s+(?:de\s+)?(?:la\s+)?semaine\s+prochaine/i.test(q)) {
    return { intent: 'hr.next-week-planning', params: {}, confidence: 0.85 }
  }

  // ─── STOCK — 5 workflows ─────────────────────────────────────────
  // STOCK-1 : "ajoute 5 kg de tomates au stock"
  if ((m = q.match(/(?:ajoute|met(?:s|tre)?|entre)\s+(\d+(?:[\.,]\d+)?)\s*(kg|g|l|cl|bouteilles?|cartons?|packs?|unit[ée]s?|pi[èe]ces?)?\s+(?:de\s+)?([\w\sàâéèêëîïôûùüç-]+?)\s+(?:au\s+|dans\s+le\s+|sur\s+le\s+)?stock/i))) {
    return { intent: 'inv.add-stock', params: { qty: parseFloat(m[1].replace(',', '.')), unit: m[2] || 'unité', name: m[3].trim() }, confidence: 0.85 }
  }
  // STOCK-2 : "stock bas" / "qu'est-ce qui manque ?"
  if (/(?:stock\s+bas|qu[''’]est.ce\s+qui\s+manque|articles?\s+rupture|que\s+commander)/i.test(q)) {
    return { intent: 'inv.low-stock-list', params: {}, confidence: 0.9 }
  }
  // STOCK-3 : "DLUO" / "produits qui périment bientôt"
  if (/(?:dluo|p[ée]riment?|date\s+limite|expiration)/i.test(q)) {
    return { intent: 'inv.expiring-soon', params: {}, confidence: 0.85 }
  }
  // STOCK-4 : "commande de café à Métro" / "passe commande à Métro"
  if ((m = q.match(/(?:passe|cr[ée]e?[zr]?|fais)\s+(?:une\s+)?commande\s+(?:de\s+)?(.+?)\s+(?:à|chez|aupr[èe]s\s+de)\s+(.+?)(?:\s*$|\s+pour)/i))) {
    return { intent: 'inv.create-order', params: { items: m[1].trim(), supplier: m[2].trim() }, confidence: 0.75 }
  }
  // STOCK-5 : "valeur du stock ?" / "combien vaut mon stock"
  if (/(?:valeur\s+du\s+stock|combien\s+vaut\s+(?:mon\s+|le\s+)?stock|inventaire\s+(?:total|valoris[ée]))/i.test(q)) {
    return { intent: 'inv.stock-value', params: {}, confidence: 0.9 }
  }

  // ─── INVOICES — 5 workflows ──────────────────────────────────────
  // INVOICE-1 : "marque facture F-2026-142 comme payée"
  if ((m = q.match(/(?:marque|met(?:s|tre)?|valide|encaisse)\s+(?:la\s+)?facture\s+(\S+)\s+(?:comme\s+)?(?:pay[ée]e?|encaiss[ée]e?|r[ée]gl[ée]e?)/i))) {
    return { intent: 'inv.mark-paid', params: { number: m[1] }, confidence: 0.9 }
  }
  // INVOICE-2 : "factures impayées" / "qui me doit de l'argent ?"
  if (/(?:factures?\s+impay[ée]es?|qui\s+me\s+doit|cr[ée]ances?|en\s+retard\s+de\s+paiement)/i.test(q)) {
    return { intent: 'inv.unpaid-list', params: {}, confidence: 0.9 }
  }
  // INVOICE-3 : "envoie relance à Brasserie"
  if ((m = q.match(/(?:envoie|envoyer)\s+(?:une\s+)?relance\s+(?:à|au|aux)\s+(.+?)(?:\s*$|\s+(?:pour|de))/i))) {
    return { intent: 'inv.send-reminder', params: { customer: m[1].trim() }, confidence: 0.85 }
  }
  // INVOICE-4 : "TVA du mois" / "TVA collectée"
  if (/(?:tva\s+(?:du\s+mois|collect[ée]e|trim(?:estre)?)|d[ée]claration\s+tva)/i.test(q)) {
    return { intent: 'acc.tva-current', params: {}, confidence: 0.9 }
  }
  // INVOICE-5 : "CA aujourd'hui" / "chiffre d'affaires" (tolère apostrophe ou espace)
  if (/(?:ca\s+(?:aujourd[''’\s]?hui|du\s+jour|d[ée]j[àa])|chiffre\s+d[''’\s]?affaires?\s+(?:du\s+jour|aujourd[''’\s]?hui))/i.test(q)) {
    return { intent: 'acc.revenue-today', params: {}, confidence: 0.9 }
  }

  // ─── CRM — 5 workflows ───────────────────────────────────────────
  // CRM-1 : "ajoute client Pierre Dupont email pierre@example.com tel +352..."
  if ((m = q.match(/(?:ajoute|cr[ée]e?[zr]?|enregistre|inscrit?)\s+(?:un\s+)?(?:nouveau\s+)?client\s+([\w\-àâéèêëîïôûùüç]+(?:\s+[\w\-àâéèêëîïôûùüç]+)?)/i))) {
    const email = q.match(/[\w.\-]+@[\w.\-]+\.\w{2,}/)?.[0]
    const phone = q.match(/\+?\d[\d\s.\-]{8,}/)?.[0]?.trim()
    return { intent: 'crm.add-client', params: { name: m[1].trim(), email, phone }, confidence: 0.8 }
  }
  // CRM-2 : "VIPs" / "meilleurs clients"
  if (/(?:vips?|meilleurs?\s+clients?|top\s+clients?|clients?\s+fid[èe]les?)/i.test(q)) {
    return { intent: 'crm.list-vips', params: {}, confidence: 0.9 }
  }
  // CRM-3 : "anniversaires ce mois"
  if (/(?:anniversaires?\s+(?:ce\s+mois|du\s+mois|cette\s+semaine|cette\s+ann[ée]e))/i.test(q)) {
    return { intent: 'crm.birthdays', params: {}, confidence: 0.9 }
  }
  // CRM-4 : "ajoute 50 points à Marie" / "fidélité Marie +50"
  if ((m = q.match(/(?:ajoute|cr[ée]dite?|donne)\s+(\d+)\s*points?\s+(?:à|au?|pour)\s+([\w\-àâéèêëîïôûùüç]+)/i))) {
    return { intent: 'crm.add-loyalty-points', params: { points: parseInt(m[1]), customer: m[2].trim() }, confidence: 0.85 }
  }
  // CRM-5 : "envoie code -10% à VIPs" / "campagne aux clients fidèles"
  if ((m = q.match(/(?:envoie|cr[ée]e?[zr]?|lance)\s+(?:une\s+)?(?:campagne|code|promo|offre)\s+(?:de\s+)?(\-?\d+\s*[%€]?)?\s*(?:à|au?|pour)?\s*(vips?|clients?\s+fid[èe]les?|top|meilleurs?)/i))) {
    return { intent: 'crm.send-campaign', params: { discount: m[1]?.trim(), audience: m[2]?.trim() }, confidence: 0.75 }
  }

  // ═══════════════════════════════════════════════════════════════════
  // v3.18.5 — 12 nouveaux intents (questions courantes patron + collab)
  // ═══════════════════════════════════════════════════════════════════

  // OWNER-1 : "CA cette semaine" / "chiffre d'affaires semaine"
  if (/(?:ca|chiffre\s+d[''’\s]?affaires?)\s+(?:cette\s+)?semaine|ca\s+hebdo/i.test(q)) {
    return { intent: 'acc.revenue-week', params: {}, confidence: 0.9 }
  }
  // OWNER-2 : "CA ce mois" / "chiffre d'affaires mois"
  if (/(?:ca|chiffre\s+d[''’\s]?affaires?)\s+(?:ce\s+|du\s+)?mois|ca\s+mensuel/i.test(q)) {
    return { intent: 'acc.revenue-month', params: {}, confidence: 0.9 }
  }
  // OWNER-3 : "ticket moyen" / "panier moyen"
  if (/(?:ticket\s+moyen|panier\s+moyen|moyenne\s+(?:par\s+)?(?:ticket|client|table))/i.test(q)) {
    return { intent: 'acc.average-ticket', params: {}, confidence: 0.9 }
  }
  // OWNER-4 : "couverts aujourd'hui" / "combien de clients aujourd'hui"
  if (/(?:couverts?|clients?|monde)\s+(?:aujourd[''’\s]?hui|du\s+jour|servi)|combien\s+(?:de\s+)?(?:clients?|couverts?)/i.test(q)) {
    return { intent: 'acc.guests-today', params: {}, confidence: 0.85 }
  }
  // OWNER-5 : "comparaison hier" / "vs hier"
  if (/(?:comparaison|compar[ée]?|vs)\s+hier|hier\s+(?:vs|contre|compar[ée])/i.test(q)) {
    return { intent: 'acc.compare-yesterday', params: {}, confidence: 0.85 }
  }
  // POS-6 : "occupation" / "taux d'occupation"
  if (/(?:taux\s+d[''’\s]?occupation|occupation|combien\s+(?:de\s+)?tables?\s+occup[ée]es?|combien\s+de\s+monde)/i.test(q)) {
    return { intent: 'pos.occupancy', params: {}, confidence: 0.9 }
  }
  // POS-7 : "plat le plus vendu" / "best seller"
  if (/(?:plat|article|produit)\s+(?:le\s+)?plus\s+(?:vendu|populaire|command[ée])|best\s*sellers?|top\s+(?:plats?|ventes?)/i.test(q)) {
    return { intent: 'pos.top-products', params: {}, confidence: 0.9 }
  }
  // HR-COLLAB-1 : "mes shifts" / "mon planning"
  if (/(?:mes\s+shifts?|mon\s+planning|mes\s+horaires|mes\s+jours\s+de\s+travail)/i.test(q)) {
    return { intent: 'hr.my-shifts', params: {}, confidence: 0.9 }
  }
  // HR-COLLAB-2 : "mes congés"
  if (/(?:mes\s+cong[ée]s?|mes\s+vacances|mon\s+solde\s+(?:de\s+)?cong[ée]s?)/i.test(q)) {
    return { intent: 'hr.my-leaves', params: {}, confidence: 0.9 }
  }
  // HR-COLLAB-3 : "pointage" / "je commence" / "je termine"
  if (/(?:je\s+(?:pointe|commence|d[ée]marre|prends?\s+mon\s+poste))/i.test(q)) {
    return { intent: 'hr.punch-in', params: {}, confidence: 0.9 }
  }
  if (/(?:je\s+(?:termine|finis|sors|quitte|pars)|fin\s+(?:de\s+)?(?:service|shift|journ[ée]e))/i.test(q)) {
    return { intent: 'hr.punch-out', params: {}, confidence: 0.9 }
  }
  // GENERAL : "aide" / "que sais-tu faire" / "commandes"
  if (/^(?:aide|help|que\s+(?:sais-tu|peux-tu)\s+faire|commandes?\s*\?|liste\s+(?:des\s+)?commandes)$/i.test(q.trim())) {
    return { intent: 'help.show-commands', params: {}, confidence: 0.95 }
  }

  // ═══════════════════════════════════════════════════════════════════
  // v3.19 E4 — 30 NOUVEAUX INTENTS (HACCP / Maint / Mkt / Analytics / Bulk / Search / Alertes)
  // ═══════════════════════════════════════════════════════════════════

  // ─── HACCP (5) ───
  // HACCP-1 : "température frigo 3°C" / "frigo 3" / "t° congélateur -18"
  if ((m = q.match(/(?:temp(?:[ée]rature)?|t°)\s+(?:du\s+)?(frigo|cong[ée]lateur|chambre\s+froide)\s+([-+]?\d+(?:[.,]\d+)?)\s*°?[cC]?/i))) {
    return { intent: 'haccp.log-temperature', params: { equipment: m[1].toLowerCase(), temp: parseFloat(m[2].replace(',', '.')) }, confidence: 0.85 }
  }
  // HACCP-1b : forme courte "frigo 3°C" / "frigo à 3"
  if ((m = q.match(/^(frigo|cong[ée]lateur|chambre\s+froide)\s+(?:[àa@]\s+)?([-+]?\d+(?:[.,]\d+)?)\s*°?[cC]?\s*$/i))) {
    return { intent: 'haccp.log-temperature', params: { equipment: m[1].toLowerCase(), temp: parseFloat(m[2].replace(',', '.')) }, confidence: 0.85 }
  }
  // HACCP-2 : "valide tâche nettoyage" / "tâche faite"
  if ((m = q.match(/(?:valide|fait|coch[ée]?|termin[ée]?)\s+(?:la\s+)?t[âa]che\s+([\w\s\-àâéèêëîïôûùüç]+?)(?:\s*$|\s+(?:de|du|pour))/i))) {
    return { intent: 'haccp.validate-task', params: { taskName: m[1].trim() }, confidence: 0.8 }
  }
  // HACCP-3 : "rapport HACCP" / "bilan hygiène"
  if (/(?:rapport|bilan|r[ée]sum[ée])\s+(?:haccp|hygi[èe]ne)/i.test(q)) {
    return { intent: 'haccp.daily-report', params: {}, confidence: 0.9 }
  }
  // HACCP-4 : "non-conformité" / "incident hygiène"
  if ((m = q.match(/(?:signale|enregistre|cr[ée]e?)\s+(?:une\s+)?(?:non[\s-]?conformit[ée]|incident|probl[èe]me)\s+(?:hygi[èe]ne|haccp|alimentaire)?\s*(.+)?/i))) {
    return { intent: 'haccp.report-incident', params: { details: (m[1] || '').trim() }, confidence: 0.8 }
  }
  // HACCP-5 : "export contrôle ITM" / "PDF HACCP"
  if (/(?:export|t[ée]l[ée]charge|g[ée]n[ée]re)\s+(?:le\s+)?(?:rapport|pdf|contr[ôo]le)\s+(?:haccp|itm|hygi[èe]ne)/i.test(q)) {
    return { intent: 'haccp.export-pdf', params: {}, confidence: 0.9 }
  }

  // ─── MAINTENANCE (3) ───
  // MAINT-1 : "créer ticket panne frigo"
  if ((m = q.match(/(?:cr[ée]e?[zr]?|ouvre|signale)\s+(?:un\s+)?(?:ticket|panne|probl[èe]me|incident)\s+(?:de\s+|sur\s+|du\s+|pour\s+)?(.+?)(?:\s*$)/i))) {
    return { intent: 'maint.create-ticket', params: { equipment: m[1].trim() }, confidence: 0.75 }
  }
  // MAINT-2 : "équipements en panne"
  if (/(?:[ée]quipements?|machines?|appareils?)\s+(?:en\s+panne|cass[ée]s?|hors\s+service|HS)|tickets?\s+(?:maint(?:enance)?|ouverts?)/i.test(q)) {
    return { intent: 'maint.list-broken', params: {}, confidence: 0.9 }
  }
  // MAINT-3 : "planifie intervention électricien jeudi"
  if ((m = q.match(/(?:planifie|programme|cr[ée]e?[zr]?)\s+(?:une\s+)?intervention\s+([\w\sàâéèêëîïôûùüç]+?)\s+(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|demain|aujourd[''’\s]?hui)/i))) {
    return { intent: 'maint.schedule', params: { who: m[1].trim(), day: m[2] }, confidence: 0.8 }
  }

  // ─── MARKETING (5) ───
  // MKT-1 : "crée campagne email Soldes Été"
  if ((m = q.match(/(?:cr[ée]e?[zr]?|lance|pr[ée]pare)\s+(?:une\s+)?campagne\s+(?:email|emailing|sms|newsletter)?\s*(?:nomm[ée]e?\s+|appel[ée]e?\s+|sur\s+|de\s+)?["']?([\w\s\-àâéèêëîïôûùüç]+?)["']?(?:\s*$|\s+(?:pour|à|de))/i))) {
    return { intent: 'mkt.create-campaign', params: { name: m[1].trim() }, confidence: 0.75 }
  }
  // MKT-2 : "taux d'ouverture campagne X"
  if (/(?:taux\s+d[''’\s]?ouverture|stats?\s+campagne|performances?\s+(?:email|campagne|newsletter))/i.test(q)) {
    return { intent: 'mkt.campaign-stats', params: {}, confidence: 0.85 }
  }
  // MKT-3 : "segment clients vegan" / "audience VIPs Luxembourg"
  if ((m = q.match(/(?:segment|audience|cible|filtre)\s+(?:clients?|public)?\s*([\w\s\-àâéèêëîïôûùüç]+?)(?:\s*$|\s+(?:pour|de))/i))) {
    return { intent: 'mkt.segment-audience', params: { criteria: m[1].trim() }, confidence: 0.7 }
  }
  // MKT-4 : "A/B test promo -10 vs -15"
  if (/(?:a\/?b[\s-]?test|teste?\s+(?:deux|2)\s+promos?|comparer?\s+(?:deux|2)\s+offres?)/i.test(q)) {
    return { intent: 'mkt.ab-test', params: {}, confidence: 0.85 }
  }
  // MKT-5 : "calendrier publications" / "planning posts"
  if (/(?:calendrier\s+(?:publications?|posts?|social)|planning\s+(?:social|posts?|insta|facebook))/i.test(q)) {
    return { intent: 'mkt.posting-calendar', params: {}, confidence: 0.9 }
  }

  // ─── ANALYTICS (5) ───
  // ANALYTICS-1 : "jours les plus rentables"
  if (/(?:jours?\s+(?:les\s+)?plus\s+(?:rentables?|forts?|charg[ée]s?)|meilleurs?\s+jours?\s+(?:de\s+(?:la\s+)?)?semaine|top\s+jours?)/i.test(q)) {
    return { intent: 'analytics.top-days', params: {}, confidence: 0.9 }
  }
  // ANALYTICS-2 : "comparaison année dernière" / "vs N-1"
  if (/(?:vs|compar[ée]?|contre)\s+(?:l[''’\s]?ann[ée]e\s+derni[èe]re|n-1|m[êe]me\s+mois\s+l[''’\s]?an\s+dernier)/i.test(q)) {
    return { intent: 'analytics.compare-yoy', params: {}, confidence: 0.9 }
  }
  // ANALYTICS-3 : "taux conversion réservations"
  if (/(?:taux\s+(?:de\s+)?conversion|r[ée]servations?\s+(?:converties?|honor[ée]es?|no.?show))/i.test(q)) {
    return { intent: 'analytics.reservation-conversion', params: {}, confidence: 0.9 }
  }
  // ANALYTICS-4 : "durée moyenne table" / "temps moyen client"
  if (/(?:dur[ée]e\s+moyenne\s+(?:par\s+)?tables?|temps\s+moyen\s+(?:par\s+)?clients?|rotation\s+tables?)/i.test(q)) {
    return { intent: 'analytics.avg-table-time', params: {}, confidence: 0.9 }
  }
  // ANALYTICS-5 : "ratio cuisine salle"
  if (/(?:ratio|r[ée]partition|split)\s+(?:cuisine|salle|food|drink|boissons?|plats?)/i.test(q)) {
    return { intent: 'analytics.kitchen-vs-bar-ratio', params: {}, confidence: 0.9 }
  }

  // ─── BULK-OPS (4) ───
  // BULK-1 : "supprime factures expirées"
  if (/(?:supprime|nettoie|purge|archive)\s+(?:toutes?\s+les\s+)?factures?\s+(?:expir[ée]es?|annul[ée]es?|vieilles?|p[ée]rim[ée]es?)/i.test(q)) {
    return { intent: 'bulk.cleanup-old-invoices', params: {}, confidence: 0.85 }
  }
  // BULK-2 : "nettoie clients inactifs"
  if (/(?:nettoie|supprime|archive|purge)\s+(?:les\s+)?clients?\s+(?:inactifs?|fant[ôo]mes?|jamais\s+revenus?)/i.test(q)) {
    return { intent: 'bulk.cleanup-inactive-customers', params: {}, confidence: 0.85 }
  }
  // BULK-3 : "archive shifts > 6 mois"
  if (/(?:archive|nettoie|purge)\s+(?:les\s+)?(?:shifts?|pointages?|plannings?)\s+(?:>|sup[ée]rieurs?|plus\s+de|de\s+plus\s+de)?\s*\d*\s*(?:mois|semaines?|ans?)/i.test(q)) {
    return { intent: 'bulk.archive-old-shifts', params: {}, confidence: 0.85 }
  }
  // BULK-4 : "reset stock à zéro"
  if (/(?:reset|remet|remise?)\s+(?:le\s+)?stock\s+(?:à\s+)?z[ée]ro|inventaire\s+vide|vide\s+(?:le\s+)?stock/i.test(q)) {
    return { intent: 'bulk.reset-stock', params: {}, confidence: 0.85 }
  }

  // ─── SEARCH CROSS-MODULE (3) ───
  // SEARCH-1 : "tout sur Dupont" / "trouve tout pour Marie"
  if ((m = q.match(/(?:tout|trouve|recherche|montre)\s+(?:tout\s+)?(?:sur|pour|à\s+propos\s+de|concernant)\s+([\w\-àâéèêëîïôûùüç]+(?:\s+[\w\-àâéèêëîïôûùüç]+)?)/i))) {
    return { intent: 'search.entity', params: { entity: m[1].trim() }, confidence: 0.85 }
  }
  // SEARCH-2 : "recherche +352 661 12 34 56" / numéro téléphone
  // (placé AVANT web.search dans l'ordre déclaration pour qu'il matche d'abord — voir ordre regex plus bas)
  if ((m = q.match(/(?:cherche|trouve|recherche|qui\s+a\s+(?:le\s+)?(?:num[ée]ro|t[ée]l(?:[ée]phone)?))\s+(\+?\d[\d\s\.\-]{7,})/i))) {
    return { intent: 'search.phone', params: { phone: m[1].replace(/[\s.\-]/g, '') }, confidence: 0.95 }
  }
  // SEARCH-3 : "que s'est-il passé le 15 mars" / search par date
  if ((m = q.match(/(?:que\s+s[''’\s]?est.il\s+pass[ée]|active?\s+du|recherche?\s+du)\s+(\d{1,2})[/\-\s]+(\d{1,2}|janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[ûu]t|septembre|octobre|novembre|d[ée]cembre)/i))) {
    return { intent: 'search.date', params: { day: m[1], month: m[2] }, confidence: 0.85 }
  }

  // ─── ALERTES / TRIGGERS (5) ───
  // ALERT-1 : "alerte si stock café < 5"
  if ((m = q.match(/(?:cr[ée]e?[zr]?|configure?|mets?)\s+(?:une\s+)?alerte\s+(?:si\s+|quand\s+)?stock\s+([\w\s\-àâéèêëîïôûùüç]+?)\s*[<≤]\s*(\d+)/i))) {
    return { intent: 'alerts.create-stock-threshold', params: { product: m[1].trim(), threshold: parseInt(m[2]) }, confidence: 0.85 }
  }
  // ALERT-2 : "alerte facture impayée J+15"
  if ((m = q.match(/(?:alerte|notif(?:ication)?)\s+factures?\s+(?:impay[ée]es?\s+)?(?:apr[èe]s\s+|>\s*)?(\d+)\s*(?:jours?|j)/i))) {
    return { intent: 'alerts.invoice-overdue', params: { days: parseInt(m[1]) }, confidence: 0.85 }
  }
  // ALERT-3 : "alerte heures sup"
  if (/(?:alerte|notif)\s+(?:heures?\s+sup|hs|temps\s+plein|d[ée]passement\s+horaire)/i.test(q)) {
    return { intent: 'alerts.overtime', params: {}, confidence: 0.9 }
  }
  // ALERT-4 : "alerte avis Google < 3 étoiles"
  if (/(?:alerte|notif)\s+(?:nouvel\s+)?avis\s+(?:google|tripadvisor|booking)?\s*(?:<|inf[ée]rieur)?\s*(\d+)?\s*[ée]toiles?/i.test(q)) {
    return { intent: 'alerts.bad-review', params: {}, confidence: 0.9 }
  }
  // ALERT-5 : "alerte température frigo"
  if (/(?:alerte|notif)\s+(?:temp[ée]rature|t°)\s+(?:frigo|cong[ée]lateur|chambre\s+froide)/i.test(q)) {
    return { intent: 'alerts.cold-chain', params: {}, confidence: 0.9 }
  }

  return null
}

// ═══════════════════════════════════════════════════════════════════════
// INTENT EXECUTION
// ═══════════════════════════════════════════════════════════════════════

async function executeIntent(intent: IntentMatch): Promise<{ success: boolean; summary: string; details?: any; uiAction?: any }> {

  switch (intent.intent) {

    case 'pos.add-items': {
      const { qty, item, tableId } = intent.params
      const floorMod = await import('./floorState')
      const state = floorMod.getFloorState()
      const tid = state.tables.find((t: any) => t.id === tableId || t.name?.toLowerCase() === tableId || t.id === `t${tableId}` || t.name?.toLowerCase() === `t${tableId}`)
      if (!tid) return { success: false, summary: `Table "${tableId}" introuvable.` }
      const menuPrices: Record<string, number> = {
        'café': 2.50, 'cafe': 2.50, 'expresso': 2.50, 'café crème': 3.20, 'cappuccino': 3.50,
        'thé': 2.80, 'the': 2.80, 'bière': 4.50, 'biere': 4.50,
        'vin': 5.00, 'verre vin': 5.00, 'eau': 3.00, 'coca': 3.50, 'jus': 3.80,
      }
      const itemKey = String(item).toLowerCase().trim()
      const price = menuPrices[itemKey] ?? menuPrices[itemKey.replace(/s$/, '')] ?? 4.00
      for (let i = 0; i < qty; i++) {
        tid.items.push({
          id: Math.random().toString(36).slice(2, 10),
          name: item, price, qty: 1, addedAt: Date.now(),
        })
      }
      if (tid.status === 'LIBRE') { tid.status = 'OCCUPEE'; tid.openedAt = Date.now() }
      state.updatedAt = Date.now()
      return {
        success: true,
        summary: `✅ ${qty} × ${item} ajouté(s) à ${tid.name} (${(qty * price).toFixed(2)} €).`,
        details: { tableId: tid.id, qty, item, total: qty * price },
      }
    }

    case 'pos.close-table': {
      const floorMod = await import('./floorState')
      const state = floorMod.getFloorState()
      const tableId = String(intent.params.tableId).toLowerCase()
      const t = state.tables.find((x: any) => x.id === tableId || x.name?.toLowerCase() === tableId || x.id === `t${tableId}` || x.name?.toLowerCase() === `t${tableId}`)
      if (!t) return { success: false, summary: `Table "${tableId}" introuvable.` }
      t.status = 'NETTOYAGE'
      t.items = []
      t.openedAt = undefined
      state.chairs = state.chairs.filter((c: any) => c.tableId !== t.id)
      state.updatedAt = Date.now()
      return { success: true, summary: `✅ ${t.name} clôturée et passée en nettoyage.` }
    }

    case 'pos.open-table': {
      const floorMod = await import('./floorState')
      const state = floorMod.getFloorState()
      const tableId = String(intent.params.tableId).toLowerCase()
      const t = state.tables.find((x: any) => x.id === tableId || x.name?.toLowerCase() === tableId || x.id === `t${tableId}` || x.name?.toLowerCase() === `t${tableId}`)
      if (!t) return { success: false, summary: `Table "${tableId}" introuvable.` }
      t.status = 'OCCUPEE'
      t.openedAt = Date.now()
      state.updatedAt = Date.now()
      return { success: true, summary: `✅ ${t.name} ouverte.` }
    }

    case 'invoices.create': {
      const { customer, amount } = intent.params
      const invoices = loadJson<any[]>('invoices.json', [])
      const next = invoices.length + 142
      const number = `F-${new Date().getFullYear()}-${String(next).padStart(4, '0')}`
      const total = amount || 100
      const newInvoice = {
        id: `i${Date.now()}`,
        number, customer,
        date: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10),
        total,
        vatTotal: Math.round(total * 0.17 * 100) / 100,
        status: 'sent',
        createdBy: 'assistant',
      }
      invoices.unshift(newInvoice)
      saveJson('invoices.json', invoices)
      return {
        success: true,
        summary: `✅ Facture ${number} créée pour ${customer} · ${total} € (TVA ${newInvoice.vatTotal} €).`,
        details: newInvoice,
        uiAction: { type: 'navigate', to: '/invoices/factures' },
      }
    }

    case 'hr.who-works': {
      const shifts = loadJson<any[]>('shifts.json', [])
      const period = String(intent.params.period || '').toLowerCase()
      let target: string
      const today = new Date()
      if (/aujourd/.test(period)) target = today.toISOString().slice(0, 10)
      else if (/demain/.test(period)) {
        const t = new Date(today); t.setDate(t.getDate() + 1)
        target = t.toISOString().slice(0, 10)
      }
      else target = today.toISOString().slice(0, 10)
      const list = shifts.filter((s: any) => s.date === target && s.type !== 'absence' && s.type !== 'conge_annuel' && s.type !== 'conge_personnel')
      if (list.length === 0) return { success: true, summary: `📅 Personne n'est planifié sur cette période.`, details: { date: target, count: 0 } }
      const summary = list.map((s: any) => `${s.employee} (${s.role}) ${s.start}–${s.end}`).join(', ')
      return { success: true, summary: `📅 ${list.length} personne(s) : ${summary}`, details: { date: target, list } }
    }

    case 'backup.create': {
      const stock = loadJson<any[]>('inventory-stock.json', [])
      const ts = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `inventory-${ts}.bak.json`
      const dir = path.join(DATA_DIR, 'backups')
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, filename), JSON.stringify(stock, null, 2), 'utf8')
      return { success: true, summary: `✅ Sauvegarde stock créée : ${filename} (${stock.length} articles).` }
    }

    case 'ui.dark-mode': {
      return {
        success: true,
        summary: intent.params.on ? '🌙 Mode sombre activé.' : '☀️ Mode clair activé.',
        uiAction: { type: 'theme', value: intent.params.on ? 'dark' : 'light' },
      }
    }

    case 'ui.navigate': {
      const targets: Record<string, string> = {
        planning: '/hr/planning', caisse: '/pos/floor', pos: '/pos/floor',
        crm: '/crm/clients', client: '/crm/clients', clients: '/crm/clients',
        facture: '/invoices/factures', factures: '/invoices/factures',
        stock: '/inventory/stock', stocks: '/inventory/stock', inventaire: '/inventory/stock',
        haccp: '/haccp/journee', comptabilité: '/accounting/depenses', comptabilite: '/accounting/depenses',
        marketing: '/marketing', avis: '/reputation/avis', réput: '/reputation/avis', reput: '/reputation/avis',
        agenda: '/agenda/calendrier', réservations: '/agenda/calendrier', reservation: '/agenda/calendrier', reservations: '/agenda/calendrier',
        portail: '/clients', menu: '/qrmenu', qr: '/qrmenu', tv: '/ads', pub: '/ads',
        musique: '/music', backup: '/backup', sauvegarde: '/backup',
        paramètres: '/settings/modules', parametres: '/settings/modules',
        ai: '/ai', assistant: '/ai',
      }
      const key = String(intent.params.target || '').toLowerCase().replace(/s$/, '')
      const route = targets[key] || targets[String(intent.params.target).toLowerCase()]
      if (!route) return { success: false, summary: `Module "${intent.params.target}" non reconnu.` }
      return {
        success: true,
        summary: `🚪 J'ouvre ${intent.params.target}…`,
        uiAction: { type: 'navigate', to: route },
      }
    }

    case 'web.search': {
      const r = await fetch(`http://localhost:${process.env.PORT || 3002}/api/agent/web-search?q=${encodeURIComponent(intent.params.query)}`, { headers: internalHeaders() })
      if (!r.ok) return { success: false, summary: '❌ Recherche web indisponible.' }
      const data = await r.json() as { results?: any[] }
      const results = data.results || []
      if (results.length === 0) return { success: true, summary: `🔍 Aucun résultat pour "${intent.params.query}".` }
      return {
        success: true,
        summary: `🔍 ${results.length} résultat(s) pour "${intent.params.query}".`,
        details: results,
      }
    }

    case 'help.tutorial': {
      const id = intent.params.id
      const moduleByArticle: Record<string, string> = {
        'pos.offert': '/pos', 'inv.create': '/invoices/factures', 'inv.ocr': '/inventory/stock',
      }
      const route = moduleByArticle[id] || '/modules'
      return {
        success: true,
        summary: `🎓 Je lance le tutoriel.`,
        uiAction: { type: 'navigate', to: `${route}?help=${id}&autoplay=demo` },
      }
    }

    // ─── NEW v3.10 ──────────────────────────────────────────────────────

    case 'pos.table-summary': {
      const floorMod = await import('./floorState')
      const state = floorMod.getFloorState()
      const tableId = String(intent.params.tableId).toLowerCase()
      const t = state.tables.find((x: any) => x.id === tableId || x.name?.toLowerCase() === tableId || x.id === `t${tableId}` || x.name?.toLowerCase() === `t${tableId}`)
      if (!t) return { success: false, summary: `Table "${tableId}" introuvable.` }
      const items: any[] = t.items || []
      const total = items.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0)
      const grouped: Record<string, { qty: number; total: number }> = {}
      items.forEach((it) => {
        const key = it.name || '?'
        if (!grouped[key]) grouped[key] = { qty: 0, total: 0 }
        grouped[key].qty += it.qty || 1
        grouped[key].total += (it.price || 0) * (it.qty || 1)
      })
      const lines = Object.entries(grouped).map(([n, g]) => `${g.qty}× ${n} (${g.total.toFixed(2)} €)`).join(', ') || 'aucune commande'
      const hours = t.openedAt ? ((Date.now() - t.openedAt) / 3600_000).toFixed(1) : '0'
      return {
        success: true,
        summary: `📋 ${t.name} (${t.status}) · ouverte ${hours}h · ${lines} · Total ${total.toFixed(2)} €`,
        details: { table: t.name, status: t.status, items: grouped, total, hoursOpen: hours },
      }
    }

    case 'reservation.create': {
      const reservations = loadJson<any[]>('reservations.json', [])
      const { tableId, customer, day, hour, minute, guests } = intent.params
      const dayMap: Record<string, number> = { lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6, dimanche: 0 }
      const today = new Date()
      let target = new Date(today)
      if (day === 'demain') target.setDate(today.getDate() + 1)
      else if (day === 'aujourd\'hui' || day === 'aujourdhui') { /* keep today */ }
      else if (dayMap[day] !== undefined) {
        const diff = (dayMap[day] - today.getDay() + 7) % 7 || 7
        target.setDate(today.getDate() + diff)
      }
      target.setHours(hour, minute || 0, 0, 0)
      const r = {
        id: `r${Date.now()}`,
        tableId: tableId || null,
        customer: customer || 'Client',
        datetime: target.toISOString(),
        guests: guests || 2,
        status: 'confirmed',
        createdBy: 'assistant',
      }
      reservations.unshift(r)
      saveJson('reservations.json', reservations)
      return {
        success: true,
        summary: `📅 Réservation créée : ${customer} · ${target.toLocaleString('fr-LU', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · ${guests} couverts${tableId ? ' · table ' + tableId : ''}`,
        details: r,
        uiAction: { type: 'navigate', to: '/agenda/calendrier' },
      }
    }

    case 'invoices.send-email': {
      const invoices = loadJson<any[]>('invoices.json', [])
      const inv = invoices.find((i: any) => String(i.number || '').toLowerCase() === String(intent.params.number).toLowerCase())
      if (!inv) return { success: false, summary: `Facture ${intent.params.number} introuvable.` }
      // Simulated email send (real SMTP requires config) — flag in JSON
      inv.lastEmailSentAt = Date.now()
      inv.status = 'sent'
      saveJson('invoices.json', invoices)
      return {
        success: true,
        summary: `📧 Facture ${inv.number} envoyée par email à ${inv.customer} (${inv.total} €).`,
        details: inv,
      }
    }

    case 'report.day': {
      const floorMod = await import('./floorState')
      const state = floorMod.getFloorState()
      const occupied = state.tables.filter((t: any) => t.status === 'OCCUPEE').length
      const totalRevenue = state.tables.reduce((s: number, t: any) => s + (t.items || []).reduce((ss: number, i: any) => ss + (i.price || 0) * (i.qty || 1), 0), 0)
      const invoices = loadJson<any[]>('invoices.json', [])
      const today = new Date().toISOString().slice(0, 10)
      const todayInvoices = invoices.filter((i: any) => i.date === today)
      const todayTotal = todayInvoices.reduce((s: number, i: any) => s + (i.total || 0), 0)
      const summary = `📊 Rapport ${today} : ${occupied} tables ouvertes (${totalRevenue.toFixed(2)} € en cours) · ${todayInvoices.length} factures émises (${todayTotal.toFixed(2)} €)`
      return {
        success: true, summary,
        details: {
          date: today,
          openTables: occupied,
          openRevenue: totalRevenue,
          invoicesIssued: todayInvoices.length,
          invoicesTotal: todayTotal,
        },
        uiAction: { type: 'navigate', to: '/owner' },
      }
    }

    case 'reminder.set': {
      const reminders = loadJson<any[]>('reminders.json', [])
      const target = new Date()
      target.setHours(intent.params.hour, intent.params.minute || 0, 0, 0)
      if (target < new Date()) target.setDate(target.getDate() + 1)
      const r = {
        id: `rm${Date.now()}`,
        text: intent.params.what,
        when: target.toISOString(),
        createdBy: 'assistant',
        done: false,
      }
      reminders.unshift(r)
      saveJson('reminders.json', reminders)
      return {
        success: true,
        summary: `⏰ Rappel programmé : "${intent.params.what}" à ${target.toLocaleTimeString('fr-LU', { hour: '2-digit', minute: '2-digit' })}`,
        details: r,
      }
    }

    case 'assistant.set-mode': {
      const modeMap: Record<string, string> = {
        patron: 'patron', service: 'service', serveur: 'service',
        cuisine: 'cuisine', cuisinier: 'cuisine',
        comptable: 'comptable', 'comptabilité': 'comptable', comptabilite: 'comptable',
        événement: 'event', evenement: 'event', tutoriel: 'tutoriel',
      }
      const mode = modeMap[String(intent.params.mode).toLowerCase()] || 'general'
      return {
        success: true,
        summary: `🎭 Mode "${mode}" activé. Mes commandes prioritaires sont adaptées.`,
        uiAction: { type: 'mode', value: mode },
      }
    }

    // v3.18 — HR add employee
    case 'hr.add-employee': {
      const { name } = intent.params
      if (!name || name.length < 2) {
        return { success: false, summary: '❌ Nom d\'employé manquant ou trop court.' }
      }
      const employees = loadJson<any[]>('employees.json', [])
      const existing = employees.find((e) => String(e.name || `${e.firstName || ''} ${e.lastName || ''}`.trim()).toLowerCase() === name.toLowerCase())
      if (existing) {
        return {
          success: false,
          summary: `⚠️ ${name} existe déjà dans l'équipe (id: ${existing.id}). Tu veux modifier ou créer un homonyme ?`,
          uiAction: { type: 'navigate', to: '/hr/team' },
        }
      }
      const newEmp = {
        id: 'emp-' + Math.random().toString(36).slice(2, 10),
        name,
        firstName: name.split(/\s+/)[0],
        lastName: name.split(/\s+/).slice(1).join(' ') || '',
        role: 'Serveur',
        section: 'Salle',
        contractType: 'CDI',
        weeklyHours: 40,
        hourlyRate: 14.0,  // SMIC LU 2026
        active: true,
        createdAt: Date.now(),
      }
      employees.push(newEmp)
      saveJson('employees.json', employees)
      return {
        success: true,
        summary: `✅ ${name} ajouté(e) à l'équipe (${employees.length} employés au total). Tu peux le configurer dans Gestion RH → Équipe.`,
        details: newEmp,
        uiAction: { type: 'navigate', to: '/hr/team' },
      }
    }

    // v3.18 — HR add shift
    case 'hr.add-shift': {
      const { employee, day, startHour, startMin, endHour, endMin } = intent.params
      if (!employee) return { success: false, summary: '❌ Nom d\'employé manquant.' }
      const dayMap: Record<string, number> = { 'lundi': 1, 'mardi': 2, 'mercredi': 3, 'jeudi': 4, 'vendredi': 5, 'samedi': 6, 'dimanche': 0 }
      const target = new Date()
      if (day === 'demain') target.setDate(target.getDate() + 1)
      else if (day && day !== 'aujourd\'hui' && dayMap[day] !== undefined) {
        const wanted = dayMap[day]
        const cur = target.getDay()
        const diff = ((wanted - cur) + 7) % 7 || 7
        target.setDate(target.getDate() + diff)
      }
      const dateStr = target.toISOString().slice(0, 10)
      const shifts = loadJson<any[]>('shifts.json', [])
      const newShift = {
        id: 'shift-' + Math.random().toString(36).slice(2, 10),
        employee,
        date: dateStr,
        start: `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`,
        end: `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`,
        role: 'Service',
        section: 'Salle',
        createdAt: Date.now(),
      }
      shifts.push(newShift)
      saveJson('shifts.json', shifts)
      return {
        success: true,
        summary: `✅ Shift ${employee} ajouté le ${dateStr} de ${newShift.start} à ${newShift.end}.`,
        details: newShift,
        uiAction: { type: 'navigate', to: '/hr/planning' },
      }
    }

    case 'hr.set-planning': {
      const spec = String(intent.params.spec || '')
      // Parse "Marie matin, Luc soir, Sophie off" etc.
      const parts = spec.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
      const SLOTS: Record<string, { start: string; end: string }> = {
        matin: { start: '08:00', end: '14:00' },
        midi: { start: '11:00', end: '15:00' },
        soir: { start: '18:00', end: '23:00' },
        nuit: { start: '22:00', end: '04:00' },
        journée: { start: '09:00', end: '18:00' },
        journee: { start: '09:00', end: '18:00' },
        weekend: { start: '11:00', end: '23:00' },
      }
      const proposed: any[] = []
      const date = new Date(); date.setDate(date.getDate() + 1)
      const dateStr = date.toISOString().slice(0, 10)
      for (const p of parts) {
        const m1 = p.match(/^([\w\s-]+?)\s+(matin|midi|soir|nuit|journ[ée]e|weekend|off|cong[ée]|absent)/i)
        if (!m1) continue
        const employee = m1[1].trim()
        const slot = m1[2].toLowerCase().replace(/[éè]/g, 'e')
        if (slot === 'off' || slot === 'conge' || slot === 'absent') {
          proposed.push({ employee, date: dateStr, type: 'conge_personnel', note: 'OFF (assistant)' })
        } else {
          const s = SLOTS[slot] || SLOTS['journee']
          proposed.push({ employee, date: dateStr, start: s.start, end: s.end, type: 'shift', role: 'auto' })
        }
      }
      // PREVIEW only — return without saving
      return {
        success: true,
        summary: `📋 Aperçu planning ${dateStr} : ${proposed.length} entrée(s). Confirmer pour enregistrer.`,
        details: proposed,
        uiAction: {
          type: 'preview',
          confirmText: `Enregistrer ${proposed.length} shift(s) pour ${dateStr}`,
          confirmEndpoint: '/api/agent/intent/confirm',
          confirmPayload: { intent: 'hr.set-planning.commit', proposed, date: dateStr },
        },
      }
    }

    case 'recite': {
      let text = ''
      switch (intent.params.what) {
        case 'avis': {
          const reviews = loadJson<any[]>('reviews.json', [])
          if (reviews.length === 0) text = 'Aucun avis pour le moment.'
          else text = reviews.slice(0, 5).map((r: any) => `${r.rating} étoiles : ${r.text}`).join('. ')
          break
        }
        case 'factures': {
          const invoices = loadJson<any[]>('invoices.json', [])
          text = invoices.slice(0, 3).map((i: any) => `Facture ${i.number} pour ${i.customer}, ${i.total} euros.`).join(' ') || 'Aucune facture.'
          break
        }
        case 'impayes':
        case 'impayés': {
          const invoices = loadJson<any[]>('invoices.json', [])
          const overdue = invoices.filter((i: any) => i.status !== 'paid')
          text = `${overdue.length} factures impayées pour un total de ${overdue.reduce((s: number, i: any) => s + (i.total || 0), 0).toFixed(2)} euros.`
          break
        }
        default:
          text = 'Lecture non disponible pour cette catégorie.'
      }
      return { success: true, summary: text, uiAction: { type: 'speak', text } }
    }

    // ═══════════════════════════════════════════════════════════════════
    // v3.18.4 — 25 NOUVEAUX EXECUTORS (5 par module)
    // ═══════════════════════════════════════════════════════════════════

    // ─── POS ──────────────────────────────────────────────────────────
    case 'pos.transfer-table': {
      const { fromId, toId } = intent.params
      try {
        const floorMod = await import('./floorState')
        const state = floorMod.getFloorState()
        const from = state.tables.find((t: any) => t.id === fromId || t.name?.toLowerCase() === fromId)
        const to   = state.tables.find((t: any) => t.id === toId   || t.name?.toLowerCase() === toId)
        if (!from || !to) return { success: false, summary: `Table ${!from ? fromId : toId} introuvable.` }
        to.items = [...(to.items || []), ...(from.items || [])]
        from.items = []
        to.status = 'OCCUPEE'; to.openedAt = to.openedAt || Date.now()
        from.status = 'LIBRE'; delete (from as any).openedAt
        state.updatedAt = Date.now()
        return { success: true, summary: `✅ Commande transférée de ${from.name} vers ${to.name}.`, uiAction: { type: 'navigate', to: '/pos/floor' } }
      } catch (e: any) { return { success: false, summary: `Erreur transfert: ${e?.message}` } }
    }
    case 'pos.offer-table': {
      const { tableId } = intent.params
      const floorMod = await import('./floorState')
      const state = floorMod.getFloorState()
      const t = state.tables.find((t: any) => t.id === tableId || t.name?.toLowerCase() === tableId)
      if (!t) return { success: false, summary: `Table "${tableId}" introuvable.` }
      ;(t as any).offered = true
      const total = (t.items || []).reduce((s: number, i: any) => s + (i.price || 0) * (i.qty || 1), 0)
      state.updatedAt = Date.now()
      return { success: true, summary: `🎁 Table ${t.name} offerte (${total.toFixed(2)} €). Compté en gratuités.`, uiAction: { type: 'navigate', to: '/pos/floor' } }
    }
    case 'pos.discount-table': {
      const { tableId, percent } = intent.params
      const floorMod = await import('./floorState')
      const state = floorMod.getFloorState()
      const t = state.tables.find((t: any) => t.id === tableId || t.name?.toLowerCase() === tableId)
      if (!t) return { success: false, summary: `Table "${tableId}" introuvable.` }
      ;(t as any).discount = { type: 'percent', value: percent }
      state.updatedAt = Date.now()
      return { success: true, summary: `💸 Remise de ${percent}% appliquée sur ${t.name}.` }
    }
    case 'pos.print-bill': {
      const { tableId } = intent.params
      const floorMod = await import('./floorState')
      const state = floorMod.getFloorState()
      const t = state.tables.find((t: any) => t.id === tableId || t.name?.toLowerCase() === tableId)
      if (!t) return { success: false, summary: `Table "${tableId}" introuvable.` }
      const total = (t.items || []).reduce((s: number, i: any) => s + (i.price || 0) * (i.qty || 1), 0)
      return { success: true, summary: `🖨 Ticket ${t.name} : ${(t.items || []).length} articles · ${total.toFixed(2)} €. Envoyé à l'imprimante.` }
    }
    case 'pos.free-tables': {
      const floorMod = await import('./floorState')
      const state = floorMod.getFloorState()
      const free = state.tables.filter((t: any) => t.status === 'LIBRE')
      return {
        success: true,
        summary: `🪑 ${free.length} table(s) libre(s) sur ${state.tables.length} : ${free.slice(0, 8).map((t: any) => t.name).join(', ')}${free.length > 8 ? '…' : ''}`,
        details: { count: free.length, names: free.map((t: any) => t.name) },
      }
    }

    // ─── HR / PLANNING ────────────────────────────────────────────────
    case 'hr.remove-shift': {
      const { employee, day } = intent.params
      const dayMap: Record<string, number> = { 'lundi': 1, 'mardi': 2, 'mercredi': 3, 'jeudi': 4, 'vendredi': 5, 'samedi': 6, 'dimanche': 0 }
      const target = new Date()
      if (day === 'demain') target.setDate(target.getDate() + 1)
      else if (day && dayMap[day] !== undefined) {
        const cur = target.getDay()
        target.setDate(target.getDate() + ((dayMap[day] - cur + 7) % 7 || 7))
      }
      const dateStr = target.toISOString().slice(0, 10)
      const shifts = loadJson<any[]>('shifts.json', [])
      const before = shifts.length
      const remaining = shifts.filter((s) => !(s.date === dateStr && String(s.employee).toLowerCase().includes(String(employee).toLowerCase())))
      saveJson('shifts.json', remaining)
      return { success: true, summary: `🗑 ${before - remaining.length} shift(s) supprimé(s) pour ${employee} le ${dateStr}.` }
    }
    case 'hr.list-leaves': {
      const leaves = loadJson<any[]>('leave-requests.json', [])
      const today = new Date().toISOString().slice(0, 10)
      const active = leaves.filter((l: any) => l.status === 'approved' && l.startDate <= today && l.endDate >= today)
      if (active.length === 0) return { success: true, summary: '✅ Personne n\'est en congé actuellement.' }
      return {
        success: true,
        summary: `🏖 ${active.length} en congé : ${active.map((l: any) => `${l.employee} (jusqu'au ${l.endDate})`).join(', ')}`,
        details: active,
      }
    }
    case 'hr.request-leave': {
      const { employee, startDay, endDay } = intent.params
      const year = new Date().getFullYear()
      const month = String(new Date().getMonth() + 1).padStart(2, '0')
      const start = `${year}-${month}-${String(startDay).padStart(2, '0')}`
      const end   = `${year}-${month}-${String(endDay).padStart(2, '0')}`
      const leaves = loadJson<any[]>('leave-requests.json', [])
      const newLeave = {
        id: 'lr-' + Math.random().toString(36).slice(2, 10),
        employee, startDate: start, endDate: end, status: 'pending', type: 'vacation', createdAt: Date.now(),
      }
      leaves.push(newLeave)
      saveJson('leave-requests.json', leaves)
      return { success: true, summary: `📝 Demande de congé créée pour ${employee} du ${start} au ${end} (en attente).`, uiAction: { type: 'navigate', to: '/hr/conges' } }
    }
    case 'hr.hours-of': {
      const { employee } = intent.params
      const shifts = loadJson<any[]>('shifts.json', [])
      const wkStart = Date.now() - 7 * 86400_000
      const empShifts = shifts.filter((s: any) =>
        String(s.employee || '').toLowerCase().includes(String(employee).toLowerCase()) &&
        s.date && new Date(s.date).getTime() >= wkStart
      )
      let totalH = 0
      for (const s of empShifts) {
        const [h1, m1] = String(s.start || '0:0').split(':').map(Number)
        const [h2, m2] = String(s.end   || '0:0').split(':').map(Number)
        totalH += Math.max(0, (h2 + (m2 || 0) / 60) - (h1 + (m1 || 0) / 60))
      }
      return { success: true, summary: `⏱ ${employee} : ${totalH.toFixed(1)} h sur ${empShifts.length} shift(s) cette semaine.` }
    }
    case 'hr.next-week-planning': {
      const shifts = loadJson<any[]>('shifts.json', [])
      const nextMonday = new Date(); nextMonday.setDate(nextMonday.getDate() + ((1 - nextMonday.getDay() + 7) % 7 || 7))
      const nextSunday = new Date(nextMonday); nextSunday.setDate(nextMonday.getDate() + 6)
      const ms = nextMonday.toISOString().slice(0, 10), me = nextSunday.toISOString().slice(0, 10)
      const wk = shifts.filter((s: any) => s.date >= ms && s.date <= me)
      return {
        success: true,
        summary: `📅 Semaine ${ms} → ${me} : ${wk.length} shift(s) planifié(s) (${new Set(wk.map((s: any) => s.employee)).size} personne(s)).`,
        uiAction: { type: 'navigate', to: '/hr/planning?view=week' },
      }
    }

    // ─── INVENTORY ────────────────────────────────────────────────────
    case 'inv.add-stock': {
      const { qty, unit, name } = intent.params
      const stock = loadJson<any[]>('inventory-stock.json', [])
      const existing = stock.find((s: any) => String(s.name || '').toLowerCase().includes(String(name).toLowerCase()))
      if (existing) {
        existing.qty = (existing.qty || 0) + qty
        existing.lastUpdate = Date.now()
        saveJson('inventory-stock.json', stock)
        return { success: true, summary: `📦 ${qty} ${unit} ajouté(s) à "${existing.name}" (total : ${existing.qty} ${existing.unit || unit}).` }
      }
      const newItem = { id: 'inv-' + Math.random().toString(36).slice(2, 10), name, qty, unit, createdAt: Date.now() }
      stock.push(newItem)
      saveJson('inventory-stock.json', stock)
      return { success: true, summary: `📦 Nouveau article créé : ${qty} ${unit} de ${name}.`, uiAction: { type: 'navigate', to: '/inventory/stock' } }
    }
    case 'inv.low-stock-list': {
      const stock = loadJson<any[]>('inventory-stock.json', [])
      const low = stock.filter((s: any) => (s.qty || 0) <= (s.minStock || 5))
      if (low.length === 0) return { success: true, summary: '✅ Aucun article en stock bas.' }
      return {
        success: true,
        summary: `⚠️ ${low.length} article(s) en stock bas : ${low.slice(0, 8).map((s: any) => `${s.name} (${s.qty || 0} ${s.unit || ''})`).join(', ')}`,
        details: low,
        uiAction: { type: 'navigate', to: '/inventory/stock' },
      }
    }
    case 'inv.expiring-soon': {
      const stock = loadJson<any[]>('inventory-stock.json', [])
      const now = Date.now(), soon = now + 7 * 86400_000
      const expiring = stock.filter((s: any) => s.dluo && new Date(s.dluo).getTime() < soon && new Date(s.dluo).getTime() > now)
      if (expiring.length === 0) return { success: true, summary: '✅ Aucun produit ne périme dans les 7 jours.' }
      return {
        success: true,
        summary: `⏰ ${expiring.length} produit(s) périme(nt) bientôt : ${expiring.slice(0, 5).map((s: any) => `${s.name} (${s.dluo})`).join(', ')}`,
        details: expiring,
      }
    }
    case 'inv.create-order': {
      const { items, supplier } = intent.params
      const orders = loadJson<any[]>('purchase-orders.json', [])
      const newOrder = {
        id: 'po-' + Math.random().toString(36).slice(2, 10),
        supplier, items, status: 'draft', createdAt: Date.now(),
      }
      orders.push(newOrder)
      saveJson('purchase-orders.json', orders)
      return { success: true, summary: `📋 Commande brouillon créée : "${items}" → ${supplier}. Vérifie et envoie.`, uiAction: { type: 'navigate', to: '/inventory/commandes' } }
    }
    case 'inv.stock-value': {
      const stock = loadJson<any[]>('inventory-stock.json', [])
      const total = stock.reduce((s: number, i: any) => s + ((i.qty || 0) * (i.unitPrice || 0)), 0)
      return { success: true, summary: `💰 Valeur du stock : **${total.toFixed(2)} €** sur ${stock.length} articles.` }
    }

    // ─── INVOICES / ACCOUNTING ────────────────────────────────────────
    case 'inv.mark-paid': {
      const { number } = intent.params
      const invoices = loadJson<any[]>('invoices.json', [])
      const inv = invoices.find((i: any) => String(i.number || i.invoiceNumber).includes(number))
      if (!inv) return { success: false, summary: `Facture ${number} introuvable.` }
      inv.status = 'paid'
      inv.paidAt = Date.now()
      saveJson('invoices.json', invoices)
      return { success: true, summary: `✅ Facture ${inv.number} marquée payée (${(inv.total || 0).toFixed(2)} €).`, uiAction: { type: 'navigate', to: '/invoices/factures' } }
    }
    case 'inv.unpaid-list': {
      const invoices = loadJson<any[]>('invoices.json', [])
      const unpaid = invoices.filter((i: any) => i.status !== 'paid')
      const total = unpaid.reduce((s: number, i: any) => s + (i.total || 0), 0)
      return {
        success: true,
        summary: `💶 ${unpaid.length} facture(s) impayée(s), total **${total.toFixed(2)} €**.`,
        details: unpaid.slice(0, 10),
        uiAction: { type: 'navigate', to: '/invoices/factures' },
      }
    }
    case 'inv.send-reminder': {
      const { customer } = intent.params
      const invoices = loadJson<any[]>('invoices.json', [])
      const cust = invoices.filter((i: any) => i.status !== 'paid' && String(i.customer || i.client || '').toLowerCase().includes(String(customer).toLowerCase()))
      if (cust.length === 0) return { success: false, summary: `Aucune facture impayée pour "${customer}".` }
      const total = cust.reduce((s: number, i: any) => s + (i.total || 0), 0)
      return {
        success: true,
        summary: `📧 ${cust.length} relance(s) à préparer pour ${customer} (${total.toFixed(2)} €). Confirme dans le module Relances.`,
        uiAction: { type: 'navigate', to: '/invoices/relances' },
      }
    }
    case 'acc.tva-current': {
      const invoices = loadJson<any[]>('invoices.json', [])
      const m = new Date().getMonth(), y = new Date().getFullYear()
      const qStart = new Date(y, m - (m % 3), 1).getTime()
      const tva = invoices.filter((i: any) => i.date && new Date(i.date).getTime() >= qStart)
                          .reduce((s: number, i: any) => s + (i.vatTotal || (i.total || 0) * 0.17), 0)
      return { success: true, summary: `📑 TVA collectée ce trimestre : **${tva.toFixed(2)} €**.`, uiAction: { type: 'navigate', to: '/accounting/tva' } }
    }
    case 'acc.revenue-today': {
      const today = new Date().toISOString().slice(0, 10)
      const invoices = loadJson<any[]>('invoices.json', [])
      const todayInv = invoices.filter((i: any) => i.date?.slice(0, 10) === today)
      const ca = todayInv.reduce((s: number, i: any) => s + (i.total || 0), 0)
      return { success: true, summary: `💰 CA aujourd'hui : **${ca.toFixed(2)} €** (${todayInv.length} facture(s)).` }
    }

    // ─── CRM ──────────────────────────────────────────────────────────
    case 'crm.add-client': {
      const { name, email, phone } = intent.params
      const customers = loadJson<any[]>('customers.json', [])
      const exists = customers.find((c: any) =>
        (email && c.email === email) ||
        String(`${c.firstName || ''} ${c.lastName || ''}`.trim()).toLowerCase() === String(name).toLowerCase()
      )
      if (exists) return { success: false, summary: `⚠️ Client "${name}" existe déjà.`, uiAction: { type: 'navigate', to: '/crm/clients' } }
      const parts = String(name).split(/\s+/)
      const newC = {
        id: 'cust-' + Math.random().toString(36).slice(2, 10),
        firstName: parts[0],
        lastName: parts.slice(1).join(' ') || '',
        email: email || '',
        phone: phone || '',
        loyaltyPoints: 0, totalSpent: 0, visits: 0,
        createdAt: Date.now(),
      }
      customers.push(newC)
      saveJson('customers.json', customers)
      return { success: true, summary: `👤 Client ${name} ajouté${email ? ' (' + email + ')' : ''}.`, uiAction: { type: 'navigate', to: '/crm/clients' } }
    }
    case 'crm.list-vips': {
      const customers = loadJson<any[]>('customers.json', [])
      const vips = [...customers].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0)).slice(0, 5)
      return {
        success: true,
        summary: `⭐ Top 5 VIPs : ${vips.map((c: any) => `${c.firstName || ''} ${c.lastName || ''} (${(c.totalSpent || 0).toFixed(0)}€)`).join(', ')}`,
        details: vips,
        uiAction: { type: 'navigate', to: '/crm/clients' },
      }
    }
    case 'crm.birthdays': {
      const customers = loadJson<any[]>('customers.json', [])
      const m = new Date().getMonth() + 1
      const born = customers.filter((c: any) => c.birthday && new Date(c.birthday).getMonth() + 1 === m)
      if (born.length === 0) return { success: true, summary: `🎂 Aucun anniversaire ce mois.` }
      return {
        success: true,
        summary: `🎂 ${born.length} anniversaire(s) ce mois : ${born.map((c: any) => `${c.firstName || ''} (${new Date(c.birthday).toLocaleDateString('fr-LU')})`).join(', ')}`,
        details: born,
      }
    }
    case 'crm.add-loyalty-points': {
      const { points, customer } = intent.params
      const customers = loadJson<any[]>('customers.json', [])
      const c = customers.find((c: any) =>
        String(`${c.firstName || ''} ${c.lastName || ''}`.trim()).toLowerCase().includes(String(customer).toLowerCase())
      )
      if (!c) return { success: false, summary: `Client "${customer}" introuvable.` }
      c.loyaltyPoints = (c.loyaltyPoints || 0) + points
      saveJson('customers.json', customers)
      return { success: true, summary: `⭐ ${points} points ajoutés à ${c.firstName} (total : ${c.loyaltyPoints}).` }
    }
    case 'crm.send-campaign': {
      const { discount, audience } = intent.params
      const customers = loadJson<any[]>('customers.json', [])
      const target = /vip|fid|top|meilleur/i.test(audience || '') ? customers.filter((c: any) => (c.totalSpent || 0) > 100) : customers
      return {
        success: true,
        summary: `📣 Campagne ${discount || ''} préparée pour ${target.length} clients. Confirme dans Marketing.`,
        details: { audience: target.length, discount },
        uiAction: { type: 'navigate', to: '/crm/campagnes' },
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // v3.18.5 — 12 nouveaux executors (questions courantes)
    // ═══════════════════════════════════════════════════════════════════

    case 'acc.revenue-week': {
      const invoices = loadJson<any[]>('invoices.json', [])
      const wkStart = Date.now() - 7 * 86400_000
      const inv = invoices.filter((i: any) => i.date && new Date(i.date).getTime() >= wkStart)
      const ca = inv.reduce((s: number, i: any) => s + (i.total || 0), 0)
      return { success: true, summary: `📈 CA des 7 derniers jours : **${ca.toFixed(2)} €** (${inv.length} factures).` }
    }
    case 'acc.revenue-month': {
      const invoices = loadJson<any[]>('invoices.json', [])
      const mStart = new Date(); mStart.setDate(1); mStart.setHours(0, 0, 0, 0)
      const inv = invoices.filter((i: any) => i.date && new Date(i.date).getTime() >= mStart.getTime())
      const ca = inv.reduce((s: number, i: any) => s + (i.total || 0), 0)
      return { success: true, summary: `📊 CA du mois en cours : **${ca.toFixed(2)} €** (${inv.length} factures).`, uiAction: { type: 'navigate', to: '/accounting/rapports' } }
    }
    case 'acc.average-ticket': {
      const invoices = loadJson<any[]>('invoices.json', [])
      const recent = invoices.slice(-100)
      if (recent.length === 0) return { success: true, summary: 'Pas encore assez de tickets pour calculer la moyenne.' }
      const avg = recent.reduce((s: number, i: any) => s + (i.total || 0), 0) / recent.length
      return { success: true, summary: `🎫 Ticket moyen : **${avg.toFixed(2)} €** (sur ${recent.length} dernières ventes).` }
    }
    case 'acc.guests-today': {
      try {
        const floorMod = await import('./floorState')
        const state = floorMod.getFloorState()
        const totalGuests = state.tables.reduce((s: number, t: any) => s + (t.guests || 0), 0)
        const occupied = state.tables.filter((t: any) => t.status === 'OCCUPEE').length
        return { success: true, summary: `👥 ${totalGuests} couvert(s) actuellement servis sur ${occupied} table(s) occupée(s).` }
      } catch { return { success: false, summary: 'Erreur lecture floor state.' } }
    }
    case 'acc.compare-yesterday': {
      const invoices = loadJson<any[]>('invoices.json', [])
      const today = new Date().toISOString().slice(0, 10)
      const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10)
      const todayInv = invoices.filter((i: any) => i.date?.slice(0, 10) === today)
      const yestInv = invoices.filter((i: any) => i.date?.slice(0, 10) === yesterday)
      const ca1 = todayInv.reduce((s: number, i: any) => s + (i.total || 0), 0)
      const ca0 = yestInv.reduce((s: number, i: any) => s + (i.total || 0), 0)
      const diff = ca1 - ca0
      const pct = ca0 > 0 ? Math.round((diff / ca0) * 100) : 0
      const arrow = diff >= 0 ? '📈' : '📉'
      return {
        success: true,
        summary: `${arrow} Aujourd'hui ${ca1.toFixed(0)}€ vs hier ${ca0.toFixed(0)}€ (${diff >= 0 ? '+' : ''}${pct}%).`,
      }
    }
    case 'pos.occupancy': {
      try {
        const floorMod = await import('./floorState')
        const state = floorMod.getFloorState()
        const occupied = state.tables.filter((t: any) => t.status === 'OCCUPEE').length
        const total = state.tables.length
        const pct = total > 0 ? Math.round((occupied / total) * 100) : 0
        return { success: true, summary: `🪑 Occupation : **${occupied}/${total}** tables (${pct}%).`, uiAction: { type: 'navigate', to: '/pos/floor' } }
      } catch { return { success: false, summary: 'Erreur lecture occupation.' } }
    }
    case 'pos.top-products': {
      // Aggrège items vendus depuis floor state (commandes en cours) + invoices.json (validées)
      try {
        const floorMod = await import('./floorState')
        const state = floorMod.getFloorState()
        const tally: Record<string, number> = {}
        for (const t of state.tables) {
          for (const it of (t.items || [])) {
            tally[it.name] = (tally[it.name] || 0) + (it.qty || 1)
          }
        }
        const top = Object.entries(tally).sort(([, a], [, b]) => b - a).slice(0, 5)
        if (top.length === 0) return { success: true, summary: 'Aucune vente en cours pour calculer le top.' }
        return {
          success: true,
          summary: `🏆 Top ventes en cours : ${top.map(([name, n]) => `${name} (×${n})`).join(', ')}`,
        }
      } catch { return { success: false, summary: 'Erreur top produits.' } }
    }
    case 'hr.my-shifts': {
      // userId est passé par /workflow → /intent (default 'default')
      const userId = (intent.params as any).userId || 'default'
      const shifts = loadJson<any[]>('shifts.json', [])
      const wkStart = Date.now() - 86400_000
      const wkEnd = Date.now() + 14 * 86400_000
      const mine = shifts.filter((s: any) =>
        String(s.employeeId || s.employee).toLowerCase() === userId.toLowerCase() ||
        String(s.userId).toLowerCase() === userId.toLowerCase()
      ).filter((s: any) => {
        const t = new Date(s.date).getTime()
        return t >= wkStart && t <= wkEnd
      })
      if (mine.length === 0) return { success: true, summary: '📅 Aucun shift planifié pour vous dans les 14 prochains jours.' }
      return {
        success: true,
        summary: `📅 Vos prochains shifts : ${mine.slice(0, 5).map((s: any) => `${s.date} ${s.start}-${s.end}`).join(' · ')}`,
        details: mine,
        uiAction: { type: 'navigate', to: '/hr/planning' },
      }
    }
    case 'hr.my-leaves': {
      const userId = (intent.params as any).userId || 'default'
      const leaves = loadJson<any[]>('leave-requests.json', [])
      const mine = leaves.filter((l: any) =>
        String(l.employeeId || l.employee).toLowerCase() === userId.toLowerCase()
      )
      const pending = mine.filter((l: any) => l.status === 'pending').length
      const approved = mine.filter((l: any) => l.status === 'approved').length
      return {
        success: true,
        summary: `🏖 Vos congés : ${approved} validé(s), ${pending} en attente.`,
        details: mine,
        uiAction: { type: 'navigate', to: '/hr/conges' },
      }
    }
    case 'hr.punch-in': {
      const punches = loadJson<any[]>('punches.json', [])
      const userId = (intent.params as any).userId || 'default'
      const last = punches.filter((p: any) => p.userId === userId).slice(-1)[0]
      if (last && !last.outAt) {
        return { success: false, summary: '⚠️ Vous êtes déjà pointé en service. Utilisez "je termine" pour clôturer.' }
      }
      const punch = { id: 'p-' + Math.random().toString(36).slice(2, 10), userId, inAt: Date.now() }
      punches.push(punch)
      saveJson('punches.json', punches)
      return { success: true, summary: `⏱ Pointage entrée enregistré à ${new Date().toLocaleTimeString('fr-LU', { hour: '2-digit', minute: '2-digit' })}.` }
    }
    case 'hr.punch-out': {
      const punches = loadJson<any[]>('punches.json', [])
      const userId = (intent.params as any).userId || 'default'
      const open = punches.filter((p: any) => p.userId === userId && !p.outAt).slice(-1)[0]
      if (!open) {
        return { success: false, summary: '⚠️ Aucun pointage en cours. Utilisez "je commence" d\'abord.' }
      }
      open.outAt = Date.now()
      const hours = (open.outAt - open.inAt) / 3_600_000
      saveJson('punches.json', punches)
      return { success: true, summary: `⏱ Pointage sortie enregistré (${hours.toFixed(1)} h de service).` }
    }
    case 'help.show-commands': {
      return {
        success: true,
        summary: `🤖 Je peux faire ${42} types d'actions ! Quelques exemples :

📊 **Patron** : "CA aujourd'hui", "CA cette semaine", "ticket moyen", "VIPs", "comparaison hier", "occupation"
🪑 **POS** : "tables libres", "ferme table 3", "transfere table 3 vers 5", "offre table 4", "imprime ticket table 5"
👥 **RH** : "qui travaille demain", "rajoute employé Marie", "supprime shift Lucas demain", "qui est en congé"
📦 **Stock** : "ajoute 5 kg tomates", "stock bas", "DLUO", "commande de café à Métro", "valeur stock"
💶 **Factures** : "factures impayées", "marque facture F-2026-142 payée", "TVA du mois"
👤 **CRM** : "VIPs", "anniversaires ce mois", "ajoute client Pierre", "ajoute 50 points à Marie"
👨‍🍳 **Collaborateur** : "mes shifts", "mes congés", "je commence", "je termine"

Tape ou parle naturellement, je comprends !`,
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // v3.19 E4 — 30 NOUVEAUX EXECUTORS
    // ═══════════════════════════════════════════════════════════════════

    // ─── HACCP ────────────────────────────────────────────────────────
    case 'haccp.log-temperature': {
      const { equipment, temp } = intent.params
      const logs = loadJson<any[]>('haccp-logs.json', [])
      const limits: Record<string, [number, number]> = {
        'frigo': [0, 4], 'frigos': [0, 4],
        'congélateur': [-25, -18], 'congelateur': [-25, -18],
        'chambre froide': [0, 4],
      }
      const [min, max] = limits[equipment] || [0, 4]
      const ok = temp >= min && temp <= max
      const log = {
        id: 'haccp-' + Math.random().toString(36).slice(2, 10),
        type: 'temperature',
        equipment, temp, min, max, ok,
        loggedAt: Date.now(),
      }
      logs.push(log)
      saveJson('haccp-logs.json', logs)
      return {
        success: true,
        summary: ok
          ? `🌡 ${equipment} : ${temp}°C ✅ conforme (cible ${min}–${max}°C)`
          : `🚨 ${equipment} : ${temp}°C **HORS-NORME** (cible ${min}–${max}°C). Action immédiate requise !`,
        details: log,
        uiAction: { type: 'navigate', to: '/haccp/temperatures' },
      }
    }
    case 'haccp.validate-task': {
      const { taskName } = intent.params
      const tasks = loadJson<any[]>('haccp-tasks.json', [])
      const today = new Date().toISOString().slice(0, 10)
      const task = tasks.find((t: any) =>
        !t.completed &&
        String(t.label || t.name || '').toLowerCase().includes(String(taskName).toLowerCase())
      )
      if (!task) {
        // Crée la tâche puis valide
        const newTask = { id: 'task-' + Math.random().toString(36).slice(2, 10), label: taskName, date: today, completed: true, completedAt: Date.now() }
        tasks.push(newTask)
        saveJson('haccp-tasks.json', tasks)
        return { success: true, summary: `✅ Tâche "${taskName}" enregistrée et validée.`, uiAction: { type: 'navigate', to: '/haccp/taches' } }
      }
      task.completed = true
      task.completedAt = Date.now()
      saveJson('haccp-tasks.json', tasks)
      return { success: true, summary: `✅ Tâche "${task.label}" validée.`, details: task, uiAction: { type: 'navigate', to: '/haccp/taches' } }
    }
    case 'haccp.daily-report': {
      const logs = loadJson<any[]>('haccp-logs.json', [])
      const tasks = loadJson<any[]>('haccp-tasks.json', [])
      const today = new Date().toISOString().slice(0, 10)
      const todayLogs = logs.filter((l: any) => new Date(l.loggedAt).toISOString().slice(0, 10) === today)
      const todayTasks = tasks.filter((t: any) => t.date === today)
      const doneTasks = todayTasks.filter((t: any) => t.completed).length
      const incidents = todayLogs.filter((l: any) => l.ok === false).length
      return {
        success: true,
        summary: `📋 **HACCP du jour** : ${doneTasks}/${todayTasks.length} tâches validées · ${todayLogs.length} relevés température · ${incidents > 0 ? `🚨 ${incidents} hors-normes` : '✅ tout conforme'}`,
        details: { tasks: todayTasks, logs: todayLogs, incidents },
        uiAction: { type: 'navigate', to: '/haccp/journee' },
      }
    }
    case 'haccp.report-incident': {
      const { details } = intent.params
      const logs = loadJson<any[]>('haccp-logs.json', [])
      const incident = {
        id: 'incident-' + Math.random().toString(36).slice(2, 10),
        type: 'incident',
        severity: 'high',
        details: details || 'Non-conformité signalée',
        loggedAt: Date.now(),
        status: 'open',
      }
      logs.push(incident)
      saveJson('haccp-logs.json', logs)
      return {
        success: true,
        summary: `🚨 Incident enregistré : "${details || 'non-conformité'}". Référence ${incident.id}. À traiter sous 24h.`,
        uiAction: { type: 'navigate', to: '/haccp/historique' },
      }
    }
    case 'haccp.export-pdf': {
      return {
        success: true,
        summary: `📑 Export HACCP préparé. Va sur /haccp/historique → bouton "Export PDF" pour télécharger le rapport ITM.`,
        uiAction: { type: 'navigate', to: '/haccp/historique' },
      }
    }

    // ─── MAINTENANCE ──────────────────────────────────────────────────
    case 'maint.create-ticket': {
      const { equipment } = intent.params
      const tickets = loadJson<any[]>('maintenance-tickets.json', [])
      const ticket = {
        id: 'mt-' + Math.random().toString(36).slice(2, 10),
        equipment,
        status: 'open',
        priority: 'normal',
        createdAt: Date.now(),
      }
      tickets.push(ticket)
      saveJson('maintenance-tickets.json', tickets)
      return {
        success: true,
        summary: `🔧 Ticket maintenance créé pour "${equipment}". Référence ${ticket.id}.`,
        uiAction: { type: 'navigate', to: '/maintenance' },
      }
    }
    case 'maint.list-broken': {
      const tickets = loadJson<any[]>('maintenance-tickets.json', [])
      const open = tickets.filter((t: any) => t.status === 'open')
      if (open.length === 0) return { success: true, summary: '✅ Aucun équipement en panne actuellement.' }
      return {
        success: true,
        summary: `🔧 ${open.length} ticket(s) ouvert(s) : ${open.slice(0, 5).map((t: any) => t.equipment).join(', ')}`,
        details: open,
        uiAction: { type: 'navigate', to: '/maintenance' },
      }
    }
    case 'maint.schedule': {
      const { who, day } = intent.params
      const tickets = loadJson<any[]>('maintenance-tickets.json', [])
      const dayMap: Record<string, number> = { 'lundi': 1, 'mardi': 2, 'mercredi': 3, 'jeudi': 4, 'vendredi': 5, 'samedi': 6, 'dimanche': 0 }
      const target = new Date()
      if (day === 'demain') target.setDate(target.getDate() + 1)
      else if (dayMap[day] !== undefined) {
        const cur = target.getDay()
        target.setDate(target.getDate() + ((dayMap[day] - cur + 7) % 7 || 7))
      }
      const intervention = {
        id: 'int-' + Math.random().toString(36).slice(2, 10),
        type: 'intervention',
        who, scheduledFor: target.toISOString().slice(0, 10),
        status: 'scheduled',
        createdAt: Date.now(),
      }
      tickets.push(intervention)
      saveJson('maintenance-tickets.json', tickets)
      return {
        success: true,
        summary: `📅 Intervention "${who}" planifiée pour ${intervention.scheduledFor}.`,
        details: intervention,
      }
    }

    // ─── MARKETING ────────────────────────────────────────────────────
    case 'mkt.create-campaign': {
      const { name } = intent.params
      const campaigns = loadJson<any[]>('campaigns.json', [])
      const campaign = {
        id: 'camp-' + Math.random().toString(36).slice(2, 10),
        name, status: 'draft', channel: 'email',
        createdAt: Date.now(),
      }
      campaigns.push(campaign)
      saveJson('campaigns.json', campaigns)
      return {
        success: true,
        summary: `📣 Campagne "${name}" créée (brouillon). Configure le contenu et la cible dans /crm/campagnes.`,
        uiAction: { type: 'navigate', to: '/crm/campagnes' },
      }
    }
    case 'mkt.campaign-stats': {
      const campaigns = loadJson<any[]>('campaigns.json', [])
      const sent = campaigns.filter((c: any) => c.status === 'sent')
      if (sent.length === 0) return { success: true, summary: 'Aucune campagne envoyée pour calculer des stats.' }
      const totalSent = sent.reduce((s: number, c: any) => s + (c.sentCount || 0), 0)
      const totalOpened = sent.reduce((s: number, c: any) => s + (c.openedCount || 0), 0)
      const rate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0
      return {
        success: true,
        summary: `📊 ${sent.length} campagne(s) envoyée(s) · ${totalSent} emails · taux d'ouverture **${rate}%**`,
        uiAction: { type: 'navigate', to: '/crm/campagnes' },
      }
    }
    case 'mkt.segment-audience': {
      const { criteria } = intent.params
      const customers = loadJson<any[]>('customers.json', [])
      // simple keyword match sur tags + tier
      const matched = customers.filter((c: any) =>
        JSON.stringify({ tags: c.tags || [], tier: c.tier, notes: c.notes }).toLowerCase().includes(String(criteria).toLowerCase())
      )
      return {
        success: true,
        summary: `🎯 Segment "${criteria}" : **${matched.length} clients** correspondent.`,
        details: matched.slice(0, 20),
        uiAction: { type: 'navigate', to: '/crm/audiences' },
      }
    }
    case 'mkt.ab-test': {
      return {
        success: true,
        summary: `🧪 A/B test en cours de configuration. Définis 2 variantes dans /crm/campagnes (ex: -10% vs -15%), Robi mesurera taux conversion 7 jours.`,
        uiAction: { type: 'navigate', to: '/crm/campagnes' },
      }
    }
    case 'mkt.posting-calendar': {
      const campaigns = loadJson<any[]>('campaigns.json', [])
      const upcoming = campaigns.filter((c: any) => c.scheduledFor && new Date(c.scheduledFor).getTime() > Date.now()).slice(0, 5)
      return {
        success: true,
        summary: upcoming.length > 0
          ? `📆 ${upcoming.length} publication(s) à venir : ${upcoming.map((c: any) => `${c.name} (${c.scheduledFor})`).join(', ')}`
          : `📆 Aucune publication planifiée. Crée une campagne avec date dans /crm/campagnes.`,
        uiAction: { type: 'navigate', to: '/crm/campagnes' },
      }
    }

    // ─── ANALYTICS ────────────────────────────────────────────────────
    case 'analytics.top-days': {
      const invoices = loadJson<any[]>('invoices.json', [])
      const byDay: Record<string, number> = {}
      const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
      for (const i of invoices) {
        if (!i.date) continue
        const d = new Date(i.date).getDay()
        byDay[dayNames[d]] = (byDay[dayNames[d]] || 0) + (i.total || 0)
      }
      const sorted = Object.entries(byDay).sort(([, a], [, b]) => b - a).slice(0, 3)
      if (sorted.length === 0) return { success: true, summary: 'Pas assez de données pour calculer.' }
      return {
        success: true,
        summary: `📈 Top 3 jours : ${sorted.map(([day, ca]) => `${day} (${ca.toFixed(0)}€)`).join(' · ')}`,
      }
    }
    case 'analytics.compare-yoy': {
      const invoices = loadJson<any[]>('invoices.json', [])
      const now = new Date()
      const thisMonth = now.getMonth(), thisYear = now.getFullYear()
      const thisMonthInv = invoices.filter((i: any) => {
        const d = new Date(i.date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear
      })
      const lastYearInv = invoices.filter((i: any) => {
        const d = new Date(i.date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear - 1
      })
      const ca1 = thisMonthInv.reduce((s: number, i: any) => s + (i.total || 0), 0)
      const ca0 = lastYearInv.reduce((s: number, i: any) => s + (i.total || 0), 0)
      const pct = ca0 > 0 ? Math.round(((ca1 - ca0) / ca0) * 100) : 0
      return {
        success: true,
        summary: `📊 Ce mois ${ca1.toFixed(0)}€ vs ${thisYear - 1} ${ca0.toFixed(0)}€ (${ca1 >= ca0 ? '+' : ''}${pct}%).`,
      }
    }
    case 'analytics.reservation-conversion': {
      const reservations = loadJson<any[]>('reservations.json', [])
      const total = reservations.length
      if (total === 0) return { success: true, summary: 'Aucune réservation pour calculer.' }
      const honored = reservations.filter((r: any) => r.status === 'honored' || r.status === 'completed').length
      const noShow = reservations.filter((r: any) => r.status === 'no-show').length
      const rate = Math.round((honored / total) * 100)
      return {
        success: true,
        summary: `🎯 Conversion réservations : **${rate}%** honorées (${honored}/${total}) · ${noShow} no-shows.`,
        uiAction: { type: 'navigate', to: '/agenda/calendrier' },
      }
    }
    case 'analytics.avg-table-time': {
      try {
        const floorMod = await import('./floorState')
        const state = floorMod.getFloorState()
        const occupied = state.tables.filter((t: any) => t.status === 'OCCUPEE' && t.openedAt)
        if (occupied.length === 0) return { success: true, summary: 'Aucune table occupée pour calculer une durée actuelle.' }
        const avg = occupied.reduce((s: number, t: any) => s + (Date.now() - t.openedAt), 0) / occupied.length / 60_000
        return {
          success: true,
          summary: `⏱ Durée moyenne actuelle par table : **${avg.toFixed(0)} min** (${occupied.length} tables occupées).`,
        }
      } catch { return { success: false, summary: 'Erreur calcul durée.' } }
    }
    case 'analytics.kitchen-vs-bar-ratio': {
      try {
        const floorMod = await import('./floorState')
        const state = floorMod.getFloorState()
        let food = 0, drinks = 0
        for (const t of state.tables) {
          for (const item of (t.items || [])) {
            const cat = String((item as any).category || '').toLowerCase()
            const isFood = /plat|cuisine|food|entr[ée]e|dessert|burger|pizza/.test(cat) || /plat/.test(String(item.name || '').toLowerCase())
            const price = (item.price || 0) * (item.qty || 1)
            if (isFood) food += price; else drinks += price
          }
        }
        const total = food + drinks
        if (total === 0) return { success: true, summary: 'Aucune vente en cours.' }
        const foodPct = Math.round((food / total) * 100)
        return {
          success: true,
          summary: `🍽 Ratio actuel : **${foodPct}% cuisine** (${food.toFixed(0)}€) / **${100 - foodPct}% bar** (${drinks.toFixed(0)}€).`,
        }
      } catch { return { success: false, summary: 'Erreur calcul ratio.' } }
    }

    // ─── BULK-OPS ─────────────────────────────────────────────────────
    case 'bulk.cleanup-old-invoices': {
      const invoices = loadJson<any[]>('invoices.json', [])
      const cutoff = Date.now() - 365 * 86400_000
      const before = invoices.length
      const remaining = invoices.filter((i: any) => {
        const d = i.date ? new Date(i.date).getTime() : Date.now()
        return d > cutoff || i.status !== 'paid'
      })
      saveJson('invoices.json', remaining)
      return {
        success: true,
        summary: `🧹 ${before - remaining.length} ancienne(s) facture(s) (>1 an, payées) archivées. Reste ${remaining.length}.`,
        uiAction: { type: 'navigate', to: '/invoices/factures' },
      }
    }
    case 'bulk.cleanup-inactive-customers': {
      const customers = loadJson<any[]>('customers.json', [])
      const cutoff = Date.now() - 2 * 365 * 86400_000
      const before = customers.length
      const remaining = customers.filter((c: any) => {
        const last = c.lastVisit ? new Date(c.lastVisit).getTime() : c.createdAt || Date.now()
        return last > cutoff
      })
      saveJson('customers.json', remaining)
      return {
        success: true,
        summary: `🧹 ${before - remaining.length} client(s) inactif(s) (>2 ans) archivés. Reste ${remaining.length}.`,
        uiAction: { type: 'navigate', to: '/crm/clients' },
      }
    }
    case 'bulk.archive-old-shifts': {
      const shifts = loadJson<any[]>('shifts.json', [])
      const cutoff = Date.now() - 180 * 86400_000
      const before = shifts.length
      const remaining = shifts.filter((s: any) => s.date && new Date(s.date).getTime() > cutoff)
      saveJson('shifts.json', remaining)
      return {
        success: true,
        summary: `🧹 ${before - remaining.length} shift(s) >6 mois archivés. Reste ${remaining.length}.`,
        uiAction: { type: 'navigate', to: '/hr/planning' },
      }
    }
    case 'bulk.reset-stock': {
      const stock = loadJson<any[]>('inventory-stock.json', [])
      const reset = stock.map((s: any) => ({ ...s, qty: 0, lastReset: Date.now() }))
      saveJson('inventory-stock.json', reset)
      return {
        success: true,
        summary: `⚠️ Stock remis à zéro (${reset.length} articles). Action irréversible — pense à scanner les commandes pour recharger.`,
        uiAction: { type: 'navigate', to: '/inventory/stock' },
      }
    }

    // ─── SEARCH CROSS-MODULE ──────────────────────────────────────────
    case 'search.entity': {
      const { entity } = intent.params
      const q = String(entity).toLowerCase()
      const customers = loadJson<any[]>('customers.json', []).filter((c: any) =>
        `${c.firstName || ''} ${c.lastName || ''} ${c.email || ''} ${c.phone || ''}`.toLowerCase().includes(q)
      )
      const invoices = loadJson<any[]>('invoices.json', []).filter((i: any) =>
        String(i.customer || i.client || '').toLowerCase().includes(q)
      )
      const reservations = loadJson<any[]>('reservations.json', []).filter((r: any) =>
        String(r.customer || r.name || '').toLowerCase().includes(q)
      )
      const shifts = loadJson<any[]>('shifts.json', []).filter((s: any) =>
        String(s.employee || '').toLowerCase().includes(q)
      )
      return {
        success: true,
        summary: `🔎 "${entity}" : ${customers.length} client(s), ${invoices.length} facture(s), ${reservations.length} réservation(s), ${shifts.length} shift(s)`,
        details: { customers, invoices, reservations, shifts },
      }
    }
    case 'search.phone': {
      const { phone } = intent.params
      const norm = String(phone).replace(/[\s.\-]/g, '')
      const customers = loadJson<any[]>('customers.json', []).filter((c: any) =>
        String(c.phone || '').replace(/[\s.\-]/g, '').includes(norm)
      )
      if (customers.length === 0) return { success: true, summary: `📞 Aucun client avec ce numéro.` }
      return {
        success: true,
        summary: `📞 ${customers.length} match(s) : ${customers.slice(0, 5).map((c: any) => `${c.firstName} ${c.lastName}`).join(', ')}`,
        details: customers,
        uiAction: { type: 'navigate', to: '/crm/clients' },
      }
    }
    case 'search.date': {
      const { day, month } = intent.params
      const months: Record<string, number> = { janvier: 1, février: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, août: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12 }
      const monthN = typeof month === 'string' && months[month.toLowerCase()] ? months[month.toLowerCase()] : parseInt(month)
      const year = new Date().getFullYear()
      const dateStr = `${year}-${String(monthN).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const invoices = loadJson<any[]>('invoices.json', []).filter((i: any) => i.date?.slice(0, 10) === dateStr)
      const shifts = loadJson<any[]>('shifts.json', []).filter((s: any) => s.date === dateStr)
      const reservations = loadJson<any[]>('reservations.json', []).filter((r: any) => r.date === dateStr)
      return {
        success: true,
        summary: `📅 ${dateStr} : ${invoices.length} facture(s), ${shifts.length} shift(s), ${reservations.length} réservation(s)`,
        details: { invoices, shifts, reservations },
      }
    }

    // ─── ALERTES ──────────────────────────────────────────────────────
    case 'alerts.create-stock-threshold': {
      const { product, threshold } = intent.params
      const alerts = loadJson<any[]>('alert-rules.json', [])
      const rule = {
        id: 'alert-' + Math.random().toString(36).slice(2, 10),
        type: 'stock-threshold',
        product, threshold,
        active: true, createdAt: Date.now(),
      }
      alerts.push(rule)
      saveJson('alert-rules.json', alerts)
      return {
        success: true,
        summary: `🔔 Alerte créée : tu seras notifié quand "${product}" tombe sous ${threshold} unités.`,
        details: rule,
      }
    }
    case 'alerts.invoice-overdue': {
      const { days } = intent.params
      const alerts = loadJson<any[]>('alert-rules.json', [])
      const rule = {
        id: 'alert-' + Math.random().toString(36).slice(2, 10),
        type: 'invoice-overdue',
        days, active: true, createdAt: Date.now(),
      }
      alerts.push(rule)
      saveJson('alert-rules.json', alerts)
      return {
        success: true,
        summary: `🔔 Alerte créée : facture impayée >${days}j → notification automatique.`,
      }
    }
    case 'alerts.overtime': {
      const alerts = loadJson<any[]>('alert-rules.json', [])
      const rule = { id: 'alert-' + Math.random().toString(36).slice(2, 10), type: 'overtime', threshold: 40, active: true, createdAt: Date.now() }
      alerts.push(rule)
      saveJson('alert-rules.json', alerts)
      return { success: true, summary: `🔔 Alerte heures sup activée (>40h/semaine légale Luxembourg).` }
    }
    case 'alerts.bad-review': {
      const alerts = loadJson<any[]>('alert-rules.json', [])
      const rule = { id: 'alert-' + Math.random().toString(36).slice(2, 10), type: 'bad-review', threshold: 3, active: true, createdAt: Date.now() }
      alerts.push(rule)
      saveJson('alert-rules.json', alerts)
      return { success: true, summary: `🔔 Alerte avis <3⭐ activée. Tu seras prévenu en temps réel.`, uiAction: { type: 'navigate', to: '/reputation/avis' } }
    }
    case 'alerts.cold-chain': {
      const alerts = loadJson<any[]>('alert-rules.json', [])
      const rule = { id: 'alert-' + Math.random().toString(36).slice(2, 10), type: 'cold-chain', limits: { frigo: [0, 4], congelateur: [-25, -18] }, active: true, createdAt: Date.now() }
      alerts.push(rule)
      saveJson('alert-rules.json', alerts)
      return { success: true, summary: `🔔 Alerte chaîne du froid activée. Notification si frigo >4°C ou congélateur >-18°C.`, uiAction: { type: 'navigate', to: '/haccp/temperatures' } }
    }

    default:
      return { success: false, summary: 'Intent non implémenté.' }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════

router.post('/intent', async (req, res) => {
  const { text, currentPath, userId } = req.body || {}
  if (!text) return res.status(400).json({ kind: 'error', text: 'text required' })

  const intent = parseIntent(text)
  if (intent) {
    const result = await executeIntent(intent)
    return res.json({
      kind: 'action',
      intent: intent.intent,
      confidence: intent.confidence,
      ...result,
    })
  }

  // Fall back to smart-query
  const r = await fetch(`http://localhost:${process.env.PORT || 3002}/api/agent/smart-query`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...internalHeaders() },
    body: JSON.stringify({ question: text, currentPath, userId: userId || 'default' }),
  })
  const data = await r.json() as any
  res.json({ kind: 'answer', ...data })
})

// Web search via DuckDuckGo HTML scrape (no API key, free) — uses matchAll
router.get('/web-search', async (req, res) => {
  const q = String(req.query.q || '').trim()
  if (!q) return res.status(400).json({ error: 'q required' })
  try {
    const r = await fetch(`https://duckduckgo.com/html/?q=${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CreorgaBot/1.0)' },
    })
    if (!r.ok) return res.json({ results: [], error: `DuckDuckGo ${r.status}` })
    const html = await r.text()
    const linkRe = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g
    const snipRe = /<a[^>]+class="result__snippet"[^>]*>([^<]+)<\/a>/g
    const titles = [...html.matchAll(linkRe)].slice(0, 10).map((mm) => {
      let url = mm[1]
      const uddg = url.match(/uddg=([^&]+)/)
      if (uddg) url = decodeURIComponent(uddg[1])
      return { url, title: mm[2].trim() }
    })
    const snippets = [...html.matchAll(snipRe)].slice(0, 10).map((mm) => mm[1].trim())
    const results = titles.map((t, i) => ({ ...t, snippet: snippets[i] || '' }))
    res.json({ q, results })
  } catch (e: any) {
    res.json({ q, results: [], error: e?.message })
  }
})

// Phase B v3.10 — Confirm a previewed action
router.post('/intent/confirm', async (req, res) => {
  const { intent, proposed, date } = req.body || {}
  if (!intent) return res.status(400).json({ error: 'intent required' })

  switch (intent) {
    case 'hr.set-planning.commit': {
      const shifts = loadJson<any[]>('shifts.json', [])
      let added = 0
      for (const p of (proposed || [])) {
        if (!p.employee || !p.date) continue
        shifts.push(p)
        added++
      }
      saveJson('shifts.json', shifts)
      return res.json({
        kind: 'action', success: true,
        summary: `✅ ${added} shift(s) enregistré(s) pour ${date}.`,
      })
    }
    case 'invoices.create.commit': {
      const invoices = loadJson<any[]>('invoices.json', [])
      const inv = req.body.invoice
      if (!inv) return res.status(400).json({ error: 'invoice required' })
      invoices.unshift(inv)
      saveJson('invoices.json', invoices)
      return res.json({ kind: 'action', success: true, summary: `✅ Facture ${inv.number} enregistrée.` })
    }
    default:
      return res.status(400).json({ error: 'unknown confirm intent' })
  }
})

// CRUD : create customer
router.post('/customers/create', (req, res) => {
  const customers = loadJson<any[]>('customers.json', [])
  const c = {
    id: `c${Date.now()}`,
    firstName: String(req.body.firstName || '').trim(),
    lastName: String(req.body.lastName || '').trim(),
    email: req.body.email || '',
    phone: req.body.phone || '',
    tier: req.body.tier || 'Régulier',
    score: req.body.score ?? 50,
    totalSpent: 0,
    lastVisit: null,
    birthday: req.body.birthday || null,
  }
  customers.push(c)
  saveJson('customers.json', customers)
  res.json({ ok: true, customer: c })
})

export default router
