import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChefHat,
  Clock,
  TrendingUp,
  TrendingDown,
  Thermometer,
  Calendar,
  BrainCircuit,
  CloudSun,
  Scale,
  Timer,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Package,
  History,
  Camera,
  ClipboardCheck,
  Utensils,
  ArrowUpRight,
  ArrowDownRight,
  Droplet,
  Eye,
  Plus,
  Download,
  Sparkles,
} from 'lucide-react'

const C = {
  text: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  bg: '#f8fafc',
  card: '#ffffff',
  pink: '#be185d',
  pinkSoft: '#fce7f3',
  pinkMid: '#ec4899',
  pinkDark: '#831843',
  green: '#16a34a',
  greenSoft: '#dcfce7',
  blue: '#2563eb',
  blueSoft: '#dbeafe',
  amber: '#f59e0b',
  amberSoft: '#fef3c7',
  red: '#dc2626',
  redSoft: '#fee2e2',
  indigo: '#4f46e5',
  indigoSoft: '#e0e7ff',
  purple: '#7c3aed',
  purpleSoft: '#ede9fe',
}

type BatchStatus = 'En préparation' | 'Prêt' | 'En service' | 'Terminé'

interface Batch {
  id: string
  recipe: string
  qty: number
  startTime: string
  endTime: string
  station: string
  chef: string
  status: BatchStatus
  temp: number
  photo: boolean
}

const BATCHES: Batch[] = [
  { id: 'B-041', recipe: 'Bolognaise maison', qty: 45, startTime: '08:00', endTime: '10:30', station: 'Feux principaux', chef: 'Laurent Becker', status: 'Terminé', temp: 72, photo: true },
  { id: 'B-042', recipe: 'Soupe potiron-coco', qty: 30, startTime: '09:00', endTime: '10:45', station: 'Marmite 50L', chef: 'Sophie Marx', status: 'Terminé', temp: 85, photo: true },
  { id: 'B-043', recipe: 'Quiche lorraine', qty: 24, startTime: '10:00', endTime: '11:30', station: 'Four pâtisserie', chef: 'Tom Weber', status: 'Prêt', temp: 68, photo: true },
  { id: 'B-044', recipe: 'Ratatouille', qty: 35, startTime: '10:30', endTime: '12:00', station: 'Plancha', chef: 'Marco Rossi', status: 'En service', temp: 74, photo: true },
  { id: 'B-045', recipe: 'Poulet rôti aux herbes', qty: 28, startTime: '11:00', endTime: '12:30', station: 'Four combi', chef: 'Laurent Becker', status: 'En service', temp: 76, photo: true },
  { id: 'B-046', recipe: 'Salade de quinoa', qty: 40, startTime: '11:15', endTime: '11:45', station: 'Garde-manger', chef: 'Claire Dupont', status: 'En préparation', temp: 6, photo: false },
  { id: 'B-047', recipe: 'Risotto aux champignons', qty: 22, startTime: '12:00', endTime: '13:00', station: 'Feux principaux', chef: 'Sophie Marx', status: 'En préparation', temp: 0, photo: false },
  { id: 'B-048', recipe: 'Tiramisu individuel', qty: 50, startTime: '07:30', endTime: '09:00', station: 'Pâtisserie', chef: 'Marco Rossi', status: 'Prêt', temp: 4, photo: true },
]

interface Prediction {
  day: string
  recipe: string
  portions: number
  confidence: number
  factor: string
}

const PREDICTIONS: Prediction[] = [
  { day: 'Jeudi soir', recipe: 'Bolognaise maison', portions: 45, confidence: 92, factor: 'Historique mercredi pluvieux' },
  { day: 'Vendredi midi', recipe: 'Poisson du jour', portions: 38, confidence: 88, factor: 'Vendredi saint approche' },
  { day: 'Samedi soir', recipe: 'Risotto aux champignons', portions: 32, confidence: 85, factor: 'Tendance weekend' },
  { day: 'Dimanche midi', recipe: 'Rôti de boeuf', portions: 52, confidence: 94, factor: 'Brunch familial habituel' },
  { day: 'Lundi midi', recipe: 'Soupe du jour', portions: 28, confidence: 78, factor: 'Températures < 10 °C prévues' },
]

