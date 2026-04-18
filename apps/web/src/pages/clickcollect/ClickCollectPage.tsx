import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type OrderStatus = 'Reçue' | 'En préparation' | 'Prête'
type TabId = 'queue' | 'slots' | 'lockers' | 'sms' | 'scheduled' | 'station'

interface CCOrder {
  id: string
  client: string
  phone: string
  items: number
  total: number
  heurePrevue: string
  status: OrderStatus
  elapsedSec: number
  lockerCode?: string
  lockerNum?: number
  itemsList: string[]
  scheduled?: boolean
  recurrent?: boolean
}

interface Slot {
  time: string
  max: number
  booked: number
  type: 'Petit-déjeuner' | 'Déjeuner' | 'Goûter' | 'Dîner'
}

const INITIAL_ORDERS: CCOrder[] = [
  { id: 'cc1', client: 'Emma Lefèvre', phone: '+352 691 111 222', items: 3, total: 24.50, heurePrevue: '12:30', status: 'Reçue', elapsedSec: 120, itemsList: ['Salade César', 'Pâtes carbonara', 'Tiramisu'] },
  { id: 'cc2', client: 'Nicolas Meyer', phone: '+352 691 222 333', items: 2, total: 18.00, heurePrevue: '12:45', status: 'Reçue', elapsedSec: 45, itemsList: ['Burger classic', 'Frites'] },
  { id: 'cc3', client: 'Léa Bertrand', phone: '+352 691 333 444', items: 4, total: 42.80, heurePrevue: '13:00', status: 'En préparation', elapsedSec: 380, itemsList: ['Pizza margherita', 'Pizza 4 fromages', 'Tiramisu x2'], scheduled: true },
  { id: 'cc4', client: 'Yann Dubois', phone: '+352 691 444 555', items: 1, total: 12.50, heurePrevue: '12:40', status: 'En préparation', elapsedSec: 540, itemsList: ['Plat du jour'] },
  { id: 'cc5', client: 'Camille Roux', phone: '+352 691 555 666', items: 2, total: 22.00, heurePrevue: '12:35', status: 'En préparation', elapsedSec: 640, itemsList: ['Salade', 'Wrap poulet'], recurrent: true },
  { id: 'cc6', client: 'Fabien Klein', phone: '+352 691 666 777', items: 3, total: 31.50, heurePrevue: '12:30', status: 'En préparation', elapsedSec: 720, itemsList: ['Entrée', 'Plat', 'Dessert'] },
  { id: 'cc7', client: 'Olivia Wagner', phone: '+352 691 777 888', items: 2, total: 19.80, heurePrevue: '12:20', status: 'Prête', elapsedSec: 820, lockerNum: 4, lockerCode: '4872', itemsList: ['Sandwich', 'Smoothie'] },
  { id: 'cc8', client: 'Grégoire Schmit', phone: '+352 691 888 999', items: 3, total: 27.40, heurePrevue: '12:15', status: 'Prête', elapsedSec: 920, lockerNum: 2, lockerCode: '1945', itemsList: ['Poke bowl', 'Dessert', 'Boisson'] },
  { id: 'cc9', client: 'Hélène Martin', phone: '+352 691 999 000', items: 1, total: 9.50, heurePrevue: '12:25', status: 'Prête', elapsedSec: 1020, lockerNum: 1, lockerCode: '7324', itemsList: ['Plat veggie'] },
  { id: 'cc10', client: 'Théo Becker', phone: '+352 691 000 111', items: 2, total: 16.00, heurePrevue: '12:18', status: 'Prête', elapsedSec: 1150, lockerNum: 6, lockerCode: '2901', itemsList: ['Burger veggie', 'Frites douces'] },
]

