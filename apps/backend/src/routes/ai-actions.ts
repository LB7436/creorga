import { Router } from 'express'

/**
 * Generic AI actions runner — single endpoint that takes an actionId + context
 * and dispatches to a Gemma prompt template.
 *
 * Each action has a metadata + prompt template. Quality flag controls model :
 *  - 'fast'  → gemma2:2b (default, ~2s)
 *  - 'best'  → gemma2:9b (more nuanced, ~10s)
 */

const router = Router()

interface ActionTemplate {
  id: string
  module: string
  label: string
  description: string
  buildPrompt: (ctx: any) => string
  quality?: 'fast' | 'best'
  format?: 'json' | 'text'
}

const TEMPLATES: ActionTemplate[] = [
  // ── CRM ──────────────────────────────────────────────────────────────────
  {
    id: 'crm.score-client', module: 'crm',
    label: 'Score & profil client',
    description: 'Évalue la valeur du client et suggère une action',
    buildPrompt: (ctx) => `Analyse ce client de restaurant et donne un score de fidélité.

Client : ${JSON.stringify(ctx)}

Réponds en JSON strict :
{ "score": 0-100, "tier": "Bronze|Silver|Gold|VIP", "nextAction": "phrase courte action recommandée", "insight": "1 phrase observation clé" }`,
    format: 'json',
  },
  {
    id: 'crm.relance-message', module: 'crm',
    label: 'Message de relance',
    description: 'Rédige un email/SMS personnalisé pour ré-engager',
    buildPrompt: (ctx) => `Rédige un message court (3 lignes) pour relancer ce client absent depuis ${ctx.daysAbsent || 60} jours.
Nom : ${ctx.name || 'Client'}
Plat préféré : ${ctx.favorite || 'inconnu'}
Ton : chaleureux, brasserie luxembourgeoise.

Réponds uniquement avec le texte du message, rien d'autre.`,
    format: 'text',
  },

  // ── Marketing ────────────────────────────────────────────────────────────
  {
    id: 'marketing.campaign', module: 'marketing',
    label: 'Rédiger une campagne',
    description: 'Génère une campagne marketing complète',
    buildPrompt: (ctx) => `Rédige une campagne marketing pour un restaurant luxembourgeois.

Objectif : ${ctx.goal || 'attirer plus de clients en semaine'}
Audience : ${ctx.audience || 'clients fidèles + nouveaux'}
Canal : ${ctx.channel || 'email + Instagram'}

Réponds en JSON strict :
{ "subject": "objet email accrocheur", "body": "corps de l'email 5-8 lignes", "instagram": "post court 2 lignes", "hashtags": "#tag1 #tag2 #tag3" }`,
    format: 'json',
  },

  // ── Comptabilité ─────────────────────────────────────────────────────────
  {
    id: 'accounting.categorize', module: 'accounting',
    label: 'Catégoriser dépense',
    description: 'Classe une dépense dans la bonne catégorie comptable',
    buildPrompt: (ctx) => `Catégorise cette dépense de restaurant luxembourgeois selon le PCN (plan comptable normalisé).

Description : ${ctx.description || ''}
Montant : ${ctx.amount || 0} EUR
Fournisseur : ${ctx.supplier || ''}

Réponds en JSON :
{ "category": "Achats matières|Énergie|Loyer|Salaires|Marketing|Maintenance|Autres", "vatRate": 3|8|14|17, "deductible": true|false, "note": "courte explication" }`,
    format: 'json',
  },

  // ── HR ────────────────────────────────────────────────────────────────────
  {
    id: 'hr.optimize-shifts', module: 'hr',
    label: 'Optimiser planning semaine',
    description: 'Suggère un planning équilibré',
    buildPrompt: (ctx) => `Optimise un planning hebdomadaire pour ${ctx.staffCount || 8} employés.
Couverture nécessaire : ${ctx.coverage || 'midi 12-14h, soir 19-23h, weekend renforcé'}
Contraintes : ${ctx.constraints || 'respecter 35h max, 2 jours OFF consécutifs'}

Réponds en JSON :
{ "summary": "résumé 2 phrases", "warnings": ["..."], "recommendations": ["..."] }`,
    format: 'json',
    quality: 'best',
  },

  // ── Réputation ───────────────────────────────────────────────────────────
  {
    id: 'reputation.respond-review', module: 'reputation',
    label: 'Répondre à un avis',
    description: 'Rédige une réponse polie et personnalisée',
    buildPrompt: (ctx) => `Rédige une réponse professionnelle à cet avis client (Google/Tripadvisor).

Avis : "${ctx.review || ''}"
Note : ${ctx.rating || 3}/5
Restaurant : ${ctx.restaurantName || 'Café um Rond-Point, Luxembourg'}
Ton : courtois, sincère, respectueux. Si avis négatif → reconnaître + proposer geste. Si positif → remercier chaleureusement.

Réponds uniquement avec le texte de la réponse, sans guillemets.`,
    format: 'text',
  },

  // ── Events ────────────────────────────────────────────────────────────────
  {
    id: 'events.budget-estimate', module: 'events',
    label: 'Estimer budget événement',
    description: 'Devis approximatif pour un événement privé',
    buildPrompt: (ctx) => `Estime le budget d'un événement privé en restaurant luxembourgeois.

Type : ${ctx.type || 'mariage'}
Personnes : ${ctx.guests || 50}
Menu : ${ctx.menuType || '3 plats + apéritif'}
Boissons : ${ctx.drinks || 'forfait vin + soft'}

Réponds en JSON :
{ "totalEstimate": montant_eur, "perGuest": montant_eur, "breakdown": { "food": x, "drinks": x, "service": x, "extras": x }, "note": "phrase remarque" }`,
    format: 'json',
  },

  // ── Inventory ─────────────────────────────────────────────────────────────
  {
    id: 'inventory.suggest-min', module: 'inventory',
    label: 'Stock min suggéré',
    description: 'Calcule un seuil minimum optimal',
    buildPrompt: (ctx) => `Pour un produit de stock restaurant, suggère un seuil minimum.

Produit : ${ctx.name || ''}
Conso moyenne / jour : ${ctx.dailyAvg || 0} ${ctx.unit || ''}
Délai livraison fournisseur : ${ctx.leadTime || 2} jours
Variabilité : ${ctx.variance || 'normale'}

Réponds en JSON :
{ "suggestedMin": nombre, "rationale": "phrase justification courte", "criticalDays": nombre }`,
    format: 'json',
  },

  // ── POS ──────────────────────────────────────────────────────────────────
  {
    id: 'pos.suggest-pairing', module: 'pos',
    label: 'Suggérer un accord',
    description: 'Suggestion plat/vin/boisson',
    buildPrompt: (ctx) => `Quel accord (vin, bière, soft) recommander avec ce plat ? 1 phrase courte.

Plat : ${ctx.dish || ''}
Réponds uniquement avec la phrase de recommandation, sans préambule.`,
    format: 'text',
  },
  {
    id: 'pos.allergens', module: 'pos',
    label: 'Vérifier allergènes',
    description: 'Liste les allergènes possibles d\'un plat',
    buildPrompt: (ctx) => `Liste les 14 allergènes UE potentiellement présents dans ce plat.

Plat : ${ctx.dish || ''}
Réponds en JSON : { "present": ["gluten","lait"], "possible": ["œuf"], "warning": "phrase courte" }`,
    format: 'json',
  },

  // ── Clients (portail) ────────────────────────────────────────────────────
  {
    id: 'clients.recommend-menu', module: 'clients',
    label: 'Recommandation menu',
    description: 'Suggère un menu pour un client',
    buildPrompt: (ctx) => `Suggère un menu (entrée + plat + dessert) à un client de brasserie luxembourgeoise.

Préférences : ${ctx.preferences || 'pas de restriction'}
Budget : ${ctx.budget || 35} EUR
Régime : ${ctx.diet || 'omnivore'}

Réponds en JSON : { "starter": "...", "main": "...", "dessert": "...", "totalPrice": montant, "reason": "phrase" }`,
    format: 'json',
  },

  // ── Formation ────────────────────────────────────────────────────────────
  {
    id: 'formation.quiz-haccp', module: 'formation',
    label: 'Quiz HACCP',
    description: 'Génère un quiz formation HACCP',
    buildPrompt: (ctx) => `Génère 3 questions de quiz HACCP pour le staff de cuisine.

Niveau : ${ctx.level || 'débutant'}

Réponds en JSON :
{ "questions": [{ "q": "...", "options": ["A","B","C","D"], "answer": "A", "explanation": "..." }] }`,
    format: 'json',
  },

  // ── HACCP ────────────────────────────────────────────────────────────────
  {
    id: 'haccp.daily-summary', module: 'haccp',
    label: 'Synthèse jour',
    description: 'Résumé HACCP de la journée',
    buildPrompt: (ctx) => `Rédige une synthèse HACCP courte (4 lignes) pour la journée.

Contrôles effectués : ${ctx.checks || 'températures, nettoyage, traçabilité'}
Anomalies : ${ctx.anomalies || 'aucune'}

Réponds en texte uniquement, format compte-rendu.`,
    format: 'text',
  },
]

