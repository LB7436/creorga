import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Platform = 'Wedely' | 'UberEats' | 'Deliveroo' | 'Direct'
type OrderStatus = 'Nouvelle' | 'Préparation' | 'Prête' | 'En livraison' | 'Livrée'
type DriverStatus = 'Libre' | 'En mission' | 'Pause'
type Vehicle = 'Vélo' | 'Scooter' | 'Voiture'
type TabId = 'map' | 'drivers' | 'zones' | 'commissions' | 'feedback'

interface DeliveryOrder {
  id: string
  numero: string
  platform: Platform
  client: string
  adresse: string
  distance: number
  montant: number
  status: OrderStatus
  elapsedSec: number
  items: number
  driverId?: string
}

interface Driver {
  id: string
  name: string
  status: DriverStatus
  vehicle: Vehicle
  zone: string
  note: number
  phone: string
  x: number
  y: number
  color: string
  deliveries: number
  avgTime: number
}

const PLATFORMS: Record<Platform, { color: string; bg: string; label: string; commission: number }> = {
  Wedely: { color: '#dc2626', bg: '#fee2e2', label: 'Wedely Luxembourg', commission: 12 },
  UberEats: { color: '#111827', bg: '#f3f4f6', label: 'UberEats', commission: 30 },
  Deliveroo: { color: '#06b6d4', bg: '#cffafe', label: 'Deliveroo', commission: 28 },
  Direct: { color: '#059669', bg: '#d1fae5', label: 'Commande directe', commission: 0 },
}

const STATUS_COLORS: Record<OrderStatus, { bg: string; fg: string }> = {
  'Nouvelle': { bg: '#fef3c7', fg: '#92400e' },
  'Préparation': { bg: '#dbeafe', fg: '#1e40af' },
  'Prête': { bg: '#d1fae5', fg: '#065f46' },
  'En livraison': { bg: '#ede9fe', fg: '#5b21b6' },
  'Livrée': { bg: '#f3f4f6', fg: '#374151' },
}

const INITIAL_ORDERS: DeliveryOrder[] = [
  { id: 'o1', numero: 'C-1284', platform: 'UberEats', client: 'Marie Dupont', adresse: '12 Rue de la Gare, Rumelange', distance: 1.8, montant: 32.50, status: 'En livraison', elapsedSec: 1245, items: 3, driverId: 'd1' },
  { id: 'o2', numero: 'C-1285', platform: 'Wedely', client: 'Paul Schmitt', adresse: '4 Avenue Kennedy, Kayl', distance: 3.2, montant: 24.80, status: 'Prête', elapsedSec: 820, items: 2 },
  { id: 'o3', numero: 'C-1286', platform: 'Deliveroo', client: 'Sophie Lemaire', adresse: '28 Rue des Fleurs, Esch', distance: 5.6, montant: 18.00, status: 'Préparation', elapsedSec: 420, items: 1 },
  { id: 'o4', numero: 'C-1287', platform: 'UberEats', client: 'Julien Weber', adresse: '7 Rue Haute, Rumelange', distance: 0.9, montant: 41.20, status: 'Nouvelle', elapsedSec: 65, items: 4 },
  { id: 'o5', numero: 'C-1288', platform: 'Wedely', client: 'Anne Muller', adresse: '15 Bd Pierre Hamer, Rumelange', distance: 2.1, montant: 22.50, status: 'En livraison', elapsedSec: 960, items: 2, driverId: 'd2' },
  { id: 'o6', numero: 'C-1289', platform: 'Direct', client: 'Claude Reuter', adresse: '3 Rue du Parc, Tétange', distance: 2.8, montant: 14.00, status: 'Préparation', elapsedSec: 220, items: 1 },
  { id: 'o7', numero: 'C-1290', platform: 'UberEats', client: 'Isabelle Becker', adresse: '22 Rue Neuve, Dudelange', distance: 4.5, montant: 36.80, status: 'Nouvelle', elapsedSec: 30, items: 3 },
  { id: 'o8', numero: 'C-1291', platform: 'Wedely', client: 'Marc Hoffmann', adresse: '9 Rue du Stade, Kayl', distance: 3.8, montant: 28.40, status: 'Prête', elapsedSec: 640, items: 2 },
]

