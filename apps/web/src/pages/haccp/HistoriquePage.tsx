import { useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  Filter,
  ShieldCheck,
  FileText,
  Printer,
  Mail,
  X,
  Upload,
  Camera,
  Calendar,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  Search,
} from 'lucide-react'

/* ============================================================
   TYPES
============================================================ */

interface AuditEntry {
  id: string
  date: string
  type: 'FRIDGE_TEMP' | 'CLEANING' | 'RECEIVING'
  value: string
  conforme: boolean
  operator: string
  notes: string
  photos?: string[]
}

interface HaccpPhoto {
  id: string
  url: string
  category: 'CLEANING' | 'RECEIVING' | 'INCIDENT'
  task: string
  date: string
  operator: string
}

type Period = 'week' | 'month' | 'quarter' | 'custom'
type ReportType = 'complete' | 'temperature' | 'cleaning' | 'incident'

/* ============================================================
   MOCK DATA
============================================================ */

const typeLabels: Record<string, string> = {
  FRIDGE_TEMP: 'Température',
  CLEANING: 'Nettoyage',
  RECEIVING: 'Réception',
}

const typeColors: Record<string, { bg: string; text: string }> = {
  FRIDGE_TEMP: { bg: '#dbeafe', text: '#1d4ed8' },
  CLEANING: { bg: '#dcfce7', text: '#16a34a' },
  RECEIVING: { bg: '#fef3c7', text: '#92400e' },
}

const categoryLabels: Record<string, string> = {
  CLEANING: 'Nettoyage',
  RECEIVING: 'Réception marchandise',
  INCIDENT: 'Incident',
}

const categoryColors: Record<string, { bg: string; text: string }> = {
  CLEANING: { bg: '#dcfce7', text: '#16a34a' },
  RECEIVING: { bg: '#fef3c7', text: '#92400e' },
  INCIDENT: { bg: '#fee2e2', text: '#dc2626' },
}

const mockEntries: AuditEntry[] = [
  { id: '1', date: '14/04/2026 08:00', type: 'FRIDGE_TEMP', value: '4.2°C', conforme: true, operator: 'Marie L.', notes: 'RAS', photos: ['p1'] },
  { id: '2', date: '14/04/2026 08:15', type: 'CLEANING', value: 'Surfaces cuisine', conforme: true, operator: 'Marie L.', notes: 'Nettoyage complet', photos: ['p2', 'p3'] },
  { id: '3', date: '14/04/2026 09:00', type: 'RECEIVING', value: 'Livraison Metro', conforme: true, operator: 'Thomas R.', notes: 'DLC vérifiées', photos: ['p4'] },
  { id: '4', date: '13/04/2026 08:00', type: 'FRIDGE_TEMP', value: '4.4°C', conforme: true, operator: 'Thomas R.', notes: '' },
  { id: '5', date: '13/04/2026 08:20', type: 'CLEANING', value: 'Plan de travail', conforme: true, operator: 'Thomas R.', notes: '', photos: ['p5'] },
  { id: '6', date: '13/04/2026 11:00', type: 'RECEIVING', value: 'Livraison Bofrost', conforme: true, operator: 'Lucas D.', notes: 'Température conforme', photos: ['p6'] },
  { id: '7', date: '12/04/2026 08:00', type: 'FRIDGE_TEMP', value: '9.1°C', conforme: false, operator: 'Marie L.', notes: 'Frigo 2 en panne - technicien appelé', photos: ['p7', 'p8'] },
  { id: '8', date: '12/04/2026 08:30', type: 'CLEANING', value: 'Hotte aspirante', conforme: true, operator: 'Marie L.', notes: 'Nettoyage hebdomadaire', photos: ['p9'] },
  { id: '9', date: '12/04/2026 14:00', type: 'FRIDGE_TEMP', value: '5.2°C', conforme: true, operator: 'Marie L.', notes: 'Frigo 2 réparé' },
  { id: '10', date: '11/04/2026 08:00', type: 'FRIDGE_TEMP', value: '4.1°C', conforme: true, operator: 'Lucas D.', notes: '' },
  { id: '11', date: '11/04/2026 09:30', type: 'RECEIVING', value: 'Ferme locale', conforme: true, operator: 'Lucas D.', notes: 'Légumes frais', photos: ['p10'] },
  { id: '12', date: '11/04/2026 22:00', type: 'CLEANING', value: 'Nettoyage complet', conforme: true, operator: 'Thomas R.', notes: 'Fermeture', photos: ['p11'] },
  { id: '13', date: '10/04/2026 08:00', type: 'FRIDGE_TEMP', value: '4.3°C', conforme: true, operator: 'Thomas R.', notes: '' },
  { id: '14', date: '10/04/2026 08:15', type: 'CLEANING', value: 'Surfaces', conforme: true, operator: 'Thomas R.', notes: '' },
  { id: '15', date: '09/04/2026 08:00', type: 'FRIDGE_TEMP', value: '3.9°C', conforme: true, operator: 'Marie L.', notes: '' },
  { id: '16', date: '09/04/2026 09:00', type: 'RECEIVING', value: 'Livraison boissons', conforme: false, operator: 'Marie L.', notes: 'Cartons abîmés - retour partiel', photos: ['p12'] },
  { id: '17', date: '08/04/2026 08:00', type: 'FRIDGE_TEMP', value: '4.0°C', conforme: true, operator: 'Lucas D.', notes: '' },
  { id: '18', date: '08/04/2026 22:00', type: 'CLEANING', value: 'Nettoyage complet', conforme: true, operator: 'Lucas D.', notes: '' },
  { id: '19', date: '07/04/2026 08:00', type: 'FRIDGE_TEMP', value: '4.2°C', conforme: true, operator: 'Thomas R.', notes: '' },
  { id: '20', date: '07/04/2026 10:00', type: 'RECEIVING', value: 'Livraison Metro', conforme: true, operator: 'Thomas R.', notes: '' },
]

