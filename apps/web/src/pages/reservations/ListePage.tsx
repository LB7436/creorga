import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Statut = 'En attente' | 'Confirmée' | 'Acompte payé' | 'No-show'
type Badge = 'VIP' | 'Nouveau' | 'Régulier'
type PaiementStatut = 'Non demandé' | 'Envoyé' | 'Payé'

interface Reservation {
  id: string
  date: string
  heure: string
  dateISO: string
  clientNom: string
  clientTel: string
  badge: Badge
  couverts: number
  table: string
  salle: string
  statut: Statut
  acompte: number
  acompteRequis: number
  paiementStatut: PaiementStatut
  paiementTimestamp?: string
  paiementLien: string
  contactRecent: boolean
  notes?: string
}

const MOCK_RESERVATIONS: Reservation[] = [
  {
    id: 'R-2041',
    date: '2026-04-16',
    heure: '19:30',
    dateISO: '2026-04-16T19:30',
    clientNom: 'Sophie Weber',
    clientTel: '+352 691 234 567',
    badge: 'VIP',
    couverts: 4,
    table: 'T12',
    salle: 'Salle principale',
    statut: 'Acompte payé',
    acompte: 40,
    acompteRequis: 40,
    paiementStatut: 'Payé',
    paiementTimestamp: '2026-04-14 10:22',
    paiementLien: 'https://pay.cafe-rond-point.lu/r/sw2041',
    contactRecent: true,
    notes: 'Anniversaire - dessert surprise demandé',
  },
  {
    id: 'R-2042',
    date: '2026-04-16',
    heure: '20:00',
    dateISO: '2026-04-16T20:00',
    clientNom: 'Marc Thiel',
    clientTel: '+352 621 445 889',
    badge: 'Régulier',
    couverts: 2,
    table: 'T05',
    salle: 'Terrasse',
    statut: 'Confirmée',
    acompte: 0,
    acompteRequis: 20,
    paiementStatut: 'Envoyé',
    paiementTimestamp: '2026-04-15 09:10',
    paiementLien: 'https://pay.cafe-rond-point.lu/r/mt2042',
    contactRecent: true,
  },
  {
    id: 'R-2043',
    date: '2026-04-16',
    heure: '20:30',
    dateISO: '2026-04-16T20:30',
    clientNom: 'Jean-Paul Hansen',
    clientTel: '+352 661 778 234',
    badge: 'Nouveau',
    couverts: 6,
    table: 'T18',
    salle: 'Salle principale',
    statut: 'En attente',
    acompte: 0,
    acompteRequis: 60,
    paiementStatut: 'Non demandé',
    paiementLien: 'https://pay.cafe-rond-point.lu/r/jph2043',
    contactRecent: false,
  },
  {
    id: 'R-2044',
    date: '2026-04-17',
    heure: '12:30',
    dateISO: '2026-04-17T12:30',
    clientNom: 'Isabelle Faber',
    clientTel: '+352 691 112 003',
    badge: 'VIP',
    couverts: 3,
    table: 'T02',
    salle: 'Salon privé',
    statut: 'Acompte payé',
    acompte: 30,
    acompteRequis: 30,
    paiementStatut: 'Payé',
    paiementTimestamp: '2026-04-13 18:45',
    paiementLien: 'https://pay.cafe-rond-point.lu/r/if2044',
    contactRecent: true,
  },
  {
    id: 'R-2045',
    date: '2026-04-17',
    heure: '19:00',
    dateISO: '2026-04-17T19:00',
    clientNom: 'Laurent Schmit',
    clientTel: '+352 621 003 557',
    badge: 'Régulier',
    couverts: 2,
    table: 'T08',
    salle: 'Terrasse',
    statut: 'Confirmée',
    acompte: 20,
    acompteRequis: 20,
    paiementStatut: 'Payé',
    paiementTimestamp: '2026-04-15 14:30',
    paiementLien: 'https://pay.cafe-rond-point.lu/r/ls2045',
    contactRecent: true,
  },
  {
    id: 'R-2046',
    date: '2026-04-17',
    heure: '20:30',
    dateISO: '2026-04-17T20:30',
    clientNom: 'Catherine Muller',
    clientTel: '+352 691 998 112',
    badge: 'Nouveau',
    couverts: 5,
    table: 'T15',
    salle: 'Salle principale',
    statut: 'En attente',
    acompte: 0,
    acompteRequis: 50,
    paiementStatut: 'Non demandé',
    paiementLien: 'https://pay.cafe-rond-point.lu/r/cm2046',
    contactRecent: false,
  },
  {
    id: 'R-2047',
    date: '2026-04-15',
    heure: '21:00',
    dateISO: '2026-04-15T21:00',
    clientNom: 'Philippe Reuter',
    clientTel: '+352 661 223 445',
    badge: 'Régulier',
    couverts: 4,
    table: 'T10',
    salle: 'Salle principale',
    statut: 'No-show',
    acompte: 0,
    acompteRequis: 40,
    paiementStatut: 'Envoyé',
    paiementTimestamp: '2026-04-14 11:00',
    paiementLien: 'https://pay.cafe-rond-point.lu/r/pr2047',
    contactRecent: false,
    notes: 'Client n\'est pas venu - pas de réponse',
  },
  {
    id: 'R-2048',
    date: '2026-04-18',
    heure: '13:00',
    dateISO: '2026-04-18T13:00',
    clientNom: 'Anne Klein',
    clientTel: '+352 621 447 889',
    badge: 'VIP',
    couverts: 8,
    table: 'T20',
    salle: 'Salon privé',
    statut: 'Acompte payé',
    acompte: 80,
    acompteRequis: 80,
    paiementStatut: 'Payé',
    paiementTimestamp: '2026-04-12 16:22',
    paiementLien: 'https://pay.cafe-rond-point.lu/r/ak2048',
    contactRecent: true,
    notes: 'Réunion d\'affaires - menu dégustation',
  },
  {
    id: 'R-2049',
    date: '2026-04-18',
    heure: '19:30',
    dateISO: '2026-04-18T19:30',
    clientNom: 'Nicolas Welter',
    clientTel: '+352 691 554 120',
    badge: 'Nouveau',
    couverts: 2,
    table: 'T06',
    salle: 'Terrasse',
    statut: 'En attente',
    acompte: 0,
    acompteRequis: 20,
    paiementStatut: 'Non demandé',
    paiementLien: 'https://pay.cafe-rond-point.lu/r/nw2049',
    contactRecent: false,
  },
  {
    id: 'R-2050',
    date: '2026-04-19',
    heure: '20:00',
    dateISO: '2026-04-19T20:00',
    clientNom: 'Béatrice Lentz',
    clientTel: '+352 661 889 334',
    badge: 'Régulier',
    couverts: 3,
    table: 'T09',
    salle: 'Salle principale',
    statut: 'Confirmée',
    acompte: 30,
    acompteRequis: 30,
    paiementStatut: 'Payé',
    paiementTimestamp: '2026-04-15 17:00',
    paiementLien: 'https://pay.cafe-rond-point.lu/r/bl2050',
    contactRecent: true,
  },
]

