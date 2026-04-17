import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Crown,
  TrendingUp,
  TrendingDown,
  Euro,
  Users,
  Target,
  Award,
  AlertCircle,
  Download,
  Calendar,
  PieChart as PieIcon,
  BarChart3,
  Clock,
  Package,
  Star,
  Lightbulb,
  Building2,
  ArrowRight,
  FileText,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import toast from 'react-hot-toast'

const C = {
  text: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  bg: '#f8fafc',
  card: '#ffffff',
  green: '#166534',
  greenMid: '#10b981',
  greenSoft: '#d1fae5',
  blue: '#2563eb',
  blueSoft: '#dbeafe',
  amber: '#f59e0b',
  amberSoft: '#fef3c7',
  red: '#dc2626',
  redSoft: '#fee2e2',
  purple: '#7c3aed',
  purpleSoft: '#ede9fe',
  gray: '#64748b',
}

const REVENUE_DATA = [
  { month: 'Mai', ca: 18200, trend: 17500 },
  { month: 'Juin', ca: 19800, trend: 18400 },
  { month: 'Juil', ca: 22100, trend: 19200 },
  { month: 'Août', ca: 24300, trend: 20000 },
  { month: 'Sept', ca: 21400, trend: 20800 },
  { month: 'Oct', ca: 19600, trend: 21600 },
  { month: 'Nov', ca: 20900, trend: 22400 },
  { month: 'Déc', ca: 27800, trend: 23200 },
  { month: 'Jan', ca: 18400, trend: 24000 },
  { month: 'Fév', ca: 19200, trend: 24800 },
  { month: 'Mar', ca: 22600, trend: 25600 },
  { month: 'Avr', ca: 23700, trend: 26400 },
]

const COSTS_DATA = [
  { name: 'Jan', revenus: 18400, couts: 14200 },
  { name: 'Fév', revenus: 19200, couts: 14800 },
  { name: 'Mar', revenus: 22600, couts: 16300 },
  { name: 'Avr', revenus: 23700, couts: 17100 },
]

const EXPENSES_DATA = [
  { name: 'Matières premières', value: 32, color: C.amber },
  { name: 'Personnel', value: 38, color: C.blue },
  { name: 'Loyer & charges', value: 14, color: C.purple },
  { name: 'Marketing', value: 6, color: C.greenMid },
  { name: 'Divers', value: 10, color: C.gray },
]

const WEEK_DAYS = [
  { day: 'Lun', ca: 2800 },
  { day: 'Mar', ca: 2400 },
  { day: 'Mer', ca: 2900 },
  { day: 'Jeu', ca: 4200 },
  { day: 'Ven', ca: 3900 },
  { day: 'Sam', ca: 4600 },
  { day: 'Dim', ca: 3200 },
]

const RECOMMENDATIONS = [
  {
    icon: TrendingUp,
    color: C.green,
    title: 'Optimiser la marge cocktails',
    text:
      "Votre marge sur les cocktails pourrait augmenter de 8% en ajustant les prix. Impact estimé : +340€/mois.",
    impact: '+4 080€/an',
  },
  {
    icon: Calendar,
    color: C.blue,
    title: 'Renforcer mardi/mercredi',
    text:
      "Le jeudi est votre meilleur jour. Campagne ciblée sur mardi/mercredi pour lisser l'activité.",
    impact: '+12% fréquentation',
  },
  {
    icon: Users,
    color: C.amber,
    title: 'Reconquête clients inactifs',
    text:
      "Vous avez perdu 34 clients inactifs depuis 90j. Campagne de reconquête recommandée.",
    impact: '~1 200€ récupérables',
  },
  {
    icon: Package,
    color: C.purple,
    title: 'Réduire les pertes stock',
    text:
      "3 produits fréquents en rupture. Ajuster les seuils de réapprovisionnement automatique.",
    impact: '-420€ pertes/mois',
  },
]

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  soft,
  delta,
  positive = true,
}: {
  label: string
  value: string
  icon: any
  color: string
  soft: string
  delta?: string
  positive?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 18,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: soft,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={20} color={color} />
        </div>
        {delta && (
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: positive ? C.greenMid : C.red,
              background: positive ? C.greenSoft : C.redSoft,
              padding: '3px 8px',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {delta}
          </div>
        )}
      </div>
      <div style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: C.text, marginTop: 4 }}>
        {value}
      </div>
    </motion.div>
  )
}