// SVG-based mock photos (data URIs) so we never depend on network
const makeSvgPhoto = (label: string, color: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#0f172a"/></linearGradient></defs><rect width="320" height="240" fill="url(#g)"/><text x="50%" y="50%" text-anchor="middle" fill="white" font-family="system-ui" font-size="18" font-weight="700">${label}</text></svg>`
  )}`

const mockPhotos: HaccpPhoto[] = [
  { id: 'ph1', url: makeSvgPhoto('Cuisine nettoyée', '#16a34a'), category: 'CLEANING', task: 'Surfaces cuisine', date: '14/04/2026 08:15', operator: 'Marie L.' },
  { id: 'ph2', url: makeSvgPhoto('Plan de travail', '#16a34a'), category: 'CLEANING', task: 'Plan de travail', date: '13/04/2026 08:20', operator: 'Thomas R.' },
  { id: 'ph3', url: makeSvgPhoto('Livraison Metro', '#f59e0b'), category: 'RECEIVING', task: 'Livraison Metro', date: '14/04/2026 09:00', operator: 'Thomas R.' },
  { id: 'ph4', url: makeSvgPhoto('Frigo 2 panne', '#dc2626'), category: 'INCIDENT', task: 'Panne frigo 2', date: '12/04/2026 08:00', operator: 'Marie L.' },
  { id: 'ph5', url: makeSvgPhoto('Hotte aspirante', '#16a34a'), category: 'CLEANING', task: 'Hotte aspirante', date: '12/04/2026 08:30', operator: 'Marie L.' },
  { id: 'ph6', url: makeSvgPhoto('Livraison Bofrost', '#f59e0b'), category: 'RECEIVING', task: 'Livraison Bofrost', date: '13/04/2026 11:00', operator: 'Lucas D.' },
  { id: 'ph7', url: makeSvgPhoto('Ferme locale', '#f59e0b'), category: 'RECEIVING', task: 'Livraison ferme locale', date: '11/04/2026 09:30', operator: 'Lucas D.' },
  { id: 'ph8', url: makeSvgPhoto('Cartons abîmés', '#dc2626'), category: 'INCIDENT', task: 'Cartons abîmés boissons', date: '09/04/2026 09:00', operator: 'Marie L.' },
  { id: 'ph9', url: makeSvgPhoto('Nettoyage fermeture', '#16a34a'), category: 'CLEANING', task: 'Nettoyage complet', date: '11/04/2026 22:00', operator: 'Thomas R.' },
  { id: 'ph10', url: makeSvgPhoto('Technicien frigo', '#dc2626'), category: 'INCIDENT', task: 'Intervention technicien', date: '12/04/2026 11:00', operator: 'Marie L.' },
  { id: 'ph11', url: makeSvgPhoto('Surfaces cuisine', '#16a34a'), category: 'CLEANING', task: 'Surfaces', date: '10/04/2026 08:15', operator: 'Thomas R.' },
  { id: 'ph12', url: makeSvgPhoto('Livraison Metro', '#f59e0b'), category: 'RECEIVING', task: 'Livraison Metro', date: '07/04/2026 10:00', operator: 'Thomas R.' },
]

const periodLabels: Record<Period, string> = {
  week: 'Cette semaine',
  month: 'Ce mois',
  quarter: 'Ce trimestre',
  custom: 'Période personnalisée',
}

const reportLabels: Record<ReportType, string> = {
  complete: 'Complet',
  temperature: 'Températures',
  cleaning: 'Nettoyage',
  incident: 'Incidents',
}

/* ============================================================
   STYLES
============================================================ */

const card: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 16,
  border: '1px solid #e2e8f0',
  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
  padding: 24,
}

const sectionTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: '#1e293b',
  marginBottom: 4,
}

const sectionSub: React.CSSProperties = {
  fontSize: 13,
  color: '#64748b',
  marginBottom: 18,
}

const chipBtn = (active: boolean): React.CSSProperties => ({
  padding: '6px 14px',
  borderRadius: 999,
  border: active ? '1px solid #B45309' : '1px solid #e2e8f0',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  background: active ? '#B45309' : '#ffffff',
  color: active ? '#ffffff' : '#475569',
  transition: 'all 0.15s',
})

const primaryBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 18px',
  borderRadius: 12,
  border: 'none',
  fontSize: 14,
  fontWeight: 600,
  color: '#ffffff',
  background: '#B45309',
  cursor: 'pointer',
}

const ghostBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '9px 16px',
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  fontSize: 14,
  fontWeight: 500,
  color: '#1e293b',
  background: '#ffffff',
  cursor: 'pointer',
}

const selectStyle: React.CSSProperties = {
  padding: '9px 14px',
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  fontSize: 14,
  color: '#1e293b',
  background: '#ffffff',
  cursor: 'pointer',
  outline: 'none',
  minWidth: 200,
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

/* ============================================================
   MAIN
============================================================ */

export default function HistoriquePage() {
  // ---- Report generation state
  const [period, setPeriod] = useState<Period>('month')
  const [reportType, setReportType] = useState<ReportType>('complete')
  const [showReportPreview, setShowReportPreview] = useState(false)

  // ---- Photo gallery state
  const [photoFilter, setPhotoFilter] = useState<'ALL' | 'CLEANING' | 'RECEIVING' | 'INCIDENT'>('ALL')
  const [photos, setPhotos] = useState<HaccpPhoto[]>(mockPhotos)
  const [fullscreenPhoto, setFullscreenPhoto] = useState<HaccpPhoto | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ---- Audit trail state
  const [filterType, setFilterType] = useState<string>('ALL')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  /* ---------- derived ---------- */
  const filteredEntries = useMemo(
    () => (filterType === 'ALL' ? mockEntries : mockEntries.filter((e) => e.type === filterType)),
    [filterType]
  )

  const filteredPhotos = useMemo(
    () => (photoFilter === 'ALL' ? photos : photos.filter((p) => p.category === photoFilter)),
    [photoFilter, photos]
  )

  const conformeCount = mockEntries.filter((e) => e.conforme).length
  const totalCount = mockEntries.length
  const tauxConformite = Math.round((conformeCount / totalCount) * 100)
  const nonConformes = mockEntries.filter((e) => !e.conforme)

  /* ---------- handlers ---------- */
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const url = ev.target?.result as string
        const newPhoto: HaccpPhoto = {
          id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          url,
          category: 'CLEANING',
          task: file.name.replace(/\.[^/.]+$/, ''),
          date: new Date().toLocaleString('fr-FR'),
          operator: 'Opérateur actuel',
        }
        setPhotos((prev) => [newPhoto, ...prev])
      }
      reader.readAsDataURL(file)
    })
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  /* ---------- render ---------- */
  return (
    <div
      style={{
        padding: 24,
        maxWidth: 1200,
        margin: '0 auto',
        background: '#f8fafc',
        minHeight: '100vh',
      }}
    >
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
      >
        {/* ============ HEADER ============ */}
        <motion.div
          variants={fadeUp}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>
              Conformité HACCP
            </h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>
              Rapports, preuves photographiques et piste d'audit
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div
              style={{
                ...card,
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <ShieldCheck size={18} style={{ color: '#16a34a' }} />
              <div>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Taux conformité
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{tauxConformite}%</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ============ SECTION 1 — REPORT GENERATION ============ */}
        <motion.section variants={fadeUp} style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={16} style={{ color: '#B45309' }} />
            </div>
            <h2 style={sectionTitle}>Générer un rapport PDF</h2>
          </div>
          <p style={sectionSub}>Rapport de conformité aux normes luxembourgeoises (Règlement (CE) 852/2004)</p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 14,
              marginBottom: 18,
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Période
              </label>
              <div style={{ position: 'relative' }}>
                <Calendar
                  size={14}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                  }}
                />
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as Period)}
                  style={{ ...selectStyle, paddingLeft: 34, width: '100%' }}
                >
                  {(Object.keys(periodLabels) as Period[]).map((p) => (
                    <option key={p} value={p}>
                      {periodLabels[p]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Type de rapport
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                style={{ ...selectStyle, width: '100%' }}
              >
                {(Object.keys(reportLabels) as ReportType[]).map((r) => (
                  <option key={r} value={r}>
                    {reportLabels[r]}
                  </option>
                ))}
              </select>
            </div>

            {period === 'custom' && (
              <>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#475569',
                      marginBottom: 6,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    Du
                  </label>
                  <input type="date" style={{ ...selectStyle, width: '100%' }} />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#475569',
                      marginBottom: 6,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    Au
                  </label>
                  <input type="date" style={{ ...selectStyle, width: '100%' }} />
                </div>
              </>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowReportPreview(true)}
            style={primaryBtn}
          >
            <FileText size={16} />
            Générer le rapport PDF
          </motion.button>
        </motion.section>

        {/* ============ SECTION 2 — PHOTO GALLERY ============ */}
        <motion.section variants={fadeUp} style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Camera size={16} style={{ color: '#1d4ed8' }} />
            </div>
            <h2 style={sectionTitle}>Galerie de preuves photographiques</h2>
          </div>
          <p style={sectionSub}>{photos.length} photos — preuves pour contrôles sanitaires</p>

          {/* Filters */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              marginBottom: 16,
            }}
          >
            <Filter size={14} style={{ color: '#64748b' }} />
            <span style={{ fontSize: 13, color: '#64748b', marginRight: 4 }}>Filtrer :</span>
            {(['ALL', 'CLEANING', 'RECEIVING', 'INCIDENT'] as const).map((c) => (
              <button key={c} onClick={() => setPhotoFilter(c)} style={chipBtn(photoFilter === c)}>
                {c === 'ALL' ? 'Tous' : categoryLabels[c]}
              </button>
            ))}
          </div>

          {/* Upload drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? '#B45309' : '#cbd5e1'}`,
              borderRadius: 14,
              padding: 22,
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragging ? '#fffbeb' : '#f8fafc',
              transition: 'all 0.2s',
              marginBottom: 20,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              style={{ display: 'none' }}
            />
            <Upload size={22} style={{ color: isDragging ? '#B45309' : '#64748b', marginBottom: 6 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
              Télécharger une photo
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Glissez-déposez ou cliquez pour sélectionner (JPG, PNG)
            </div>
          </div>

          {/* Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 14,
            }}
          >
            <AnimatePresence mode="popLayout">
              {filteredPhotos.map((photo) => (
                <motion.div
                  key={photo.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ y: -3 }}
                  onClick={() => setFullscreenPhoto(photo)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '4 / 3',
                      background: `url(${photo.url}) center/cover`,
                      position: 'relative',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        background: categoryColors[photo.category].bg,
                        color: categoryColors[photo.category].text,
                      }}
                    >
                      {categoryLabels[photo.category]}
                    </span>
                  </div>
                  <div style={{ padding: 10 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#1e293b',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {photo.task}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      {photo.date}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      {photo.operator}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredPhotos.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: 40,
                color: '#94a3b8',
                fontSize: 14,
              }}
            >
              <ImageIcon size={28} style={{ marginBottom: 8 }} />
              <div>Aucune photo dans cette catégorie</div>
            </div>
          )}
        </motion.section>

        {/* ============ SECTION 3 — AUDIT TRAIL ============ */}
        <motion.section variants={fadeUp} style={card}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
              marginBottom: 4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: '#dcfce7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Search size={16} style={{ color: '#16a34a' }} />
              </div>
              <h2 style={sectionTitle}>Piste d'audit</h2>
            </div>
            <button style={ghostBtn}>
              <Download size={14} />
              Exporter CSV
            </button>
          </div>
          <p style={sectionSub}>Traçabilité complète — cliquez pour déployer les preuves photo</p>

          {/* Filter chips */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              marginBottom: 14,
            }}
          >
            <Filter size={14} style={{ color: '#64748b' }} />
            <span style={{ fontSize: 13, color: '#64748b', marginRight: 4 }}>Type :</span>
            {['ALL', 'FRIDGE_TEMP', 'CLEANING', 'RECEIVING'].map((t) => (
              <button key={t} onClick={() => setFilterType(t)} style={chipBtn(filterType === t)}>
                {t === 'ALL' ? 'Tous' : typeLabels[t]}
              </button>
            ))}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  {['', 'Date', 'Type', 'Détail', 'Conformité', 'Opérateur', 'Notes'].map((h, i) => (
                    <th
                      key={i}
                      style={{
                        padding: '10px 12px',
                        textAlign: 'left',
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        width: i === 0 ? 32 : undefined,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => {
                  const isOpen = expandedRow === entry.id
                  const rowPhotos = photos.filter((p) =>
                    entry.photos?.some((ph) => p.task.toLowerCase().includes(entry.value.toLowerCase().slice(0, 10)))
                  ).slice(0, 3)
                  const hasPhotos = entry.photos && entry.photos.length > 0

                  return (
                    <>
                      <tr
                        key={entry.id}
                        onClick={() => hasPhotos && setExpandedRow(isOpen ? null : entry.id)}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          cursor: hasPhotos ? 'pointer' : 'default',
                          background: isOpen ? '#f8fafc' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                      >
                        <td style={{ padding: '10px 12px', color: '#94a3b8' }}>
                          {hasPhotos ? (
                            isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                          ) : null}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: '#475569' }}>{entry.date}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              padding: '3px 10px',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 600,
                              background: typeColors[entry.type].bg,
                              color: typeColors[entry.type].text,
                            }}
                          >
                            {typeLabels[entry.type]}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: '#1e293b', fontWeight: 500 }}>
                          {entry.value}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {entry.conforme ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 12,
                                fontWeight: 600,
                                color: '#16a34a',
                              }}
                            >
                              <CheckCircle2 size={14} /> Conforme
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 12,
                                fontWeight: 600,
                                color: '#dc2626',
                              }}
                            >
                              <AlertTriangle size={14} /> Non conforme
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 13, color: '#475569' }}>
                          {entry.operator}
                        </td>
                        <td
                          style={{
                            padding: '10px 12px',
                            fontSize: 13,
                            color: '#475569',
                            maxWidth: 220,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {entry.notes || '—'}
                        </td>
                      </tr>
                      <AnimatePresence>
                        {isOpen && hasPhotos && (
                          <motion.tr
                            key={`${entry.id}-expand`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <td colSpan={7} style={{ background: '#f8fafc', padding: 16 }}>
                              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
                                Preuves photographiques attachées ({entry.photos!.length}) :
                              </div>
                              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                {(rowPhotos.length > 0 ? rowPhotos : photos.slice(0, Math.min(entry.photos!.length, 3))).map((p) => (
                                  <div
                                    key={p.id}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setFullscreenPhoto(p)
                                    }}
                                    style={{
                                      width: 110,
                                      height: 80,
                                      borderRadius: 8,
                                      background: `url(${p.url}) center/cover`,
                                      border: '1px solid #e2e8f0',
                                      cursor: 'pointer',
                                    }}
                                  />
                                ))}
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </motion.section>
      </motion.div>

      {/* ============ MODAL — PDF REPORT PREVIEW ============ */}
      <AnimatePresence>
        {showReportPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowReportPreview(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#ffffff',
                borderRadius: 16,
                width: '100%',
                maxWidth: 780,
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Modal header */}
              <div
                style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FileText size={18} style={{ color: '#B45309' }} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
                    Prévisualisation — Rapport HACCP
                  </div>
                </div>
                <button
                  onClick={() => setShowReportPreview(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    display: 'flex',
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* PDF body (scrollable) */}
              <div
                style={{
                  flex: 1,
                  overflow: 'auto',
                  padding: 40,
                  background: '#f1f5f9',
                }}
              >
                <div
                  style={{
                    background: '#ffffff',
                    padding: 40,
                    borderRadius: 4,
                    boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)',
                    color: '#1e293b',
                    fontFamily: 'Georgia, serif',
                  }}
                >
                  {/* PDF header */}
                  <div
                    style={{
                      borderBottom: '2px solid #B45309',
                      paddingBottom: 14,
                      marginBottom: 20,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: '#B45309',
                        textTransform: 'uppercase',
                        letterSpacing: 1.5,
                        fontWeight: 700,
                      }}
                    >
                      Rapport de conformité HACCP
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginTop: 4 }}>
                      Creorga Restaurant
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: '#64748b',
                        marginTop: 8,
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>
                        <strong>Période :</strong> {periodLabels[period]}
                      </span>
                      <span>
                        <strong>Type :</strong> {reportLabels[reportType]}
                      </span>
                      <span>
                        <strong>Opérateur :</strong> Marie L. (responsable)
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                      Conforme au Règlement (CE) n° 852/2004 — Luxembourg
                    </div>
                  </div>

                  {/* Synthesis */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 10,
                      marginBottom: 24,
                    }}
                  >
                    {[
                      { label: 'Contrôles', value: totalCount },
                      { label: 'Conformes', value: `${tauxConformite}%` },
                      { label: 'Non-conformités', value: totalCount - conformeCount },
                    ].map((s) => (
                      <div
                        key={s.label}
                        style={{
                          border: '1px solid #e2e8f0',
                          padding: 12,
                          borderRadius: 6,
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>{s.value}</div>
                        <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                          {s.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Section — Températures */}
                  <PdfSection title="1. Contrôles températures">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={pdfTh}>Date</th>
                          <th style={pdfTh}>Équipement</th>
                          <th style={pdfTh}>Température</th>
                          <th style={pdfTh}>Conforme</th>
                          <th style={pdfTh}>Opérateur</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockEntries
                          .filter((e) => e.type === 'FRIDGE_TEMP')
                          .slice(0, 6)
                          .map((e) => (
                            <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={pdfTd}>{e.date}</td>
                              <td style={pdfTd}>Frigo principal</td>
                              <td style={{ ...pdfTd, fontWeight: 600 }}>{e.value}</td>
                              <td style={pdfTd}>{e.conforme ? 'Oui' : 'Non'}</td>
                              <td style={pdfTd}>{e.operator}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </PdfSection>

                  {/* Section — Nettoyage */}
                  <PdfSection title="2. Tâches de nettoyage">
                    <ul style={{ paddingLeft: 18, margin: 0, fontSize: 12, lineHeight: 1.7 }}>
                      {mockEntries
                        .filter((e) => e.type === 'CLEANING')
                        .slice(0, 6)
                        .map((e) => (
                          <li key={e.id}>
                            <strong>[{e.conforme ? '✓' : '✗'}]</strong> {e.value} — {e.date} ({e.operator})
                          </li>
                        ))}
                    </ul>
                  </PdfSection>

                  {/* Section — Non-conformités */}
                  <PdfSection title="3. Non-conformités">
                    {nonConformes.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                        Aucune non-conformité relevée sur la période.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {nonConformes.map((nc) => (
                          <div
                            key={nc.id}
                            style={{
                              border: '1px solid #fecaca',
                              background: '#fef2f2',
                              padding: 10,
                              borderRadius: 4,
                              fontSize: 11,
                            }}
                          >
                            <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 3 }}>
                              {typeLabels[nc.type]} — {nc.value}
                            </div>
                            <div style={{ color: '#475569' }}>
                              {nc.date} · {nc.operator}
                            </div>
                            <div style={{ color: '#1e293b', marginTop: 3 }}>
                              Action corrective : {nc.notes}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </PdfSection>

                  {/* Section — Signatures */}
                  <PdfSection title="4. Signatures">
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 24,
                        marginTop: 10,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 40 }}>
                          Opérateur responsable
                        </div>
                        <div style={{ borderTop: '1px solid #1e293b', paddingTop: 4, fontSize: 11, color: '#1e293b' }}>
                          Marie L. — {new Date().toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 40 }}>
                          Gérant / Responsable hygiène
                        </div>
                        <div
                          style={{
                            borderTop: '1px dashed #94a3b8',
                            paddingTop: 4,
                            fontSize: 11,
                            color: '#94a3b8',
                            fontStyle: 'italic',
                          }}
                        >
                          Signature à apposer
                        </div>
                      </div>
                    </div>
                  </PdfSection>

                  <div
                    style={{
                      marginTop: 30,
                      paddingTop: 12,
                      borderTop: '1px solid #e2e8f0',
                      fontSize: 10,
                      color: '#94a3b8',
                      textAlign: 'center',
                    }}
                  >
                    Document généré automatiquement par Creorga POS — Conservation obligatoire 3 ans
                  </div>
                </div>
              </div>

              {/* Action bar */}
              <div
                style={{
                  padding: 14,
                  borderTop: '1px solid #e2e8f0',
                  background: '#ffffff',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                }}
              >
                <button style={ghostBtn}>
                  <Mail size={14} />
                  Envoyer par e-mail
                </button>
                <button style={ghostBtn} onClick={() => window.print()}>
                  <Printer size={14} />
                  Imprimer
                </button>
                <button style={primaryBtn}>
                  <Download size={14} />
                  Télécharger PDF
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ MODAL — FULLSCREEN PHOTO ============ */}
      <AnimatePresence>
        {fullscreenPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFullscreenPhoto(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.92)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#ffffff',
                borderRadius: 16,
                maxWidth: 900,
                width: '100%',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
                    {fullscreenPhoto.task}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {fullscreenPhoto.date} · {fullscreenPhoto.operator}
                  </div>
                </div>
                <button
                  onClick={() => setFullscreenPhoto(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    display: 'flex',
                  }}
                >
                  <X size={20} />
                </button>
              </div>
              <div
                style={{
                  flex: 1,
                  background: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 20,
                  overflow: 'auto',
                }}
              >
                <img
                  src={fullscreenPhoto.url}
                  alt={fullscreenPhoto.task}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '60vh',
                    borderRadius: 8,
                    boxShadow: '0 8px 30px rgba(15, 23, 42, 0.15)',
                  }}
                />
              </div>
              <div
                style={{
                  padding: '14px 20px',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      background: categoryColors[fullscreenPhoto.category].bg,
                      color: categoryColors[fullscreenPhoto.category].text,
                    }}
                  >
                    {categoryLabels[fullscreenPhoto.category]}
                  </span>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      color: '#64748b',
                      background: '#f1f5f9',
                    }}
                  >
                    ID : {fullscreenPhoto.id}
                  </span>
                </div>
                <button style={ghostBtn}>
                  <Download size={14} />
                  Télécharger
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ============================================================
   HELPERS
============================================================ */

const pdfTh: React.CSSProperties = {
  padding: '8px 10px',
  textAlign: 'left',
  fontSize: 10,
  fontWeight: 700,
  color: '#475569',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
}

const pdfTd: React.CSSProperties = {
  padding: '8px 10px',
  fontSize: 11,
  color: '#1e293b',
}

function PdfSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h3
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#B45309',
          textTransform: 'uppercase',
          letterSpacing: 1,
          margin: '0 0 10px',
          borderBottom: '1px solid #fde68a',
          paddingBottom: 4,
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  )
}