interface Recipe {
  id: string
  name: string
  base4: number
  prep4: number
  costPerPortion: number
  category: string
}

const RECIPES: Recipe[] = [
  { id: 'r1', name: 'Bolognaise maison', base4: 8.50, prep4: 45, costPerPortion: 2.12, category: 'Plat principal' },
  { id: 'r2', name: 'Soupe potiron-coco', base4: 4.20, prep4: 30, costPerPortion: 1.05, category: 'Entrée' },
  { id: 'r3', name: 'Risotto aux champignons', base4: 9.80, prep4: 50, costPerPortion: 2.45, category: 'Plat principal' },
  { id: 'r4', name: 'Ratatouille', base4: 6.40, prep4: 60, costPerPortion: 1.60, category: 'Plat principal' },
  { id: 'r5', name: 'Quiche lorraine', base4: 5.60, prep4: 40, costPerPortion: 1.40, category: 'Plat principal' },
  { id: 'r6', name: 'Tiramisu individuel', base4: 7.20, prep4: 35, costPerPortion: 1.80, category: 'Dessert' },
]

interface IngredientAlert {
  id: string
  name: string
  needed: number
  stock: number
  unit: string
  batches: string[]
}

const INGREDIENT_ALERTS: IngredientAlert[] = [
  { id: 'i1', name: 'Boeuf haché', needed: 6.5, stock: 4.2, unit: 'kg', batches: ['B-041'] },
  { id: 'i2', name: 'Riz arborio', needed: 3.2, stock: 2.8, unit: 'kg', batches: ['B-047'] },
  { id: 'i3', name: 'Crème liquide', needed: 4, stock: 2.5, unit: 'L', batches: ['B-042', 'B-048'] },
]

interface PortionTracking {
  batch: string
  recipe: string
  prepared: number
  served: number
  remaining: number
  wasteRate: number
}

const PORTIONS: PortionTracking[] = [
  { batch: 'B-041', recipe: 'Bolognaise maison', prepared: 45, served: 42, remaining: 3, wasteRate: 2.2 },
  { batch: 'B-042', recipe: 'Soupe potiron-coco', prepared: 30, served: 26, remaining: 4, wasteRate: 3.3 },
  { batch: 'B-043', recipe: 'Quiche lorraine', prepared: 24, served: 20, remaining: 4, wasteRate: 0 },
  { batch: 'B-044', recipe: 'Ratatouille', prepared: 35, served: 24, remaining: 11, wasteRate: 0 },
  { batch: 'B-045', recipe: 'Poulet rôti aux herbes', prepared: 28, served: 18, remaining: 10, wasteRate: 0 },
]

interface HistoryStat {
  recipe: string
  soldOut: number
  avgWaste: number
  trend: 'up' | 'down' | 'stable'
}

const HISTORY_STATS: HistoryStat[] = [
  { recipe: 'Bolognaise maison', soldOut: 85, avgWaste: 2.8, trend: 'up' },
  { recipe: 'Poulet rôti aux herbes', soldOut: 72, avgWaste: 4.1, trend: 'stable' },
  { recipe: 'Ratatouille', soldOut: 45, avgWaste: 12.5, trend: 'down' },
  { recipe: 'Risotto aux champignons', soldOut: 68, avgWaste: 5.2, trend: 'up' },
  { recipe: 'Soupe potiron-coco', soldOut: 78, avgWaste: 3.6, trend: 'stable' },
  { recipe: 'Tiramisu individuel', soldOut: 92, avgWaste: 1.2, trend: 'up' },
]