const INITIAL_DRIVERS: Driver[] = [
  { id: 'd1', name: 'Thomas Berg', status: 'En mission', vehicle: 'Scooter', zone: 'Zone 1 (0-3km)', note: 4.9, phone: '+352 621 123 456', x: 180, y: 220, color: '#dc2626', deliveries: 128, avgTime: 24 },
  { id: 'd2', name: 'Sarah Klein', status: 'En mission', vehicle: 'Vélo', zone: 'Zone 1 (0-3km)', note: 4.8, phone: '+352 621 234 567', x: 320, y: 180, color: '#2563eb', deliveries: 94, avgTime: 28 },
  { id: 'd3', name: 'Luis Pereira', status: 'Libre', vehicle: 'Voiture', zone: 'Zone 2 (3-5km)', note: 4.7, phone: '+352 621 345 678', x: 240, y: 310, color: '#059669', deliveries: 215, avgTime: 31 },
  { id: 'd4', name: 'Mehdi Ouali', status: 'Libre', vehicle: 'Scooter', zone: 'Zone 2 (3-5km)', note: 4.6, phone: '+352 621 456 789', x: 400, y: 260, color: '#7c3aed', deliveries: 167, avgTime: 26 },
  { id: 'd5', name: 'Elena Rossi', status: 'Pause', vehicle: 'Voiture', zone: 'Zone 3 (5-10km)', note: 4.9, phone: '+352 621 567 890', x: 140, y: 140, color: '#db2777', deliveries: 88, avgTime: 38 },
]

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function timerColor(s: number, status: OrderStatus) {
  if (status === 'Livrée') return '#6b7280'
  if (s > 1800) return '#dc2626'
  if (s > 900) return '#ea580c'
  return '#059669'
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 18,
        flex: 1,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{sub}</div>}
    </motion.div>
  )
}

function PlatformCard({ platform, orders, revenue }: { platform: Platform; orders: number; revenue: number }) {
  const p = PLATFORMS[platform]
  return (
    <motion.div
      whileHover={{ y: -2 }}
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 16,
        flex: 1,
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, background: p.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: p.color, fontWeight: 700, fontSize: 14,
        }}>
          {platform.charAt(0)}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{p.label}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{orders}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>commandes</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: p.color }}>{revenue}€</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>CA</div>
        </div>
      </div>
    </motion.div>
  )
}

