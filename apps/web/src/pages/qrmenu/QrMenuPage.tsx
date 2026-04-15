import { useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Download, Check, QrCode } from 'lucide-react'

const MENU_LINK = 'https://cafe-um-rond-point.creorga.lu/menu'

export default function QrMenuPage() {
  const [copied, setCopied] = useState(false)
  const [showPrices, setShowPrices] = useState(true)
  const [showAllergens, setShowAllergens] = useState(true)
  const [allowOrdering, setAllowOrdering] = useState(false)
  const [accentColor, setAccentColor] = useState('#7C3AED')

  const handleCopy = () => {
    navigator.clipboard.writeText(MENU_LINK)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 32 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, #7C3AED, #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <QrCode size={20} color="#fff" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1e293b', margin: 0 }}>
            Menu QR
          </h1>
        </div>
        <p style={{ fontSize: 15, color: '#64748b', margin: 0 }}>
          Générez un QR code pour votre carte numérique
        </p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
        {/* Left: QR Code */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: '#fff', borderRadius: 20, padding: 32,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 600, color: '#475569', margin: 0 }}>
            Aperçu du QR Code
          </p>

          {/* QR Code Placeholder SVG */}
          <motion.div
            whileHover={{ scale: 1.03 }}
            transition={{ type: 'spring', stiffness: 300 }}
            style={{
              width: 220, height: 220, borderRadius: 16,
              background: '#fff', padding: 12,
              border: `3px solid ${accentColor}`,
              boxShadow: `0 4px 24px ${accentColor}22`,
            }}
          >
            <svg viewBox="0 0 200 200" width="100%" height="100%">
              {/* Top-left finder */}
              <rect x="10" y="10" width="50" height="50" rx="4" fill="#1e293b" />
              <rect x="16" y="16" width="38" height="38" rx="2" fill="#fff" />
              <rect x="22" y="22" width="26" height="26" rx="2" fill="#1e293b" />
              {/* Top-right finder */}
              <rect x="140" y="10" width="50" height="50" rx="4" fill="#1e293b" />
              <rect x="146" y="16" width="38" height="38" rx="2" fill="#fff" />
              <rect x="152" y="22" width="26" height="26" rx="2" fill="#1e293b" />
              {/* Bottom-left finder */}
              <rect x="10" y="140" width="50" height="50" rx="4" fill="#1e293b" />
              <rect x="16" y="146" width="38" height="38" rx="2" fill="#fff" />
              <rect x="22" y="152" width="26" height="26" rx="2" fill="#1e293b" />
              {/* Data pattern rows */}
              {[70, 80, 90, 100, 110, 120, 130].map(y => (
                [10, 22, 38, 50, 66, 82, 98, 110, 126, 140, 156, 170, 182].map(x => (
                  <rect
                    key={`${x}-${y}`}
                    x={x} y={y}
                    width={Math.random() > 0.4 ? 8 : 0}
                    height={8}
                    rx={1}
                    fill={Math.random() > 0.5 ? '#1e293b' : accentColor}
                  />
                ))
              ))}
              {[10, 22, 38, 50, 66].map(y => (
                [70, 82, 98, 110, 126, 140, 156, 170, 182].map(x => (
                  <rect
                    key={`u-${x}-${y}`}
                    x={x} y={y}
                    width={Math.random() > 0.45 ? 8 : 0}
                    height={8}
                    rx={1}
                    fill={Math.random() > 0.5 ? '#1e293b' : accentColor}
                  />
                ))
              ))}
              {[140, 152, 164, 176, 182].map(y => (
                [70, 82, 98, 110, 126, 140, 156, 170, 182].map(x => (
                  <rect
                    key={`d-${x}-${y}`}
                    x={x} y={y}
                    width={Math.random() > 0.4 ? 8 : 0}
                    height={8}
                    rx={1}
                    fill={Math.random() > 0.5 ? '#1e293b' : accentColor}
                  />
                ))
              ))}
            </svg>
          </motion.div>

          {/* Link */}
          <div style={{
            width: '100%', background: '#f8fafc', borderRadius: 12,
            padding: '12px 16px', border: '1px solid #e2e8f0',
          }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Lien du menu
            </p>
            <p style={{ fontSize: 13, color: '#6366f1', margin: 0, wordBreak: 'break-all', fontWeight: 500 }}>
              {MENU_LINK}
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, width: '100%' }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCopy}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 16px', borderRadius: 12,
                background: copied ? '#10b981' : '#f1f5f9',
                color: copied ? '#fff' : '#475569',
                border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                transition: 'all .2s',
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copié !' : 'Copier le lien'}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 16px', borderRadius: 12,
                background: 'linear-gradient(135deg, #7C3AED, #a78bfa)',
                color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Download size={16} />
              Télécharger le QR Code
            </motion.button>
          </div>
        </motion.div>

        {/* Right: Customization */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            background: '#fff', borderRadius: 20, padding: 32,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex', flexDirection: 'column', gap: 24,
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 600, color: '#475569', margin: 0 }}>
            Personnalisation du menu
          </p>

          {/* Toggle: Afficher les prix */}
          <ToggleRow
            label="Afficher les prix"
            description="Les clients voient les prix sur la carte"
            checked={showPrices}
            onChange={setShowPrices}
            color={accentColor}
          />

          {/* Toggle: Afficher les allergènes */}
          <ToggleRow
            label="Afficher les allergènes"
            description="Icônes des allergènes sur chaque plat"
            checked={showAllergens}
            onChange={setShowAllergens}
            color={accentColor}
          />

          {/* Toggle: Permettre la commande */}
          <ToggleRow
            label="Permettre la commande"
            description="Les clients peuvent commander depuis le QR"
            checked={allowOrdering}
            onChange={setAllowOrdering}
            color={accentColor}
          />

          {/* Divider */}
          <div style={{ height: 1, background: '#e2e8f0' }} />

          {/* Color picker */}
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: '0 0 4px 0' }}>
              Couleur d'accent
            </p>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 12px 0' }}>
              Personnalisez la couleur de votre carte en ligne
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="color"
                value={accentColor}
                onChange={e => setAccentColor(e.target.value)}
                style={{
                  width: 44, height: 44, border: 'none', borderRadius: 12,
                  cursor: 'pointer', padding: 0, background: 'transparent',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                {['#7C3AED', '#6366f1', '#0EA5E9', '#10b981', '#f59e0b', '#ef4444'].map(c => (
                  <motion.button
                    key={c}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setAccentColor(c)}
                    style={{
                      width: 32, height: 32, borderRadius: 10, background: c,
                      border: accentColor === c ? '3px solid #1e293b' : '2px solid #e2e8f0',
                      cursor: 'pointer', transition: 'border .2s',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Stats preview */}
          <div style={{ height: 1, background: '#e2e8f0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <StatCard label="Scans aujourd'hui" value="47" />
            <StatCard label="Scans cette semaine" value="312" />
            <StatCard label="Commandes via QR" value="28" />
            <StatCard label="Taux de conversion" value="8.9%" />
          </div>
        </motion.div>
      </div>
    </div>
  )
}

/* ── Toggle Row ─────────────────────────────────────────────── */
function ToggleRow({ label, description, checked, onChange, color }: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  color: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: '0 0 2px 0' }}>{label}</p>
        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{description}</p>
      </div>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => onChange(!checked)}
        style={{
          width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
          background: checked ? color : '#e2e8f0',
          position: 'relative', transition: 'background .2s', flexShrink: 0,
        }}
      >
        <motion.div
          animate={{ x: checked ? 22 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{
            width: 22, height: 22, borderRadius: 11,
            background: '#fff', position: 'absolute', top: 3,
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          }}
        />
      </motion.button>
    </div>
  )
}

/* ── Stat Card ──────────────────────────────────────────────── */
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: '#f8fafc', borderRadius: 12, padding: '14px 16px',
      border: '1px solid #f1f5f9',
    }}>
      <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 4px 0', fontWeight: 500 }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>{value}</p>
    </div>
  )
}