// GET catalogue (frontend uses this to populate menus)
router.get('/catalogue', (_req, res) => {
  res.json({
    actions: TEMPLATES.map((t) => ({
      id: t.id, module: t.module, label: t.label, description: t.description, format: t.format || 'text',
    })),
  })
})

// POST run-action — generic dispatcher
router.post('/run-action', async (req, res) => {
  const { actionId, context, model } = req.body || {}
  const tpl = TEMPLATES.find((t) => t.id === actionId)
  if (!tpl) return res.status(404).json({ error: 'unknown action' })

  const prompt = tpl.buildPrompt(context || {})
  const useModel = model || (tpl.quality === 'best' ? 'gemma2:9b' : 'gemma2:2b')
  const isJson = tpl.format !== 'text'

  try {
    const r = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: useModel, prompt, stream: false,
        ...(isJson ? { format: 'json' } : {}),
      }),
    })
    if (!r.ok) {
      // fallback fast model if 9b not available
      if (useModel === 'gemma2:9b') {
        const r2 = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'gemma2:2b', prompt, stream: false, ...(isJson ? { format: 'json' } : {}) }),
        })
        if (!r2.ok) return res.status(500).json({ error: 'Ollama unavailable' })
        const data = await r2.json() as { response?: string }
        return finishResponse(res, data.response || '', tpl)
      }
      return res.status(500).json({ error: 'Ollama unavailable' })
    }
    const data = await r.json() as { response?: string }
    finishResponse(res, data.response || '', tpl)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

function finishResponse(res: any, raw: string, tpl: ActionTemplate) {
  if (tpl.format === 'text') {
    return res.json({ text: raw.trim(), actionId: tpl.id })
  }
  // JSON parse with fallback
  try { return res.json({ data: JSON.parse(raw), actionId: tpl.id, raw }) }
  catch {
    const m = raw.match(/\{[\s\S]*\}/)
    if (m) {
      try { return res.json({ data: JSON.parse(m[0]), actionId: tpl.id, raw }) } catch {}
    }
    return res.status(500).json({ error: 'Invalid JSON', raw, actionId: tpl.id })
  }
}

export default router
