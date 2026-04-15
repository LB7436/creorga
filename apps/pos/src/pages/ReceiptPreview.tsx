import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePOS, tableTotal } from '../store/posStore'

// ─── Props ──────────────────────────────────────────────────────────────────
interface Props {
  type: 'caisse' | 'cuisine' | 'facture'
  tableId: string
  onClose: () => void
  onPrint: () => void
}

// ─── Luxembourg drink categories (TVA 17%) ─────────────────────────────────
const DRINK_CATEGORIES = ['Boissons', 'Bières', 'Vins', 'Cocktails']

// ─── Kitchen course grouping ────────────────────────────────────────────────
const COURSE_ORDER: Record<string, number> = {
  'Boissons': 0, 'Bières': 0, 'Vins': 0, 'Cocktails': 0,
  'Cuisine': 2, 'Desserts': 3,
}
const COURSE_LABELS: Record<string, string> = {
  'Boissons': 'Apéritif / Boissons', 'Bières': 'Apéritif / Boissons',
  'Vins': 'Apéritif / Boissons', 'Cocktails': 'Apéritif / Boissons',
  'Cuisine': 'Plat principal', 'Desserts': 'Dessert',
}

// ─── Separator ──────────────────────────────────────────────────────────────
function Separator({ char = '-', style: s }: { char?: string; style?: React.CSSProperties }) {
  return (
    <div style={{ color: '#94a3b8', fontSize: 12, letterSpacing: 1, margin: '6px 0', userSelect: 'none', ...s }}>
      {char.repeat(48)}
    </div>
  )
}

// ─── ReceiptHeader ──────────────────────────────────────────────────────────
function ReceiptHeader({ type, table, ticketNumber, staffName }: {
  type: Props['type']
  table: { name: string; openedAt?: number }
  ticketNumber: string
  staffName: string
}) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('fr-LU', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('fr-LU', { hour: '2-digit', minute: '2-digit' })

  if (type === 'cuisine') {
    const orderAge = table.openedAt ? Math.floor((Date.now() - table.openedAt) / 60000) : 0
    return (
      <div style={{ textAlign: 'center', paddingBottom: 8 }}>
        <div style={{
          fontSize: 22, fontWeight: 900, letterSpacing: 2,
          color: '#0f172a', marginBottom: 4,
        }}>
          BON DE CUISINE
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
          Commande #{ticketNumber}
        </div>
        <div style={{
          fontSize: 36, fontWeight: 900, color: '#0f172a',
          padding: '12px 0', letterSpacing: 1,
        }}>
          {table.name}
        </div>
        <div style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>
          {timeStr} &mdash; {dateStr}
        </div>
        {orderAge > 10 && (
          <div style={{
            display: 'inline-block', marginTop: 6,
            padding: '4px 16px', borderRadius: 8,
            background: '#ef4444', color: '#fff',
            fontSize: 13, fontWeight: 800, letterSpacing: 1,
          }}>
            URGENT &mdash; {orderAge} min
          </div>
        )}
        <Separator />
      </div>
    )
  }

  if (type === 'facture') {
    return (
      <div style={{ paddingBottom: 16 }}>
        {/* Company header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 20, fontWeight: 800,
          }}>
            C
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
              CAFÉ UM ROND-POINT
            </div>
            <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
              12 Rue du Rond-Point, L-3760 Rumelange<br />
              Tél : +352 26 56 12 34 &bull; TVA : LU12345678
            </div>
          </div>
        </div>
        {/* Invoice title */}
        <div style={{
          background: '#f1f5f9', borderRadius: 8,
          padding: '12px 16px', marginBottom: 12,
        }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>
            FACTURE N° F-2026-{ticketNumber}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            Date : {dateStr} &bull; Serveur : {staffName} &bull; {table.name}
          </div>
        </div>
        {/* Client info */}
        <div style={{
          border: '1px solid #e2e8f0', borderRadius: 8,
          padding: '10px 14px', marginBottom: 8,
        }}>
          <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            Client
          </div>
          <div style={{ fontSize: 13, color: '#475569' }}>
            Client comptoir
          </div>
        </div>
      </div>
    )
  }

  // type === 'caisse'
  return (
    <div style={{ textAlign: 'center', paddingBottom: 4 }}>
      <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 1, color: '#0f172a' }}>
        CAFÉ UM ROND-POINT
      </div>
      <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6, marginTop: 2 }}>
        12 Rue du Rond-Point, L-3760 Rumelange<br />
        Tél : +352 26 56 12 34<br />
        TVA : LU12345678
      </div>
      <Separator />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#334155' }}>
        <span>{dateStr} {timeStr}</span>
        <span>Ticket #{ticketNumber}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#334155', marginTop: 2 }}>
        <span>Serveur : {staffName}</span>
        <span>{table.name}</span>
      </div>
      <Separator />
    </div>
  )
}