const SLOTS: Slot[] = [
  { time: '08:00-09:00', max: 8, booked: 3, type: 'Petit-déjeuner' },
  { time: '09:00-10:00', max: 8, booked: 5, type: 'Petit-déjeuner' },
  { time: '11:30-12:00', max: 12, booked: 12, type: 'Déjeuner' },
  { time: '12:00-12:30', max: 15, booked: 14, type: 'Déjeuner' },
  { time: '12:30-13:00', max: 15, booked: 11, type: 'Déjeuner' },
  { time: '13:00-13:30', max: 12, booked: 4, type: 'Déjeuner' },
  { time: '15:00-16:00', max: 6, booked: 2, type: 'Goûter' },
  { time: '16:00-17:00', max: 6, booked: 1, type: 'Goûter' },
  { time: '18:30-19:00', max: 10, booked: 6, type: 'Dîner' },
  { time: '19:00-19:30', max: 12, booked: 9, type: 'Dîner' },
  { time: '19:30-20:00', max: 12, booked: 7, type: 'Dîner' },
  { time: '20:00-20:30', max: 10, booked: 3, type: 'Dîner' },
]

const SLOT_COLORS: Record<Slot['type'], { bg: string; fg: string }> = {
  'Petit-déjeuner': { bg: '#fef3c7', fg: '#92400e' },
  'Déjeuner': { bg: '#dbeafe', fg: '#1e40af' },
  'Goûter': { bg: '#fce7f3', fg: '#9f1239' },
  'Dîner': { bg: '#ede9fe', fg: '#5b21b6' },
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function timerColor(s: number) {
  if (s > 900) return '#dc2626'
  if (s > 600) return '#ea580c'
  return '#0d9488'
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18, flex: 1 }}
    >
      <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{sub}</div>}
    </motion.div>
  )
}