function MapView({ drivers, onDriverClick, selectedDriver, orders }: {
  drivers: Driver[]
  onDriverClick: (d: Driver | null) => void
  selectedDriver: Driver | null
  orders: DeliveryOrder[]
}) {
  const [pulse, setPulse] = useState(0)

  useEffect(() => {
    const i = setInterval(() => setPulse(p => p + 1), 1500)
    return () => clearInterval(i)
  }, [])

  const center = { x: 270, y: 230 }
  const activeOrder = selectedDriver ? orders.find(o => o.driverId === selectedDriver.id) : null

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      overflow: 'hidden',
      position: 'relative',
      height: 540,
    }}>
      <div style={{
        padding: 14,
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Carte temps réel · Rumelange</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>{drivers.filter(d => d.status === 'En mission').length} livreur(s) en mission</div>
        </div>
        <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ea580c' }} />
            <span style={{ color: '#6b7280' }}>Restaurant</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb' }} />
            <span style={{ color: '#6b7280' }}>Livreurs</span>
          </div>
        </div>
      </div>
      <svg viewBox="0 0 540 480" style={{ width: '100%', height: 'calc(100% - 58px)', background: '#f8fafc', cursor: 'pointer' }} onClick={() => onDriverClick(null)}>
        {/* Streets mock */}
        <path d="M 0 230 L 540 230" stroke="#e5e7eb" strokeWidth="10" />
        <path d="M 270 0 L 270 480" stroke="#e5e7eb" strokeWidth="10" />
        <path d="M 0 120 L 540 140" stroke="#e5e7eb" strokeWidth="6" />
        <path d="M 0 340 L 540 360" stroke="#e5e7eb" strokeWidth="6" />
        <path d="M 140 0 L 160 480" stroke="#e5e7eb" strokeWidth="6" />
        <path d="M 380 0 L 400 480" stroke="#e5e7eb" strokeWidth="6" />
        <path d="M 50 60 Q 200 100 350 50" stroke="#f1f5f9" strokeWidth="4" fill="none" />
        <path d="M 100 420 Q 300 380 500 440" stroke="#f1f5f9" strokeWidth="4" fill="none" />

        {/* Zones concentric */}
        <circle cx={center.x} cy={center.y} r="80" fill="#fde68a" fillOpacity="0.25" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 4" />
        <circle cx={center.x} cy={center.y} r="140" fill="#bfdbfe" fillOpacity="0.18" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 4" />
        <circle cx={center.x} cy={center.y} r="210" fill="#bbf7d0" fillOpacity="0.12" stroke="#10b981" strokeWidth="1" strokeDasharray="4 4" />

        <text x={center.x + 85} y={center.y - 5} fontSize="10" fill="#92400e" fontWeight="600">0-3km</text>
        <text x={center.x + 145} y={center.y - 5} fontSize="10" fill="#1e40af" fontWeight="600">3-5km</text>
        <text x={center.x + 215} y={center.y - 5} fontSize="10" fill="#065f46" fontWeight="600">5-10km</text>

        {/* Restaurant pin */}
        <motion.circle
          cx={center.x} cy={center.y} r="16"
          fill="#ea580c"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <circle cx={center.x} cy={center.y} r="8" fill="#ffffff" />
        <text x={center.x} y={center.y + 32} fontSize="11" fontWeight="700" fill="#ea580c" textAnchor="middle">Restaurant</text>

        {/* Drivers */}
        {drivers.map((d, idx) => {
          const offset = pulse % 4
          const x = d.status === 'En mission' ? d.x + Math.sin(pulse * 0.5 + idx) * 8 : d.x
          const y = d.status === 'En mission' ? d.y + Math.cos(pulse * 0.5 + idx) * 6 : d.y
          const isSelected = selectedDriver?.id === d.id
          return (
            <g key={d.id} onClick={(e) => { e.stopPropagation(); onDriverClick(d) }} style={{ cursor: 'pointer' }}>
              {d.status === 'En mission' && (
                <motion.circle
                  cx={x} cy={y} r="20"
                  fill={d.color} fillOpacity="0.2"
                  animate={{ r: [15, 25, 15] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
              <circle cx={x} cy={y} r={isSelected ? 12 : 10} fill={d.color} stroke="#ffffff" strokeWidth="2" />
              <text x={x} y={y + 4} fontSize="10" fontWeight="700" fill="#ffffff" textAnchor="middle">
                {d.vehicle === 'Vélo' ? 'V' : d.vehicle === 'Scooter' ? 'S' : 'A'}
              </text>
              {isSelected && (
                <text x={x} y={y - 18} fontSize="11" fontWeight="600" fill="#111827" textAnchor="middle">{d.name}</text>
              )}
            </g>
          )
        })}
      </svg>

      <AnimatePresence>
        {selectedDriver && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{
              position: 'absolute',
              left: 14, bottom: 14,
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              padding: 14,
              width: 280,
              boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: selectedDriver.color, color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {selectedDriver.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{selectedDriver.name}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{selectedDriver.vehicle} · Note {selectedDriver.note}/5</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
              <div><b>Statut :</b> {selectedDriver.status}</div>
              <div><b>Zone :</b> {selectedDriver.zone}</div>
              <div><b>Téléphone :</b> {selectedDriver.phone}</div>
            </div>
            {activeOrder && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>COMMANDE EN COURS</div>
                <div style={{ fontSize: 12, color: '#111827' }}>{activeOrder.numero} · {activeOrder.client}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{activeOrder.adresse}</div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function OrderCard({ order, onAction }: { order: DeliveryOrder; onAction: (id: string, a: string) => void }) {
  const p = PLATFORMS[order.platform]
  const sc = STATUS_COLORS[order.status]
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            padding: '2px 8px', borderRadius: 4,
            background: p.bg, color: p.color,
            fontSize: 10, fontWeight: 700,
          }}>{order.platform}</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{order.numero}</span>
        </div>
        <div style={{
          padding: '3px 8px', borderRadius: 4,
          background: sc.bg, color: sc.fg,
          fontSize: 10, fontWeight: 700,
        }}>{order.status}</div>
      </div>
      <div style={{ fontSize: 12, color: '#111827', marginBottom: 2 }}>{order.client}</div>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>{order.adresse} · {order.distance} km</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{order.montant.toFixed(2)}€</span>
          <span style={{ fontSize: 11, color: timerColor(order.elapsedSec, order.status), fontWeight: 600 }}>
            ⏱ {formatTime(order.elapsedSec)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {order.status === 'Nouvelle' && (
            <>
              <button onClick={() => onAction(order.id, 'refuse')} style={btnStyle('#fee2e2', '#991b1b')}>Refuser</button>
              <button onClick={() => onAction(order.id, 'accept')} style={btnStyle('#d1fae5', '#065f46')}>Accepter</button>
            </>
          )}
          {order.status === 'Préparation' && (
            <button onClick={() => onAction(order.id, 'ready')} style={btnStyle('#dbeafe', '#1e40af')}>Marquer prête</button>
          )}
          {order.status === 'Prête' && (
            <button onClick={() => onAction(order.id, 'deliver')} style={btnStyle('#ede9fe', '#5b21b6')}>Assigner livreur</button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function btnStyle(bg: string, fg: string): React.CSSProperties {
  return {
    padding: '5px 10px',
    background: bg,
    color: fg,
    border: 'none',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
  }
}

function DriversPanel({ drivers }: { drivers: Driver[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
      {drivers.map(d => (
        <motion.div
          key={d.id}
          whileHover={{ y: -2 }}
          style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: d.color, color: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700,
            }}>
              {d.name.split(' ').map(n => n.charAt(0)).join('')}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{d.name}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{d.phone}</div>
            </div>
            <div style={{
              padding: '3px 8px', borderRadius: 4,
              background: d.status === 'Libre' ? '#d1fae5' : d.status === 'En mission' ? '#dbeafe' : '#f3f4f6',
              color: d.status === 'Libre' ? '#065f46' : d.status === 'En mission' ? '#1e40af' : '#374151',
              fontSize: 10, fontWeight: 700,
            }}>{d.status}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
            <div><span style={{ color: '#6b7280' }}>Véhicule :</span> <b style={{ color: '#111827' }}>{d.vehicle}</b></div>
            <div><span style={{ color: '#6b7280' }}>Zone :</span> <b style={{ color: '#111827' }}>{d.zone.split(' ')[1]}</b></div>
            <div><span style={{ color: '#6b7280' }}>Note :</span> <b style={{ color: '#ea580c' }}>⭐ {d.note}</b></div>
            <div><span style={{ color: '#6b7280' }}>Livraisons :</span> <b style={{ color: '#111827' }}>{d.deliveries}</b></div>
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6', display: 'flex', gap: 6 }}>
            <button style={{ ...btnStyle('#dbeafe', '#1e40af'), flex: 1 }}>Appeler</button>
            <button style={{ ...btnStyle('#f3f4f6', '#374151'), flex: 1 }}>Localiser</button>
            <button style={{ ...btnStyle('#ede9fe', '#5b21b6'), flex: 1 }}>Stats</button>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function ZonesPanel() {
  const zones = [
    { name: 'Zone 1', range: '0-3 km', fee: 2.00, minOrder: 15, freeFrom: 25, color: '#f59e0b', orders: 14 },
    { name: 'Zone 2', range: '3-5 km', fee: 3.50, minOrder: 20, freeFrom: 35, color: '#3b82f6', orders: 8 },
    { name: 'Zone 3', range: '5-10 km', fee: 5.50, minOrder: 30, freeFrom: 50, color: '#10b981', orders: 2 },
  ]
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {zones.map(z => (
          <div key={z.name} style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: z.color }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{z.name} · {z.range}</div>
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Frais de livraison</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 14 }}>{z.fee.toFixed(2)}€</div>
            <div style={{ display: 'grid', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Commande min.</span><b>{z.minOrder}€</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Livraison gratuite dès</span><b>{z.freeFrom}€</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Commandes aujourd'hui</span><b>{z.orders}</b>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 12 }}>Règles d'auto-dispatch</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {[
            { label: 'Assignation au livreur le plus proche dispo', on: true },
            { label: 'Privilégier livreurs avec meilleure note', on: true },
            { label: 'Équilibrer la charge entre livreurs', on: true },
            { label: 'Respecter les zones assignées', on: false },
            { label: 'Alerter si zone saturée', on: true },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, background: '#f9fafb', borderRadius: 8 }}>
              <span style={{ fontSize: 13, color: '#111827' }}>{r.label}</span>
              <div style={{
                width: 36, height: 20, borderRadius: 10,
                background: r.on ? '#10b981' : '#d1d5db',
                position: 'relative', cursor: 'pointer',
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', background: '#ffffff',
                  position: 'absolute', top: 2, left: r.on ? 18 : 2,
                  transition: 'left 0.2s',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CommissionsPanel() {
  const data = [
    { platform: 'UberEats', orders: 12, revenue: 245, commission: 30, net: 171.50 },
    { platform: 'Wedely', orders: 8, revenue: 185, commission: 12, net: 162.80 },
    { platform: 'Deliveroo', orders: 3, revenue: 42, commission: 28, net: 30.24 },
    { platform: 'Direct', orders: 1, revenue: 14, commission: 0, net: 14.00 },
  ]
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: 18, borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Commissions plateformes · Aujourd'hui</div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>Détail des frais prélevés par chaque plateforme</div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f9fafb' }}>
            {['Plateforme', 'Commandes', 'CA brut', 'Commission', '% frais', 'Net restaurant'].map(h => (
              <th key={h} style={{ padding: 12, textAlign: 'left', fontSize: 11, color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(d => (
            <tr key={d.platform}>
              <td style={{ padding: 12, fontSize: 13, fontWeight: 600, color: '#111827', borderBottom: '1px solid #f3f4f6' }}>{d.platform}</td>
              <td style={{ padding: 12, fontSize: 13, color: '#374151', borderBottom: '1px solid #f3f4f6' }}>{d.orders}</td>
              <td style={{ padding: 12, fontSize: 13, color: '#374151', borderBottom: '1px solid #f3f4f6' }}>{d.revenue}€</td>
              <td style={{ padding: 12, fontSize: 13, color: '#dc2626', fontWeight: 600, borderBottom: '1px solid #f3f4f6' }}>-{(d.revenue * d.commission / 100).toFixed(2)}€</td>
              <td style={{ padding: 12, fontSize: 13, color: '#374151', borderBottom: '1px solid #f3f4f6' }}>{d.commission}%</td>
              <td style={{ padding: 12, fontSize: 13, color: '#059669', fontWeight: 700, borderBottom: '1px solid #f3f4f6' }}>{d.net.toFixed(2)}€</td>
            </tr>
          ))}
          <tr style={{ background: '#f9fafb' }}>
            <td style={{ padding: 12, fontSize: 13, fontWeight: 700, color: '#111827' }}>TOTAL</td>
            <td style={{ padding: 12, fontSize: 13, fontWeight: 700, color: '#111827' }}>24</td>
            <td style={{ padding: 12, fontSize: 13, fontWeight: 700, color: '#111827' }}>486€</td>
            <td style={{ padding: 12, fontSize: 13, fontWeight: 700, color: '#dc2626' }}>-107.46€</td>
            <td style={{ padding: 12, fontSize: 13, fontWeight: 700, color: '#374151' }}>22.1%</td>
            <td style={{ padding: 12, fontSize: 13, fontWeight: 700, color: '#059669' }}>378.54€</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function FeedbackPanel() {
  const reviews = [
    { client: 'Marie D.', platform: 'UberEats', rating: 5, tip: 3, comment: 'Livraison rapide, plats encore chauds. Parfait !', date: 'Il y a 2h' },
    { client: 'Paul S.', platform: 'Wedely', rating: 5, tip: 2, comment: 'Livreur très sympa, bien emballé.', date: 'Il y a 3h' },
    { client: 'Sophie L.', platform: 'Deliveroo', rating: 4, tip: 0, comment: 'Bon mais un peu long.', date: 'Il y a 5h' },
    { client: 'Julien W.', platform: 'UberEats', rating: 5, tip: 5, comment: 'Comme toujours excellent, merci !', date: 'Hier' },
    { client: 'Anne M.', platform: 'Wedely', rating: 3, tip: 0, comment: 'Commande incomplète, manquait une sauce.', date: 'Hier' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 14 }}>Résumé pourboires</div>
        <div style={{ fontSize: 32, fontWeight: 700, color: '#ea580c', marginBottom: 6 }}>48€</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>Total pourboires aujourd'hui</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {[
            { label: 'Moyenne par commande', val: '2.00€' },
            { label: 'Commandes avec pourboire', val: '18 / 24' },
            { label: 'Meilleur livreur pourboires', val: 'Thomas (22€)' },
          ].map((x, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#6b7280' }}>{x.label}</span>
              <b style={{ color: '#111827' }}>{x.val}</b>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 14 }}>Note moyenne livraison</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 14 }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#111827' }}>4.7</div>
          <div style={{ fontSize: 14, color: '#6b7280' }}>/ 5</div>
          <div style={{ fontSize: 18, color: '#fbbf24', marginLeft: 6 }}>★★★★★</div>
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          {[5, 4, 3, 2, 1].map(s => {
            const pct = s === 5 ? 72 : s === 4 ? 20 : s === 3 ? 5 : s === 2 ? 2 : 1
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ width: 20, color: '#6b7280' }}>{s}★</span>
                <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: '#fbbf24' }} />
                </div>
                <span style={{ width: 30, textAlign: 'right', color: '#374151' }}>{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>
      <div style={{ gridColumn: 'span 2', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 14 }}>Derniers avis livraison</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {reviews.map((r, i) => (
            <div key={i} style={{ padding: 12, background: '#f9fafb', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                  {r.client} · <span style={{ color: PLATFORMS[r.platform as Platform].color }}>{r.platform}</span>
                </div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{r.date}</div>
              </div>
              <div style={{ fontSize: 12, color: '#fbbf24', marginBottom: 4 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
              <div style={{ fontSize: 12, color: '#374151', marginBottom: r.tip > 0 ? 4 : 0 }}>{r.comment}</div>
              {r.tip > 0 && <div style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>💶 Pourboire : {r.tip}€</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function DeliveryPage() {
  const [orders, setOrders] = useState<DeliveryOrder[]>(INITIAL_ORDERS)
  const [drivers] = useState<Driver[]>(INITIAL_DRIVERS)
  const [tab, setTab] = useState<TabId>('map')
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)

  useEffect(() => {
    const i = setInterval(() => {
      setOrders(prev => prev.map(o => o.status !== 'Livrée' ? { ...o, elapsedSec: o.elapsedSec + 1 } : o))
    }, 1000)
    return () => clearInterval(i)
  }, [])

  const handleAction = (id: string, action: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== id) return o
      if (action === 'accept') return { ...o, status: 'Préparation' }
      if (action === 'refuse') return { ...o, status: 'Livrée' }
      if (action === 'ready') return { ...o, status: 'Prête' }
      if (action === 'deliver') return { ...o, status: 'En livraison' }
      return o
    }))
  }

  const platformStats = useMemo(() => {
    const stats: Record<Platform, { orders: number; revenue: number }> = {
      Wedely: { orders: 8, revenue: 185 },
      UberEats: { orders: 12, revenue: 245 },
      Deliveroo: { orders: 3, revenue: 42 },
      Direct: { orders: 1, revenue: 14 },
    }
    return stats
  }, [])

  const tabs: { id: TabId; label: string }[] = [
    { id: 'map', label: 'Carte & commandes' },
    { id: 'drivers', label: 'Livreurs' },
    { id: 'zones', label: 'Zones & dispatch' },
    { id: 'commissions', label: 'Commissions' },
    { id: 'feedback', label: 'Avis & pourboires' },
  ]

  return (
    <div style={{ padding: 24, background: '#f9fafb', minHeight: '100vh' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#ffedd5', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🛵</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>Livraison & Delivery</h1>
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Gestion des commandes Uber Eats, Wedely, Deliveroo et livreurs internes</p>
      </motion.div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
        <Stat label="Livraisons aujourd'hui" value="24" sub="+18% vs hier" color="#ea580c" />
        <Stat label="CA livraison" value="486€" sub="Net : 378.54€" color="#059669" />
        <Stat label="Temps moyen" value="32 min" sub="Cible 30 min" color="#2563eb" />
        <Stat label="Note moyenne" value="4.7/5" sub="214 avis cette semaine" color="#f59e0b" />
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
        <PlatformCard platform="Wedely" orders={platformStats.Wedely.orders} revenue={platformStats.Wedely.revenue} />
        <PlatformCard platform="UberEats" orders={platformStats.UberEats.orders} revenue={platformStats.UberEats.revenue} />
        <PlatformCard platform="Deliveroo" orders={platformStats.Deliveroo.orders} revenue={platformStats.Deliveroo.revenue} />
        <PlatformCard platform="Direct" orders={platformStats.Direct.orders} revenue={platformStats.Direct.revenue} />
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #e5e7eb' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid #ea580c' : '2px solid transparent',
              color: tab === t.id ? '#ea580c' : '#6b7280',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'map' && (
        <div style={{ display: 'grid', gridTemplateColumns: '60fr 40fr', gap: 16 }}>
          <MapView drivers={drivers} onDriverClick={setSelectedDriver} selectedDriver={selectedDriver} orders={orders} />
          <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, maxHeight: 540, overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>File d'attente</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{orders.filter(o => o.status !== 'Livrée').length} commandes actives</div>
              </div>
            </div>
            <AnimatePresence>
              {orders.filter(o => o.status !== 'Livrée').map(o => (
                <OrderCard key={o.id} order={o} onAction={handleAction} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {tab === 'drivers' && <DriversPanel drivers={drivers} />}
      {tab === 'zones' && <ZonesPanel />}
      {tab === 'commissions' && <CommissionsPanel />}
      {tab === 'feedback' && <FeedbackPanel />}
    </div>
  )
}