// ─── ReceiptBody ────────────────────────────────────────────────────────────
function ReceiptBody({ type, items, menu }: {
  type: Props['type']
  items: { name: string; price: number; qty: number; note: string; category: string }[]
  menu: { id: string; category: string }[]
}) {
  if (type === 'cuisine') {
    // Group items by course
    const grouped = useMemo(() => {
      const groups: Record<string, typeof items> = {}
      for (const it of items) {
        const label = COURSE_LABELS[it.category] || 'Autre'
        if (!groups[label]) groups[label] = []
        groups[label].push(it)
      }
      // Sort groups by course order
      const sorted = Object.entries(groups).sort(([a], [b]) => {
        const aOrder = Object.entries(COURSE_LABELS).find(([, v]) => v === a)?.[0]
        const bOrder = Object.entries(COURSE_LABELS).find(([, v]) => v === b)?.[0]
        return (COURSE_ORDER[aOrder || ''] ?? 99) - (COURSE_ORDER[bOrder || ''] ?? 99)
      })
      return sorted
    }, [items])

    return (
      <div>
        {grouped.map(([courseLabel, courseItems]) => (
          <div key={courseLabel} style={{ marginBottom: 12 }}>
            <div style={{
              fontSize: 14, fontWeight: 800, color: '#0f172a',
              padding: '6px 0', borderBottom: '2px solid #0f172a',
              marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1,
            }}>
              {courseLabel}
            </div>
            {courseItems.map((it, i) => (
              <div key={i} style={{ padding: '4px 0' }}>
                <div style={{
                  fontSize: 16, fontWeight: 700, color: '#1e293b',
                  display: 'flex', alignItems: 'baseline', gap: 8,
                }}>
                  <span style={{
                    fontSize: 18, fontWeight: 900,
                    minWidth: 30,
                  }}>
                    {it.qty}x
                  </span>
                  {it.name}
                </div>
                {it.note && (
                  <div style={{
                    fontSize: 13, color: '#dc2626', fontStyle: 'italic',
                    marginLeft: 38, marginTop: 2,
                  }}>
                    {it.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (type === 'facture') {
    return (
      <div>
        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 50px 80px 60px 80px',
          gap: 4, padding: '8px 0', borderBottom: '2px solid #1e293b',
          fontSize: 10, fontWeight: 800, color: '#475569',
          textTransform: 'uppercase', letterSpacing: 0.8,
        }}>
          <span>Description</span>
          <span style={{ textAlign: 'center' }}>Qté</span>
          <span style={{ textAlign: 'right' }}>Prix HT</span>
          <span style={{ textAlign: 'center' }}>TVA</span>
          <span style={{ textAlign: 'right' }}>Total TTC</span>
        </div>
        {/* Items */}
        {items.map((it, i) => {
          const isDrink = DRINK_CATEGORIES.includes(it.category)
          const tvaRate = isDrink ? 0.17 : 0.08
          const ttc = it.price * it.qty
          const ht = ttc / (1 + tvaRate)
          return (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1fr 50px 80px 60px 80px',
              gap: 4, padding: '6px 0',
              borderBottom: '1px solid #f1f5f9',
              fontSize: 12, color: '#334155',
            }}>
              <span style={{ fontWeight: 500 }}>{it.name}</span>
              <span style={{ textAlign: 'center' }}>{it.qty}</span>
              <span style={{ textAlign: 'right' }}>{ht.toFixed(2)} €</span>
              <span style={{ textAlign: 'center', fontSize: 11, color: '#64748b' }}>{isDrink ? '17%' : '8%'}</span>
              <span style={{ textAlign: 'right', fontWeight: 600 }}>{ttc.toFixed(2)} €</span>
            </div>
          )
        })}
      </div>
    )
  }

  // type === 'caisse' — receipt style
  return (
    <div>
      {items.map((it, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 13, color: '#1e293b', padding: '3px 0',
          fontFamily: "'Courier New', Courier, monospace",
        }}>
          <span>
            {it.qty} x {it.name}
          </span>
          <span style={{ fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>
            {(it.price * it.qty).toFixed(2)}
          </span>
        </div>
      ))}
      {items.length > 0 && <Separator />}
    </div>
  )
}

// ─── ReceiptFooter ──────────────────────────────────────────────────────────
function ReceiptFooter({ type, items }: {
  type: Props['type']
  items: { name: string; price: number; qty: number; category: string }[]
}) {
  // Compute totals
  const { totalTTC, totalHTFood, totalHTDrinks, tvaFood, tvaDrinks } = useMemo(() => {
    let foodTTC = 0
    let drinkTTC = 0
    for (const it of items) {
      const line = it.price * it.qty
      if (DRINK_CATEGORIES.includes(it.category)) {
        drinkTTC += line
      } else {
        foodTTC += line
      }
    }
    const htFood = foodTTC / 1.08
    const htDrinks = drinkTTC / 1.17
    const tFood = foodTTC - htFood
    const tDrinks = drinkTTC - htDrinks
    return {
      totalTTC: foodTTC + drinkTTC,
      totalHTFood: htFood,
      totalHTDrinks: htDrinks,
      tvaFood: tFood,
      tvaDrinks: tDrinks,
    }
  }, [items])

  const totalHT = totalHTFood + totalHTDrinks

  if (type === 'cuisine') {
    return (
      <div style={{ textAlign: 'center', paddingTop: 12 }}>
        <Separator />
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
          Imprimé à {new Date().toLocaleTimeString('fr-LU', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    )
  }

  if (type === 'facture') {
    const echeance = new Date()
    echeance.setDate(echeance.getDate() + 30)
    const echeanceStr = echeance.toLocaleDateString('fr-LU', { day: '2-digit', month: '2-digit', year: 'numeric' })
    return (
      <div style={{ paddingTop: 16 }}>
        {/* Totals box */}
        <div style={{
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
          padding: '12px 16px', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475569', marginBottom: 4 }}>
            <span>Total HT</span>
            <span>{totalHT.toFixed(2)} €</span>
          </div>
          {tvaFood > 0.001 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475569', marginBottom: 4 }}>
              <span>TVA 8% (alimentation)</span>
              <span>{tvaFood.toFixed(2)} €</span>
            </div>
          )}
          {tvaDrinks > 0.001 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475569', marginBottom: 4 }}>
              <span>TVA 17% (boissons)</span>
              <span>{tvaDrinks.toFixed(2)} €</span>
            </div>
          )}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 18, fontWeight: 800, color: '#0f172a',
            borderTop: '2px solid #1e293b', paddingTop: 8, marginTop: 6,
          }}>
            <span>TOTAL TTC</span>
            <span>{totalTTC.toFixed(2)} €</span>
          </div>
        </div>
        {/* Payment info */}
        <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.8, marginBottom: 12 }}>
          <div><strong>Mode de paiement :</strong> Sur place</div>
          <div><strong>Date d'échéance :</strong> {echeanceStr}</div>
        </div>
        {/* Legal */}
        <div style={{
          fontSize: 9, color: '#94a3b8', lineHeight: 1.5,
          borderTop: '1px solid #e2e8f0', paddingTop: 10,
        }}>
          Café um Rond-Point S.à r.l. &bull; R.C.S. Luxembourg B123456 &bull; TVA LU12345678<br />
          12 Rue du Rond-Point, L-3760 Rumelange &bull; Tél : +352 26 56 12 34
        </div>
      </div>
    )
  }

  // type === 'caisse'
  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 12, color: '#475569', marginBottom: 2,
        fontFamily: "'Courier New', Courier, monospace",
      }}>
        <span>Sous-total HT</span>
        <span>{totalHT.toFixed(2)}</span>
      </div>
      {tvaFood > 0.001 && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 12, color: '#475569', marginBottom: 2,
          fontFamily: "'Courier New', Courier, monospace",
        }}>
          <span>TVA 8% (alim.)</span>
          <span>{tvaFood.toFixed(2)}</span>
        </div>
      )}
      {tvaDrinks > 0.001 && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 12, color: '#475569', marginBottom: 2,
          fontFamily: "'Courier New', Courier, monospace",
        }}>
          <span>TVA 17% (boiss.)</span>
          <span>{tvaDrinks.toFixed(2)}</span>
        </div>
      )}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 20, fontWeight: 900, color: '#0f172a',
        padding: '8px 0', margin: '4px 0',
        borderTop: '2px solid #0f172a',
        borderBottom: '2px solid #0f172a',
        fontFamily: "'Courier New', Courier, monospace",
      }}>
        <span>TOTAL TTC</span>
        <span>{totalTTC.toFixed(2)} €</span>
      </div>
      <div style={{
        fontSize: 12, color: '#475569', textAlign: 'center',
        margin: '6px 0 2px',
        fontFamily: "'Courier New', Courier, monospace",
      }}>
        Paiement : Carte
      </div>
      <Separator />
      <div style={{
        textAlign: 'center', fontSize: 14, color: '#334155',
        fontWeight: 600, margin: '8px 0 4px',
      }}>
        Merci de votre visite !
      </div>
      <div style={{
        textAlign: 'center', fontSize: 10, color: '#cbd5e1',
        marginTop: 2,
      }}>
        Powered by Creorga
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function ReceiptPreview({ type, tableId, onClose, onPrint }: Props) {
  const table = usePOS(s => s.tables.find(t => t.id === tableId))
  const menu = usePOS(s => s.menu)
  const currentStaff = usePOS(s => s.currentStaff)
  const settings = usePOS(s => s.settings)
  const [emailSent, setEmailSent] = useState(false)

  if (!table) return null

  // Flatten all items with category info
  const allItems = useMemo(() => {
    const flat: { name: string; price: number; qty: number; note: string; category: string }[] = []
    for (const cover of table.covers) {
      for (const item of cover.items) {
        const menuItem = menu.find(m => m.id === item.menuItemId)
        const category = menuItem?.category || 'Cuisine'
        // Merge same items
        const existing = flat.find(f => f.name === item.name && f.note === item.note)
        if (existing) {
          existing.qty += item.qty
        } else {
          flat.push({
            name: item.name,
            price: item.price,
            qty: item.qty,
            note: item.note,
            category,
          })
        }
      }
    }
    return flat
  }, [table, menu])

  const ticketNumber = String(Math.floor(Math.random() * 900) + 100).padStart(4, '0')
  const staffName = currentStaff?.name || 'Admin'
  const isInvoice = type === 'facture'
  const receiptWidth = isInvoice ? 600 : 320

  function handleEmail() {
    setEmailSent(true)
    setTimeout(() => setEmailSent(false), 2500)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: receiptWidth,
            maxHeight: '90vh',
            display: 'flex', flexDirection: 'column',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
          }}
        >
          {/* Receipt paper */}
          <div style={{
            flex: 1, overflow: 'auto',
            background: '#ffffff',
            backgroundImage: type !== 'facture'
              ? 'repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(0,0,0,0.015) 28px)'
              : 'none',
            padding: isInvoice ? '28px 32px' : '20px 16px',
            fontFamily: type === 'facture'
              ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
              : "'Courier New', Courier, monospace",
          }}>
            <ReceiptHeader
              type={type}
              table={{ name: table.name, openedAt: table.openedAt }}
              ticketNumber={ticketNumber}
              staffName={staffName}
            />
            <ReceiptBody
              type={type}
              items={allItems}
              menu={menu.map(m => ({ id: m.id, category: m.category }))}
            />
            <ReceiptFooter
              type={type}
              items={allItems}
            />
          </div>

          {/* Action bar */}
          <div style={{
            padding: '12px 16px',
            background: '#0f172a',
            display: 'flex', gap: 8,
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onPrint}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
              }}
            >
              🖨️ Imprimer
            </motion.button>
            {type !== 'cuisine' && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleEmail}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  border: '1px solid rgba(99,102,241,0.3)',
                  background: emailSent ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.08)',
                  color: emailSent ? '#10b981' : '#818cf8',
                  fontSize: 13, fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all .2s',
                }}
              >
                {emailSent ? '✓ Envoyé' : '✉️ Envoyer par email'}
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              style={{
                padding: '10px 18px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: '#94a3b8', fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Fermer
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
