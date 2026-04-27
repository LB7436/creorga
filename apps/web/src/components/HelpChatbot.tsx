import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { MessageCircle, X, Send, Sparkles, Loader2 } from 'lucide-react'

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

/**
 * Help Chatbot — floating "agent" available on every page.
 * Detects current route, sends it as context to Gemma so the bot knows
 * which module the user is on and gives tailored guidance.
 *
 *   "Sur /pos : 'Comment offrir un plat ?' → explique le bouton 🎁 Offert"
 *   "Sur /crm : 'Comment relancer un client ?' → menu IA Score & Relance"
 *
 * Uses POST /api/ai/run-action with actionId 'help.guide' (added to backend).
 * Falls back to a static FAQ map if the backend is offline.
 */

const FAQ_BY_PATH: Record<string, { q: string; a: string }[]> = {
  '/modules': [
    { q: 'Comment ouvrir un module ?', a: 'Cliquez sur la carte du module dans la grille. Utilisez la barre de recherche pour filtrer.' },
    { q: 'Comment activer/désactiver un module ?', a: 'Allez dans Paramètres → Modules. Le toggle en haut de la grille filtre les modules visibles.' },
  ],
  '/pos': [
    { q: 'Comment offrir un plat ?', a: 'Dans le panier, ouvrez le panneau Remise → onglet 🎁 Offert. Le montant est exclu du CA et tracé en comptabilité.' },
    { q: 'Comment fusionner deux tables ?', a: 'Drag-and-drop une table sur l\'autre. Une modal vous demandera de confirmer.' },
    { q: 'Pourquoi des tables sont marquées NETTOYAGE automatiquement ?', a: 'Le janitor auto-clôture les sessions ouvertes > 8 h sans encaissement (anti-bug timer aberrant).' },
  ],
  '/crm/clients': [
    { q: 'Comment marquer un client VIP ?', a: 'Cliquez sur le client → onglet Profil → Tier "VIP". Ou utilisez le bouton "IA Clients" qui scorera automatiquement.' },
    { q: 'Comment relancer un client perdu ?', a: 'Bouton "IA Clients" → "Message de relance". Gemma rédige un message personnalisé que vous pouvez approuver.' },
  ],
  '/marketing': [
    { q: 'Comment créer une campagne ?', a: 'Bouton "Nouvelle campagne". Pour un contenu généré IA : "IA Marketing" → "Rédiger une campagne".' },
  ],
  '/accounting/depenses': [
    { q: 'Comment catégoriser automatiquement une dépense ?', a: 'Bouton "IA Compta" → "Catégoriser dépense" (PCN luxembourgeois + détection TVA 3/8/14/17 %).' },
  ],
  '/reputation/avis': [
    { q: 'Comment répondre rapidement aux avis ?', a: 'Bouton "IA Avis" → "Réponds avis". Gemma rédige une réponse polie en 4 langues (FR/DE/EN/PT).' },
  ],
  '/hr/planning': [
    { q: 'Comment importer un planning manuscrit ?', a: 'Bouton "📸 Importer planning OCR" — prenez une photo du tableau, l\'OCR + Gemma extrait les shifts.' },
    { q: 'Comment optimiser un planning ?', a: 'Bouton "Auto-planifier (IA)" — Gemma propose une affectation respectant les contraintes 35h/semaine.' },
  ],
  '/inventory': [
    { q: 'Comment scanner un ticket fournisseur ?', a: 'Bouton "📸 Scanner OCR" — l\'IA Gemma reconnaît articles, quantités et prix automatiquement.' },
    { q: 'Comment prévoir les ruptures ?', a: 'Le forecast quotidien analyse 90 jours d\'historique + météo. Bandeau orange si conso > stock disponible J+1.' },
  ],
  '/ai': [
    { q: 'Local Gemma vs Cloud Claude, lequel choisir ?', a: 'Local Gemma → 100 % privé (CNPD), gratuit, ~2 s. Cloud Claude → meilleure qualité, ~3 s. "Auto" route selon le besoin.' },
    { q: 'Comment changer de modèle ?', a: 'Le toggle "Provider" en haut à gauche. Persisté dans localStorage.' },
  ],
}

const DEFAULT_FAQS = [
  { q: 'Que fait Creorga OS ?', a: 'Plateforme tout-en-un pour restaurant : POS, plan de salle, stocks, HACCP, comptabilité, IA — 35+ modules, conforme CNPD Luxembourg.' },
  { q: 'Comment activer le mode sombre ?', a: 'Cliquez sur l\'icône 🌙 dans le header. L\'app re-thème immédiatement (overlay CSS).' },
  { q: 'Où sont les jeux clients ?', a: '15 jeux jouables sur le portail invité (5176/5178) — Slots, Blackjack, Roulette, Poker, Tetris, Sueca, etc.' },
]

interface ChatMsg { role: 'user' | 'bot'; text: string; ts: number }

