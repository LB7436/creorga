import { useState } from 'react'

const S = {
  page: { padding: '20px 16px' },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#1a1a2e' },
  stars: { display: 'flex' as const, gap: 8, marginBottom: 20 },
  star: (active: boolean) => ({
    fontSize: 36,
    cursor: 'pointer',
    filter: active ? 'none' : 'grayscale(1)',
    opacity: active ? 1 : 0.3,
    transition: 'all .15s',
  }),
  textarea: {
    width: '100%',
    minHeight: 120,
    padding: '14px 16px',
    borderRadius: 14,
    border: '1px solid #e5e7eb',
    fontSize: 14,
    resize: 'vertical' as const,
    outline: 'none',
    fontFamily: 'inherit',
  },
  submitBtn: {
    width: '100%',
    padding: '16px 0',
    borderRadius: 14,
    border: 'none',
    background: '#6366f1',
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 20,
  },
  success: { textAlign: 'center' as const, padding: '60px 20px' },
  successIcon: { fontSize: 64, marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: 700, color: '#10b981', marginBottom: 8 },
  successSub: { fontSize: 14, color: '#6b7280' },
}

export default function FeedbackPage() {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit() {
    if (rating === 0) return
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div style={S.page}>
        <div style={S.success} className="fade-in">
          <div style={S.successIcon}>🎉</div>
          <div style={S.successTitle}>Merci pour votre avis !</div>
          <div style={S.successSub}>Votre retour nous aide a nous ameliorer</div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.page}>
      <div style={S.title}>Votre Avis</div>
      <div style={S.subtitle}>Comment s'est passee votre experience ?</div>

      <div style={S.section}>
        <div style={S.sectionTitle}>Note globale</div>
        <div style={S.stars}>
          {[1, 2, 3, 4, 5].map(n => (
            <span key={n} style={S.star(n <= rating)} onClick={() => setRating(n)}>⭐</span>
          ))}
        </div>
      </div>

      <div style={S.section}>
        <div style={S.sectionTitle}>Commentaire (optionnel)</div>
        <textarea
          style={S.textarea}
          placeholder="Partagez votre experience..."
          value={comment}
          onChange={e => setComment(e.target.value)}
        />
      </div>

      <button
        style={{ ...S.submitBtn, opacity: rating === 0 ? 0.4 : 1 }}
        disabled={rating === 0}
        onClick={handleSubmit}
      >
        Envoyer mon avis
      </button>
    </div>
  )
}
