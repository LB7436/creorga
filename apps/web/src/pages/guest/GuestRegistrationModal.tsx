import { useEffect, useState, type CSSProperties } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import {
  loadGuestClient,
  saveGuestClient,
  type GuestClientProfile,
  type GuestProvider,
} from './guestClient'

const BG = '#05050f'
const SURFACE = '#11111d'
const SURFACE2 = '#17172a'
const BORDER = 'rgba(168,85,247,0.22)'
const TEXT = '#f8fafc'
const MUTED = '#94a3b8'
const ACCENT = '#a855f7'

export default function GuestRegistrationModal({
  open,
  reason,
  onClose,
  onSaved,
}: {
  open: boolean
  reason: string
  onClose: () => void
  onSaved: (profile: GuestClientProfile) => void
}) {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [provider, setProvider] = useState<GuestProvider>('email')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    const saved = loadGuestClient()
    setDisplayName(saved?.displayName ?? '')
    setEmail(saved?.email ?? '')
    setPhone(saved?.phone ?? '')
    setProvider(saved?.provider ?? 'email')
    setTouched(false)
  }, [open])

  const valid = displayName.trim().length >= 2 && email.includes('@') && phone.trim().length >= 6

  const submit = () => {
    setTouched(true)
    if (!valid) return
    const profile = saveGuestClient({ displayName, email, phone, provider })
    onSaved(profile)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.72)' }}
          />
          <motion.div
            initial={{ y: 28, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 28, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            role="dialog"
            aria-modal="true"
            aria-label="Inscription client"
            style={{
              position: 'fixed',
              left: 12,
              right: 12,
              bottom: 12,
              zIndex: 81,
              maxWidth: 520,
              margin: '0 auto',
              background: BG,
              color: TEXT,
              border: `1px solid ${BORDER}`,
              borderRadius: 18,
              boxShadow: '0 24px 70px rgba(0,0,0,0.55)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 16, fontWeight: 800, marginBottom: 3 }}>Inscription client</p>
                <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.4 }}>{reason}</p>
              </div>
              <button onClick={onClose} aria-label="Fermer" style={{ width: 34, height: 34, borderRadius: 12, border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT, display: 'grid', placeItems: 'center' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 16, display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {([
                  ['email', 'Email'],
                  ['google', 'Google'],
                  ['apple', 'Apple'],
                ] as [GuestProvider, string][]).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setProvider(id)}
                    style={{
                      borderRadius: 12,
                      padding: '10px 8px',
                      border: `1px solid ${provider === id ? ACCENT : BORDER}`,
                      background: provider === id ? 'rgba(168,85,247,0.2)' : SURFACE,
                      color: TEXT,
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <label style={fieldLabel}>
                Nom joueur
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ex: Bryan" style={fieldInput} />
              </label>
              <label style={fieldLabel}>
                Email
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@email.com" inputMode="email" style={fieldInput} />
              </label>
              <label style={fieldLabel}>
                Numero mobile
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+352 ..." inputMode="tel" style={fieldInput} />
              </label>

              {touched && !valid && (
                <p style={{ color: '#fca5a5', fontSize: 12 }}>
                  Ajoutez un pseudo, un email valide et un numero mobile.
                </p>
              )}

              <button
                onClick={submit}
                style={{
                  width: '100%',
                  border: 'none',
                  borderRadius: 14,
                  padding: '13px 12px',
                  background: `linear-gradient(135deg, ${ACCENT}, #7c3aed)`,
                  color: '#fff',
                  fontWeight: 900,
                  fontSize: 14,
                }}
              >
                Continuer
              </button>
              <p style={{ color: MUTED, fontSize: 10.5, lineHeight: 1.45 }}>
                Le profil est enregistre dans Creorga cote client pour les commandes, avis, records et invitations. La connexion OAuth reelle pourra ensuite brancher Google/Apple sur la meme fiche.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

const fieldLabel: CSSProperties = {
  display: 'grid',
  gap: 6,
  color: MUTED,
  fontSize: 11,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: 0,
}

const fieldInput: CSSProperties = {
  width: '100%',
  borderRadius: 12,
  border: `1px solid ${BORDER}`,
  background: SURFACE2,
  color: TEXT,
  padding: '12px 12px',
  outline: 'none',
  fontSize: 14,
  fontWeight: 700,
}