function OrderCard({ order, onAdvance }: { order: CCOrder; onAdvance: (id: string) => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ y: -2 }}
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        padding: 14,
        marginBottom: 10,
        position: 'relative',
      }}
    >
      {order.recurrent && (
        <div style={{ position: 'absolute', top: 8, right: 8, padding: '2px 6px', background: '#fef3c7', color: '#92400e', fontSize: 9, fontWeight: 700, borderRadius: 4 }}>
          HABITUÉ
        </div>
      )}
      {order.scheduled && (
        <div style={{ position: 'absolute', top: 8, right: 8, padding: '2px 6px', background: '#dbeafe', color: '#1e40af', fontSize: 9, fontWeight: 700, borderRadius: 4 }}>
          PROGRAMMÉE
        </div>
      )}
      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>{order.client}</div>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>{order.phone}</div>
      <div style={{ fontSize: 11, color: '#374151', marginBottom: 8, lineHeight: 1.4 }}>
        {order.itemsList.slice(0, 2).join(', ')}{order.itemsList.length > 2 && ` +${order.itemsList.length - 2}`}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0d9488' }}>{order.total.toFixed(2)}€</span>
          <span style={{ fontSize: 11, color: '#6b7280' }}>{order.items} art.</span>
        </div>
        <div style={{ fontSize: 11, color: timerColor(order.elapsedSec), fontWeight: 600 }}>
          ⏱ {formatTime(order.elapsedSec)}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, background: '#f9fafb', borderRadius: 6, marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: '#6b7280' }}>Heure prévue</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{order.heurePrevue}</div>
      </div>
      {order.status === 'Prête' && order.lockerNum && (
        <div style={{ padding: 8, background: '#ccfbf1', borderRadius: 6, marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: '#0f766e', fontWeight: 600 }}>Casier #{order.lockerNum} · Code {order.lockerCode}</div>
        </div>
      )}
      {order.status !== 'Prête' && (
        <button
          onClick={() => onAdvance(order.id)}
          style={{
            width: '100%', padding: 8,
            background: order.status === 'Reçue' ? '#dbeafe' : '#ccfbf1',
            color: order.status === 'Reçue' ? '#1e40af' : '#0f766e',
            border: 'none', borderRadius: 6,
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {order.status === 'Reçue' ? 'Démarrer préparation' : 'Marquer prête (SMS auto)'}
        </button>
      )}
      {order.status === 'Prête' && (
        <button
          onClick={() => onAdvance(order.id)}
          style={{
            width: '100%', padding: 8,
            background: '#0d9488', color: '#ffffff',
            border: 'none', borderRadius: 6,
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Remise au client
        </button>
      )}
    </motion.div>
  )
}

function Column({ title, color, orders, onAdvance }: { title: string; color: string; orders: CCOrder[]; onAdvance: (id: string) => void }) {
  return (
    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, minHeight: 400 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: `2px solid ${color}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{title}</div>
        <div style={{
          padding: '2px 8px', background: color, color: '#ffffff',
          fontSize: 11, fontWeight: 700, borderRadius: 10,
        }}>{orders.length}</div>
      </div>
      <AnimatePresence>
        {orders.map(o => <OrderCard key={o.id} order={o} onAdvance={onAdvance} />)}
      </AnimatePresence>
    </div>
  )
}

function SlotsPanel() {
  const grouped = SLOTS.reduce((acc, s) => {
    if (!acc[s.type]) acc[s.type] = []
    acc[s.type].push(s)
    return acc
  }, {} as Record<string, Slot[]>)

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {Object.entries(grouped).map(([type, slots]) => {
        const colors = SLOT_COLORS[type as Slot['type']]
        return (
          <div key={type} style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ padding: '4px 10px', background: colors.bg, color: colors.fg, fontSize: 12, fontWeight: 700, borderRadius: 6 }}>{type}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{slots.reduce((a, s) => a + s.booked, 0)} / {slots.reduce((a, s) => a + s.max, 0)} places réservées</div>
              </div>
              <button style={{ padding: '6px 12px', background: '#0d9488', color: '#ffffff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>+ Nouveau créneau</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
              {slots.map(s => {
                const pct = (s.booked / s.max) * 100
                const full = s.booked >= s.max
                return (
                  <motion.div
                    key={s.time}
                    whileHover={{ scale: 1.02 }}
                    style={{
                      padding: 12,
                      background: full ? '#fee2e2' : '#f9fafb',
                      border: `1px solid ${full ? '#fecaca' : '#e5e7eb'}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 6 }}>{s.time}</div>
                    <div style={{ fontSize: 11, color: full ? '#991b1b' : '#6b7280', marginBottom: 6 }}>
                      {s.booked}/{s.max} {full ? '· COMPLET' : ''}
                    </div>
                    <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: full ? '#dc2626' : '#0d9488' }} />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LockersPanel() {
  const lockers = [
    { num: 1, status: 'occupied', order: 'Hélène Martin', code: '7324', since: '5 min' },
    { num: 2, status: 'occupied', order: 'Grégoire Schmit', code: '1945', since: '15 min' },
    { num: 3, status: 'free' },
    { num: 4, status: 'occupied', order: 'Olivia Wagner', code: '4872', since: '13 min' },
    { num: 5, status: 'free' },
    { num: 6, status: 'occupied', order: 'Théo Becker', code: '2901', since: '19 min' },
    { num: 7, status: 'free' },
    { num: 8, status: 'free' },
    { num: 9, status: 'maintenance' },
    { num: 10, status: 'free' },
    { num: 11, status: 'free' },
    { num: 12, status: 'free' },
  ]

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        <Stat label="Casiers disponibles" value="7 / 12" color="#0d9488" />
        <Stat label="En cours d'utilisation" value="4" color="#ea580c" />
        <Stat label="Maintenance" value="1" color="#6b7280" />
      </div>
      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 14 }}>Casiers self-service</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {lockers.map(l => {
            const bg = l.status === 'occupied' ? '#ccfbf1' : l.status === 'maintenance' ? '#f3f4f6' : '#ffffff'
            const border = l.status === 'occupied' ? '#5eead4' : l.status === 'maintenance' ? '#9ca3af' : '#e5e7eb'
            return (
              <motion.div
                key={l.num}
                whileHover={{ scale: 1.03 }}
                style={{
                  padding: 14,
                  background: bg,
                  border: `2px solid ${border}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  minHeight: 110,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>#{l.num}</div>
                  <div style={{ fontSize: 16 }}>
                    {l.status === 'occupied' ? '🔒' : l.status === 'maintenance' ? '🔧' : '🔓'}
                  </div>
                </div>
                {l.status === 'occupied' ? (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#0f766e', marginBottom: 2 }}>{l.order}</div>
                    <div style={{ fontSize: 10, color: '#0d9488' }}>Code {l.code}</div>
                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>Depuis {l.since}</div>
                  </div>
                ) : l.status === 'maintenance' ? (
                  <div style={{ fontSize: 11, color: '#6b7280' }}>Hors service</div>
                ) : (
                  <div style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>Disponible</div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SmsPanel() {
  const templates = [
    { title: 'Commande reçue', message: 'Bonjour {nom}, nous avons bien reçu votre commande #{numero}. Elle sera prête à {heure}. Merci !', active: true },
    { title: 'En préparation', message: 'Votre commande #{numero} est en préparation. Prête dans environ 15 min.', active: true },
    { title: 'Commande prête', message: 'Votre commande #{numero} est prête ! Casier #{locker} · Code {code}. À bientôt.', active: true },
    { title: 'Rappel retrait', message: 'Rappel : votre commande vous attend dans le casier #{locker}. Code {code}.', active: true },
    { title: 'Merci & avis', message: 'Merci pour votre visite ! Donnez-nous votre avis : {lien}', active: true },
    { title: 'Annulation', message: 'Votre commande #{numero} a été annulée. Remboursement sous 3-5 jours.', active: false },
  ]

  const history = [
    { time: '12:45', to: 'Olivia Wagner', template: 'Commande prête', status: 'Délivré' },
    { time: '12:42', to: 'Grégoire Schmit', template: 'Commande prête', status: 'Délivré' },
    { time: '12:38', to: 'Camille Roux', template: 'En préparation', status: 'Délivré' },
    { time: '12:30', to: 'Yann Dubois', template: 'En préparation', status: 'Délivré' },
    { time: '12:28', to: 'Nicolas Meyer', template: 'Commande reçue', status: 'Délivré' },
    { time: '12:15', to: 'Emma Lefèvre', template: 'Commande reçue', status: 'Délivré' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 14 }}>Templates SMS automatiques</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {templates.map((t, i) => (
            <div key={i} style={{ padding: 12, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{t.title}</div>
                <div style={{
                  width: 36, height: 20, borderRadius: 10,
                  background: t.active ? '#0d9488' : '#d1d5db',
                  position: 'relative', cursor: 'pointer',
                }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', background: '#ffffff',
                    position: 'absolute', top: 2, left: t.active ? 18 : 2,
                  }} />
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>{t.message}</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18, marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 14 }}>Statistiques SMS</div>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#6b7280' }}>Envoyés aujourd'hui</span><b>42</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#6b7280' }}>Taux de délivrance</span><b style={{ color: '#059669' }}>98.8%</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#6b7280' }}>Coût du jour</span><b>2.52€</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#6b7280' }}>Crédit restant</span><b style={{ color: '#0d9488' }}>847 SMS</b>
            </div>
          </div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 14 }}>Historique récent</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {history.map((h, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, background: '#f9fafb', borderRadius: 6, fontSize: 11 }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#111827' }}>{h.to}</div>
                  <div style={{ color: '#6b7280' }}>{h.template}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#111827' }}>{h.time}</div>
                  <div style={{ color: '#059669', fontWeight: 600 }}>{h.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ScheduledPanel() {
  const scheduled = [
    { client: 'Léa Bertrand', date: 'Aujourd\'hui', time: '13:00', items: 4, total: 42.80, note: 'Sans oignons' },
    { client: 'Pierre Klein', date: 'Demain', time: '12:30', items: 2, total: 18.50, note: '' },
    { client: 'Marie D. (habituée)', date: 'Demain', time: '12:15', items: 3, total: 24.00, note: 'Commande habituelle' },
    { client: 'Société ABC', date: 'Vendredi', time: '12:00', items: 12, total: 156.00, note: 'Réunion équipe' },
    { client: 'Jean Meyer', date: 'Samedi', time: '19:30', items: 4, total: 58.40, note: 'Anniversaire' },
    { client: 'Cabinet Legal', date: 'Lundi', time: '13:15', items: 8, total: 98.00, note: 'Plateau repas' },
  ]

  const recurrents = [
    { client: 'Marie Dupont', frequency: 'Tous les mardis 12:15', lastOrder: 'Il y a 7j', avgTotal: 24 },
    { client: 'Café Central', frequency: 'Chaque matin 08:30', lastOrder: 'Aujourd\'hui', avgTotal: 45 },
    { client: 'Paul Schmitt', frequency: 'Vendredi soir 19:00', lastOrder: 'Il y a 3j', avgTotal: 32 },
  ]

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Commandes programmées</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Réservation à l'avance jusqu'à 7 jours</div>
          </div>
          <button style={{ padding: '8px 14px', background: '#0d9488', color: '#ffffff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Nouvelle commande</button>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {scheduled.map((s, i) => (
            <motion.div
              key={i}
              whileHover={{ x: 2 }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 12, background: '#f9fafb', borderRadius: 8 }}
            >
              <div style={{ width: 60, textAlign: 'center', padding: '6px 0', background: '#ccfbf1', borderRadius: 6 }}>
                <div style={{ fontSize: 10, color: '#0f766e', fontWeight: 600 }}>{s.date}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0d9488' }}>{s.time}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{s.client}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>
                  {s.items} article(s){s.note && ` · ${s.note}`}
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0d9488' }}>{s.total.toFixed(2)}€</div>
            </motion.div>
          ))}
        </div>
      </div>
      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 14 }}>Commandes récurrentes (habitués)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {recurrents.map((r, i) => (
            <div key={i} style={{ padding: 14, background: '#fef3c7', borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 4 }}>{r.client}</div>
              <div style={{ fontSize: 11, color: '#92400e', marginBottom: 8 }}>{r.frequency}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: '#6b7280' }}>Dernière : {r.lastOrder}</span>
                <b style={{ color: '#111827' }}>~{r.avgTotal}€</b>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StationPanel() {
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const currentOrder = {
    numero: 'CC-1287',
    client: 'Nicolas Meyer',
    items: [
      { name: 'Burger classic', note: 'Sans cornichons', qty: 1 },
      { name: 'Frites maison', note: 'Grande', qty: 1 },
      { name: 'Coca-Cola 33cl', note: '', qty: 1 },
    ],
  }
  const packagingChecklist = [
    'Vérifier tous les articles',
    'Emballer dans sac isotherme',
    'Ajouter couverts & serviettes',
    'Joindre ticket de commande',
    'Ajouter sauces si demandé',
    'Coller étiquette nom client',
    'Placer dans casier & envoyer SMS',
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4 }}>Station d'emballage</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>Commande en cours : {currentOrder.numero}</div>
        <div style={{ padding: 14, background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 8, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f766e', marginBottom: 10 }}>Client : {currentOrder.client}</div>
          {currentOrder.items.map((it, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: i > 0 ? '1px solid #ccfbf1' : 'none' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{it.qty}x {it.name}</div>
                {it.note && <div style={{ fontSize: 10, color: '#dc2626' }}>⚠ {it.note}</div>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 10 }}>Checklist préparation</div>
        <div style={{ display: 'grid', gap: 6 }}>
          {packagingChecklist.map((step, i) => (
            <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: checks[step] ? '#d1fae5' : '#f9fafb', borderRadius: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!checks[step]}
                onChange={e => setChecks(prev => ({ ...prev, [step]: e.target.checked }))}
                style={{ width: 16, height: 16 }}
              />
              <span style={{ fontSize: 12, color: checks[step] ? '#065f46' : '#374151', textDecoration: checks[step] ? 'line-through' : 'none' }}>{step}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18, marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 10 }}>QR Check-in client</div>
          <div style={{
            padding: 20, background: '#f9fafb', borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{
              width: 80, height: 80, background: '#111827', borderRadius: 8,
              display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: 6, gap: 1,
            }}>
              {Array.from({ length: 49 }).map((_, i) => (
                <div key={i} style={{ background: Math.random() > 0.45 ? '#ffffff' : 'transparent', borderRadius: 1 }} />
              ))}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 4 }}>Scan à l'arrivée</div>
              <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>Le client scanne le QR au comptoir. Le staff reçoit une notification instantanée pour préparer la remise.</div>
            </div>
          </div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 10 }}>Plan de retrait</div>
          <svg viewBox="0 0 400 200" style={{ width: '100%', height: 180, background: '#f9fafb', borderRadius: 8 }}>
            <rect x="20" y="20" width="360" height="30" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1" />
            <text x="200" y="40" fontSize="11" fill="#92400e" textAnchor="middle" fontWeight="600">Restaurant</text>

            <rect x="20" y="70" width="150" height="110" fill="#ccfbf1" stroke="#0d9488" strokeWidth="1" />
            <text x="95" y="115" fontSize="11" fill="#0f766e" textAnchor="middle" fontWeight="700">Casiers</text>
            <text x="95" y="130" fontSize="10" fill="#0f766e" textAnchor="middle">Self-service</text>

            <rect x="190" y="70" width="190" height="110" fill="#dbeafe" stroke="#2563eb" strokeWidth="1" strokeDasharray="4 4" />
            <text x="285" y="115" fontSize="11" fill="#1e40af" textAnchor="middle" fontWeight="700">Zone parking</text>
            <text x="285" y="130" fontSize="10" fill="#1e40af" textAnchor="middle">Drive 5 min max</text>

            <circle cx="95" cy="95" r="6" fill="#ea580c" />
            <text x="95" y="68" fontSize="9" fill="#ea580c" textAnchor="middle" fontWeight="600">Entrée</text>
          </svg>
        </div>
      </div>
    </div>
  )
}

export default function ClickCollectPage() {
  const [orders, setOrders] = useState<CCOrder[]>(INITIAL_ORDERS)
  const [tab, setTab] = useState<TabId>('queue')

  useEffect(() => {
    const i = setInterval(() => {
      setOrders(prev => prev.map(o => ({ ...o, elapsedSec: o.elapsedSec + 1 })))
    }, 1000)
    return () => clearInterval(i)
  }, [])

  const handleAdvance = (id: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== id) return o
      if (o.status === 'Reçue') return { ...o, status: 'En préparation' }
      if (o.status === 'En préparation') {
        const lockerNum = Math.floor(Math.random() * 12) + 1
        const lockerCode = Math.floor(1000 + Math.random() * 9000).toString()
        return { ...o, status: 'Prête', lockerNum, lockerCode }
      }
      return o
    }).filter(o => !(o.id === id && o.status === 'Prête')))
  }

  const received = orders.filter(o => o.status === 'Reçue')
  const preparing = orders.filter(o => o.status === 'En préparation')
  const ready = orders.filter(o => o.status === 'Prête')

  const tabs: { id: TabId; label: string }[] = [
    { id: 'queue', label: 'File de commandes' },
    { id: 'slots', label: 'Créneaux' },
    { id: 'lockers', label: 'Casiers' },
    { id: 'sms', label: 'SMS automatiques' },
    { id: 'scheduled', label: 'Programmées' },
    { id: 'station', label: 'Station d\'emballage' },
  ]

  return (
    <div style={{ padding: 24, background: '#f9fafb', minHeight: '100vh' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#ccfbf1', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🛍️</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>Click & Collect / Drive</h1>
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Commandes à emporter, casiers self-service et retrait programmé</p>
      </motion.div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
        <Stat label="Commandes aujourd'hui" value="18" sub="+12% vs hier" color="#0d9488" />
        <Stat label="Prêtes à retirer" value="4" sub="Attente client" color="#ea580c" />
        <Stat label="En préparation" value="6" sub="Temps moyen 12 min" color="#2563eb" />
        <Stat label="CA jour" value="234€" sub="Ticket moyen 13€" color="#059669" />
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #e5e7eb', overflowX: 'auto' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid #0d9488' : '2px solid transparent',
              color: tab === t.id ? '#0d9488' : '#6b7280',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'queue' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          <Column title="Reçues" color="#f59e0b" orders={received} onAdvance={handleAdvance} />
          <Column title="En préparation" color="#2563eb" orders={preparing} onAdvance={handleAdvance} />
          <Column title="Prêtes" color="#0d9488" orders={ready} onAdvance={handleAdvance} />
        </div>
      )}
      {tab === 'slots' && <SlotsPanel />}
      {tab === 'lockers' && <LockersPanel />}
      {tab === 'sms' && <SmsPanel />}
      {tab === 'scheduled' && <ScheduledPanel />}
      {tab === 'station' && <StationPanel />}
    </div>
  )
}