function Section({
  title,
  icon: Icon,
  color,
  children,
}: {
  title: string
  icon: any
  color: string
  children: React.ReactNode
}) {
  return (
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
        <Icon size={18} color={color} />
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

function OwnerReportPage() {
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('yearly')

  const exportPDF = () => {
    toast.success(`Rapport PDF ${period === 'yearly' ? 'annuel' : 'mensuel'} généré`)
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
              background: `linear-gradient(135deg, ${C.green}, ${C.greenMid})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(22,101,52,0.25)',
            }}
          >
            <Crown size={26} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>
              Rapport Patron
            </h1>
            <p style={{ margin: 0, color: C.muted, fontSize: 14 }}>
              Vision stratégique globale de votre établissement
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div
            style={{
              display: 'flex',
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: 4,
            }}
          >
            {(['monthly', 'yearly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  border: 'none',
                  background: period === p ? C.greenSoft : 'transparent',
                  color: period === p ? C.green : C.muted,
                  padding: '6px 12px',
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {p === 'monthly' ? 'Mensuel' : 'Annuel'}
              </button>
            ))}
          </div>
          <button
            onClick={exportPDF}
            style={{
              border: 'none',
              background: C.green,
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
            <Download size={15} /> Exporter PDF
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
          label="CA annuel"
          value="248 K€"
          icon={Euro}
          color={C.green}
          soft={C.greenSoft}
          delta="+12,4%"
        />
        <StatCard
          label="Marge nette"
          value="62 K€"
          icon={TrendingUp}
          color={C.blue}
          soft={C.blueSoft}
          delta="+8,1%"
        />
        <StatCard
          label="Clients fidèles"
          value="412"
          icon={Users}
          color={C.purple}
          soft={C.purpleSoft}
          delta="+23"
        />
        <StatCard
          label="ROI marketing"
          value="234%"
          icon={Target}
          color={C.amber}
          soft={C.amberSoft}
          delta="+18 pts"
        />
      </div>

      {/* Financial */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <Section title="Santé financière – CA 12 mois" icon={BarChart3} color={C.green}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={REVENUE_DATA}>
              <defs>
                <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.greenMid} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={C.greenMid} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="month" stroke={C.muted} fontSize={12} />
              <YAxis stroke={C.muted} fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="ca"
                stroke={C.greenMid}
                fill="url(#caGrad)"
                strokeWidth={2}
                name="CA"
              />
              <Line
                type="monotone"
                dataKey="trend"
                stroke={C.blue}
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                name="Tendance"
              />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
              marginTop: 14,
            }}
          >
            {[
              { label: 'Marge brute', val: '68%', c: C.green },
              { label: 'Marge nette', val: '25%', c: C.blue },
              { label: 'EBITDA', val: '31%', c: C.purple },
            ].map((x) => (
              <div
                key={x.label}
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: 10,
                  background: C.bg,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 11, color: C.muted }}>{x.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: x.c }}>
                  {x.val}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Répartition dépenses" icon={PieIcon} color={C.purple}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={EXPENSES_DATA}
                dataKey="value"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={45}
                paddingAngle={2}
              >
                {EXPENSES_DATA.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              marginTop: 8,
            }}
          >
            {EXPENSES_DATA.map((e) => (
              <div
                key={e.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 12,
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: e.color,
                    }}
                  />
                  {e.name}
                </div>
                <span style={{ fontWeight: 600 }}>{e.value}%</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Costs vs Revenue */}
      <div style={{ marginBottom: 20 }}>
        <Section title="Revenus vs Coûts (trimestriel)" icon={BarChart3} color={C.blue}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={COSTS_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="name" stroke={C.muted} fontSize={12} />
              <YAxis stroke={C.muted} fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend />
              <Bar dataKey="revenus" fill={C.greenMid} radius={[6, 6, 0, 0]} />
              <Bar dataKey="couts" fill={C.red} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      {/* Performance + Staff + Inventory */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <Section title="Performance snapshot" icon={Award} color={C.amber}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 12,
              }}
            >
              <div
                style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}
              >
                Tables les + rentables
              </div>
              {[
                { t: 'Terrasse T1', v: '4 890€' },
                { t: 'Salle principale T8', v: '4 210€' },
                { t: 'Bar haut B2', v: '3 680€' },
              ].map((x, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    fontSize: 13,
                  }}
                >
                  <span>
                    #{i + 1} {x.t}
                  </span>
                  <strong>{x.v}</strong>
                </div>
              ))}
            </div>
            <div
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 12,
              }}
            >
              <div
                style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}
              >
                Heures de pointe
              </div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                12h–14h & 19h–22h
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                68% du CA total
              </div>
            </div>
            <div
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 12,
              }}
            >
              <div
                style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}
              >
                Jours les meilleurs
              </div>
              <ResponsiveContainer width="100%" height={90}>
                <BarChart data={WEEK_DAYS}>
                  <XAxis dataKey="day" stroke={C.muted} fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      background: C.card,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                  />
                  <Bar dataKey="ca" fill={C.amber} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Section>

        <Section title="Équipe" icon={Users} color={C.blue}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 12,
              }}
            >
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>
                Top performers
              </div>
              {[
                { n: 'Sophie L.', v: '+38% vs équipe' },
                { n: 'Marc D.', v: '+24% vs équipe' },
                { n: 'Amélie R.', v: '+19% vs équipe' },
              ].map((x, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    fontSize: 13,
                  }}
                >
                  <span>{x.n}</span>
                  <span style={{ color: C.greenMid, fontWeight: 600 }}>
                    {x.v}
                  </span>
                </div>
              ))}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
              }}
            >
              <div
                style={{
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <div style={{ fontSize: 11, color: C.muted }}>Heures réel/prévu</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                  1 124 / 1 080
                </div>
                <div style={{ fontSize: 11, color: C.amber, marginTop: 2 }}>
                  +4% vs prévision
                </div>
              </div>
              <div
                style={{
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <div style={{ fontSize: 11, color: C.muted }}>Coût perso / CA</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                  28,4%
                </div>
                <div style={{ fontSize: 11, color: C.greenMid, marginTop: 2 }}>
                  Sous moyenne secteur
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Santé inventaire" icon={Package} color={C.purple}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              {
                label: 'Rotation stock',
                val: '6,2x / mois',
                color: C.green,
                status: 'Optimal',
              },
              {
                label: 'Pertes/gaspillage',
                val: '2,1%',
                color: C.amber,
                status: '≈ moyenne',
              },
              {
                label: 'Ruptures critiques',
                val: '3 produits',
                color: C.red,
                status: 'À traiter',
              },
              {
                label: 'Valeur stock',
                val: '8 420€',
                color: C.blue,
                status: 'Stable',
              },
            ].map((x, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 12,
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: C.muted }}>{x.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>
                    {x.val}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: x.color,
                    background: '#fff',
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  {x.status}
                </span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Customer insights */}
      <div style={{ marginBottom: 20 }}>
        <Section title="Insights clients" icon={Star} color={C.purple}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            {[
              {
                label: 'Nouveaux clients',
                val: '127',
                sub: '+18 vs mois préc.',
                c: C.green,
              },
              {
                label: 'Clients récurrents',
                val: '412',
                sub: '72% du CA',
                c: C.blue,
              },
              { label: 'NPS Score', val: '68', sub: 'Excellent', c: C.purple },
              {
                label: 'CLV moyen',
                val: '342€',
                sub: '+24€ vs N-1',
                c: C.amber,
              },
              {
                label: 'Taux rétention',
                val: '81%',
                sub: '+6 pts',
                c: C.greenMid,
              },
            ].map((x, i) => (
              <div
                key={i}
                style={{
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>
                  {x.label}
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: x.c,
                    marginTop: 4,
                  }}
                >
                  {x.val}
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                  {x.sub}
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Recommendations */}
      <div style={{ marginBottom: 20 }}>
        <Section
          title="Recommandations stratégiques"
          icon={Lightbulb}
          color={C.amber}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 12,
            }}
          >
            {RECOMMENDATIONS.map((r, i) => {
              const Icon = r.icon
              return (
                <motion.div
                  key={i}
                  whileHover={{ y: -2 }}
                  style={{
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 9,
                        background: '#fff',
                        border: `1px solid ${C.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={17} color={r.color} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>
                      {r.title}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: C.muted,
                      lineHeight: 1.55,
                    }}
                  >
                    {r.text}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 'auto',
                    }}
                  >
                    <span
                      style={{
                        background: '#fff',
                        border: `1px solid ${r.color}`,
                        color: r.color,
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {r.impact}
                    </span>
                    <button
                      onClick={() => toast.success('Action planifiée')}
                      style={{
                        border: 'none',
                        background: r.color,
                        color: '#fff',
                        padding: '5px 10px',
                        borderRadius: 7,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      Agir <ArrowRight size={12} />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </Section>
      </div>

      {/* Market comparison */}
      <div style={{ marginBottom: 20 }}>
        <Section
          title="Comparaison marché (HORECA Luxembourg)"
          icon={Building2}
          color={C.blue}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 12,
            }}
          >
            {[
              {
                label: 'Votre marge nette',
                you: 25,
                market: 18,
                unit: '%',
                better: true,
              },
              {
                label: 'Coût du personnel / CA',
                you: 28.4,
                market: 33,
                unit: '%',
                better: true,
              },
              {
                label: 'Rétention client',
                you: 81,
                market: 65,
                unit: '%',
                better: true,
              },
              {
                label: 'Panier moyen',
                you: 32,
                market: 28,
                unit: '€',
                better: true,
              },
            ].map((m, i) => {
              const max = Math.max(m.you, m.market)
              return (
                <div
                  key={i}
                  style={{
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                    }}
                  >
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                      {m.label}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: m.better ? C.greenMid : C.red,
                        fontWeight: 700,
                      }}
                    >
                      {m.better ? '▲' : '▼'}{' '}
                      {Math.round(((m.you - m.market) / m.market) * 100)}%
                    </span>
                  </div>
                  {[
                    { label: 'Vous', val: m.you, c: C.green },
                    { label: 'Moyenne secteur', val: m.market, c: C.gray },
                  ].map((b, j) => (
                    <div key={j} style={{ marginBottom: 8 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 11,
                          marginBottom: 3,
                          color: C.muted,
                        }}
                      >
                        <span>{b.label}</span>
                        <strong style={{ color: C.text }}>
                          {b.val}
                          {m.unit}
                        </strong>
                      </div>
                      <div
                        style={{
                          height: 6,
                          background: C.border,
                          borderRadius: 4,
                          overflow: 'hidden',
                        }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(b.val / max) * 100}%` }}
                          transition={{ duration: 0.6 }}
                          style={{
                            height: '100%',
                            background: b.c,
                            borderRadius: 4,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </Section>
      </div>

      {/* Footer */}
      <div
        style={{
          background: `linear-gradient(135deg, ${C.green}, ${C.greenMid})`,
          borderRadius: 16,
          padding: 22,
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <FileText size={26} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              Besoin d'un rapport approfondi ?
            </div>
            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>
              Exportez un PDF complet {period === 'yearly' ? 'annuel' : 'mensuel'} avec toutes les métriques.
            </div>
          </div>
        </div>
        <button
          onClick={exportPDF}
          style={{
            background: '#fff',
            color: C.green,
            border: 'none',
            padding: '10px 18px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Download size={15} /> Générer le rapport
        </button>
      </div>
    </div>
  )
}

export default OwnerReportPage
