import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBrand } from '@/stores/brandStore'
import LogoUploader from '@/components/LogoUploader'

/**
 * First-run setup wizard — a client launches the app and is guided through:
 *   1) restaurant name + logo + accent color
 *   2) room layout designer (embedded from the POS 5175 FloorPlanEditor)
 *   3) Ollama AI configuration
 *   4) done → admin panel
 */
type Step = 1 | 2 | 3 | 4

export default function SetupWizard() {
  const [step, setStep] = useState<Step>(1)
  const [restaurantName, setRestaurantName] = useState('Café um Rond-Point')
  const brand = useBrand()
  const nav = useNavigate()

  const finish = () => {
    localStorage.setItem('creorga-onboarded', '1')
    nav('/modules')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(145deg, #0a0a1a 0%, #1a0a2e 50%, #0d0b24 100%)', color: '#f1f5f9', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Creorga OS — Configuration initiale</div>
            <div style={{ fontSize: 12, color: '#a78bfa' }}>Étape {step}/4</div>
          </div>
        </div>
        <button onClick={finish} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.3)', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontSize: 13 }}>
          Passer cette étape
        </button>
      </header>

      {/* Progress */}
      <div style={{ height: 4, background: 'rgba(148,163,184,0.1)' }}>
        <div style={{ width: `${(step / 4) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #ec4899)', transition: 'width .3s' }} />
      </div>

      {/* Content */}
      <main style={{ flex: 1, padding: '40px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
        {step === 1 && (
          <Card title="👋 Bienvenue !" subtitle="Commençons par quelques informations sur votre établissement.">
            <label style={label}>Nom du restaurant / café</label>
            <input
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              style={input}
            />
            <label style={{ ...label, marginTop: 20 }}>Logo</label>
            <LogoUploader />
            <label style={{ ...label, marginTop: 20 }}>Couleur d'accent</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {['#10b981', '#6366f1', '#8b5cf6', '#f59e0b', '#ec4899', '#0ea5e9'].map((c) => (
                <button key={c}
                  onClick={() => brand.setAccent(c)}
                  style={{ width: 44, height: 44, borderRadius: 10, border: brand.accentColor === c ? '3px solid #fff' : '2px solid rgba(255,255,255,0.1)', background: c, cursor: 'pointer' }}
                />
              ))}
            </div>
            <Footer onNext={() => setStep(2)} onBack={null} nextLabel="Suivant →" />
          </Card>
        )}

        {step === 2 && (
          <Card title="🏛 Configurez votre salle" subtitle="Dessinez les murs, fenêtres, comptoir, tables et chaises. L'éditeur visuel du POS 5175 s'ouvre dans la fenêtre ci-dessous." wide>
            <div style={{
              width: '100%', height: 600, borderRadius: 14, overflow: 'hidden',
              border: '1px solid rgba(139,92,246,0.3)', background: '#000',
              boxShadow: '0 8px 32px rgba(139,92,246,0.2)',
            }}>
              <iframe
                src="http://localhost:5175/"
                title="Éditeur de plan de salle"
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </div>
            <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 10, textAlign: 'center' }}>
              💡 Utilisez les boutons « Ronde / Carrée / Rectangle / Comptoir » pour ajouter des éléments. Les modifications sont enregistrées automatiquement.
            </p>
            <Footer onNext={() => setStep(3)} onBack={() => setStep(1)} nextLabel="Configurer l'IA →" />
          </Card>
        )}

        {step === 3 && <OllamaStep onNext={() => setStep(4)} onBack={() => setStep(2)} />}

        {step === 4 && (
          <Card title="🎉 Tout est prêt !" subtitle="Votre établissement est configuré. Vous pouvez maintenant explorer les 33 modules.">
            <div style={{ padding: 20, background: 'rgba(139,92,246,0.1)', borderRadius: 14, border: '1px solid rgba(139,92,246,0.3)', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>✅ Configuration terminée</div>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#cbd5e1', fontSize: 14, lineHeight: 1.8 }}>
                <li>Nom : <strong>{restaurantName}</strong></li>
                <li>Logo : {brand.logoDataUrl ? 'Configuré' : 'Non configuré'}</li>
                <li>Couleur : <span style={{ display: 'inline-block', width: 14, height: 14, background: brand.accentColor, borderRadius: 3, verticalAlign: 'middle' }} /> {brand.accentColor}</li>
              </ul>
            </div>
            <Footer onNext={finish} onBack={() => setStep(3)} nextLabel="Ouvrir Creorga OS 🚀" />
          </Card>
        )}
      </main>
    </div>
  )
}

function OllamaStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  useState(() => {
    fetch('http://localhost:11434/api/tags').then((r) => r.ok ? setStatus('online') : setStatus('offline')).catch(() => setStatus('offline'))
  })

  return (
    <Card title="🤖 Configuration de l'IA locale" subtitle="Ollama fait tourner Gemma directement sur votre machine — 100 % privé, zéro dépendance au cloud.">
      <div style={{
        padding: 20, borderRadius: 14, marginBottom: 20,
        background: status === 'online' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
        border: `1px solid ${status === 'online' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
      }}>
        {status === 'checking' && '⏳ Détection d\'Ollama…'}
        {status === 'online' && <><strong>✅ Ollama est actif</strong><br /><span style={{ fontSize: 13, color: '#6ee7b7' }}>Serveur détecté sur http://localhost:11434</span></>}
        {status === 'offline' && <><strong>⚠️ Ollama n'est pas détecté</strong><br /><span style={{ fontSize: 13, color: '#fcd34d' }}>Installez-le ci-dessous puis revenez ici.</span></>}
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16 }}>
        <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>Installation par OS</h4>

        <InstallRow title="Windows" emoji="🪟" cmd={null} link="https://ollama.com/download/windows" note="Téléchargez OllamaSetup.exe" />
        <InstallRow title="macOS" emoji="🍎" cmd={null} link="https://ollama.com/download/mac" note="Téléchargez Ollama.dmg" />
        <InstallRow title="Linux / Raspberry Pi 5" emoji="🐧" cmd="curl -fsSL https://ollama.com/install.sh | sh" link={null} />

        <div style={{ marginTop: 14, padding: 12, background: 'rgba(139,92,246,0.1)', borderRadius: 10, fontSize: 13, color: '#c4b5fd' }}>
          💡 Après installation, lancez <code>ollama serve</code>, puis téléchargez Gemma depuis la page <strong>Assistant IA local</strong>.
        </div>
      </div>

      <Footer onNext={onNext} onBack={onBack} nextLabel="Suivant →" />
    </Card>
  )
}

function InstallRow({ title, emoji, cmd, link, note }: { title: string; emoji: string; cmd: string | null; link: string | null; note?: string }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <strong style={{ fontSize: 13 }}>{emoji} {title}</strong>
        {link && <a href={link} target="_blank" rel="noreferrer" style={{ color: '#a78bfa', fontSize: 12 }}>{note || 'Télécharger ↗'}</a>}
      </div>
      {cmd && (
        <code style={{ display: 'block', padding: 8, background: '#0a0a0a', color: '#a7f3d0', borderRadius: 6, fontSize: 11, overflowX: 'auto' }}>
          {cmd}
        </code>
      )}
    </div>
  )
}

function Card({ children, title, subtitle, wide }: { children: React.ReactNode; title: string; subtitle: string; wide?: boolean }) {
  return (
    <div style={{
      width: '100%', maxWidth: wide ? 1100 : 560,
      background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(14px)',
      border: '1px solid rgba(139,92,246,0.2)', borderRadius: 20,
      padding: 32,
    }}>
      <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{title}</h2>
      <p style={{ color: '#a78bfa', margin: '6px 0 24px' }}>{subtitle}</p>
      {children}
    </div>
  )
}

function Footer({ onNext, onBack, nextLabel }: { onNext: () => void; onBack: (() => void) | null; nextLabel: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 10 }}>
      {onBack ? (
        <button onClick={onBack} style={{ padding: '12px 20px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.3)', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontWeight: 600 }}>
          ← Retour
        </button>
      ) : <div />}
      <button onClick={onNext} style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
        {nextLabel}
      </button>
    </div>
  )
}

const label: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginBottom: 8 }
const input: React.CSSProperties = {
  width: '100%', padding: '12px 14px', fontSize: 15,
  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, color: '#fff', outline: 'none', boxSizing: 'border-box',
}
