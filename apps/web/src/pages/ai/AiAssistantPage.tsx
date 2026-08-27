import { useEffect, type CSSProperties } from 'react'
import { Bot, CheckCircle2, Cpu, FileSearch, MessageSquareText, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAssistant } from '@/stores/assistantStore'

export default function AiAssistantPage() {
  const assistant = useAssistant()

  useEffect(() => {
    assistant.setPanelMode('full')
    assistant.setOpen(true)
  }, []) // ouverture intentionnelle à l'arrivée sur le module

  const open = () => {
    assistant.setPanelMode('full')
    assistant.setOpen(true)
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 90px)', display: 'grid', placeItems: 'center', padding: 28, color: '#172033', background: 'radial-gradient(circle at 80% 5%, #ede9fe 0, transparent 35%), #f8fafc' }}>
      <section style={{ width: 'min(880px,100%)', background: 'rgba(255,255,255,.94)', border: '1px solid #e2e8f0', borderRadius: 24, padding: 30, boxShadow: '0 22px 70px rgba(76,29,149,.12)' }}>
        <div style={{ width: 58, height: 58, borderRadius: 18, display: 'grid', placeItems: 'center', color: '#fff', background: 'linear-gradient(135deg,#7c3aed,#ec4899)', boxShadow: '0 12px 30px rgba(124,58,237,.25)' }}><Bot size={28} /></div>
        <h1 style={{ fontSize: 31, margin: '18px 0 7px', letterSpacing: '-0.04em' }}>Robi, l’assistant Creorga</h1>
        <p style={{ color: '#64748b', lineHeight: 1.65, margin: 0, maxWidth: 700 }}>
          Cette page ouvre le véritable assistant relié aux actions Creorga. Les anciennes conversations de démonstration et leurs chiffres inventés ont été retirés.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, margin: '24px 0' }}>
          <Feature icon={<MessageSquareText size={19} />} title="Conversations" text="Historique, renommage, archivage et pièces jointes." />
          <Feature icon={<FileSearch size={19} />} title="Données réelles" text="Interroge les routes Creorga authentifiées." />
          <Feature icon={<ShieldCheck size={19} />} title="Confirmation" text="Les actions sensibles demandent une validation." />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={open} style={primaryButton}><Sparkles size={17} /> Ouvrir Robi</button>
          <Link to="/ai/local" style={secondaryButton}><Cpu size={17} /> Configurer l’IA locale</Link>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#047857', fontSize: 12, marginLeft: 'auto' }}><CheckCircle2 size={15} /> Aucun résultat fictif affiché</span>
        </div>
      </section>
    </div>
  )
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <article style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 15, background: '#fff' }}><span style={{ color: '#7c3aed' }}>{icon}</span><strong style={{ display: 'block', margin: '8px 0 4px' }}>{title}</strong><p style={{ margin: 0, color: '#64748b', fontSize: 12, lineHeight: 1.5 }}>{text}</p></article>
}

const primaryButton: CSSProperties = { border: 0, borderRadius: 11, padding: '11px 16px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }
const secondaryButton: CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 11, padding: '10px 15px', background: '#fff', color: '#334155', fontWeight: 750, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }
