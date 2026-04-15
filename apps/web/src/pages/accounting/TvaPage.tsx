import { useState } from 'react'
import { motion } from 'framer-motion'
import { Percent, TrendingUp, TrendingDown, Calculator } from 'lucide-react'

type Period = 'mois' | 'trimestre'

interface VatRate {
  rate: number
  label: string
  color: string
  caHT: number
  tvaCollectee: number
  tvaDeductible: number
}

const vatDataMois: VatRate[] = [
  { rate: 3, label: 'Alimentation', color: '#10b981', caHT: 12450, tvaCollectee: 373.50, tvaDeductible: 198.00 },
  { rate: 8, label: 'Restauration', color: '#3b82f6', caHT: 28900, tvaCollectee: 2312.00, tvaDeductible: 1450.00 },
  { rate: 14, label: 'Vins & alcools', color: '#8b5cf6', caHT: 8200, tvaCollectee: 1148.00, tvaDeductible: 680.00 },
  { rate: 17, label: 'Standard', color: '#f59e0b', caHT: 3400, tvaCollectee: 578.00, tvaDeductible: 312.00 },
]

const vatDataTrimestre: VatRate[] = [
  { rate: 3, label: 'Alimentation', color: '#10b981', caHT: 38200, tvaCollectee: 1146.00, tvaDeductible: 610.00 },
  { rate: 8, label: 'Restauration', color: '#3b82f6', caHT: 86500, tvaCollectee: 6920.00, tvaDeductible: 4280.00 },
  { rate: 14, label: 'Vins & alcools', color: '#8b5cf6', caHT: 24800, tvaCollectee: 3472.00, tvaDeductible: 2050.00 },
  { rate: 17, label: 'Standard', color: '#f59e0b', caHT: 10100, tvaCollectee: 1717.00, tvaDeductible: 945.00 },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 20,
  padding: '24px',
  }

function formatEuro(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

export default function TvaPage() {
  const [period, setPeriod] = useState<Period>('mois')

  const vatData = period === 'mois' ? vatDataMois : vatDataTrimestre

  const totalCollectee = vatData.reduce((s, v) => s + v.tvaCollectee, 0)
  const totalDeductible = vatData.reduce((s, v) => s + v.tvaDeductible, 0)
  const tvaAReverser = totalCollectee - totalDeductible

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}
    >
      <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>TVA Luxembourg</h1>
          <p style={{ fontSize: 14, color: '#475569' }}>Tableau de bord des taux de TVA luxembourgeois</p>
        </div>
        <div style={{ display: 'flex', background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {(['mois', 'trimestre'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '8px 20px',
                border: 'none',
                background: period === p ? '#1F2937' : 'transparent',
                color: period === p ? '#fff' : '#64748b',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {p === 'mois' ? 'Mois' : 'Trimestre'}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 28 }}
      >
        {vatData.map(vat => (
          <div key={vat.rate} style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 700,
                  color: vat.color,
                  background: `${vat.color}15`,
                }}
              >
                <Percent size={13} />
                {vat.rate}%
              </span>
              <span style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>{vat.label}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: '#475569', fontWeight: 500, marginBottom: 2 }}>CA HT</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>{formatEuro(vat.caHT)}</div>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#475569', fontWeight: 500, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <TrendingUp size={11} style={{ color: '#ef4444' }} /> Collectée
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#ef4444' }}>{formatEuro(vat.tvaCollectee)}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#475569', fontWeight: 500, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <TrendingDown size={11} style={{ color: '#10b981' }} /> Déductible
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#10b981' }}>{formatEuro(vat.tvaDeductible)}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      <motion.div variants={itemVariants} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#1F293718', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calculator size={24} style={{ color: '#1F2937' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>Résumé {period === 'mois' ? 'mensuel' : 'trimestriel'}</div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>TVA collectée - TVA déductible</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>Collectée</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#ef4444' }}>{formatEuro(totalCollectee)}</div>
          </div>
          <div style={{ fontSize: 24, color: '#cbd5e1', fontWeight: 300 }}>-</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>Déductible</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#10b981' }}>{formatEuro(totalDeductible)}</div>
          </div>
          <div style={{ fontSize: 24, color: '#cbd5e1', fontWeight: 300 }}>=</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>TVA à reverser</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>{formatEuro(tvaAReverser)}</div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
