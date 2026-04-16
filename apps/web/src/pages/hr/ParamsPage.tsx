import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Clock, Calendar, Euro, FileSpreadsheet, Building2, Shield,
  Download, Check, Info, ChevronDown, ToggleLeft, ToggleRight,
  Briefcase, HeartPulse, Wallet, Settings2,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────
interface ToggleState {
  reportConges: boolean
  cns: boolean
  pension: boolean
  assuranceDependance: boolean
}

// ── Component ──────────────────────────────────────────────────────────
export default function ParamsPage() {
  // Règles de l'entreprise
  const [heuresStandard, setHeuresStandard] = useState(40)
  const [tauxHS150, setTauxHS150] = useState(150)
  const [tauxHS200, setTauxHS200] = useState(200)
  const [pauseObligatoire, setPauseObligatoire] = useState(30)

  // Congés
  const [joursConges, setJoursConges] = useState(26)
  const [certifMaladie, setCertifMaladie] = useState(3)

  // Paie
  const [jourPaie, setJourPaie] = useState('25')

  // Export
  const [formatExport, setFormatExport] = useState('CSV')

  // Toggles
  const [toggles, setToggles] = useState<ToggleState>({
    reportConges: true,
    cns: true,
    pension: true,
    assuranceDependance: true,
  })

  const [saved, setSaved] = useState(false)
  const [exporting, setExporting] = useState(false)

  const toggleField = (field: keyof ToggleState) => {
    setToggles(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleExport = () => {
    setExporting(true)
    setTimeout(() => setExporting(false), 1500)
  }

  // ── Shared Styles ────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: '#fff', borderRadius: 16, padding: 24,
    boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0',
  }

  const sectionTitle: React.CSSProperties = {
    fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 4px',
    display: 'flex', alignItems: 'center', gap: 8,
  }

  const sectionDesc: React.CSSProperties = {
    fontSize: 13, color: '#64748b', margin: '0 0 20px',
  }

  const fieldRow: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 0', borderBottom: '1px solid #f1f5f9',
  }

  const fieldLabel: React.CSSProperties = {
    fontSize: 14, fontWeight: 600, color: '#334155',
  }

  const fieldSub: React.CSSProperties = {
    fontSize: 12, color: '#94a3b8', marginTop: 2,
  }

  const inputSmall: React.CSSProperties = {
    width: 90, padding: '8px 12px', borderRadius: 10,
    background: '#f8fafc', border: '1px solid #e2e8f0', color: '#1e293b',
    fontSize: 14, fontWeight: 600, outline: 'none', textAlign: 'center' as const,
    boxSizing: 'border-box' as const,
  }

  const selectSmall: React.CSSProperties = {
    ...inputSmall, width: 180, textAlign: 'left' as const, appearance: 'auto' as any,
  }

  const infoBadge: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
    background: '#eef2ff', color: '#6366f1',
  }

  const ToggleSwitch = ({ active, onToggle }: { active: boolean; onToggle: () => void }) => (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
      }}
    >
      {active ? (
        <ToggleRight size={32} style={{ color: '#6366f1' }} />
      ) : (
        <ToggleLeft size={32} style={{ color: '#cbd5e1' }} />
      )}
      <span style={{ fontSize: 13, fontWeight: 600, color: active ? '#6366f1' : '#94a3b8' }}>
        {active ? 'Actif' : 'Inactif'}
      </span>
    </motion.button>
  )

  return (
    <div style={{ padding: 28, background: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 28 }}
      >
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: '#0f172a' }}>
            Param&egrave;tres RH
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>
            Configuration des r&egrave;gles de travail, cong&eacute;s et paie &mdash; L&eacute;gislation luxembourgeoise
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 24px', borderRadius: 12, border: 'none',
            background: saved ? '#10b981' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            boxShadow: saved ? '0 4px 14px rgba(16,185,129,0.35)' : '0 4px 14px rgba(99,102,241,0.35)',
            transition: 'all .3s',
          }}
        >
          {saved ? <><Check size={18} /> Enregistr&eacute; !</> : <><Settings2 size={18} /> Sauvegarder</>}
        </motion.button>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 20 }}>
        {/* ── SECTION 1: Règles de l'entreprise ───────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={cardStyle}
        >
          <div style={sectionTitle}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={18} style={{ color: '#6366f1' }} />
            </div>
            R&egrave;gles de l&rsquo;entreprise
          </div>
          <p style={sectionDesc}>Horaires, heures suppl&eacute;mentaires et pauses</p>

          {/* Heures standard */}
          <div style={fieldRow}>
            <div>
              <div style={fieldLabel}>Heures de travail standard</div>
              <div style={fieldSub}>Dur&eacute;e hebdomadaire l&eacute;gale</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number" style={inputSmall}
                value={heuresStandard}
                onChange={e => setHeuresStandard(Number(e.target.value))}
                min={0} max={60}
              />
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>h/sem</span>
            </div>
          </div>

          {/* Taux HS 150% */}
          <div style={fieldRow}>
            <div>
              <div style={fieldLabel}>Heures suppl&eacute;mentaires &mdash; Taux 1</div>
              <div style={fieldSub}>Majoration standard (jours ouvrables)</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number" style={inputSmall}
                value={tauxHS150}
                onChange={e => setTauxHS150(Number(e.target.value))}
                min={100} max={300} step={10}
              />
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>%</span>
            </div>
          </div>

          {/* Taux HS 200% */}
          <div style={fieldRow}>
            <div>
              <div style={fieldLabel}>Heures suppl&eacute;mentaires &mdash; Taux 2</div>
              <div style={fieldSub}>Majoration dimanche / jours f&eacute;ri&eacute;s</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number" style={inputSmall}
                value={tauxHS200}
                onChange={e => setTauxHS200(Number(e.target.value))}
                min={100} max={400} step={10}
              />
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>%</span>
            </div>
          </div>

          {/* Pause obligatoire */}
          <div style={{ ...fieldRow, borderBottom: 'none' }}>
            <div>
              <div style={fieldLabel}>Pause obligatoire</div>
              <div style={fieldSub}>Apr&egrave;s 6h de travail continu</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number" style={inputSmall}
                value={pauseObligatoire}
                onChange={e => setPauseObligatoire(Number(e.target.value))}
                min={0} max={120} step={5}
              />
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>min</span>
            </div>
          </div>
        </motion.div>

        {/* ── SECTION 2: Congés ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={cardStyle}
        >
          <div style={sectionTitle}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={18} style={{ color: '#10b981' }} />
            </div>
            Cong&eacute;s
          </div>
          <p style={sectionDesc}>Jours de cong&eacute;s annuels, report et maladie</p>

          {/* Jours congés annuels */}
          <div style={fieldRow}>
            <div>
              <div style={fieldLabel}>Jours de cong&eacute;s annuels</div>
              <div style={fieldSub}>Minimum l&eacute;gal Luxembourg : 26 jours ouvrables</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number" style={inputSmall}
                value={joursConges}
                onChange={e => setJoursConges(Number(e.target.value))}
                min={26} max={40}
              />
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>jours</span>
            </div>
          </div>

          {/* Report congés */}
          <div style={fieldRow}>
            <div>
              <div style={fieldLabel}>Report des cong&eacute;s non pris</div>
              <div style={fieldSub}>Possibilit&eacute; de reporter &agrave; l&rsquo;ann&eacute;e suivante</div>
            </div>
            <ToggleSwitch active={toggles.reportConges} onToggle={() => toggleField('reportConges')} />
          </div>

          {/* Certificat maladie */}
          <div style={{ ...fieldRow, borderBottom: 'none' }}>
            <div>
              <div style={fieldLabel}>Certificat m&eacute;dical requis apr&egrave;s</div>
              <div style={fieldSub}>Nombre de jours d&rsquo;absence avant obligation</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number" style={inputSmall}
                value={certifMaladie}
                onChange={e => setCertifMaladie(Number(e.target.value))}
                min={1} max={10}
              />
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>jours</span>
            </div>
          </div>

          {/* Info box */}
          <div style={{
            marginTop: 16, padding: '12px 16px', borderRadius: 12,
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <Info size={16} style={{ color: '#16a34a', flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 12, color: '#166534', lineHeight: 1.5 }}>
              Le droit luxembourgeois accorde 26 jours ouvrables de cong&eacute; annuel minimum.
              Les cong&eacute;s non pris peuvent &ecirc;tre report&eacute;s jusqu&rsquo;au 31 mars de l&rsquo;ann&eacute;e suivante.
            </div>
          </div>
        </motion.div>

        {/* ── SECTION 3: Paie ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={cardStyle}
        >
          <div style={sectionTitle}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={18} style={{ color: '#ca8a04' }} />
            </div>
            Paie
          </div>
          <p style={sectionDesc}>Salaire minimum, cotisations sociales et date de virement</p>

          {/* Salaire minimum */}
          <div style={fieldRow}>
            <div>
              <div style={fieldLabel}>Salaire social minimum (SSM)</div>
              <div style={fieldSub}>Non qualifi&eacute; &mdash; Brut mensuel 2026</div>
            </div>
            <span style={infoBadge}>
              <Euro size={14} /> 2 570,93 &euro;
            </span>
          </div>

          {/* SSM qualifié */}
          <div style={fieldRow}>
            <div>
              <div style={fieldLabel}>SSM qualifi&eacute;</div>
              <div style={fieldSub}>+20% du salaire minimum non qualifi&eacute;</div>
            </div>
            <span style={infoBadge}>
              <Euro size={14} /> 3 085,12 &euro;
            </span>
          </div>

          {/* CNS */}
          <div style={fieldRow}>
            <div>
              <div style={fieldLabel}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <HeartPulse size={14} style={{ color: '#ec4899' }} /> CNS (Maladie)
                </span>
              </div>
              <div style={fieldSub}>Caisse Nationale de Sant&eacute; &mdash; Part salariale : 2,80%</div>
            </div>
            <ToggleSwitch active={toggles.cns} onToggle={() => toggleField('cns')} />
          </div>

          {/* Pension */}
          <div style={fieldRow}>
            <div>
              <div style={fieldLabel}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Briefcase size={14} style={{ color: '#6366f1' }} /> Pension
                </span>
              </div>
              <div style={fieldSub}>Assurance pension &mdash; Part salariale : 8,00%</div>
            </div>
            <ToggleSwitch active={toggles.pension} onToggle={() => toggleField('pension')} />
          </div>

          {/* Assurance dépendance */}
          <div style={fieldRow}>
            <div>
              <div style={fieldLabel}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Shield size={14} style={{ color: '#10b981' }} /> Assurance d&eacute;pendance
                </span>
              </div>
              <div style={fieldSub}>Contribution d&eacute;pendance &mdash; 1,40%</div>
            </div>
            <ToggleSwitch active={toggles.assuranceDependance} onToggle={() => toggleField('assuranceDependance')} />
          </div>

          {/* Jour de paie */}
          <div style={{ ...fieldRow, borderBottom: 'none' }}>
            <div>
              <div style={fieldLabel}>Jour de versement du salaire</div>
              <div style={fieldSub}>Date de virement bancaire mensuel</div>
            </div>
            <select
              style={selectSmall}
              value={jourPaie}
              onChange={e => setJourPaie(e.target.value)}
            >
              <option value="25">Le 25 du mois</option>
              <option value="28">Le 28 du mois</option>
              <option value="dernier">Dernier jour ouvrable</option>
            </select>
          </div>

          {/* Info box cotisations */}
          <div style={{
            marginTop: 16, padding: '12px 16px', borderRadius: 12,
            background: '#fefce8', border: '1px solid #fde68a',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <Info size={16} style={{ color: '#ca8a04', flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 12, color: '#854d0e', lineHeight: 1.5 }}>
              Total cotisations salariales : ~12,20% du salaire brut.
              L&rsquo;employeur verse &eacute;galement ~12,17% de charges patronales en sus.
            </div>
          </div>
        </motion.div>

        {/* ── SECTION 4: Export comptable ──────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={cardStyle}
        >
          <div style={sectionTitle}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#fce4ec', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileSpreadsheet size={18} style={{ color: '#e11d48' }} />
            </div>
            Export comptable
          </div>
          <p style={sectionDesc}>Exportation des donn&eacute;es RH pour la comptabilit&eacute; et la fiduciaire</p>

          {/* Format */}
          <div style={fieldRow}>
            <div>
              <div style={fieldLabel}>Format d&rsquo;export</div>
              <div style={fieldSub}>S&eacute;lectionnez le format compatible avec votre fiduciaire</div>
            </div>
            <select
              style={selectSmall}
              value={formatExport}
              onChange={e => setFormatExport(e.target.value)}
            >
              <option value="CSV">CSV (standard)</option>
              <option value="Excel">Excel (.xlsx)</option>
              <option value="FIDUCIAIRE">Format FIDUCIAIRE</option>
            </select>
          </div>

          {/* Contenu export */}
          <div style={{ ...fieldRow, borderBottom: 'none', flexDirection: 'column' as const, alignItems: 'stretch', gap: 12 }}>
            <div style={fieldLabel}>Donn&eacute;es incluses dans l&rsquo;export</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                'Liste du personnel', 'Salaires bruts', 'Cotisations sociales',
                'Heures travaill\u00e9es', 'Cong\u00e9s utilis\u00e9s', 'Historique absences',
              ].map(item => (
                <span key={item} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: '#f0f0ff', color: '#6366f1', border: '1px solid #e0e7ff',
                }}>
                  <Check size={12} /> {item}
                </span>
              ))}
            </div>
          </div>

          {/* Export button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleExport}
            disabled={exporting}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%', padding: '14px 24px', borderRadius: 12, border: 'none',
              background: exporting ? '#10b981' : 'linear-gradient(135deg, #e11d48, #f43f5e)',
              color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 16,
              boxShadow: exporting ? '0 4px 14px rgba(16,185,129,0.3)' : '0 4px 14px rgba(225,29,72,0.3)',
              transition: 'all .3s',
            }}
          >
            {exporting ? (
              <><Check size={18} /> Export termin&eacute; !</>
            ) : (
              <><Download size={18} /> Exporter les donn&eacute;es RH ({formatExport})</>
            )}
          </motion.button>

          {/* Info box */}
          <div style={{
            marginTop: 16, padding: '12px 16px', borderRadius: 12,
            background: '#fef2f2', border: '1px solid #fecaca',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <Info size={16} style={{ color: '#dc2626', flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 12, color: '#991b1b', lineHeight: 1.5 }}>
              L&rsquo;export g&eacute;n&egrave;re un fichier contenant les donn&eacute;es du mois en cours.
              Pour une p&eacute;riode personnalis&eacute;e, contactez votre fiduciaire.
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{
          marginTop: 24, padding: '16px 24px', borderRadius: 14,
          background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          {[
            { label: 'Heures/sem', value: `${heuresStandard}h`, color: '#6366f1' },
            { label: 'Cong\u00e9s/an', value: `${joursConges}j`, color: '#10b981' },
            { label: 'Pause', value: `${pauseObligatoire} min`, color: '#f97316' },
            { label: 'Paie', value: jourPaie === 'dernier' ? 'Fin de mois' : `Le ${jourPaie}`, color: '#ca8a04' },
            { label: 'Cotisations', value: `${[toggles.cns && 'CNS', toggles.pension && 'Pension', toggles.assuranceDependance && 'D\u00e9p.'].filter(Boolean).join(', ') || 'Aucune'}`, color: '#ec4899' },
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {item.label}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: item.color, marginTop: 2 }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          Derni&egrave;re modification : {new Date().toLocaleDateString('fr-LU')}
        </div>
      </motion.div>
    </div>
  )
}
