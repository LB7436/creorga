import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  Users,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Download,
  Lock,
  Eye,
  Cookie,
  Video,
  GraduationCap,
  Activity,
  ClipboardCheck,
  Mail,
  Phone,
  Plus,
  X,
  Clock,
} from 'lucide-react'
import toast from 'react-hot-toast'

/* ── palette ── */
const C = {
  text: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  bg: '#f8fafc',
  card: '#ffffff',
  green: '#059669',
  greenSoft: '#d1fae5',
  amber: '#f59e0b',
  amberSoft: '#fef3c7',
  red: '#ef4444',
  redSoft: '#fee2e2',
  blue: '#3b82f6',
  blueSoft: '#dbeafe',
  violet: '#7C3AED',
  violetSoft: '#ede9fe',
}

interface Treatment {
  id: string
  name: string
  finality: string
  legalBasis: string
  categories: string
  recipients: string
  retention: string
  security: string
}

interface Request {
  id: string
  date: string
  requester: string
  type: 'Accès' | 'Rectification' | 'Suppression' | 'Portabilité' | 'Opposition'
  status: 'En cours' | 'Complétée' | 'En attente'
  deadline: string
}

interface Camera {
  id: string
  name: string
  location: string
  retention: string
  purpose: string
}

interface Audit {
  id: string
  date: string
  type: string
  score: number
  auditor: string
}

interface Employee {
  id: string
  name: string
  role: string
  trainedDate: string
  nextRefresh: string
  status: 'formé' | 'à renouveler'
}

const TREATMENTS: Treatment[] = [
  { id: 't1', name: 'Gestion clientèle', finality: 'Prise de réservations et suivi clients', legalBasis: 'Exécution du contrat', categories: 'Nom, email, téléphone, préférences', recipients: 'Personnel salle, direction', retention: '3 ans après dernière interaction', security: 'Chiffrement, accès restreint' },
  { id: 't2', name: 'Facturation', finality: 'Émission et conservation des factures', legalBasis: 'Obligation légale', categories: 'Nom, adresse, montants', recipients: 'Comptable, AED', retention: '10 ans (obligation fiscale LU)', security: 'Serveur sécurisé, sauvegarde chiffrée' },
  { id: 't3', name: 'Marketing direct', finality: 'Envoi newsletters et promotions', legalBasis: 'Consentement', categories: 'Email, préférences, historique', recipients: 'Équipe marketing, Mailchimp (US — SCC)', retention: 'Jusqu\'au retrait du consentement', security: 'Double opt-in, désabonnement 1 clic' },
  { id: 't4', name: 'Vidéosurveillance (CCTV)', finality: 'Sécurité des biens et personnes', legalBasis: 'Intérêt légitime', categories: 'Images vidéo', recipients: 'Gérance, police sur réquisition', retention: '30 jours', security: 'Stockage local chiffré, accès journalisé' },
  { id: 't5', name: 'Cookies site web', finality: 'Analytics et personnalisation', legalBasis: 'Consentement', categories: 'Identifiants techniques, navigation', recipients: 'Google Analytics, Meta', retention: '13 mois max', security: 'Bannière de consentement, IP anonymisée' },
  { id: 't6', name: 'Recrutement', finality: 'Traitement des candidatures', legalBasis: 'Mesures précontractuelles', categories: 'CV, lettres, évaluations', recipients: 'RH, direction', retention: '2 ans si non retenu', security: 'Coffre-fort RH, suppression automatique' },
  { id: 't7', name: 'Paie', finality: 'Gestion salariale et déclarations sociales', legalBasis: 'Obligation légale', categories: 'Identité, compte bancaire, salaires, santé', recipients: 'CCSS, fiduciaire, ADEM', retention: '10 ans', security: 'Logiciel paie certifié, accès restreint' },
  { id: 't8', name: 'HACCP', finality: 'Traçabilité sanitaire', legalBasis: 'Obligation légale', categories: 'Relevés température, identité opérateur', recipients: 'Direction, ALVA', retention: '5 ans', security: 'Registre numérique horodaté' },
]

