import { useGuest, store } from '../store'

const S = {
  page: { padding: '20px 16px' },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 20 },
  card: {
    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
    borderRadius: 20,
    padding: '24px 20px',
    color: '#fff',
    marginBottom: 20,
  },
  cardTitle: { fontSize: 13, opacity: 0.8, marginBottom: 4 },
  points: { fontSize: 36, fontWeight: 800, marginBottom: 4 },
  pointsSub: { fontSize: 12, opacity: 0.7 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#1a1a2e' },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' as const },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    fontSize: 14,
    outline: 'none',
  },
  saveBtn: {
    padding: '12px 24px',
    borderRadius: 12,
    border: 'none',
    background: '#6366f1',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
  },
  info: {
    padding: '16px',
    borderRadius: 12,
    background: '#f9fafb',
    border: '1px solid #f3f4f6',
    marginBottom: 10,
  },
  infoRow: { display: 'flex' as const, justifyContent: 'space-between' as const, fontSize: 14, padding: '6px 0' },
}

export default function AccountPage() {
  const guest = useGuest()

  return (
    <div style={S.page}>
      <div style={S.title}>Mon Compte</div>

      <div style={S.card}>
        <div style={S.cardTitle}>Programme Fidelite</div>
        <div style={S.points}>0 pts</div>
        <div style={S.pointsSub}>Commandez pour cumuler des points</div>
      </div>

      <div style={S.section}>
        <div style={S.sectionTitle}>Informations</div>
        <div style={S.info}>
          <div style={S.infoRow}>
            <span style={{ color: '#6b7280' }}>Table</span>
            <span style={{ fontWeight: 600 }}>{guest.tableCode || '—'}</span>
          </div>
          <div style={S.infoRow}>
            <span style={{ color: '#6b7280' }}>Nom</span>
            <span style={{ fontWeight: 600 }}>{guest.guestName || '—'}</span>
          </div>
        </div>
      </div>

      <div style={S.section}>
        <div style={S.sectionTitle}>Votre nom (optionnel)</div>
        <form onSubmit={e => {
          e.preventDefault()
          const input = e.currentTarget.elements.namedItem('name') as HTMLInputElement
          if (input.value.trim()) store.setName(input.value.trim())
        }}>
          <div style={S.inputGroup}>
            <input name="name" placeholder="Votre prenom" style={S.input} defaultValue={guest.guestName || ''} />
          </div>
          <button type="submit" style={S.saveBtn}>Enregistrer</button>
        </form>
      </div>
    </div>
  )
}