interface QualityCheck {
  id: string
  label: string
  icon: typeof Eye
}

const QC_ITEMS: QualityCheck[] = [
  { id: 'q1', label: 'Goût conforme à la recette', icon: Utensils },
  { id: 'q2', label: 'Texture idéale', icon: Droplet },
  { id: 'q3', label: 'Température de service respectée', icon: Thermometer },
  { id: 'q4', label: 'Dressage et présentation OK', icon: Eye },
  { id: 'q5', label: 'Assaisonnement équilibré', icon: Sparkles },
]

const statusStyle = (s: BatchStatus): { bg: string; fg: string } => {
  if (s === 'En préparation') return { bg: C.amberSoft, fg: C.amber }
  if (s === 'Prêt') return { bg: C.blueSoft, fg: C.blue }
  if (s === 'En service') return { bg: C.pinkSoft, fg: C.pink }
  return { bg: C.greenSoft, fg: C.green }
}

const CALENDAR_DAYS = [
  { day: 'Lun', date: 15, batches: 6, portions: 142 },
  { day: 'Mar', date: 16, batches: 7, portions: 168 },
  { day: 'Mer', date: 17, batches: 8, portions: 185 },
  { day: 'Jeu', date: 18, batches: 8, portions: 156, today: true },
  { day: 'Ven', date: 19, batches: 9, portions: 210 },
  { day: 'Sam', date: 20, batches: 10, portions: 245 },
  { day: 'Dim', date: 21, batches: 7, portions: 172 },
]

