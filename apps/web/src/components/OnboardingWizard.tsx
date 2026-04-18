import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface OnboardingWizardProps {
  onComplete?: () => void
  onSkip?: () => void
}

interface TableItem {
  id: string
  name: string
  shape: 'round' | 'square' | 'rect'
  capacity: number
  x: number
  y: number
}

interface StaffInvite {
  email: string
  role: string
}

const STORAGE_KEY = 'creorga-onboarding-progress'

const MENU_TEMPLATES = [
  { id: 'cafe', name: 'Café', emoji: '\u2615', desc: 'Boissons, pâtisseries, snacks' },
  { id: 'brasserie', name: 'Brasserie', emoji: '\u{1F37D}\uFE0F', desc: 'Plats du jour, bières, vins' },
  { id: 'gastro', name: 'Restaurant gastronomique', emoji: '\u{1F37E}', desc: 'Menus dégustation, carte étoilée' },
  { id: 'cocktails', name: 'Bar à cocktails', emoji: '\u{1F378}', desc: 'Mixologie, tapas, ambiance' },
]

const DEFAULT_ROLES = [
  { id: 'manager', label: 'Manager', emoji: '\u{1F464}', color: '#6366f1' },
  { id: 'serveur', label: 'Serveur', emoji: '\u{1F9D1}\u200D\u{1F373}', color: '#10b981' },
  { id: 'cuisine', label: 'Cuisine', emoji: '\u{1F468}\u200D\u{1F373}', color: '#f59e0b' },
]

/* ── Confetti burst ── */
function ConfettiBurst() {
  const pieces = Array.from({ length: 60 })
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      {pieces.map((_, i) => {
        const left = Math.random() * 100
        const delay = Math.random() * 0.4
        const duration = 2 + Math.random() * 1.5
        const size = 6 + Math.random() * 8
        const color = colors[i % colors.length]
        const rot = Math.random() * 360
        return (
          <motion.div
            key={i}
            initial={{ y: -20, opacity: 1, rotate: 0 }}
            animate={{ y: '110vh', opacity: 0, rotate: rot + 720 }}
            transition={{ duration, delay, ease: 'easeIn' }}
            style={{
              position: 'absolute',
              top: 0,
              left: `${left}%`,
              width: size,
              height: size,
              background: color,
              borderRadius: i % 2 === 0 ? '50%' : 2,
            }}
          />
        )
      })}
    </div>
  )
}

