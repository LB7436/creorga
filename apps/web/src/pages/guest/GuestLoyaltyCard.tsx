import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'
const REWARD_THRESHOLD = 500

/**
 * v5.0.5 — Points fidélité visibles côté client (lookup par téléphone).
 */
export default function GuestLoyaltyCard({ phone, companyId }: { phone: string; companyId: string }) {
  const [points, setPoints] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    fetch(`${BACKEND}/api/guest/loyalty/${encodeURIComponent(phone)}?companyId=${encodeURIComponent(companyId)}`)
      .then((r) => r.json())
      .then((data) => { if (alive) setPoints(data.points ?? 0) })
      .catch(() => { if (alive) setPoints(null) })
    return () => { alive = false }
  }, [phone, companyId])

  if (!points) return null

  const remaining = Math.max(0, REWARD_THRESHOLD - points)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
      borderRadius: 999, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)',
      fontSize: 11, color: '#fbbf24', fontWeight: 700, margin: '8px 0',
    }}>
      <Star size={13} fill="#fbbf24" />
      {points} pts — {remaining > 0 ? `plus que ${remaining} pour une récompense` : 'récompense disponible !'}
    </div>
  )
}