function CentralKitchenPage() {
  const [tab, setTab] = useState<'production' | 'planning' | 'recipes' | 'batches' | 'inventory' | 'portions' | 'quality' | 'history'>('production')

  // Recipe scaling
  const [selectedRecipe, setSelectedRecipe] = useState<string>('r1')
  const [targetPortions, setTargetPortions] = useState(50)

  // QC state
  const [qcChecks, setQcChecks] = useState<Record<string, boolean>>({})

  const recipe = RECIPES.find((r) => r.id === selectedRecipe)!
  const scale = targetPortions / 4
  const scaled = useMemo(() => ({
    cost: recipe.costPerPortion * targetPortions,
    prepTime: Math.round(recipe.prep4 + (targetPortions / 4 - 1) * (recipe.prep4 * 0.35)),
    ingredientMultiplier: scale,
  }), [recipe, targetPortions, scale])

  const toggleQc = (id: string) => setQcChecks((p) => ({ ...p, [id]: !p[id] }))

  return (
    <div style={{ padding: '28px 32px', background: C.bg, minHeight: '100vh', color: C.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg, ${C.pink}, ${C.pinkMid})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 20px ${C.pink}40` }}>
            <Flame size={26} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Cuisine centrale</h1>
            <p style={{ margin: '4px 0 0 0', color: C.muted, fontSize: 14 }}>Batch cooking, prévisions IA et gestion des productions</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={btnSecondary}><Download size={16} /> Exporter</button>
          <button style={btnPrimary}><Plus size={16} /> Nouveau batch</button>
        </div>
      </motion.div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard icon={Flame} label="Batches aujourd'hui" value="8" delta="+2" color={C.pink} soft={C.pinkSoft} />
        <StatCard icon={Utensils} label="Portions préparées" value="156" delta="+12%" color={C.blue} soft={C.blueSoft} />
        <StatCard icon={TrendingDown} label="Perte estimée" value="3 %" delta="-1,2 pts" color={C.green} soft={C.greenSoft} positive />
        <StatCard icon={Clock} label="Économie temps" value="2h30" delta="vs manuel" color={C.indigo} soft={C.indigoSoft} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: 4, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 20, overflowX: 'auto' }}>
        {[
          { id: 'production', label: 'Production', icon: Flame },
          { id: 'planning', label: 'Prévisions IA', icon: BrainCircuit },
          { id: 'recipes', label: 'Recettes à l\'échelle', icon: Scale },
          { id: 'batches', label: 'Fiches batch', icon: ClipboardCheck },
          { id: 'inventory', label: 'Ingrédients', icon: Package },
          { id: 'portions', label: 'Portions servies', icon: Utensils },
          { id: 'quality', label: 'Qualité', icon: CheckCircle2 },
          { id: 'history', label: 'Historique', icon: History },
        ].map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              style={{
                flex: 1,
                minWidth: 130,
                padding: '10px 14px',
                background: active ? C.pink : 'transparent',
                color: active ? '#fff' : C.muted,
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                transition: 'all .15s',
              }}
            >
              <Icon size={15} /> {t.label}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'production' && (
          <motion.div key="production" {...fade} style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20 }}>
            <Card title="Batches en cours" icon={Flame}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {BATCHES.filter((b) => b.status !== 'Terminé').map((b) => (
                  <motion.div
                    key={b.id}
                    whileHover={{ x: 2 }}
                    style={{
                      padding: 14,
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: C.muted, background: '#fff', padding: '2px 7px', borderRadius: 5, border: `1px solid ${C.border}` }}>{b.id}</span>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{b.recipe}</span>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: C.muted }}>
                      <span><Utensils size={11} style={{ display: 'inline', marginRight: 3 }} />{b.qty} portions</span>
                      <span><Clock size={11} style={{ display: 'inline', marginRight: 3 }} />{b.startTime} → {b.endTime}</span>
                      <span><Flame size={11} style={{ display: 'inline', marginRight: 3 }} />{b.station}</span>
                      <span><ChefHat size={11} style={{ display: 'inline', marginRight: 3 }} />{b.chef}</span>
                      <span style={{ color: b.temp > 63 || b.temp < 8 ? C.green : C.amber }}>
                        <Thermometer size={11} style={{ display: 'inline', marginRight: 3 }} />{b.temp} °C
                      </span>
                      {b.photo && <span style={{ color: C.indigo }}><Camera size={11} style={{ display: 'inline', marginRight: 3 }} />Photo</span>}
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>

            <Card title="Suivi HACCP en temps réel" icon={Thermometer}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <InfoRow icon={CheckCircle2} title="Cuisson à coeur" desc="Toutes les températures > 63 °C respectées" color={C.green} />
                <InfoRow icon={Thermometer} title="Refroidissement rapide" desc="3 batches passés de +63 à +10 °C en < 2h" color={C.blue} />
                <InfoRow icon={AlertTriangle} title="Vigilance" desc="Batch B-046 (salade quinoa) — maintenir < 8 °C" color={C.amber} />
                <InfoRow icon={Camera} title="Preuves photo" desc="6 clichés collectés aujourd'hui · traçabilité OK" color={C.indigo} />
              </div>

              <div style={{ marginTop: 16, padding: 14, background: C.pinkSoft, borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Sparkles size={14} color={C.pink} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.pinkDark }}>Suggestion IA</span>
                </div>
                <p style={{ fontSize: 12, color: C.text, margin: 0, lineHeight: 1.5 }}>
                  Le batch de ratatouille tourne plus lentement que prévu. Prévoir +15 min ou ajuster la thermostatique à 180 °C.
                </p>
              </div>
            </Card>
          </motion.div>
        )}

        {tab === 'planning' && (
          <motion.div key="planning" {...fade}>
            <Card title="Calendrier de production — semaine en cours" icon={Calendar}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
                {CALENDAR_DAYS.map((d) => (
                  <div
                    key={d.date}
                    style={{
                      padding: 14,
                      border: `2px solid ${d.today ? C.pink : C.border}`,
                      borderRadius: 12,
                      background: d.today ? C.pinkSoft : C.bg,
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase' }}>{d.day}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: d.today ? C.pink : C.text }}>{d.date}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{d.batches} batches</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{d.portions} portions</div>
                  </div>
                ))}
              </div>
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
              <Card title="Prédictions IA" icon={BrainCircuit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {PREDICTIONS.map((p, i) => (
                    <div key={i} style={{ padding: 12, border: `1px solid ${C.border}`, borderRadius: 10, background: C.bg }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{p.day}</span>
                        <span style={{ fontSize: 11, background: C.pinkSoft, color: C.pink, padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                          {p.confidence}%
                        </span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        Prévoir {p.portions} portions de <span style={{ color: C.pink }}>{p.recipe}</span>
                      </div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Sparkles size={11} /> {p.factor}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Ajustements météo" icon={CloudSun}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ padding: 14, background: C.blueSoft, borderRadius: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.blue, marginBottom: 5 }}>Jeudi — 8 °C, pluie</div>
                    <div style={{ fontSize: 13, color: C.text }}>+30 % de soupes et plats chauds estimés</div>
                  </div>
                  <div style={{ padding: 14, background: C.amberSoft, borderRadius: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.amber, marginBottom: 5 }}>Samedi — 22 °C, ensoleillé</div>
                    <div style={{ fontSize: 13, color: C.text }}>+45 % de salades et plats froids, -20 % soupes</div>
                  </div>
                  <div style={{ padding: 14, background: C.greenSoft, borderRadius: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.green, marginBottom: 5 }}>Dimanche — 19 °C, nuageux</div>
                    <div style={{ fontSize: 13, color: C.text }}>Tendance normale, brunch familial attendu</div>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
        )}

        {tab === 'recipes' && (
          <motion.div key="recipes" {...fade} style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 20 }}>
            <Card title="Recettes de référence" icon={Scale}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {RECIPES.map((r) => {
                  const active = selectedRecipe === r.id
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRecipe(r.id)}
                      style={{
                        textAlign: 'left',
                        padding: 12,
                        border: `1px solid ${active ? C.pink : C.border}`,
                        borderRadius: 10,
                        background: active ? C.pinkSoft : C.bg,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</span>
                        <span style={{ fontSize: 11, color: C.muted, background: '#fff', padding: '2px 7px', borderRadius: 5 }}>{r.category}</span>
                      </div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                        Base 4 portions · {r.base4.toFixed(2)} € · {r.prep4} min
                      </div>
                    </button>
                  )
                })}
              </div>
            </Card>

            <Card title={`Mise à l'échelle — ${recipe.name}`} icon={Sparkles}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Portions cibles</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="range"
                    min={4}
                    max={200}
                    step={2}
                    value={targetPortions}
                    onChange={(e) => setTargetPortions(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="number"
                    min={4}
                    value={targetPortions}
                    onChange={(e) => setTargetPortions(Number(e.target.value))}
                    style={{ ...inputStyle, width: 90 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                <SmallStat icon={Scale} label="Facteur" value={`× ${scale.toFixed(1)}`} color={C.pink} />
                <SmallStat icon={Timer} label="Temps préparation" value={`${scaled.prepTime} min`} color={C.indigo} />
                <SmallStat icon={Flame} label="Coût total" value={`${scaled.cost.toFixed(2)} €`} color={C.amber} />
              </div>

              <div style={{ padding: 14, background: C.bg, borderRadius: 10, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.pinkDark, marginBottom: 10 }}>Ingrédients ajustés</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                  <IngRow name="Ingrédient principal" base={1} mult={scale} unit="kg" />
                  <IngRow name="Matières grasses" base={0.2} mult={scale} unit="L" />
                  <IngRow name="Aromatiques" base={0.15} mult={scale} unit="kg" />
                  <IngRow name="Liquide (fond, eau)" base={1.5} mult={scale} unit="L" />
                  <IngRow name="Assaisonnement" base={0.05} mult={scale} unit="kg" />
                </div>
              </div>

              <div style={{ marginTop: 14, padding: 12, background: C.greenSoft, borderRadius: 8, fontSize: 12, color: C.green }}>
                <CheckCircle2 size={12} style={{ display: 'inline', marginRight: 5 }} />
                Coût par portion : <strong>{recipe.costPerPortion.toFixed(2)} €</strong>
              </div>
            </Card>
          </motion.div>
        )}

        {tab === 'batches' && (
          <motion.div key="batches" {...fade}>
            <Card title="Fiches de batch complètes" icon={ClipboardCheck}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}`, textAlign: 'left', color: C.muted, fontSize: 12 }}>
                      <th style={th}>ID</th>
                      <th style={th}>Recette</th>
                      <th style={th}>Quantité</th>
                      <th style={th}>Début</th>
                      <th style={th}>Fin</th>
                      <th style={th}>Poste</th>
                      <th style={th}>Chef</th>
                      <th style={th}>Temp.</th>
                      <th style={th}>Photo</th>
                      <th style={th}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BATCHES.map((b) => (
                      <tr key={b.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={td}><span style={{ fontFamily: 'monospace', fontSize: 12, color: C.muted }}>{b.id}</span></td>
                        <td style={{ ...td, fontWeight: 600 }}>{b.recipe}</td>
                        <td style={td}>{b.qty}</td>
                        <td style={td}>{b.startTime}</td>
                        <td style={td}>{b.endTime}</td>
                        <td style={td}>{b.station}</td>
                        <td style={td}>{b.chef}</td>
                        <td style={{ ...td, color: b.temp > 63 || b.temp < 8 ? C.green : C.amber, fontWeight: 600 }}>{b.temp} °C</td>
                        <td style={td}>{b.photo ? <Camera size={14} color={C.green} /> : <span style={{ color: C.muted, fontSize: 12 }}>—</span>}</td>
                        <td style={td}><StatusBadge status={b.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}

        {tab === 'inventory' && (
          <motion.div key="inventory" {...fade} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <Card title="Alertes de stock" icon={AlertTriangle}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {INGREDIENT_ALERTS.map((a) => {
                  const missing = a.needed - a.stock
                  return (
                    <div key={a.id} style={{ padding: 14, border: `1px solid ${C.red}30`, borderRadius: 10, background: C.redSoft }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.red }}>
                          Manque {missing.toFixed(1)} {a.unit}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: C.muted, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Besoin : {a.needed} {a.unit} · Stock : {a.stock} {a.unit}</span>
                        <span>Impacte : {a.batches.join(', ')}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Card title="Déduction automatique" icon={Package}>
              <p style={{ fontSize: 13, color: C.muted, margin: '0 0 14px 0', lineHeight: 1.5 }}>
                Chaque batch déduit automatiquement les ingrédients nécessaires du stock selon les recettes mises à l'échelle.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <DeductionRow name="Boeuf haché" amount="6,5 kg" batch="B-041" />
                <DeductionRow name="Potiron" amount="4 kg" batch="B-042" />
                <DeductionRow name="Pâte brisée" amount="2,4 kg" batch="B-043" />
                <DeductionRow name="Tomates" amount="5 kg" batch="B-044" />
                <DeductionRow name="Poulet fermier" amount="7 kg" batch="B-045" />
                <DeductionRow name="Quinoa" amount="2,5 kg" batch="B-046" />
              </div>
            </Card>
          </motion.div>
        )}

        {tab === 'portions' && (
          <motion.div key="portions" {...fade}>
            <Card title="Suivi des portions servies" icon={Utensils}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {PORTIONS.map((p) => {
                  const servedPct = Math.round((p.served / p.prepared) * 100)
                  return (
                    <div key={p.batch} style={{ padding: 14, border: `1px solid ${C.border}`, borderRadius: 10, background: C.bg }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div>
                          <span style={{ fontFamily: 'monospace', fontSize: 11, color: C.muted, marginRight: 8 }}>{p.batch}</span>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{p.recipe}</span>
                        </div>
                        <span style={{ fontSize: 12, color: p.wasteRate > 5 ? C.red : C.muted }}>
                          Perte : <strong>{p.wasteRate.toFixed(1)} %</strong>
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, fontSize: 12, marginBottom: 10 }}>
                        <div><span style={{ color: C.muted }}>Préparées : </span><strong>{p.prepared}</strong></div>
                        <div><span style={{ color: C.muted }}>Servies : </span><strong style={{ color: C.green }}>{p.served}</strong></div>
                        <div><span style={{ color: C.muted }}>Restantes : </span><strong style={{ color: p.remaining > 5 ? C.amber : C.text }}>{p.remaining}</strong></div>
                      </div>
                      <div style={{ width: '100%', height: 8, background: C.border, borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${servedPct}%`, height: '100%', background: C.pink }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </motion.div>
        )}

        {tab === 'quality' && (
          <motion.div key="quality" {...fade} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <Card title="Checklist qualité en service" icon={CheckCircle2}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {QC_ITEMS.map((q) => {
                  const Icon = q.icon
                  const checked = qcChecks[q.id] || false
                  return (
                    <button
                      key={q.id}
                      onClick={() => toggleQc(q.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 14,
                        border: `1.5px solid ${checked ? C.green : C.border}`,
                        borderRadius: 10,
                        background: checked ? C.greenSoft : C.bg,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: checked ? C.green : C.card, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={16} color={checked ? '#fff' : C.muted} />
                      </div>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: C.text }}>{q.label}</span>
                      {checked && <CheckCircle2 size={18} color={C.green} />}
                    </button>
                  )
                })}
              </div>
            </Card>

            <Card title="Performance prep time" icon={Timer}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <PerfRow recipe="Bolognaise maison" planned={120} actual={108} />
                <PerfRow recipe="Soupe potiron-coco" planned={90} actual={105} />
                <PerfRow recipe="Ratatouille" planned={90} actual={92} />
                <PerfRow recipe="Poulet rôti aux herbes" planned={80} actual={75} />
                <PerfRow recipe="Quiche lorraine" planned={75} actual={90} />
                <PerfRow recipe="Tiramisu individuel" planned={90} actual={85} />
              </div>
            </Card>
          </motion.div>
        )}

        {tab === 'history' && (
          <motion.div key="history" {...fade}>
            <Card title="Analytics par recette" icon={History}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}`, textAlign: 'left', color: C.muted, fontSize: 12 }}>
                      <th style={th}>Recette</th>
                      <th style={th}>Taux épuisement</th>
                      <th style={th}>Perte moyenne</th>
                      <th style={th}>Tendance</th>
                      <th style={th}>Recommandation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {HISTORY_STATS.map((s) => {
                      const recommendation = s.avgWaste > 10
                        ? 'Réduire quantités'
                        : s.soldOut > 80
                        ? 'Augmenter production'
                        : 'Maintenir volume'
                      const recoColor = s.avgWaste > 10 ? C.red : s.soldOut > 80 ? C.green : C.muted
                      const TrendIcon = s.trend === 'up' ? ArrowUpRight : s.trend === 'down' ? ArrowDownRight : TrendingUp
                      const trendColor = s.trend === 'up' ? C.green : s.trend === 'down' ? C.red : C.muted
                      return (
                        <tr key={s.recipe} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ ...td, fontWeight: 600 }}>{s.recipe}</td>
                          <td style={td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 100, height: 6, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${s.soldOut}%`, height: '100%', background: C.pink }} />
                              </div>
                              <span>{s.soldOut}%</span>
                            </div>
                          </td>
                          <td style={{ ...td, color: s.avgWaste > 10 ? C.red : s.avgWaste > 5 ? C.amber : C.green, fontWeight: 600 }}>
                            {s.avgWaste.toFixed(1)}%
                          </td>
                          <td style={td}><TrendIcon size={16} color={trendColor} /></td>
                          <td style={{ ...td, color: recoColor, fontWeight: 600, fontSize: 12 }}>{recommendation}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 16, padding: 14, background: C.pinkSoft, borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <BrainCircuit size={16} color={C.pink} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.pinkDark }}>Proposition pour la semaine prochaine</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: C.text, lineHeight: 1.7 }}>
                  <li>Réduire la ratatouille de 35 à 25 portions (gaspillage trop élevé)</li>
                  <li>Augmenter le tiramisu de 50 à 60 portions (écoulement à 92 %)</li>
                  <li>Tester un nouveau dessert en remplacement du plus faible</li>
                </ul>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// --- helpers ---

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.18 },
}

