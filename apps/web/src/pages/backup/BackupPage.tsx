import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  HardDrive,
  Cloud,
  Download,
  Upload,
  RotateCcw,
  Lock,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  Database,
  Key,
  Users,
  FileText,
  AlertTriangle,
  ShieldCheck,
  MapPin,
  FileDown,
  Settings,
  Fingerprint,
} from 'lucide-react'
import toast from 'react-hot-toast'

const C = {
  text: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  bg: '#f8fafc',
  card: '#ffffff',
  blue: '#0284c7',
  blueSoft: '#e0f2fe',
  green: '#10b981',
  greenSoft: '#d1fae5',
  amber: '#f59e0b',
  amberSoft: '#fef3c7',
  red: '#ef4444',
  redSoft: '#fee2e2',
  indigo: '#6366f1',
  indigoSoft: '#e0e7ff',
}

type BackupStatus = 'success' | 'failed' | 'progress'
interface BackupEntry {
  id: string
  date: string
  type: 'Auto' | 'Manuel'
  size: string
  status: BackupStatus
  duration: string
}

const HISTORY: BackupEntry[] = Array.from({ length: 20 }, (_, i) => {
  const d = new Date()
  d.setHours(d.getHours() - i * 2)
  const statuses: BackupStatus[] = ['success', 'success', 'success', 'failed']
  const s = i === 0 ? 'progress' : statuses[i % statuses.length]
  return {
    id: `B-${1000 + i}`,
    date: d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    type: i % 3 === 0 ? 'Manuel' : 'Auto',
    size: `${(Math.random() * 0.5 + 0.1).toFixed(2)} GB`,
    status: s as BackupStatus,
    duration: `${Math.floor(Math.random() * 4 + 1)}min ${Math.floor(
      Math.random() * 55
    )}s`,
  }
})

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  soft,
}: {
  label: string
  value: string
  icon: any
  color: string
  soft: string
}) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 18,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: soft,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={22} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{value}</div>
      </div>
    </div>
  )
}

function statusBadge(s: BackupStatus) {
  if (s === 'success')
    return { icon: CheckCircle2, color: C.green, bg: C.greenSoft, label: 'Succès' }
  if (s === 'failed')
    return { icon: XCircle, color: C.red, bg: C.redSoft, label: 'Échec' }
  return { icon: Loader2, color: C.amber, bg: C.amberSoft, label: 'En cours' }
}