const REQUESTS: Request[] = [
  { id: 'r1', date: '2026-04-10', requester: 'M. Dupont (client)', type: 'Accès', status: 'En cours', deadline: '2026-05-10' },
  { id: 'r2', date: '2026-04-02', requester: 'Mme Leblanc', type: 'Suppression', status: 'Complétée', deadline: '2026-05-02' },
  { id: 'r3', date: '2026-03-18', requester: 'J. Martins (ancien employé)', type: 'Portabilité', status: 'Complétée', deadline: '2026-04-18' },
]

const CAMERAS: Camera[] = [
  { id: 'c1', name: 'Caméra 1 — Entrée', location: 'Porte principale', retention: '30 jours', purpose: 'Sécurité accès' },
  { id: 'c2', name: 'Caméra 2 — Caisse', location: 'Zone POS', retention: '30 jours', purpose: 'Prévention vol' },
  { id: 'c3', name: 'Caméra 3 — Terrasse', location: 'Terrasse extérieure', retention: '30 jours', purpose: 'Sécurité biens' },
  { id: 'c4', name: 'Caméra 4 — Cuisine', location: 'Cuisine (couloir)', retention: '30 jours', purpose: 'Sécurité' },
]

const AUDITS: Audit[] = [
  { id: 'a1', date: '2026-02-15', type: 'Audit interne annuel', score: 87, auditor: 'DPO externe — CONFORMIX' },
  { id: 'a2', date: '2025-11-08', type: 'Revue cookies & marketing', score: 92, auditor: 'DPO interne' },
  { id: 'a3', date: '2025-06-20', type: 'Audit CNPD — contrôle ciblé', score: 78, auditor: 'CNPD Luxembourg' },
]

const EMPLOYEES: Employee[] = [
  { id: 'e1', name: 'Sophie Martin', role: 'Manager', trainedDate: '2025-09-15', nextRefresh: '2026-09-15', status: 'formé' },
  { id: 'e2', name: 'Lucas Weber', role: 'Cuisinier', trainedDate: '2025-09-15', nextRefresh: '2026-09-15', status: 'formé' },
  { id: 'e3', name: 'Emma Schmit', role: 'Serveur/se', trainedDate: '2024-05-10', nextRefresh: '2025-05-10', status: 'à renouveler' },
  { id: 'e4', name: 'Thomas Klein', role: 'Commis', trainedDate: '2025-11-22', nextRefresh: '2026-11-22', status: 'formé' },
  { id: 'e5', name: 'Léa Dupont', role: 'Barman', trainedDate: '2024-08-03', nextRefresh: '2025-08-03', status: 'à renouveler' },
]

const CONSENTS = {
  email: 184,
  sms: 98,
  marketing: 142,
  cookies: 248,
  total: 248,
}