export default function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [step, setStep] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)

  /* ── Company info state ── */
  const [company, setCompany] = useState({
    logo: '',
    name: 'Café um Rond-Point',
    address: '12 Place du Marché, 1234 Luxembourg',
    vat: 'LU12345678',
    phone: '+352 621 000 000',
    email: 'contact@cafe-rondpoint.lu',
  })

  /* ── Tables state ── */
  const [tables, setTables] = useState<TableItem[]>([
    { id: 't1', name: 'T1', shape: 'round', capacity: 4, x: 60, y: 60 },
    { id: 't2', name: 'T2', shape: 'square', capacity: 2, x: 200, y: 80 },
    { id: 't3', name: 'T3', shape: 'rect', capacity: 6, x: 340, y: 60 },
  ])
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const dragOffset = useRef({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)

  /* ── Menu state ── */
  const [menuMode, setMenuMode] = useState<'csv' | 'paste' | 'template' | null>(null)
  const [pasteText, setPasteText] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  /* ── Team state ── */
  const [invites, setInvites] = useState<StaffInvite[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('serveur')
  const [pinsGenerated, setPinsGenerated] = useState<Record<string, string>>({})

  /* ── Load/save progress ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data = JSON.parse(raw)
        if (typeof data.step === 'number') setStep(data.step)
        if (data.company) setCompany(data.company)
        if (data.tables) setTables(data.tables)
        if (data.invites) setInvites(data.invites)
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ step, company, tables, invites })
      )
    } catch {}
  }, [step, company, tables, invites])

  const steps = [
    { label: 'Bienvenue', icon: '\u{1F44B}' },
    { label: 'Entreprise', icon: '\u{1F3E2}' },
    { label: 'Tables', icon: '\u{1FA91}' },
    { label: 'Menu', icon: '\u{1F4DD}' },
    { label: '\u00C9quipe', icon: '\u{1F465}' },
    { label: 'Pr\u00EAt!', icon: '\u{1F389}' },
  ]

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1)
    else finish()
  }
  const prev = () => {
    if (step > 0) setStep(step - 1)
  }

  const finish = () => {
    setShowConfetti(true)
    localStorage.setItem('creorga-onboarded', '1')
    localStorage.removeItem(STORAGE_KEY)
    setTimeout(() => {
      onComplete?.()
    }, 2500)
  }

  const skip = () => {
    localStorage.setItem('creorga-onboarded', '1')
    localStorage.removeItem(STORAGE_KEY)
    onSkip?.()
  }

  const postponeLater = () => {
    onSkip?.()
  }

  /* ── Table drag handlers ── */
  const onTableMouseDown = (e: React.MouseEvent, t: TableItem) => {
    setDraggingId(t.id)
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }
  const onCanvasMouseMove = (e: React.MouseEvent) => {
    if (!draggingId || !canvasRef.current) return
    const cRect = canvasRef.current.getBoundingClientRect()
    const nx = e.clientX - cRect.left - dragOffset.current.x
    const ny = e.clientY - cRect.top - dragOffset.current.y
    setTables((prev) =>
      prev.map((t) =>
        t.id === draggingId
          ? { ...t, x: Math.max(0, Math.min(nx, cRect.width - 70)), y: Math.max(0, Math.min(ny, cRect.height - 70)) }
          : t
      )
    )
  }
  const onCanvasMouseUp = () => setDraggingId(null)

  const addTable = (shape: TableItem['shape']) => {
    const id = 't' + (tables.length + 1 + Math.floor(Math.random() * 1000))
    setTables([
      ...tables,
      { id, name: 'T' + (tables.length + 1), shape, capacity: 4, x: 80, y: 200 },
    ])
  }
  const removeTable = (id: string) => setTables(tables.filter((t) => t.id !== id))
  const updateCapacity = (id: string, cap: number) =>
    setTables(tables.map((t) => (t.id === id ? { ...t, capacity: cap } : t)))

  /* ── Team handlers ── */
  const addInvite = () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) return
    setInvites([...invites, { email: inviteEmail.trim(), role: inviteRole }])
    setInviteEmail('')
  }
  const generatePin = (role: string) => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString()
    setPinsGenerated({ ...pinsGenerated, [role]: pin })
  }

  /* ── Styles ── */
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.55)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    zIndex: 9000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  }
  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 820,
    maxHeight: '92vh',
    background: '#ffffff',
    borderRadius: 20,
    boxShadow: '0 30px 80px rgba(15,23,42,0.25)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    color: '#0f172a',
  }
  const headerStyle: React.CSSProperties = {
    padding: '20px 28px 12px',
    borderBottom: '1px solid #f1f5f9',
  }
  const bodyStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '28px 32px',
  }
  const footerStyle: React.CSSProperties = {
    padding: '16px 28px',
    borderTop: '1px solid #f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    background: '#fafbfc',
  }
  const btnPrimary: React.CSSProperties = {
    padding: '10px 22px',
    borderRadius: 10,
    border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
  }
  const btnSecondary: React.CSSProperties = {
    padding: '10px 20px',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    background: '#fff',
    color: '#475569',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  }
  const btnGhost: React.CSSProperties = {
    padding: '8px 14px',
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 13,
    cursor: 'pointer',
  }
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    background: '#fff',
    fontSize: 14,
    color: '#0f172a',
    outline: 'none',
    boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#64748b',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  }

  return (
    <div style={overlayStyle}>
      {showConfetti && <ConfettiBurst />}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={cardStyle}
      >
        {/* ── Header with progress ── */}
        <div style={headerStyle}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 800,
                }}
              >
                C
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                  Installation Creorga
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  {'\u00C9tape'} {step + 1} sur {steps.length}
                </div>
              </div>
            </div>
            <button onClick={skip} style={btnGhost}>
              Passer l'installation
            </button>
          </div>

          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {steps.map((s, i) => (
              <div
                key={i}
                style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <motion.div
                  initial={false}
                  animate={{
                    background:
                      i <= step
                        ? 'linear-gradient(90deg, #6366f1, #8b5cf6)'
                        : '#e2e8f0',
                  }}
                  transition={{ duration: 0.4 }}
                  style={{
                    height: 6,
                    flex: 1,
                    borderRadius: 3,
                  }}
                />
              </div>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 6,
              fontSize: 10,
              color: '#94a3b8',
            }}
          >
            {steps.map((s, i) => (
              <span
                key={i}
                style={{
                  fontWeight: i === step ? 700 : 500,
                  color: i === step ? '#6366f1' : i < step ? '#64748b' : '#cbd5e1',
                }}
              >
                {s.icon} {s.label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={bodyStyle}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3 }}
            >
              {/* STEP 0 - Bienvenue */}
              {step === 0 && (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: 'spring' }}
                    style={{ fontSize: 72, marginBottom: 12 }}
                  >
                    {'\u{1F44B}'}
                  </motion.div>
                  <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>
                    Bienvenue chez Creorga, Caf\u00e9 um Rond-Point!
                  </h1>
                  <p style={{ fontSize: 15, color: '#64748b', maxWidth: 520, margin: '0 auto 24px', lineHeight: 1.55 }}>
                    En quelques minutes, nous allons configurer votre \u00e9tablissement pour
                    que vous puissiez commencer \u00e0 encaisser, g\u00e9rer et faire prosp\u00e9rer
                    votre activit\u00e9.
                  </p>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 560,
                      aspectRatio: '16/9',
                      margin: '0 auto',
                      borderRadius: 14,
                      background:
                        'linear-gradient(135deg, #eef2ff 0%, #f3e8ff 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #e2e8f0',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        background: '#fff',
                        boxShadow: '0 8px 24px rgba(99,102,241,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                        color: '#6366f1',
                      }}
                    >
                      {'\u25B6'}
                    </div>
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 12,
                        left: 16,
                        fontSize: 12,
                        color: '#6366f1',
                        fontWeight: 600,
                      }}
                    >
                      Vid\u00e9o de bienvenue (2 min)
                    </span>
                  </div>
                  <p style={{ marginTop: 24, fontSize: 13, color: '#94a3b8' }}>
                    Commen\u00e7ons l'installation
                  </p>
                </div>
              )}

              {/* STEP 1 - Entreprise */}
              {step === 1 && (
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>
                    Informations de votre entreprise
                  </h2>
                  <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px' }}>
                    Ces informations appara\u00eetront sur vos factures et tickets de caisse.
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      gap: 16,
                      alignItems: 'center',
                      marginBottom: 20,
                      padding: 16,
                      background: '#f8fafc',
                      borderRadius: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 16,
                        background:
                          company.logo
                            ? `url(${company.logo}) center/cover`
                            : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: 28,
                        flexShrink: 0,
                      }}
                    >
                      {!company.logo && company.name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                        Logo de l'entreprise
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                        PNG, JPG ou SVG. Max 2 Mo.
                      </div>
                      <label style={{ ...btnSecondary, display: 'inline-block' }}>
                        T\u00e9l\u00e9verser un logo
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) {
                              const r = new FileReader()
                              r.onload = () =>
                                setCompany({ ...company, logo: r.result as string })
                              r.readAsDataURL(f)
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>{"Nom de l'\u00e9tablissement"}</label>
                      <input
                        style={inputStyle}
                        value={company.name}
                        onChange={(e) => setCompany({ ...company, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>{'N\u00B0 TVA'}</label>
                      <input
                        style={inputStyle}
                        value={company.vat}
                        onChange={(e) => setCompany({ ...company, vat: e.target.value })}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / span 2' }}>
                      <label style={labelStyle}>Adresse</label>
                      <input
                        style={inputStyle}
                        value={company.address}
                        onChange={(e) => setCompany({ ...company, address: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>{'T\u00E9l\u00E9phone'}</label>
                      <input
                        style={inputStyle}
                        value={company.phone}
                        onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Email</label>
                      <input
                        style={inputStyle}
                        value={company.email}
                        onChange={(e) => setCompany({ ...company, email: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2 - Tables */}
              {step === 2 && (
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>
                    Configuration des tables
                  </h2>
                  <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>
                    Glissez-d\u00e9posez pour disposer. Ajoutez des formes, ajustez la capacit\u00e9.
                  </p>

                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    <button style={btnSecondary} onClick={() => addTable('round')}>
                      {'\u26AA'} Table ronde
                    </button>
                    <button style={btnSecondary} onClick={() => addTable('square')}>
                      {'\u25FC\uFE0F'} Table carr\u00e9e
                    </button>
                    <button style={btnSecondary} onClick={() => addTable('rect')}>
                      {'\u25AC'} Table rectangulaire
                    </button>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 13, color: '#94a3b8', alignSelf: 'center' }}>
                      {tables.length} table(s)
                    </span>
                  </div>

                  <div
                    ref={canvasRef}
                    onMouseMove={onCanvasMouseMove}
                    onMouseUp={onCanvasMouseUp}
                    onMouseLeave={onCanvasMouseUp}
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: 340,
                      background:
                        'repeating-linear-gradient(0deg, #f8fafc 0 24px, #f1f5f9 24px 25px), repeating-linear-gradient(90deg, #f8fafc 0 24px, #f1f5f9 24px 25px)',
                      borderRadius: 12,
                      border: '1px dashed #cbd5e1',
                      overflow: 'hidden',
                    }}
                  >
                    {tables.map((t) => {
                      const w = t.shape === 'rect' ? 96 : 60
                      const h = 60
                      const br = t.shape === 'round' ? '50%' : 10
                      return (
                        <div
                          key={t.id}
                          onMouseDown={(e) => onTableMouseDown(e, t)}
                          style={{
                            position: 'absolute',
                            left: t.x,
                            top: t.y,
                            width: w,
                            height: h,
                            borderRadius: br,
                            background: '#fff',
                            border: `2px solid ${draggingId === t.id ? '#6366f1' : '#cbd5e1'}`,
                            boxShadow: draggingId === t.id
                              ? '0 10px 24px rgba(99,102,241,0.35)'
                              : '0 2px 6px rgba(15,23,42,0.08)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: draggingId === t.id ? 'grabbing' : 'grab',
                            userSelect: 'none',
                            transition: 'border-color 0.15s, box-shadow 0.15s',
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                            {t.name}
                          </div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>
                            {t.capacity} pers.
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeTable(t.id)
                            }}
                            style={{
                              position: 'absolute',
                              top: -8,
                              right: -8,
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              border: 'none',
                              background: '#ef4444',
                              color: '#fff',
                              fontSize: 11,
                              cursor: 'pointer',
                              lineHeight: 1,
                            }}
                          >
                            \u00d7
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                      gap: 10,
                    }}
                  >
                    {tables.map((t) => (
                      <div
                        key={t.id}
                        style={{
                          padding: 10,
                          background: '#f8fafc',
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 600, width: 36 }}>
                          {t.name}
                        </span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{'Capacit\u00E9'}</span>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={t.capacity}
                          onChange={(e) => updateCapacity(t.id, parseInt(e.target.value) || 1)}
                          style={{
                            width: 50,
                            padding: '4px 6px',
                            borderRadius: 6,
                            border: '1px solid #e2e8f0',
                            fontSize: 13,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3 - Menu */}
              {step === 3 && (
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>
                    Importer votre menu
                  </h2>
                  <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>
                    Choisissez la m\u00e9thode qui vous convient le mieux.
                  </p>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 12,
                      marginBottom: 18,
                    }}
                  >
                    {[
                      { id: 'csv', emoji: '\u{1F4C4}', label: 'Uploader CSV/Excel', desc: 'Fichier .csv, .xlsx' },
                      { id: 'paste', emoji: '\u{1F4CB}', label: 'Copier-coller', desc: 'Liste depuis un document' },
                      { id: 'template', emoji: '\u{1F3AF}', label: 'Mod\u00e8le pr\u00eat', desc: 'Choisir un type d\'activit\u00e9' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setMenuMode(opt.id as any)}
                        style={{
                          padding: 18,
                          borderRadius: 12,
                          border: `2px solid ${menuMode === opt.id ? '#6366f1' : '#e2e8f0'}`,
                          background: menuMode === opt.id ? '#eef2ff' : '#fff',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ fontSize: 26, marginBottom: 8 }}>{opt.emoji}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                          {opt.label}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          {opt.desc}
                        </div>
                      </button>
                    ))}
                  </div>

                  {menuMode === 'csv' && (
                    <div
                      style={{
                        padding: 24,
                        border: '2px dashed #cbd5e1',
                        borderRadius: 12,
                        textAlign: 'center',
                        background: '#f8fafc',
                      }}
                    >
                      <div style={{ fontSize: 32, marginBottom: 8 }}>{'\u{1F4E4}'}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                        {fileName ? fileName : 'Glissez votre fichier ici'}
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>
                        Formats accept\u00e9s : CSV, XLSX (max 5 Mo)
                      </div>
                      <label style={{ ...btnPrimary, display: 'inline-block' }}>
                        Parcourir les fichiers
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          style={{ display: 'none' }}
                          onChange={(e) => setFileName(e.target.files?.[0]?.name || null)}
                        />
                      </label>
                    </div>
                  )}

                  {menuMode === 'paste' && (
                    <div>
                      <label style={labelStyle}>Collez votre liste de produits</label>
                      <textarea
                        rows={8}
                        placeholder={'Espresso\u00092.50\nCappuccino\u00093.50\nTarte du jour\u00095.00'}
                        value={pasteText}
                        onChange={(e) => setPasteText(e.target.value)}
                        style={{
                          ...inputStyle,
                          fontFamily: 'monospace',
                          resize: 'vertical',
                        }}
                      />
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                        Un produit par ligne. S\u00e9parez le nom et le prix par une tabulation.
                      </div>
                    </div>
                  )}

                  {menuMode === 'template' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {MENU_TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.id}
                          onClick={() => setSelectedTemplate(tpl.id)}
                          style={{
                            padding: 16,
                            borderRadius: 12,
                            border: `2px solid ${selectedTemplate === tpl.id ? '#6366f1' : '#e2e8f0'}`,
                            background: selectedTemplate === tpl.id ? '#eef2ff' : '#fff',
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                          }}
                        >
                          <div style={{ fontSize: 32 }}>{tpl.emoji}</div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                              {tpl.name}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>{tpl.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4 - Equipe */}
              {step === 4 && (
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>
                    Invitez votre \u00e9quipe
                  </h2>
                  <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>
                    Ajoutez des collaborateurs par email ou g\u00e9n\u00e9rez des codes PIN pour les r\u00f4les.
                  </p>

                  <div
                    style={{
                      padding: 16,
                      background: '#f8fafc',
                      borderRadius: 12,
                      marginBottom: 20,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                      <input
                        style={{ ...inputStyle, flex: 1 }}
                        type="email"
                        placeholder="collaborateur@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addInvite()}
                      />
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        style={{ ...inputStyle, width: 160 }}
                      >
                        {DEFAULT_ROLES.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                      <button style={btnPrimary} onClick={addInvite}>
                        Inviter
                      </button>
                    </div>

                    {invites.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {invites.map((inv, i) => (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '8px 12px',
                              background: '#fff',
                              borderRadius: 8,
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            <span style={{ fontSize: 16 }}>{'\u{1F4E7}'}</span>
                            <span style={{ fontSize: 13, color: '#0f172a', flex: 1 }}>
                              {inv.email}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '3px 8px',
                                borderRadius: 6,
                                background: '#eef2ff',
                                color: '#6366f1',
                              }}
                            >
                              {DEFAULT_ROLES.find((r) => r.id === inv.role)?.label}
                            </span>
                            <button
                              onClick={() =>
                                setInvites(invites.filter((_, idx) => idx !== i))
                              }
                              style={{ ...btnGhost, padding: 4 }}
                            >
                              \u00d7
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 10 }}>
                      Ou g\u00e9n\u00e9rer un code PIN par r\u00f4le
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 10,
                      }}
                    >
                      {DEFAULT_ROLES.map((r) => (
                        <div
                          key={r.id}
                          style={{
                            padding: 14,
                            borderRadius: 10,
                            background: '#fff',
                            border: `1px solid ${r.color}30`,
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ fontSize: 26, marginBottom: 4 }}>{r.emoji}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                            {r.label}
                          </div>
                          {pinsGenerated[r.id] ? (
                            <div
                              style={{
                                fontFamily: 'monospace',
                                fontSize: 20,
                                fontWeight: 700,
                                color: r.color,
                                letterSpacing: '0.12em',
                                padding: '6px 0',
                              }}
                            >
                              {pinsGenerated[r.id]}
                            </div>
                          ) : (
                            <button
                              onClick={() => generatePin(r.id)}
                              style={{
                                ...btnSecondary,
                                fontSize: 12,
                                padding: '6px 10px',
                              }}
                            >
                              G\u00e9n\u00e9rer un PIN
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5 - Done */}
              {step === 5 && (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', delay: 0.1 }}
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 20px',
                      fontSize: 48,
                      color: '#fff',
                      boxShadow: '0 20px 40px rgba(16,185,129,0.35)',
                    }}
                  >
                    {'\u2713'}
                  </motion.div>
                  <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 10px' }}>
                    C'est pr\u00eat !
                  </h1>
                  <p style={{ fontSize: 15, color: '#64748b', maxWidth: 480, margin: '0 auto 28px' }}>
                    Votre \u00e9tablissement est configur\u00e9. Voici ce que vous pouvez faire
                    d\u00e8s maintenant :
                  </p>
                  <div
                    style={{
                      maxWidth: 480,
                      margin: '0 auto',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    {[
                      { icon: '\u{1F4B3}', text: 'Prendre votre premi\u00e8re commande sur la caisse' },
                      { icon: '\u{1F4CA}', text: 'Consulter votre tableau de bord en temps r\u00e9el' },
                      { icon: '\u{1F4C5}', text: 'Cr\u00e9er une r\u00e9servation ou un \u00e9v\u00e9nement' },
                      { icon: '\u{1F4E6}', text: 'Recevoir et g\u00e9rer votre stock' },
                      { icon: '\u{1F4F1}', text: 'Installer l\'application sur vos tablettes' },
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 + i * 0.08 }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '12px 14px',
                          background: '#f8fafc',
                          borderRadius: 10,
                        }}
                      >
                        <span style={{ fontSize: 20 }}>{item.icon}</span>
                        <span style={{ fontSize: 14, color: '#0f172a' }}>{item.text}</span>
                        <span style={{ marginLeft: 'auto', color: '#10b981', fontSize: 16 }}>
                          {'\u2713'}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Footer ── */}
        <div style={footerStyle}>
          <button onClick={postponeLater} style={btnGhost}>
            Faire plus tard
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            {step > 0 && (
              <button onClick={prev} style={btnSecondary}>
                {'\u2190'} Pr\u00e9c\u00e9dent
              </button>
            )}
            <button onClick={next} style={btnPrimary}>
              {step === steps.length - 1 ? 'Terminer ' + '\u{1F389}' : 'Suivant \u2192'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
