import type { GuestTab } from '../App'
import { useGuest, store } from '../store'

const S = {
  page: { padding: '24px 20px' },
  hero: {
    backgroundImage: 'linear-gradient(135deg, rgba(91,95,240,0.9), rgba(124,58,237,0.74)), url(https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    borderRadius: 14,
    padding: '30px 22px',
    color: '#fff',
    marginBottom: 22,
    border: '1px solid rgba(255,255,255,0.16)',
    boxShadow: '0 20px 45px rgba(0,0,0,0.22)',
  },
  heroTitle: { fontSize: 24, fontWeight: 700, marginBottom: 6 },
  heroSub: { fontSize: 14, opacity: 0.8 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 },
  grid: { display: 'grid' as const, gridTemplateColumns: '1fr 1fr', gap: 12 },
  card: (bg: string) => ({
    background: bg,
    borderRadius: 12,
    padding: '20px 16px',
    cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.1)',
    textAlign: 'left' as const,
    transition: 'background-color .15s, border-color .15s',
  }),
  cardIcon: { fontSize: 28, marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: 700, color: '#f8fafc' },
  cardDesc: { fontSize: 11, color: '#cbd5e1', marginTop: 4 },
  tableInput: {
    display: 'flex' as const,
    gap: 8,
    marginTop: 12,
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    fontSize: 15,
    outline: 'none',
  },
  btn: {
    padding: '12px 20px',
    borderRadius: 12,
    border: 'none',
    background: '#6366f1',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
  },
}

export default function GuestHome({ onNavigate }: { onNavigate: (tab: GuestTab) => void }) {
  const guest = useGuest()

  return (
    <div style={S.page}>
      <div style={S.hero}>
        <div style={S.heroTitle}>Bienvenue !</div>
        <div style={S.heroSub}>
          {guest.tableCode ? `Table ${guest.tableCode}` : 'Scannez le QR ou entrez votre code table'}
        </div>
      </div>

      {!guest.tableCode && (
        <div style={S.section}>
          <div style={S.sectionTitle}>Votre table</div>
          <form style={S.tableInput} onSubmit={e => {
            e.preventDefault()
            const input = (e.currentTarget.elements.namedItem('code') as HTMLInputElement)
            if (input.value.trim()) {
              store.setTable(input.value.trim())
            }
          }}>
            <input name="code" placeholder="Code table (ex: T5)" style={S.input} />
            <button type="submit" style={S.btn}>OK</button>
          </form>
        </div>
      )}

      <div style={S.section}>
        <div style={S.sectionTitle}>Explorer</div>
        <div style={S.grid}>
          <button style={S.card('rgba(99,102,241,0.18)')} onClick={() => onNavigate('menu')}>
            <div style={S.cardIcon}>📋</div>
            <div style={S.cardTitle}>Voir le Menu</div>
            <div style={S.cardDesc}>Parcourez notre carte</div>
          </button>
          <button style={S.card('rgba(14,165,233,0.16)')} onClick={() => onNavigate('order')}>
            <div style={S.cardIcon}>🛒</div>
            <div style={S.cardTitle}>Commander</div>
            <div style={S.cardDesc}>Passez commande depuis votre table</div>
          </button>
          <button style={S.card('rgba(236,72,153,0.15)')} onClick={() => onNavigate('feedback')}>
            <div style={S.cardIcon}>⭐</div>
            <div style={S.cardTitle}>Laisser un Avis</div>
            <div style={S.cardDesc}>Partagez votre experience</div>
          </button>
          <button style={S.card('rgba(16,185,129,0.16)')} onClick={() => onNavigate('account')}>
            <div style={S.cardIcon}>🎁</div>
            <div style={S.cardTitle}>Fidelite</div>
            <div style={S.cardDesc}>Vos points & recompenses</div>
          </button>
        </div>
      </div>
    </div>
  )
}
