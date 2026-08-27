import { ArrowLeft, CheckCircle2, Construction } from 'lucide-react'
import { Link } from 'react-router-dom'

interface FeatureUnavailableProps {
  title: string
  availableNow?: string
  backPath?: string
  backLabel?: string
}

export default function FeatureUnavailable({
  title,
  availableNow,
  backPath = '/modules',
  backLabel = 'Retour aux modules',
}: FeatureUnavailableProps) {
  return (
    <main style={{
      minHeight: 'calc(100vh - 150px)',
      display: 'grid',
      placeItems: 'center',
      padding: '32px 20px',
      background: 'radial-gradient(circle at 50% 0%, rgba(99,102,241,.08), transparent 44%)',
    }}>
      <section style={{
        width: 'min(100%, 620px)',
        padding: '36px',
        border: '1px solid #e2e8f0',
        borderRadius: 24,
        background: 'rgba(255,255,255,.96)',
        boxShadow: '0 20px 60px rgba(15,23,42,.08)',
        textAlign: 'center',
      }}>
        <div aria-hidden="true" style={{
          width: 64,
          height: 64,
          margin: '0 auto 20px',
          borderRadius: 20,
          display: 'grid',
          placeItems: 'center',
          color: '#4f46e5',
          background: '#eef2ff',
        }}>
          <Construction size={30} />
        </div>

        <p style={{ margin: '0 0 8px', color: '#4f46e5', fontSize: 12, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>
          En préparation
        </p>
        <h1 style={{ margin: 0, color: '#0f172a', fontSize: 'clamp(24px, 4vw, 34px)', lineHeight: 1.15 }}>
          {title}
        </h1>
        <p style={{ margin: '16px auto 0', maxWidth: 500, color: '#64748b', fontSize: 15, lineHeight: 1.65 }}>
          Cet espace n'est pas encore relié à une sauvegarde fiable. Il reste volontairement indisponible pour éviter toute fausse confirmation ou perte de données.
        </p>

        {availableNow && (
          <div style={{
            margin: '24px 0 0',
            padding: '14px 16px',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            color: '#166534',
            background: '#f0fdf4',
            textAlign: 'left',
            fontSize: 14,
            lineHeight: 1.5,
          }}>
            <CheckCircle2 size={19} style={{ flex: '0 0 auto', marginTop: 1 }} />
            <span><strong>Disponible maintenant :</strong> {availableNow}</span>
          </div>
        )}

        <Link to={backPath} style={{
          marginTop: 28,
          minHeight: 44,
          padding: '0 18px',
          borderRadius: 12,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          color: '#fff',
          background: '#4f46e5',
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: 750,
        }}>
          <ArrowLeft size={17} />
          {backLabel}
        </Link>
      </section>
    </main>
  )
}