const COLORS = {
  bg: '#F7F8FA',
  card: '#FFFFFF',
  border: '#E5E7EB',
  borderLight: '#F1F2F5',
  text: '#111827',
  textMuted: '#6B7280',
  textLight: '#9CA3AF',
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primarySoft: '#EFF6FF',
  success: '#10B981',
  successSoft: '#ECFDF5',
  warning: '#F59E0B',
  warningSoft: '#FFFBEB',
  danger: '#EF4444',
  dangerSoft: '#FEF2F2',
  vipGold: '#B45309',
  vipGoldSoft: '#FEF3C7',
  neutral: '#6B7280',
  neutralSoft: '#F3F4F6',
}

function statutStyle(statut: Statut) {
  switch (statut) {
    case 'Confirmée':
      return { bg: COLORS.primarySoft, color: COLORS.primaryDark, dot: COLORS.primary }
    case 'Acompte payé':
      return { bg: COLORS.successSoft, color: '#047857', dot: COLORS.success }
    case 'En attente':
      return { bg: COLORS.warningSoft, color: '#B45309', dot: COLORS.warning }
    case 'No-show':
      return { bg: COLORS.dangerSoft, color: '#B91C1C', dot: COLORS.danger }
  }
}

function badgeStyle(badge: Badge) {
  switch (badge) {
    case 'VIP':
      return { bg: COLORS.vipGoldSoft, color: COLORS.vipGold }
    case 'Nouveau':
      return { bg: COLORS.primarySoft, color: COLORS.primaryDark }
    case 'Régulier':
      return { bg: COLORS.neutralSoft, color: COLORS.neutral }
  }
}