function BackupPage() {
  const [frequency, setFrequency] = useState('hourly')
  const [retention, setRetention] = useState('30')
  const [destination, setDestination] = useState<'cloud' | 'external' | 'both'>(
    'cloud'
  )
  const [time, setTime] = useState('03:00')
  const [twoFA, setTwoFA] = useState(true)
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [restoreStep, setRestoreStep] = useState(1)
  const [restoreScope, setRestoreScope] = useState<'menu' | 'full' | 'modules'>(
    'full'
  )
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null)
  const [pin, setPin] = useState('')

  const confirmRestore = () => {
    if (pin.length < 4) {
      toast.error('PIN admin requis (4 chiffres min)')
      return
    }
    toast.success('Restauration démarrée')
    setRestoreOpen(false)
    setRestoreStep(1)
    setPin('')
  }

  const startBackup = () => {
    toast.loading('Sauvegarde manuelle en cours...', { duration: 2000 })
    setTimeout(() => toast.success('Sauvegarde terminée'), 2100)
  }

  const exportData = (format: 'json' | 'csv') => {
    toast.success(`Export ${format.toUpperCase()} généré`)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        padding: 24,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: C.text,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${C.blue}, ${C.indigo})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(2,132,199,0.25)',
            }}
          >
            <Shield size={26} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>
              Sauvegarde & Sécurité
            </h1>
            <p style={{ margin: 0, color: C.muted, fontSize: 14 }}>
              Vos données protégées et restaurables à tout moment
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setRestoreOpen(true)}
            style={{
              border: `1px solid ${C.border}`,
              background: C.card,
              padding: '10px 14px',
              borderRadius: 10,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 500,
              color: C.text,
            }}
          >
            <RotateCcw size={15} /> Restaurer
          </button>
          <button
            onClick={startBackup}
            style={{
              border: 'none',
              background: C.blue,
              color: '#fff',
              padding: '10px 16px',
              borderRadius: 10,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Upload size={15} /> Sauvegarder maintenant
          </button>
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
          marginBottom: 22,
        }}
      >
        <StatCard
          label="Dernière sauvegarde"
          value="il y a 2h"
          icon={Clock}
          color={C.green}
          soft={C.greenSoft}
        />
        <StatCard
          label="Espace utilisé"
          value="2.4 GB"
          icon={HardDrive}
          color={C.blue}
          soft={C.blueSoft}
        />
        <StatCard
          label="Restaurations (mois)"
          value="0"
          icon={RotateCcw}
          color={C.indigo}
          soft={C.indigoSoft}
        />
        <StatCard
          label="Chiffrement"
          value="AES-256"
          icon={Lock}
          color={C.amber}
          soft={C.amberSoft}
        />
      </div>

      {/* Main grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
          marginBottom: 22,
        }}
      >
        {/* Schedule */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 20,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <Calendar size={18} color={C.blue} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              Programmation
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label
                style={{
                  fontSize: 12,
                  color: C.muted,
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                Fréquence
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { id: 'hourly', label: 'Toutes les heures' },
                  { id: '3daily', label: '3x par jour' },
                  { id: 'daily', label: 'Quotidienne' },
                  { id: 'weekly', label: 'Hebdomadaire' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFrequency(f.id)}
                    style={{
                      border: `1px solid ${
                        frequency === f.id ? C.blue : C.border
                      }`,
                      background: frequency === f.id ? C.blueSoft : C.card,
                      color: frequency === f.id ? C.blue : C.text,
                      padding: '6px 10px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  color: C.muted,
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                Heure du backup
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={{
                  border: `1px solid ${C.border}`,
                  background: C.bg,
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  color: C.text,
                  width: 140,
                }}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  color: C.muted,
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                Rétention
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { id: '7', label: '7 jours' },
                  { id: '30', label: '30 jours' },
                  { id: '90', label: '90 jours' },
                  { id: '365', label: '1 an' },
                  { id: 'inf', label: 'Illimité' },
                ].map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRetention(r.id)}
                    style={{
                      border: `1px solid ${
                        retention === r.id ? C.blue : C.border
                      }`,
                      background: retention === r.id ? C.blueSoft : C.card,
                      color: retention === r.id ? C.blue : C.text,
                      padding: '6px 10px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  color: C.muted,
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                Destination
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 8,
                }}
              >
                {[
                  { id: 'cloud' as const, label: 'Cloud LU', icon: Cloud },
                  {
                    id: 'external' as const,
                    label: 'Disque externe',
                    icon: HardDrive,
                  },
                  { id: 'both' as const, label: 'Les deux', icon: Shield },
                ].map((d) => {
                  const Icon = d.icon
                  const active = destination === d.id
                  return (
                    <button
                      key={d.id}
                      onClick={() => setDestination(d.id)}
                      style={{
                        border: `1px solid ${active ? C.blue : C.border}`,
                        background: active ? C.blueSoft : C.card,
                        color: active ? C.blue : C.text,
                        padding: 10,
                        borderRadius: 10,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    >
                      <Icon size={18} />
                      {d.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Security */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 20,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <ShieldCheck size={18} color={C.green} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Sécurité</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              {
                icon: Fingerprint,
                title: 'Authentification 2FA',
                desc: 'Code par SMS ou app TOTP',
                toggle: true,
                active: twoFA,
                onToggle: () => setTwoFA(!twoFA),
              },
              {
                icon: Users,
                title: 'Gestion des sessions',
                desc: '4 sessions actives',
                action: 'Gérer',
              },
              {
                icon: FileText,
                title: 'Journal d\'audit',
                desc: '1 247 évènements ce mois',
                action: 'Consulter',
              },
              {
                icon: Key,
                title: 'Politique mot de passe',
                desc: '12 car. min, rotation 90j',
                action: 'Configurer',
              },
              {
                icon: Settings,
                title: 'Accès API',
                desc: '3 clés API actives',
                action: 'Réviser',
              },
            ].map((s, i) => {
              const Icon = s.icon
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      background: C.card,
                      border: `1px solid ${C.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={16} color={C.blue} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{s.desc}</div>
                  </div>
                  {s.toggle ? (
                    <button
                      onClick={s.onToggle}
                      style={{
                        width: 36,
                        height: 20,
                        borderRadius: 10,
                        border: 'none',
                        background: s.active ? C.green : C.border,
                        cursor: 'pointer',
                        position: 'relative',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: 2,
                          left: s.active ? 18 : 2,
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: '#fff',
                          transition: 'all 0.2s',
                        }}
                      />
                    </button>
                  ) : (
                    <button
                      onClick={() => toast(s.action!)}
                      style={{
                        border: `1px solid ${C.border}`,
                        background: C.card,
                        color: C.blue,
                        padding: '5px 10px',
                        borderRadius: 7,
                        fontSize: 12,
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      {s.action}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* History */}
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 20,
          marginBottom: 22,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 14,
          }}
        >
          <Database size={18} color={C.blue} />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            Historique des sauvegardes
          </h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
            }}
          >
            <thead>
              <tr
                style={{
                  textAlign: 'left',
                  color: C.muted,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                <th style={{ padding: '10px 8px', borderBottom: `1px solid ${C.border}` }}>
                  Date
                </th>
                <th style={{ padding: '10px 8px', borderBottom: `1px solid ${C.border}` }}>
                  Type
                </th>
                <th style={{ padding: '10px 8px', borderBottom: `1px solid ${C.border}` }}>
                  Taille
                </th>
                <th style={{ padding: '10px 8px', borderBottom: `1px solid ${C.border}` }}>
                  Durée
                </th>
                <th style={{ padding: '10px 8px', borderBottom: `1px solid ${C.border}` }}>
                  Statut
                </th>
                <th style={{ padding: '10px 8px', borderBottom: `1px solid ${C.border}` }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {HISTORY.map((b) => {
                const st = statusBadge(b.status)
                const Icon = st.icon
                return (
                  <tr key={b.id}>
                    <td style={{ padding: '10px 8px', borderBottom: `1px solid ${C.border}` }}>
                      {b.date}
                    </td>
                    <td style={{ padding: '10px 8px', borderBottom: `1px solid ${C.border}` }}>
                      <span
                        style={{
                          background: b.type === 'Auto' ? C.blueSoft : C.indigoSoft,
                          color: b.type === 'Auto' ? C.blue : C.indigo,
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {b.type}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', borderBottom: `1px solid ${C.border}` }}>
                      {b.size}
                    </td>
                    <td style={{ padding: '10px 8px', borderBottom: `1px solid ${C.border}`, color: C.muted }}>
                      {b.duration}
                    </td>
                    <td style={{ padding: '10px 8px', borderBottom: `1px solid ${C.border}` }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          background: st.bg,
                          color: st.color,
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        <Icon size={12} />
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', borderBottom: `1px solid ${C.border}` }}>
                      <button
                        onClick={() => {
                          setSelectedBackup(b.id)
                          setRestoreOpen(true)
                        }}
                        style={{
                          border: `1px solid ${C.border}`,
                          background: C.card,
                          color: C.blue,
                          padding: '4px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          cursor: 'pointer',
                          fontWeight: 500,
                          display: 'inline-flex',
                          gap: 4,
                          alignItems: 'center',
                        }}
                      >
                        <Download size={12} /> Restaurer
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compliance + DR + Export */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
        }}
      >
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 18,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 12,
            }}
          >
            <MapPin size={18} color={C.green} />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
              Conformité & Résidence
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'RGPD Backup Compliance', ok: true },
              { label: 'Data Center Luxembourg', ok: true },
              { label: 'ISO 27001 certifié', ok: true },
              { label: 'Chiffrement en transit & au repos', ok: true },
            ].map((c, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <CheckCircle2 size={15} color={C.green} />
                {c.label}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 18,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 12,
            }}
          >
            <AlertTriangle size={18} color={C.amber} />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
              Plan de reprise d'activité
            </h3>
          </div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
            Procédure documentée · RTO 2h · RPO 1h · Test trimestriel effectué le 15/03/2026.
          </div>
          <button
            onClick={() => toast('Ouvre la procédure DRP')}
            style={{
              marginTop: 12,
              border: `1px solid ${C.border}`,
              background: C.bg,
              padding: '7px 12px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              color: C.text,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <FileText size={13} /> Consulter le plan
          </button>
        </div>

        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 18,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 12,
            }}
          >
            <FileDown size={18} color={C.indigo} />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
              Export complet
            </h3>
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
            Exportez toutes vos données pour migration ou archivage.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => exportData('json')}
              style={{
                flex: 1,
                border: `1px solid ${C.border}`,
                background: C.bg,
                padding: '8px 10px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                color: C.text,
              }}
            >
              JSON
            </button>
            <button
              onClick={() => exportData('csv')}
              style={{
                flex: 1,
                border: `1px solid ${C.border}`,
                background: C.bg,
                padding: '8px 10px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                color: C.text,
              }}
            >
              CSV
            </button>
          </div>
        </div>
      </div>

      {/* Restore modal */}
      <AnimatePresence>
        {restoreOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setRestoreOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: C.card,
                borderRadius: 16,
                padding: 24,
                width: '100%',
                maxWidth: 480,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <RotateCcw size={20} color={C.blue} />
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                  Restaurer une sauvegarde
                </h3>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  marginBottom: 18,
                }}
              >
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 2,
                      background: restoreStep >= n ? C.blue : C.border,
                    }}
                  />
                ))}
              </div>

              {restoreStep === 1 && (
                <>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
                    Choisissez une sauvegarde récente :
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      maxHeight: 220,
                      overflowY: 'auto',
                    }}
                  >
                    {HISTORY.slice(0, 6).map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setSelectedBackup(b.id)}
                        style={{
                          textAlign: 'left',
                          border: `1px solid ${
                            selectedBackup === b.id ? C.blue : C.border
                          }`,
                          background:
                            selectedBackup === b.id ? C.blueSoft : C.bg,
                          padding: 10,
                          borderRadius: 9,
                          cursor: 'pointer',
                          fontSize: 13,
                          color: C.text,
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{b.date}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>
                          {b.type} · {b.size}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {restoreStep === 2 && (
                <>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
                    Portée de la restauration :
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { id: 'menu' as const, label: 'Menu uniquement', desc: 'Produits, recettes, prix' },
                      { id: 'full' as const, label: 'Restauration complète', desc: 'Toutes les données' },
                      { id: 'modules' as const, label: 'Modules spécifiques', desc: 'Sélection personnalisée' },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setRestoreScope(s.id)}
                        style={{
                          textAlign: 'left',
                          border: `1px solid ${
                            restoreScope === s.id ? C.blue : C.border
                          }`,
                          background:
                            restoreScope === s.id ? C.blueSoft : C.bg,
                          padding: 12,
                          borderRadius: 9,
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{s.label}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                          {s.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {restoreStep === 3 && (
                <>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
                    Aperçu des changements :
                  </div>
                  <div
                    style={{
                      background: C.amberSoft,
                      border: `1px solid ${C.amber}`,
                      borderRadius: 10,
                      padding: 12,
                      fontSize: 12.5,
                      color: C.text,
                      lineHeight: 1.6,
                    }}
                  >
                    <strong>Attention :</strong> cette opération remplacera 248
                    enregistrements. Une sauvegarde pré-restauration sera créée
                    automatiquement.
                  </div>
                </>
              )}

              {restoreStep === 4 && (
                <>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
                    Saisissez votre PIN admin pour confirmer :
                  </div>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••"
                    maxLength={6}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      fontSize: 18,
                      textAlign: 'center',
                      letterSpacing: 8,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 20,
                }}
              >
                <button
                  onClick={() => {
                    if (restoreStep === 1) setRestoreOpen(false)
                    else setRestoreStep(restoreStep - 1)
                  }}
                  style={{
                    border: `1px solid ${C.border}`,
                    background: C.card,
                    padding: '9px 14px',
                    borderRadius: 9,
                    cursor: 'pointer',
                    fontSize: 13,
                    color: C.text,
                  }}
                >
                  {restoreStep === 1 ? 'Annuler' : 'Retour'}
                </button>
                <button
                  onClick={() => {
                    if (restoreStep < 4) setRestoreStep(restoreStep + 1)
                    else confirmRestore()
                  }}
                  disabled={restoreStep === 1 && !selectedBackup}
                  style={{
                    border: 'none',
                    background:
                      restoreStep === 1 && !selectedBackup ? C.border : C.blue,
                    color: '#fff',
                    padding: '9px 18px',
                    borderRadius: 9,
                    cursor:
                      restoreStep === 1 && !selectedBackup
                        ? 'not-allowed'
                        : 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {restoreStep < 4 ? 'Suivant' : 'Confirmer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default BackupPage