export default function HelpChatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const location = useLocation()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Suggested FAQ for current path
  const suggestions = (() => {
    const exact = FAQ_BY_PATH[location.pathname]
    if (exact) return exact
    // Match by prefix
    const prefixMatch = Object.keys(FAQ_BY_PATH).find((k) => location.pathname.startsWith(k) && k !== '/')
    return prefixMatch ? FAQ_BY_PATH[prefixMatch] : DEFAULT_FAQS
  })()

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const ask = async (text: string) => {
    if (!text.trim() || busy) return
    setBusy(true)
    const userMsg: ChatMsg = { role: 'user', text, ts: Date.now() }
    setMessages((m) => [...m, userMsg])
    setInput('')

    try {
      const r = await fetch(`${BACKEND}/api/ai/run-action`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: 'help.guide',
          context: { question: text, currentPath: location.pathname, suggestions: suggestions.slice(0, 3).map((s) => s.q) },
        }),
      })
      const data = await r.json()
      const reply = data?.text || 'Je n\'ai pas trouvé de réponse claire. Essayez les suggestions ci-dessus ou consultez la documentation.'
      setMessages((m) => [...m, { role: 'bot', text: reply, ts: Date.now() }])
    } catch {
      // Fallback to static FAQ
      const match = suggestions.find((s) => text.toLowerCase().includes(s.q.toLowerCase().split(' ')[0]))
      const reply = match?.a || 'Backend IA hors-ligne. Voici les questions fréquentes pour cette page :\n\n' +
        suggestions.map((s) => `• ${s.q}`).join('\n')
      setMessages((m) => [...m, { role: 'bot', text: reply, ts: Date.now() }])
    } finally {
      setBusy(false)
    }
  }

  const askPreset = (q: string, a: string) => {
    setMessages((m) => [
      ...m,
      { role: 'user', text: q, ts: Date.now() },
      { role: 'bot', text: a, ts: Date.now() + 1 },
    ])
  }

  return (
    <>
      {/* Floating launcher */}
      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9998,
          width: 56, height: 56, borderRadius: '50%',
          background: open ? 'rgba(15,23,42,0.95)' : 'linear-gradient(135deg,#8b5cf6,#ec4899)',
          color: '#fff', border: 'none', cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(139,92,246,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        title="Aide Creorga"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="x" initial={{ rotate: -90 }} animate={{ rotate: 0 }} exit={{ rotate: 90 }}><X size={22} /></motion.span>
          ) : (
            <motion.span key="msg" initial={{ rotate: 90 }} animate={{ rotate: 0 }} exit={{ rotate: -90 }}><MessageCircle size={22} /></motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{
              position: 'fixed', bottom: 96, right: 24, zIndex: 9997,
              width: 380, maxWidth: 'calc(100vw - 48px)', height: 540, maxHeight: 'calc(100vh - 140px)',
              background: '#fff', borderRadius: 16,
              boxShadow: '0 24px 64px rgba(0,0,0,0.25), 0 0 0 1px rgba(15,23,42,0.06)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            <header style={{
              padding: '14px 16px', background: 'linear-gradient(135deg,#8b5cf6,#ec4899)',
              color: '#fff', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><Sparkles size={18} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>Agent Creorga</div>
                <div style={{ fontSize: 11, opacity: 0.9 }}>
                  Page : <code style={{ background: 'rgba(255,255,255,0.15)', padding: '1px 5px', borderRadius: 4 }}>{location.pathname}</code>
                </div>
              </div>
            </header>

            <div ref={scrollRef} style={{ flex: 1, padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, background: '#f8fafc' }}>
              {messages.length === 0 && (
                <>
                  <div style={{ padding: 12, background: '#fff', borderRadius: 12, fontSize: 13, color: '#1e293b', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    Bonjour 👋 Je suis votre agent Creorga.
                    Voici les questions les plus utiles sur cette page :
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                    {suggestions.map((s, i) => (
                      <button key={i} onClick={() => askPreset(s.q, s.a)}
                        style={{
                          textAlign: 'left', padding: '10px 12px', borderRadius: 10,
                          background: '#fff', border: '1px solid #e2e8f0',
                          fontSize: 12, color: '#475569', cursor: 'pointer',
                          transition: 'all .15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.background = '#faf5ff' }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff' }}>
                        💬 {s.q}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {messages.map((m, i) => (
                <div key={i} style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  padding: '10px 14px', borderRadius: 14,
                  background: m.role === 'user' ? 'linear-gradient(135deg,#8b5cf6,#ec4899)' : '#fff',
                  color: m.role === 'user' ? '#fff' : '#1e293b',
                  maxWidth: '85%', fontSize: 13, lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  boxShadow: m.role === 'bot' ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
                }}>
                  {m.text}
                </div>
              ))}
              {busy && (
                <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: 14, background: '#fff', display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 12 }}>
                  <Loader2 size={14} className="ai-spin" /> L'agent réfléchit…
                </div>
              )}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); ask(input) }}
              style={{ padding: 10, borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', gap: 6 }}>
              <input
                value={input} onChange={(e) => setInput(e.target.value)}
                placeholder="Posez votre question…"
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0',
                  fontSize: 13, outline: 'none',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#8b5cf6' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0' }}
              />
              <button type="submit" disabled={busy || !input.trim()}
                style={{
                  padding: '0 14px', borderRadius: 10, border: 'none',
                  background: busy || !input.trim() ? '#cbd5e1' : 'linear-gradient(135deg,#8b5cf6,#ec4899)',
                  color: '#fff', cursor: busy || !input.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes ai-spin { from { transform: rotate(0) } to { transform: rotate(360deg) } } .ai-spin { animation: ai-spin 1s linear infinite }`}</style>
    </>
  )
}