function hoursUntil(iso: string): number {
  const now = new Date('2026-04-16T10:00:00').getTime()
  const target = new Date(iso).getTime()
  return (target - now) / (1000 * 60 * 60)
}

function isAtRisk(r: Reservation): boolean {
  const h = hoursUntil(r.dateISO)
  return h > 0 && h < 24 && r.statut === 'En attente'
}

export default function ListePage() {
  const [reservations, setReservations] = useState<Reservation[]>(MOCK_RESERVATIONS)
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState<Statut | 'Tous'>('Tous')
  const [filterDate, setFilterDate] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reminders, setReminders] = useState({ j2: true, j1: true, h2: true })
  const [testSent, setTestSent] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      if (filterStatut !== 'Tous' && r.statut !== filterStatut) return false
      if (filterDate && r.date !== filterDate) return false
      if (search) {
        const s = search.toLowerCase()
        if (
          !r.clientNom.toLowerCase().includes(s) &&
          !r.clientTel.includes(s) &&
          !r.id.toLowerCase().includes(s)
        )
          return false
      }
      return true
    })
  }, [reservations, search, filterStatut, filterDate])

  const atRisk = useMemo(
    () =>
      reservations.filter((r) => {
        const h = hoursUntil(r.dateISO)
        return h > 0 && h < 48 && r.acompte === 0 && !r.contactRecent && r.statut !== 'No-show'
      }),
    [reservations]
  )

  const selected = reservations.find((r) => r.id === selectedId) || null

  const updateReservation = (id: string, patch: Partial<Reservation>) => {
    setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const acomptesCeMois = reservations
    .filter((r) => r.paiementStatut === 'Payé')
    .reduce((sum, r) => sum + r.acompte, 0)

  const tauxNoShow = 8

  const templates = {
    j2: {
      titre: 'Rappel J-2 par email',
      aperçu:
        'Bonjour {prénom}, nous vous confirmons votre réservation pour {couverts} personnes le {date} à {heure} au Café Rond-Point. À très bientôt !',
    },
    j1: {
      titre: 'Rappel J-1 par SMS',
      aperçu:
        'Café Rond-Point : rappel de votre réservation demain à {heure} ({couverts} pers.). Répondez OUI pour confirmer, NON pour annuler.',
    },
    h2: {
      titre: 'Rappel H-2 par SMS',
      aperçu:
        'Café Rond-Point : votre table est prête pour {heure}. À tout de suite ! Adresse : 12 rue de la Gare, Luxembourg.',
    },
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: COLORS.bg,
        padding: '28px 32px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: COLORS.text,
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ marginBottom: 24 }}
      >
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, marginBottom: 4 }}>
          Liste des réservations
        </h1>
        <p style={{ color: COLORS.textMuted, margin: 0, fontSize: 14 }}>
          Gérez vos réservations, encaissez les acomptes et automatisez les rappels
        </p>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {[
          {
            label: 'Réservations totales',
            value: reservations.length,
            sub: 'cette semaine',
            color: COLORS.primary,
          },
          {
            label: 'Acomptes collectés',
            value: `${acomptesCeMois} €`,
            sub: 'ce mois',
            color: COLORS.success,
          },
          {
            label: 'Taux de no-show',
            value: `${tauxNoShow}%`,
            sub: '-2% vs mois dernier',
            color: COLORS.warning,
          },
          {
            label: 'À risque (48h)',
            value: atRisk.length,
            sub: 'sans acompte',
            color: COLORS.danger,
          },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              padding: 18,
            }}
          >
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color, marginBottom: 4 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: COLORS.textLight }}>{s.sub}</div>
          </div>
        ))}
      </motion.div>

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <input
          placeholder="Rechercher client, téléphone ou ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: 240,
            padding: '10px 14px',
            borderRadius: 8,
            border: `1px solid ${COLORS.border}`,
            fontSize: 14,
            outline: 'none',
            background: COLORS.bg,
          }}
        />
        <select
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value as Statut | 'Tous')}
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            border: `1px solid ${COLORS.border}`,
            fontSize: 14,
            background: COLORS.card,
            cursor: 'pointer',
          }}
        >
          <option value="Tous">Tous les statuts</option>
          <option value="En attente">En attente</option>
          <option value="Confirmée">Confirmée</option>
          <option value="Acompte payé">Acompte payé</option>
          <option value="No-show">No-show</option>
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            border: `1px solid ${COLORS.border}`,
            fontSize: 14,
            background: COLORS.card,
          }}
        />
        <button
          onClick={() => {
            setSearch('')
            setFilterStatut('Tous')
            setFilterDate('')
          }}
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.card,
            color: COLORS.text,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Réinitialiser
        </button>
        <button
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            border: 'none',
            background: COLORS.primary,
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Nouvelle réservation
        </button>
      </motion.div>

      {/* Section 1: Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 12,
          overflow: 'hidden',
          marginBottom: 24,
        }}
      >
        <div
          style={{
            padding: '14px 20px',
            borderBottom: `1px solid ${COLORS.borderLight}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Toutes les réservations</div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
              {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: COLORS.bg }}>
                {[
                  'Date / heure',
                  'Client',
                  'Couverts',
                  'Table / Salle',
                  'Statut',
                  'Acompte',
                  'Actions',
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: COLORS.textMuted,
                      textTransform: 'uppercase',
                      letterSpacing: 0.3,
                      borderBottom: `1px solid ${COLORS.border}`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const sSty = statutStyle(r.statut)
                const bSty = badgeStyle(r.badge)
                const risk = isAtRisk(r)
                const paid = r.paiementStatut === 'Payé'
                const rowBg = paid
                  ? COLORS.successSoft
                  : risk
                    ? COLORS.dangerSoft
                    : 'transparent'
                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    style={{
                      background: rowBg,
                      cursor: 'pointer',
                      borderBottom: `1px solid ${COLORS.borderLight}`,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (!paid && !risk) e.currentTarget.style.background = COLORS.bg
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = rowBg
                    }}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600 }}>
                        {new Date(r.date).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </div>
                      <div style={{ fontSize: 12, color: COLORS.textMuted }}>{r.heure}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 3,
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{r.clientNom}</span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: bSty.bg,
                            color: bSty.color,
                            textTransform: 'uppercase',
                            letterSpacing: 0.3,
                          }}
                        >
                          {r.badge}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: COLORS.textMuted }}>{r.clientTel}</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>{r.couverts}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{r.table}</div>
                      <div style={{ fontSize: 12, color: COLORS.textMuted }}>{r.salle}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          borderRadius: 999,
                          background: sSty.bg,
                          color: sSty.color,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: sSty.dot,
                          }}
                        />
                        {r.statut}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {r.acompte > 0 ? (
                        <div>
                          <div style={{ fontWeight: 600, color: COLORS.success }}>
                            {r.acompte} €
                          </div>
                          <div style={{ fontSize: 11, color: COLORS.textMuted }}>payé</div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontWeight: 600, color: COLORS.textLight }}>
                            {r.acompteRequis} €
                          </div>
                          <div style={{ fontSize: 11, color: COLORS.textMuted }}>requis</div>
                        </div>
                      )}
                    </td>
                    <td
                      style={{ padding: '14px 16px' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => updateReservation(r.id, { statut: 'Confirmée' })}
                          disabled={r.statut === 'Confirmée' || r.statut === 'Acompte payé'}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 6,
                            border: `1px solid ${COLORS.border}`,
                            background: COLORS.card,
                            color: COLORS.success,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            opacity:
                              r.statut === 'Confirmée' || r.statut === 'Acompte payé' ? 0.4 : 1,
                          }}
                          title="Confirmer"
                        >
                          ✓ Confirmer
                        </button>
                        <button
                          onClick={() => updateReservation(r.id, { statut: 'No-show' })}
                          disabled={r.statut === 'No-show'}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 6,
                            border: `1px solid ${COLORS.border}`,
                            background: COLORS.card,
                            color: COLORS.danger,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            opacity: r.statut === 'No-show' ? 0.4 : 1,
                          }}
                          title="Marquer no-show"
                        >
                          No-show
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: 40,
                      textAlign: 'center',
                      color: COLORS.textMuted,
                      fontSize: 14,
                    }}
                  >
                    Aucune réservation ne correspond à ces critères
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Two column section: Reminders + No-show prevention */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
          marginBottom: 24,
        }}
      >
        {/* Section 3: Reminders */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700 }}>Rappels automatiques</div>
            <span
              style={{
                fontSize: 11,
                padding: '3px 8px',
                borderRadius: 10,
                background: COLORS.successSoft,
                color: '#047857',
                fontWeight: 600,
              }}
            >
              ACTIF
            </span>
          </div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 16 }}>
            Envois programmés pour réduire le taux de no-show
          </div>

          {(
            [
              { key: 'j2' as const, ...templates.j2, delay: 'email' },
              { key: 'j1' as const, ...templates.j1, delay: 'sms' },
              { key: 'h2' as const, ...templates.h2, delay: 'sms' },
            ]
          ).map((t) => (
            <div
              key={t.key}
              style={{
                border: `1px solid ${COLORS.borderLight}`,
                borderRadius: 10,
                padding: 14,
                marginBottom: 10,
                background: COLORS.bg,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 4,
                      background: t.delay === 'email' ? COLORS.primarySoft : COLORS.warningSoft,
                      color: t.delay === 'email' ? COLORS.primaryDark : '#B45309',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t.delay}
                  </span>
                  {t.titre}
                </div>
                <label
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: 38,
                    height: 22,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={reminders[t.key]}
                    onChange={(e) =>
                      setReminders({ ...reminders, [t.key]: e.target.checked })
                    }
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      inset: 0,
                      background: reminders[t.key] ? COLORS.success : '#D1D5DB',
                      borderRadius: 22,
                      transition: 'background 0.2s',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        height: 16,
                        width: 16,
                        left: reminders[t.key] ? 19 : 3,
                        top: 3,
                        background: '#fff',
                        borderRadius: '50%',
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}
                    />
                  </span>
                </label>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: COLORS.textMuted,
                  lineHeight: 1.5,
                  fontStyle: 'italic',
                  padding: '8px 10px',
                  background: COLORS.card,
                  borderRadius: 6,
                  border: `1px solid ${COLORS.borderLight}`,
                  marginBottom: 8,
                }}
              >
                « {t.aperçu} »
              </div>
              <button
                onClick={() => {
                  setTestSent(t.key)
                  setTimeout(() => setTestSent(null), 2000)
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: `1px solid ${COLORS.border}`,
                  background: COLORS.card,
                  color: COLORS.text,
                  cursor: 'pointer',
                }}
              >
                {testSent === t.key ? '✓ Test envoyé' : 'Tester l\'envoi'}
              </button>
            </div>
          ))}
        </motion.div>

        {/* Section 4: No-show prevention */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
            Prévention des no-shows
          </div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 16 }}>
            Réservations à risque dans les 48 prochaines heures
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                padding: 12,
                background: COLORS.warningSoft,
                borderRadius: 8,
                border: `1px solid #FDE68A`,
              }}
            >
              <div style={{ fontSize: 11, color: '#B45309', fontWeight: 600, marginBottom: 2 }}>
                TAUX NO-SHOW
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#B45309' }}>
                {tauxNoShow}%
              </div>
              <div style={{ fontSize: 11, color: '#92400E' }}>30 derniers jours</div>
            </div>
            <div
              style={{
                padding: 12,
                background: COLORS.successSoft,
                borderRadius: 8,
                border: `1px solid #A7F3D0`,
              }}
            >
              <div style={{ fontSize: 11, color: '#047857', fontWeight: 600, marginBottom: 2 }}>
                ACOMPTES COLLECTÉS
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#047857' }}>
                {acomptesCeMois} €
              </div>
              <div style={{ fontSize: 11, color: '#065F46' }}>ce mois</div>
            </div>
          </div>

          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            À risque ({atRisk.length})
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 12 }}>
            {atRisk.length === 0 && (
              <div
                style={{
                  padding: 20,
                  textAlign: 'center',
                  fontSize: 13,
                  color: COLORS.textMuted,
                  background: COLORS.bg,
                  borderRadius: 8,
                }}
              >
                Aucune réservation à risque 🎉
              </div>
            )}
            {atRisk.map((r) => (
              <div
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                style={{
                  padding: '10px 12px',
                  border: `1px solid ${COLORS.borderLight}`,
                  borderRadius: 8,
                  marginBottom: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: COLORS.bg,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.clientNom}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>
                    {new Date(r.date).toLocaleDateString('fr-FR')} · {r.heure} · {r.couverts} pers.
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: 10,
                    background: COLORS.dangerSoft,
                    color: '#B91C1C',
                  }}
                >
                  Sans acompte
                </span>
              </div>
            ))}
          </div>
          {atRisk.length > 0 && (
            <button
              onClick={() => {
                atRisk.forEach((r) =>
                  updateReservation(r.id, { contactRecent: true, paiementStatut: 'Envoyé' })
                )
              }}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: 'none',
                background: COLORS.primary,
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Envoyer confirmation à tous ({atRisk.length})
            </button>
          )}
        </motion.div>
      </div>

      {/* Modal Section 2: Deposit Payment */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedId(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(17, 24, 39, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
              padding: 20,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: COLORS.card,
                borderRadius: 14,
                width: '100%',
                maxWidth: 640,
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              }}
            >
              <div
                style={{
                  padding: '20px 24px',
                  borderBottom: `1px solid ${COLORS.border}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{selected.clientNom}</div>
                  <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 2 }}>
                    Réservation {selected.id} ·{' '}
                    {new Date(selected.date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}{' '}
                    à {selected.heure}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedId(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: 22,
                    cursor: 'pointer',
                    color: COLORS.textMuted,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ padding: 24 }}>
                {/* Full info */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 12,
                    marginBottom: 20,
                    padding: 16,
                    background: COLORS.bg,
                    borderRadius: 10,
                  }}
                >
                  {[
                    { l: 'Téléphone', v: selected.clientTel },
                    { l: 'Couverts', v: `${selected.couverts} personnes` },
                    { l: 'Table', v: selected.table },
                    { l: 'Salle', v: selected.salle },
                    {
                      l: 'Statut',
                      v: (
                        <span style={{ color: statutStyle(selected.statut).color, fontWeight: 600 }}>
                          {selected.statut}
                        </span>
                      ),
                    },
                    {
                      l: 'Badge',
                      v: (
                        <span
                          style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: badgeStyle(selected.badge).bg,
                            color: badgeStyle(selected.badge).color,
                            fontWeight: 700,
                          }}
                        >
                          {selected.badge}
                        </span>
                      ),
                    },
                  ].map((item, i) => (
                    <div key={i}>
                      <div
                        style={{
                          fontSize: 11,
                          color: COLORS.textMuted,
                          textTransform: 'uppercase',
                          marginBottom: 2,
                          letterSpacing: 0.3,
                        }}
                      >
                        {item.l}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{item.v}</div>
                    </div>
                  ))}
                  {selected.notes && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div
                        style={{
                          fontSize: 11,
                          color: COLORS.textMuted,
                          textTransform: 'uppercase',
                          marginBottom: 2,
                          letterSpacing: 0.3,
                        }}
                      >
                        Notes
                      </div>
                      <div style={{ fontSize: 13, fontStyle: 'italic' }}>{selected.notes}</div>
                    </div>
                  )}
                </div>

                {/* Acompte section */}
                <div
                  style={{
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 10,
                    padding: 18,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 700 }}>Acompte</div>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '3px 10px',
                        borderRadius: 10,
                        fontWeight: 600,
                        background:
                          selected.paiementStatut === 'Payé'
                            ? COLORS.successSoft
                            : selected.paiementStatut === 'Envoyé'
                              ? COLORS.warningSoft
                              : COLORS.neutralSoft,
                        color:
                          selected.paiementStatut === 'Payé'
                            ? '#047857'
                            : selected.paiementStatut === 'Envoyé'
                              ? '#B45309'
                              : COLORS.neutral,
                      }}
                    >
                      {selected.paiementStatut}
                      {selected.paiementTimestamp && ` · ${selected.paiementTimestamp}`}
                    </span>
                  </div>

                  <div
                    style={{
                      padding: 14,
                      background: COLORS.primarySoft,
                      borderRadius: 8,
                      marginBottom: 14,
                    }}
                  >
                    <div style={{ fontSize: 14, color: COLORS.primaryDark, fontWeight: 600 }}>
                      Acompte requis : {selected.acompteRequis} € (50% du montant estimé)
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.primaryDark, marginTop: 4 }}>
                      Estimation couvert : {Math.round((selected.acompteRequis * 2) / selected.couverts)} € ·{' '}
                      Total estimé : {selected.acompteRequis * 2} €
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: COLORS.textMuted,
                      marginBottom: 6,
                      fontFamily: 'monospace',
                      padding: '8px 10px',
                      background: COLORS.bg,
                      borderRadius: 6,
                      wordBreak: 'break-all',
                    }}
                  >
                    {selected.paiementLien}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    <button
                      onClick={() =>
                        updateReservation(selected.id, {
                          paiementStatut: 'Envoyé',
                          paiementTimestamp: new Date().toLocaleString('fr-FR'),
                        })
                      }
                      disabled={selected.paiementStatut === 'Payé'}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: `1px solid ${COLORS.border}`,
                        background: COLORS.card,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: selected.paiementStatut === 'Payé' ? 'not-allowed' : 'pointer',
                        opacity: selected.paiementStatut === 'Payé' ? 0.5 : 1,
                        color: COLORS.text,
                      }}
                    >
                      📱 Lien par SMS
                    </button>
                    <button
                      onClick={() =>
                        updateReservation(selected.id, {
                          paiementStatut: 'Envoyé',
                          paiementTimestamp: new Date().toLocaleString('fr-FR'),
                        })
                      }
                      disabled={selected.paiementStatut === 'Payé'}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: `1px solid ${COLORS.border}`,
                        background: COLORS.card,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: selected.paiementStatut === 'Payé' ? 'not-allowed' : 'pointer',
                        opacity: selected.paiementStatut === 'Payé' ? 0.5 : 1,
                        color: COLORS.text,
                      }}
                    >
                      ✉️ Lien par email
                    </button>
                    <button
                      onClick={() =>
                        updateReservation(selected.id, {
                          paiementStatut: 'Payé',
                          paiementTimestamp: new Date().toLocaleString('fr-FR'),
                          acompte: selected.acompteRequis,
                          statut: 'Acompte payé',
                        })
                      }
                      disabled={selected.paiementStatut === 'Payé'}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: 'none',
                        background:
                          selected.paiementStatut === 'Payé' ? COLORS.success : COLORS.primary,
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: selected.paiementStatut === 'Payé' ? 'default' : 'pointer',
                      }}
                    >
                      {selected.paiementStatut === 'Payé' ? '✓ Payé' : '💶 Encaisser'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
