import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

/**
 * v5.0 — Page de retour Stripe Checkout après paiement à table.
 * Confirme au backend (notif staff) puis affiche un message de remerciement.
 */
export default function GuestPaidPage() {
  const [searchParams] = useSearchParams()
  const tableId = searchParams.get('table')

  useEffect(() => {
    if (!tableId) return
    fetch(`${BACKEND}/api/guest/paid-confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId }),
    }).catch(() => { /* best effort */ })
  }, [tableId])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      background: '#05050f', color: '#f8fafc', padding: 24, textAlign: 'center',
    }}>
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Check size={40} strokeWidth={3} color="#fff" />
      </motion.div>
      <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Paiement reçu, merci !</h1>
      <p style={{ color: '#94a3b8', fontSize: 14, maxWidth: 320 }}>
        Votre addition a été réglée{tableId ? ` pour la table ${tableId}` : ''}. Passez une excellente fin de journée.
      </p>
    </div>
  )
}
