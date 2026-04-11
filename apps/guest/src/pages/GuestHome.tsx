import type { GuestTab } from '../App'
import { useGuest, store } from '../store'

const S = {
  page: { padding: '24px 20px' },
  hero: {
    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
    borderRadius: 20,
    padding: '32px 24px',
    color: '#fff',
    marginBottom: 24,
  },
  heroTitle: { fontSize: 24, fontWeight: 700, marginBottom: 6 },
  heroSub: { fontSize: 14, opacity: 0.8 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 12 },
  grid: { display: 'grid' as const, gridTemplateColumns: '1fr 1fr', gap: 12 },
  card: (bg: string) => ({
    background: bg,
    borderRadius: 16,
    padding: '20px 16px',
    cursor: 'pointer',
    border: 'none',
    textAlign: 'left' as const,
    transition: 'transform .15s',
  }),
  cardIcon: { fontSize: 28, marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: 600, color: '#1a1a2e' },
  cardDesc: { fontSize: 11, color: '#6b7280', marginTop: 4 },
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
          <button style={S.card('#ede9fe')} onClick={() => onNavigate('menu')}>
            <div style={S.cardIcon}>📋</div>
            <div style={S.cardTitle}>Voir le Menu</div>
            <div style={S.cardDesc}>Parcourez notre carte</div>
          </button>
          <button style={S.card('#dbeafe')} onClick={() => onNavigate('order')}>
            <div style={S.cardIcon}>🛒</div>
            <div style={S.cardTitle}>Commander</div>
            <div style={S.cardDesc}>Passez commande depuis votre table</div>
          </button>
          <button style={S.card('#fce7f3')} onClick={() => onNavigate('feedback')}>
            <div style={S.cardIcon}>⭐</div>
            <div style={S.cardTitle}>Laisser un Avis</div>
            <div style={S.cardDesc}>Partagez votre experience</div>
          </button>
          <button style={S.card('#d1fae5')} onClick={() => onNavigate('account')}>
            <div style={S.cardIcon}>🎁</div>
            <div style={S.cardTitle}>Fidelite</div>
            <div style={S.cardDesc}>Vos points & recompenses</div>
          </button>
        </div>
      </div>
    </div>
  )
}