function StatCard({ icon: Icon, label, value, delta, color, soft, positive }: { icon: typeof Flame; label: string; value: string; delta: string; color: string; soft: string; positive?: boolean }) {
  return (
    <motion.div whileHover={{ y: -2 }} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: soft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={color} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: positive !== false ? C.green : C.muted, background: positive !== false ? C.greenSoft : C.bg, padding: '3px 8px', borderRadius: 6 }}>{delta}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>{value}</div>
      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{label}</div>
    </motion.div>
  )
}

function SmallStat({ icon: Icon, label, value, color }: { icon: typeof Flame; label: string; value: string; color: string }) {
  return (
    <div style={{ padding: 12, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
        <Icon size={14} color={color} />
        <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{value}</div>
    </div>
  )
}

function Card({ title, icon: Icon, children }: { title: string; icon: typeof Flame; children: React.ReactNode }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Icon size={18} color={C.pink} />
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

function StatusBadge({ status }: { status: BatchStatus }) {
  const s = statusStyle(status)
  return (
    <span style={{ padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: s.bg, color: s.fg }}>
      {status}
    </span>
  )
}

function InfoRow({ icon: Icon, title, desc, color }: { icon: typeof Thermometer; title: string; desc: string; color: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} color={color} />
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{title}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  )
}

function IngRow({ name, base, mult, unit }: { name: string; base: number; mult: number; unit: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px dashed ${C.border}` }}>
      <span style={{ color: C.muted }}>{name}</span>
      <span style={{ fontWeight: 600 }}>{(base * mult).toFixed(2)} {unit}</span>
    </div>
  )
}

function DeductionRow({ name, amount, batch }: { name: string; amount: string; batch: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, background: C.bg, borderRadius: 8, fontSize: 13 }}>
      <div>
        <div style={{ fontWeight: 600 }}>{name}</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Batch {batch}</div>
      </div>
      <span style={{ fontWeight: 700, color: C.pink }}>-{amount}</span>
    </div>
  )
}

function PerfRow({ recipe, planned, actual }: { recipe: string; planned: number; actual: number }) {
  const diff = actual - planned
  const pct = Math.round((actual / planned) * 100)
  const ok = actual <= planned
  return (
    <div style={{ padding: 12, background: C.bg, borderRadius: 10, border: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{recipe}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: ok ? C.green : C.red }}>
          {diff > 0 ? '+' : ''}{diff} min
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginBottom: 6 }}>
        <span>Prévu : {planned} min</span>
        <span>Réel : {actual} min</span>
      </div>
      <div style={{ width: '100%', height: 5, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: ok ? C.green : C.amber }} />
      </div>
    </div>
  )
}

// --- styles ---

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  background: C.pink,
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
}

const btnSecondary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  background: C.card,
  color: C.text,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  fontSize: 13,
  background: '#fff',
  color: C.text,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: C.muted,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: 5,
}

const th: React.CSSProperties = {
  padding: '10px 12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
}

const td: React.CSSProperties = {
  padding: '12px',
  color: C.text,
}

export default CentralKitchenPage