function RgpdPage() {
  const [tab, setTab] = useState<'registre' | 'requests' | 'breach' | 'consent' | 'cctv' | 'audits' | 'training' | 'policies'>('registre')
  const [newRequestOpen, setNewRequestOpen] = useState(false)

  const stats = useMemo(() => ({
    registers: TREATMENTS.length,
    requests: REQUESTS.filter(r => r.date.startsWith('2026-04')).length,
    incidents: 0,
    consents: CONSENTS.total,
  }), [])

  return (
    <div style={{ padding: 24, background: C.bg, minHeight: '100vh', color: C.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Shield size={28} color={C.green} /> RGPD / Conformité
          </h1>
          <p style={{ margin: '4px 0 0', color: C.muted }}>Protection des données personnelles — Luxembourg (CNPD)</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => toast.success('Export PDF CNPD généré')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.card, color: C.text, border: `1px solid ${C.border}`, padding: '10px 16px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
            <Download size={16} /> Exporter registre CNPD
          </button>
          <button onClick={() => setNewRequestOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.green, color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={16} /> Nouvelle demande
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Registres de traitement', value: stats.registers, icon: ClipboardCheck, color: C.green, bg: C.greenSoft },
          { label: 'Demandes RGPD ce mois', value: stats.requests, icon: Mail, color: C.blue, bg: C.blueSoft },
          { label: 'Incidents', value: stats.incidents, icon: AlertTriangle, color: C.red, bg: C.redSoft },
          { label: 'Consentements clients', value: stats.consents, icon: Users, color: C.violet, bg: C.violetSoft },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} style={{ background: C.card, padding: 18, borderRadius: 14, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <s.icon size={22} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: C.muted }}>{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* DPO card */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 18, marginBottom: 22, display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ width: 54, height: 54, borderRadius: 12, background: C.greenSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={28} color={C.green} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, textTransform: 'uppercase' }}>Délégué à la Protection des Données (DPO)</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginTop: 2 }}>CONFORMIX SARL — Me Pierre Lang</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 2, display: 'flex', gap: 14 }}>
            <span><Mail size={12} style={{ verticalAlign: 'middle' }} /> dpo@conformix.lu</span>
            <span><Phone size={12} style={{ verticalAlign: 'middle' }} /> +352 44 22 33 11</span>
          </div>
        </div>
        <div style={{ padding: '10px 14px', background: C.bg, borderRadius: 10, fontSize: 12 }}>
          <div style={{ color: C.muted }}>Autorité de contrôle</div>
          <div style={{ fontWeight: 600 }}>CNPD Luxembourg</div>
          <div style={{ color: C.muted, fontSize: 11 }}>cnpd.public.lu</div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${C.border}`, overflowX: 'auto' }}>
        {[
          { id: 'registre', label: 'Registre traitements', icon: ClipboardCheck },
          { id: 'requests', label: 'Demandes', icon: Mail },
          { id: 'breach', label: 'Violations', icon: AlertTriangle },
          { id: 'consent', label: 'Consentements', icon: CheckCircle2 },
          { id: 'cctv', label: 'CCTV', icon: Video },
          { id: 'audits', label: 'Audits', icon: Activity },
          { id: 'training', label: 'Formation', icon: GraduationCap },
          { id: 'policies', label: 'Politiques', icon: FileText },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} style={{
            background: 'transparent', border: 'none', padding: '10px 12px', cursor: 'pointer',
            color: tab === t.id ? C.green : C.muted, fontWeight: 600, fontSize: 13,
            borderBottom: tab === t.id ? `2px solid ${C.green}` : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
          }}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'registre' && (
          <motion.div key="reg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              {TREATMENTS.map(t => (
                <div key={t.id} style={{ background: C.card, padding: 18, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: C.greenSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Lock size={16} color={C.green} />
                    </div>
                    <h4 style={{ margin: 0, fontSize: 15 }}>{t.name}</h4>
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                    <div><strong>Finalité :</strong> <span style={{ color: C.muted }}>{t.finality}</span></div>
                    <div><strong>Base légale :</strong> <span style={{ color: C.muted }}>{t.legalBasis}</span></div>
                    <div><strong>Données :</strong> <span style={{ color: C.muted }}>{t.categories}</span></div>
                    <div><strong>Destinataires :</strong> <span style={{ color: C.muted }}>{t.recipients}</span></div>
                    <div><strong>Conservation :</strong> <span style={{ color: C.muted }}>{t.retention}</span></div>
                    <div><strong>Sécurité :</strong> <span style={{ color: C.muted }}>{t.security}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === 'requests' && (
          <motion.div key="rq" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.bg, textAlign: 'left' }}>
                    {['Date', 'Demandeur', 'Type', 'Statut', 'Délai légal', 'Actions'].map(h => (
                      <th key={h} style={{ padding: 12, fontSize: 12, color: C.muted, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {REQUESTS.map(r => (
                    <tr key={r.id} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: 12, color: C.muted }}>{r.date}</td>
                      <td style={{ padding: 12, fontWeight: 600 }}>{r.requester}</td>
                      <td style={{ padding: 12 }}>
                        <span style={{ background: C.violetSoft, color: C.violet, padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>{r.type}</span>
                      </td>
                      <td style={{ padding: 12 }}>
                        <span style={{
                          background: r.status === 'Complétée' ? C.greenSoft : r.status === 'En cours' ? C.blueSoft : C.amberSoft,
                          color: r.status === 'Complétée' ? C.green : r.status === 'En cours' ? C.blue : C.amber,
                          padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        }}>{r.status}</span>
                      </td>
                      <td style={{ padding: 12, fontSize: 12 }}><Clock size={12} style={{ display: 'inline', marginRight: 4 }} />{r.deadline}</td>
                      <td style={{ padding: 12 }}>
                        <button style={{ background: C.bg, border: `1px solid ${C.border}`, padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Ouvrir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 14, padding: 14, background: C.blueSoft, borderRadius: 10, color: C.blue, fontSize: 13, display: 'flex', alignItems: 'start', gap: 10 }}>
              <Clock size={16} style={{ marginTop: 2 }} />
              <div>Délai légal de réponse : <strong>1 mois</strong> (prolongeable de 2 mois si complexe). Toute demande doit être documentée et la réponse conservée.</div>
            </div>
          </motion.div>
        )}

        {tab === 'breach' && (
          <motion.div key="br" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 40, textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: C.greenSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <CheckCircle2 size={32} color={C.green} />
              </div>
              <h3 style={{ margin: '0 0 6px' }}>Aucune violation enregistrée</h3>
              <p style={{ margin: 0, color: C.muted, fontSize: 14 }}>
                Le registre des violations est vide. En cas de fuite de données, notification à la CNPD sous <strong>72h</strong> obligatoire.
              </p>
              <button onClick={() => toast('Formulaire de déclaration ouvert')} style={{ marginTop: 18, background: C.red, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
                <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Déclarer un incident
              </button>
            </div>
          </motion.div>
        )}

        {tab === 'consent' && (
          <motion.div key="cs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
              {[
                { label: 'Email marketing', value: CONSENTS.email, icon: Mail, color: C.blue, bg: C.blueSoft },
                { label: 'SMS promotionnel', value: CONSENTS.sms, icon: Phone, color: C.violet, bg: C.violetSoft },
                { label: 'Marketing général', value: CONSENTS.marketing, icon: Users, color: C.green, bg: C.greenSoft },
                { label: 'Cookies analytiques', value: CONSENTS.cookies, icon: Cookie, color: C.amber, bg: C.amberSoft },
              ].map(s => (
                <div key={s.label} style={{ background: C.card, padding: 16, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <s.icon size={16} color={s.color} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.label}</div>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>sur {CONSENTS.total} clients</div>
                  <div style={{ background: C.bg, height: 6, borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${(s.value / CONSENTS.total) * 100}%`, height: '100%', background: s.color }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: 18 }}>
              <h4 style={{ margin: '0 0 10px' }}>Bannière cookies — configuration</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['Cookies strictement nécessaires (toujours actifs)', 'Cookies analytiques (Google Analytics)', 'Cookies marketing (Meta Pixel)', 'Cookies de personnalisation'].map((c, i) => (
                  <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: C.bg, borderRadius: 8 }}>
                    <input type="checkbox" defaultChecked={i === 0 || i === 1} disabled={i === 0} />
                    <span style={{ fontSize: 13 }}>{c}</span>
                  </label>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'cctv' && (
          <motion.div key="cv" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ background: C.amberSoft, color: C.amber, padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13, display: 'flex', gap: 8 }}>
              <Eye size={16} /> Déclaration CNPD vidéosurveillance — réf. CCTV-2024-RUM-0087 — durée de conservation légale maximale : 30 jours.
            </div>
            <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.bg, textAlign: 'left' }}>
                    {['Caméra', 'Emplacement', 'Finalité', 'Conservation'].map(h => (
                      <th key={h} style={{ padding: 12, fontSize: 12, color: C.muted, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CAMERAS.map(c => (
                    <tr key={c.id} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: 12, fontWeight: 600 }}><Video size={14} style={{ display: 'inline', marginRight: 6, color: C.green }} />{c.name}</td>
                      <td style={{ padding: 12 }}>{c.location}</td>
                      <td style={{ padding: 12, color: C.muted }}>{c.purpose}</td>
                      <td style={{ padding: 12 }}>
                        <span style={{ background: C.greenSoft, color: C.green, padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>{c.retention}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {tab === 'audits' && (
          <motion.div key="au" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {AUDITS.map(a => (
                <div key={a.id} style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: 18, display: 'flex', alignItems: 'center', gap: 18 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 32, background: a.score >= 85 ? C.greenSoft : a.score >= 70 ? C.amberSoft : C.redSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: a.score >= 85 ? C.green : a.score >= 70 ? C.amber : C.red }}>
                    {a.score}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{a.type}</div>
                    <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{a.auditor} — {a.date}</div>
                  </div>
                  <button style={{ background: C.bg, border: `1px solid ${C.border}`, padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    <FileText size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Rapport
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === 'training' && (
          <motion.div key="tr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.bg, textAlign: 'left' }}>
                    {['Employé', 'Rôle', 'Dernière formation', 'Recyclage prévu', 'Statut'].map(h => (
                      <th key={h} style={{ padding: 12, fontSize: 12, color: C.muted, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {EMPLOYEES.map(e => (
                    <tr key={e.id} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: 12, fontWeight: 600 }}>{e.name}</td>
                      <td style={{ padding: 12, color: C.muted }}>{e.role}</td>
                      <td style={{ padding: 12 }}>{e.trainedDate}</td>
                      <td style={{ padding: 12 }}>{e.nextRefresh}</td>
                      <td style={{ padding: 12 }}>
                        <span style={{
                          background: e.status === 'formé' ? C.greenSoft : C.amberSoft,
                          color: e.status === 'formé' ? C.green : C.amber,
                          padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        }}>{e.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 14, padding: 14, background: C.violetSoft, borderRadius: 10, color: C.violet, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <GraduationCap size={16} /> Formation RGPD annuelle obligatoire — e-learning 45 min + quiz.
            </div>
          </motion.div>
        )}

        {tab === 'policies' && (
          <motion.div key="po" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              {[
                { title: 'Politique de confidentialité', desc: 'Document d\'information aux personnes concernées sur la collecte et l\'usage de leurs données.', icon: FileText, version: 'v3.2 — 2026-02-01' },
                { title: 'Politique cookies', desc: 'Détail des cookies utilisés, durée, finalité, gestion du consentement via bannière.', icon: Cookie, version: 'v2.1 — 2025-11-15' },
                { title: 'Charte employés', desc: 'Bonnes pratiques RGPD pour le personnel : mots de passe, mobilité, confidentialité.', icon: Users, version: 'v1.4 — 2025-09-01' },
                { title: 'Procédure violations', desc: 'Processus de détection, notification CNPD (72h) et communication aux personnes concernées.', icon: AlertTriangle, version: 'v2.0 — 2025-06-10' },
              ].map(p => (
                <div key={p.title} style={{ background: C.card, padding: 18, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: C.greenSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <p.icon size={20} color={C.green} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 15 }}>{p.title}</h4>
                      <div style={{ fontSize: 11, color: C.muted }}>{p.version}</div>
                    </div>
                  </div>
                  <p style={{ margin: '0 0 12px', fontSize: 13, color: C.muted }}>{p.desc}</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      <Eye size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Consulter
                    </button>
                    <button style={{ flex: 1, background: C.green, color: '#fff', border: 'none', padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Éditer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New request modal */}
      <AnimatePresence>
        {newRequestOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setNewRequestOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()} style={{ background: C.card, padding: 24, borderRadius: 16, width: 480, maxWidth: '90%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h3 style={{ margin: 0 }}>Enregistrer une demande RGPD</h3>
                <button onClick={() => setNewRequestOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input placeholder="Nom du demandeur" style={{ padding: 10, border: `1px solid ${C.border}`, borderRadius: 8 }} />
                <input placeholder="Email / coordonnées" style={{ padding: 10, border: `1px solid ${C.border}`, borderRadius: 8 }} />
                <select style={{ padding: 10, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                  <option>Accès</option><option>Rectification</option><option>Suppression</option><option>Portabilité</option><option>Opposition</option>
                </select>
                <textarea placeholder="Description de la demande" rows={3} style={{ padding: 10, border: `1px solid ${C.border}`, borderRadius: 8, resize: 'vertical', fontFamily: 'inherit' }} />
                <button onClick={() => { toast.success('Demande enregistrée — délai 1 mois'); setNewRequestOpen(false) }} style={{ background: C.green, color: '#fff', border: 'none', padding: 12, borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
                  <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Enregistrer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default RgpdPage
