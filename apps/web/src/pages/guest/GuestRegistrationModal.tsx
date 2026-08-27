import { useEffect, useState, type CSSProperties } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import {
  loadGuestClient,
  saveGuestClient,
  type GuestClientProfile,
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
  companyId,
}: {
  open: boolean
  reason: string
  onClose: () => void
  onSaved: (profile: GuestClientProfile) => void
  companyId: string
}) {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    const saved = loadGuestClient(companyId)
    setDisplayName(saved?.displayName ?? '')
    setEmail(saved?.email ?? '')
    setPhone(saved?.phone ?? '')
    setTouched(false)
    setError('')
  }, [open, companyId])

  const valid = displayName.trim().length >= 2 && email.includes('@') && phone.trim().length >= 6

  const submit = async () => {
    setTouched(true)
    if (!valid) return
    setSubmitting(true)
    setError('')
    try {
      const profile = await saveGuestClient({ displayName, email, phone, provider: 'email' }, companyId)
      onSaved(profile)
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Inscription impossible pour le moment.')
    } finally {
      setSubmitting(false)
    }
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
              <div style={{ borderRadius: 12, padding: '10px 12px', border: `1px solid ${ACCENT}`, background: 'rgba(168,85,247,0.2)', color: TEXT, fontSize: 12, fontWeight: 800 }}>
                Inscription par e-mail
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

              {error && <p role="alert" style={{ color: '#fca5a5', fontSize: 12 }}>{error}</p>}

              <button
                onClick={submit}
                disabled={submitting}
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
                {submitting ? 'Enregistrement…' : 'Continuer'}
              </button>
              <p style={{ color: MUTED, fontSize: 10.5, lineHeight: 1.45 }}>
                Le profil est enregistré dans l'entreprise indiquée par ce QR pour vos commandes et avis. Google OAuth n'est pas activé pour le moment.
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
