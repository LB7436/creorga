import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePOS } from '../store/posStore'

// ─── Props ──────────────────────────────────────────────────────────────────
interface Props {
  type: 'caisse' | 'cuisine' | 'facture'
  tableId: string
  onClose: () => void
  onPrint: () => void
}

type ExportFormat = 'pdf' | 'png' | 'thermal'
type PaperFormat = '58mm' | '80mm' | 'a4'
type Lang = 'FR' | 'DE' | 'EN' | 'PT'
type TemplateId = 'classique' | 'moderne' | 'minimaliste' | 'luxembourg' | 'fete'

const DRINK_CATEGORIES = ['Boissons', 'Bières', 'Vins', 'Cocktails']

const TEMPLATES: { id: TemplateId; name: string; accent: string; emoji: string }[] = [
  { id: 'classique',    name: 'Classique',    accent: '#6366f1', emoji: '📜' },
  { id: 'moderne',      name: 'Moderne',      accent: '#10b981', emoji: '✨' },
  { id: 'minimaliste',  name: 'Minimaliste',  accent: '#64748b', emoji: '◽' },
  { id: 'luxembourg',   name: 'Luxembourg',   accent: '#ef4444', emoji: '🇱🇺' },
  { id: 'fete',         name: 'Fête',         accent: '#f59e0b', emoji: '🎉' },
]

const I18N: Record<Lang, Record<string, string>> = {
  FR: { thanks: 'Merci de votre visite !', total: 'TOTAL TTC', subtotal: 'Sous-total HT', payment: 'Paiement', ticket: 'Ticket', server: 'Serveur', date: 'Date', table: 'Table', review: 'Laissez-nous un avis' },
  DE: { thanks: 'Vielen Dank für Ihren Besuch!', total: 'GESAMT', subtotal: 'Zwischensumme', payment: 'Zahlung', ticket: 'Beleg', server: 'Kellner', date: 'Datum', table: 'Tisch', review: 'Bewerten Sie uns' },
  EN: { thanks: 'Thank you for your visit!', total: 'TOTAL', subtotal: 'Subtotal', payment: 'Payment', ticket: 'Receipt', server: 'Server', date: 'Date', table: 'Table', review: 'Leave us a review' },
  PT: { thanks: 'Obrigado pela sua visita!', total: 'TOTAL', subtotal: 'Subtotal', payment: 'Pagamento', ticket: 'Recibo', server: 'Servidor', date: 'Data', table: 'Mesa', review: 'Deixe uma avaliação' },
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function ReceiptPreview({ type, tableId, onClose, onPrint }: Props) {
  const table = usePOS(s => s.tables.find(t => t.id === tableId))
  const menu = usePOS(s => s.menu)
  const currentStaff = usePOS(s => s.currentStaff)
  const settings = usePOS(s => s.settings)

  const [emailSent, setEmailSent] = useState(false)
  const [smsSent, setSmsSent] = useState(false)
  const [format, setFormat] = useState<ExportFormat>('thermal')
  const [paper, setPaper] = useState<PaperFormat>('80mm')
  const [lang, setLang] = useState<Lang>('FR')
  const [template, setTemplate] = useState<TemplateId>('classique')
  const [copies, setCopies] = useState(1)
  const [emailSubject, setEmailSubject] = useState('Votre reçu — Café um Rond-Point')
  const [emailAddress, setEmailAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [showQR, setShowQR] = useState(true)
  const [qrTarget, setQrTarget] = useState<'google' | 'tripadvisor'>('google')
  const [hasSignature, setHasSignature] = useState(false)
  const [footerNote, setFooterNote] = useState('Merci de votre visite !')
  const [tab, setTab] = useState<'preview' | 'send' | 'template'>('preview')

  if (!table) return null

  const allItems = useMemo(() => {
    const flat: { name: string; price: number; qty: number; note: string; category: string }[] = []
    for (const cover of table.covers) {
      for (const item of cover.items) {
        const menuItem = menu.find(m => m.id === item.menuItemId)
        const category = menuItem?.category || 'Cuisine'
        const existing = flat.find(f => f.name === item.name && f.note === item.note)
        if (existing) {
          existing.qty += item.qty
        } else {
          flat.push({ name: item.name, price: item.price, qty: item.qty, note: item.note, category })
        }
      }
    }
    return flat
  }, [table, menu])

  const totals = useMemo(() => {
    let food = 0, drink = 0
    allItems.forEach(it => {
      const line = it.price * it.qty
      if (DRINK_CATEGORIES.includes(it.category)) drink += line
      else food += line
    })
    const htFood = food / 1.08, htDrink = drink / 1.17
    return {
      ttc: food + drink,
      htFood, htDrink,
      ht: htFood + htDrink,
      tvaFood: food - htFood,
      tvaDrink: drink - htDrink,
    }
  }, [allItems])

  const ticketNumber = String(Math.floor(Math.random() * 900) + 100).padStart(4, '0')
  const staffName = currentStaff?.name || 'Admin'
  const t = I18N[lang]
  const activeTemplate = TEMPLATES.find(x => x.id === template)!
  const paperWidth = paper === '58mm' ? 220 : paper === '80mm' ? 320 : 560

  const now = new Date()
  const dateStr = now.toLocaleDateString('fr-LU')
  const timeStr = now.toLocaleTimeString('fr-LU', { hour: '2-digit', minute: '2-digit' })

  function handleEmail() {
    setEmailSent(true)
    setTimeout(() => setEmailSent(false), 2500)
  }
  function handleSMS() {
    setSmsSent(true)
    setTimeout(() => setSmsSent(false), 2500)
  }

  // ── Render receipt content ───────────────────────────────────────────────
  function renderReceipt() {
    const bgColor = template === 'minimaliste' ? '#ffffff' : '#fefefe'
    const isCompact = paper === '58mm'
    const fs = isCompact ? 10 : 12

    return (
      <div style={{
        background: bgColor,
        color: '#111',
        padding: paper === 'a4' ? '32px 40px' : isCompact ? '14px 10px' : '20px 16px',
        fontFamily: type === 'facture' ? "-apple-system, 'Segoe UI', sans-serif" : "'Courier New', monospace",
        minHeight: 200,
        position: 'relative',
      }}>
        {/* Header band for template */}
        {template !== 'minimaliste' && (
          <div style={{
            height: 4, background: activeTemplate.accent,
            marginBottom: 12, borderRadius: 2,
          }} />
        )}

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <div style={{
            fontSize: isCompact ? 14 : 16, fontWeight: 900,
            letterSpacing: 1, color: activeTemplate.accent,
          }}>
            {activeTemplate.emoji} CAFÉ UM ROND-POINT
          </div>
          <div style={{ fontSize: fs - 2, color: '#555', lineHeight: 1.4, marginTop: 4 }}>
            12 Rue du Rond-Point, L-3760 Rumelange<br />
            Tél : +352 26 56 12 34 · TVA : LU12345678
          </div>
        </div>

        <div style={{ borderTop: '1px dashed #999', margin: '8px 0' }} />

        {/* Meta */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fs, color: '#333' }}>
          <span>{dateStr} {timeStr}</span>
          <span>{t.ticket} #{ticketNumber}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fs, color: '#333', marginTop: 2 }}>
          <span>{t.server} : {staffName}</span>
          <span>{t.table} : {table.name}</span>
        </div>

        <div style={{ borderTop: '1px dashed #999', margin: '8px 0' }} />

        {/* Type-specific body */}
        {type === 'cuisine' ? (
          <div>
            <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 900, margin: '6px 0', color: '#dc2626' }}>
              BON DE CUISINE
            </div>
            {allItems.map((it, i) => (
              <div key={i} style={{ padding: '4px 0' }}>
                <div style={{ fontSize: fs + 2, fontWeight: 700, display: 'flex', gap: 6 }}>
                  <span style={{ minWidth: 24 }}>{it.qty}x</span>
                  <span
                    contentEditable={editMode}
                    suppressContentEditableWarning
                    style={{
                      outline: editMode ? '1px dashed #6366f1' : 'none',
                      padding: editMode ? '0 2px' : 0,
                    }}
                  >{it.name}</span>
                </div>
                {it.note && (
                  <div style={{ fontSize: fs - 1, color: '#dc2626', fontStyle: 'italic', marginLeft: 28 }}>
                    ↪ {it.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div>
            {allItems.map((it, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: fs, padding: '2px 0',
              }}>
                <span
                  contentEditable={editMode}
                  suppressContentEditableWarning
                  style={{
                    outline: editMode ? '1px dashed #6366f1' : 'none',
                    padding: editMode ? '0 2px' : 0,
                  }}
                >
                  {it.qty} x {it.name}
                </span>
                <span style={{ fontWeight: 600 }}>{(it.price * it.qty).toFixed(2)}</span>
              </div>
            ))}

            <div style={{ borderTop: '1px dashed #999', margin: '8px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fs, color: '#555' }}>
              <span>{t.subtotal}</span>
              <span>{totals.ht.toFixed(2)} €</span>
            </div>
            {totals.tvaFood > 0.001 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fs - 1, color: '#666' }}>
                <span>TVA 8%</span>
                <span>{totals.tvaFood.toFixed(2)} €</span>
              </div>
            )}
            {totals.tvaDrink > 0.001 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fs - 1, color: '#666' }}>
                <span>TVA 17%</span>
                <span>{totals.tvaDrink.toFixed(2)} €</span>
              </div>
            )}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: fs + 4, fontWeight: 900,
              borderTop: '2px solid ' + activeTemplate.accent,
              borderBottom: '2px solid ' + activeTemplate.accent,
              padding: '6px 0', margin: '4px 0',
            }}>
              <span>{t.total}</span>
              <span>{totals.ttc.toFixed(2)} €</span>
            </div>
            <div style={{ textAlign: 'center', fontSize: fs, margin: '8px 0' }}>
              {t.payment} : Carte
            </div>
          </div>
        )}

        {/* QR */}
        {showQR && type !== 'cuisine' && (
          <div style={{ textAlign: 'center', margin: '12px 0 8px' }}>
            <div style={{
              display: 'inline-block', width: 72, height: 72,
              background: `repeating-linear-gradient(0deg, #000 0 4px, #fff 4px 8px), repeating-linear-gradient(90deg, #000 0 4px, transparent 4px 8px)`,
              border: '2px solid #000',
            }} />
            <div style={{ fontSize: fs - 2, color: '#555', marginTop: 4 }}>
              {t.review} — {qrTarget === 'google' ? 'Google' : 'TripAdvisor'}
            </div>
          </div>
        )}

        {/* Signature (facture) */}
        {type === 'facture' && hasSignature && (
          <div style={{
            marginTop: 16, padding: '12px 0',
            borderTop: '1px solid #ddd',
          }}>
            <div style={{ fontSize: fs - 2, color: '#777', marginBottom: 4 }}>Signature numérique :</div>
            <div style={{
              fontFamily: "'Brush Script MT', cursive", fontSize: 20,
              color: activeTemplate.accent, fontStyle: 'italic',
            }}>
              ✍ {staffName}
            </div>
            <div style={{ fontSize: 9, color: '#aaa' }}>
              SHA256: a3f{ticketNumber}...e82b · {dateStr} {timeStr}
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          contentEditable={editMode}
          suppressContentEditableWarning
          style={{
            textAlign: 'center', fontSize: fs, marginTop: 12,
            fontWeight: 600, color: '#444',
            outline: editMode ? '1px dashed #6366f1' : 'none',
            padding: editMode ? '0 2px' : 0,
          }}
        >
          {type === 'facture' ? 'Document officiel' : footerNote}
        </div>
        <div style={{ textAlign: 'center', fontSize: 9, color: '#aaa', marginTop: 4 }}>
          Powered by Creorga · {copies > 1 && `Copie ${copies}`}
        </div>
      </div>
    )
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
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: 'min(960px, 96vw)',
            maxHeight: '92vh',
            display: 'grid', gridTemplateColumns: '1fr 360px',
            gap: 0,
            borderRadius: 18,
            overflow: 'hidden',
            background: '#07070d',
            boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* ── LEFT: Receipt preview ── */}
          <div style={{
            background: '#0a0a14',
            padding: 24,
            overflow: 'auto',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            borderRight: '1px solid rgba(255,255,255,0.06)',
          }}>
            {/* Paper format selector */}
            <div style={{
              display: 'flex', gap: 6, marginBottom: 16, padding: 4,
              background: 'rgba(255,255,255,0.04)', borderRadius: 10,
            }}>
              {(['58mm', '80mm', 'a4'] as PaperFormat[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPaper(p)}
                  style={{
                    padding: '6px 14px', borderRadius: 7, border: 'none',
                    background: paper === p ? activeTemplate.accent : 'transparent',
                    color: paper === p ? '#fff' : '#94a3b8',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    letterSpacing: 0.5, textTransform: 'uppercase',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Receipt */}
            <motion.div
              key={paper + template + lang}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                width: paperWidth,
                maxWidth: '100%',
                boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              {renderReceipt()}
            </motion.div>

            {/* Edit toggle */}
            <button
              onClick={() => setEditMode(v => !v)}
              style={{
                marginTop: 14, padding: '8px 14px', borderRadius: 10,
                background: editMode ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                border: '1px solid ' + (editMode ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'),
                color: editMode ? '#a5b4fc' : '#94a3b8',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {editMode ? '✓ Édition active' : '✎ Modifier le reçu'}
            </button>
          </div>

          {/* ── RIGHT: Controls ── */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            background: '#0a0a14',
          }}>
            {/* Tabs */}
            <div style={{
              display: 'flex', padding: '16px 16px 0',
              gap: 4, borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              {([
                { id: 'preview', label: 'Aperçu' },
                { id: 'send', label: 'Envoyer' },
                { id: 'template', label: 'Modèle' },
              ] as const).map(x => (
                <button
                  key={x.id}
                  onClick={() => setTab(x.id)}
                  style={{
                    flex: 1, padding: '10px 0',
                    background: 'transparent', border: 'none',
                    color: tab === x.id ? '#fff' : '#64748b',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    borderBottom: '2px solid ' + (tab === x.id ? activeTemplate.accent : 'transparent'),
                    marginBottom: -1,
                    letterSpacing: 0.5, textTransform: 'uppercase',
                  }}
                >
                  {x.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
              {tab === 'preview' && (
                <div>
                  {/* Language */}
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                      Langue
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['FR', 'DE', 'EN', 'PT'] as Lang[]).map(l => (
                        <button
                          key={l}
                          onClick={() => setLang(l)}
                          style={{
                            flex: 1, padding: '8px 0', borderRadius: 8,
                            background: lang === l ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                            border: '1px solid ' + (lang === l ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'),
                            color: lang === l ? '#a5b4fc' : '#94a3b8',
                            fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Format */}
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                      Format d'export
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {([
                        { id: 'pdf', label: 'PDF', emoji: '📄' },
                        { id: 'png', label: 'PNG', emoji: '🖼️' },
                        { id: 'thermal', label: 'Thermique', emoji: '🖨️' },
                      ] as const).map(f => (
                        <button
                          key={f.id}
                          onClick={() => setFormat(f.id)}
                          style={{
                            flex: 1, padding: '10px 0', borderRadius: 8,
                            background: format === f.id ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                            border: '1px solid ' + (format === f.id ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'),
                            color: format === f.id ? '#6ee7b7' : '#94a3b8',
                            fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                          }}
                        >
                          <span style={{ fontSize: 18 }}>{f.emoji}</span>
                          {f.label}
                        </button>
                      ))}
                    </div>
                    {format === 'thermal' && (
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 6, fontStyle: 'italic' }}>
                        ESC/POS — Compatible Epson, Star, Citizen
                      </div>
                    )}
                  </div>

                  {/* Copies */}
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                      Nombre de copies
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <button
                          key={n}
                          onClick={() => setCopies(n)}
                          style={{
                            flex: 1, padding: '10px 0', borderRadius: 8,
                            background: copies === n ? activeTemplate.accent : 'rgba(255,255,255,0.04)',
                            border: '1px solid ' + (copies === n ? activeTemplate.accent : 'rgba(255,255,255,0.06)'),
                            color: copies === n ? '#fff' : '#94a3b8',
                            fontSize: 14, fontWeight: 800, cursor: 'pointer',
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* QR Code */}
                  {type !== 'cuisine' && (
                    <div style={{ marginBottom: 18 }}>
                      <label style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        cursor: 'pointer', marginBottom: 10,
                      }}>
                        <input type="checkbox" checked={showQR} onChange={e => setShowQR(e.target.checked)} />
                        <span style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 600 }}>
                          QR Code d'avis
                        </span>
                      </label>
                      {showQR && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => setQrTarget('google')}
                            style={{
                              flex: 1, padding: '8px 0', borderRadius: 8,
                              background: qrTarget === 'google' ? 'rgba(66,133,244,0.2)' : 'rgba(255,255,255,0.04)',
                              border: '1px solid ' + (qrTarget === 'google' ? 'rgba(66,133,244,0.4)' : 'rgba(255,255,255,0.06)'),
                              color: qrTarget === 'google' ? '#8ab4f8' : '#94a3b8',
                              fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            }}
                          >
                            Google
                          </button>
                          <button
                            onClick={() => setQrTarget('tripadvisor')}
                            style={{
                              flex: 1, padding: '8px 0', borderRadius: 8,
                              background: qrTarget === 'tripadvisor' ? 'rgba(0,175,135,0.2)' : 'rgba(255,255,255,0.04)',
                              border: '1px solid ' + (qrTarget === 'tripadvisor' ? 'rgba(0,175,135,0.4)' : 'rgba(255,255,255,0.06)'),
                              color: qrTarget === 'tripadvisor' ? '#34d399' : '#94a3b8',
                              fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            }}
                          >
                            TripAdvisor
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Signature (facture) */}
                  {type === 'facture' && (
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      cursor: 'pointer', marginBottom: 18,
                    }}>
                      <input type="checkbox" checked={hasSignature} onChange={e => setHasSignature(e.target.checked)} />
                      <span style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 600 }}>
                        Signature numérique
                      </span>
                    </label>
                  )}

                  {/* Footer note */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                      Message de pied
                    </div>
                    <input
                      value={footerNote}
                      onChange={e => setFooterNote(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 8,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: '#e2e8f0', fontSize: 12, fontFamily: 'inherit',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              )}

              {tab === 'send' && (
                <div>
                  {/* Email */}
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                      ✉️ Email
                    </div>
                    <input
                      placeholder="client@example.com"
                      value={emailAddress}
                      onChange={e => setEmailAddress(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 8,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: '#e2e8f0', fontSize: 12, marginBottom: 8,
                        fontFamily: 'inherit', outline: 'none',
                      }}
                    />
                    <input
                      placeholder="Sujet"
                      value={emailSubject}
                      onChange={e => setEmailSubject(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 8,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: '#e2e8f0', fontSize: 12, marginBottom: 10,
                        fontFamily: 'inherit', outline: 'none',
                      }}
                    />
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleEmail}
                      style={{
                        width: '100%', padding: '10px 0', borderRadius: 10,
                        background: emailSent ? 'rgba(16,185,129,0.2)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                        border: 'none',
                        color: emailSent ? '#6ee7b7' : '#fff',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      {emailSent ? '✓ Envoyé' : 'Envoyer par email'}
                    </motion.button>
                  </div>

                  {/* SMS */}
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                      📱 SMS (shortlink)
                    </div>
                    <input
                      placeholder="+352 621 123 456"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 8,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: '#e2e8f0', fontSize: 12, marginBottom: 8,
                        fontFamily: 'inherit', outline: 'none',
                      }}
                    />
                    <div style={{
                      fontSize: 10, color: '#64748b', marginBottom: 10,
                      padding: '6px 10px', borderRadius: 6,
                      background: 'rgba(255,255,255,0.03)',
                      fontFamily: 'monospace',
                    }}>
                      https://creorga.lu/r/{ticketNumber}
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleSMS}
                      style={{
                        width: '100%', padding: '10px 0', borderRadius: 10,
                        background: smsSent ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.12)',
                        border: '1px solid ' + (smsSent ? 'rgba(16,185,129,0.4)' : 'rgba(99,102,241,0.3)'),
                        color: smsSent ? '#6ee7b7' : '#a5b4fc',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      {smsSent ? '✓ SMS envoyé' : 'Envoyer SMS'}
                    </motion.button>
                  </div>
                </div>
              )}

              {tab === 'template' && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                    Bibliothèque de modèles
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {TEMPLATES.map(tpl => (
                      <button
                        key={tpl.id}
                        onClick={() => setTemplate(tpl.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 14px', borderRadius: 10,
                          background: template === tpl.id ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                          border: '1px solid ' + (template === tpl.id ? tpl.accent : 'rgba(255,255,255,0.06)'),
                          color: '#e2e8f0', fontSize: 13, fontWeight: 600,
                          cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                          boxShadow: template === tpl.id ? `0 0 20px ${tpl.accent}40` : 'none',
                        }}
                      >
                        <span style={{ fontSize: 24 }}>{tpl.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <div>{tpl.name}</div>
                          <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                            Accent: {tpl.accent}
                          </div>
                        </div>
                        <div style={{
                          width: 16, height: 16, borderRadius: '50%',
                          background: tpl.accent,
                          boxShadow: template === tpl.id ? `0 0 8px ${tpl.accent}` : 'none',
                        }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action bar */}
            <div style={{
              padding: 12, display: 'flex', gap: 8,
              borderTop: '1px solid rgba(255,255,255,0.06)',
              background: '#07070d',
            }}>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={onPrint}
                style={{
                  flex: 2, padding: '12px 0', borderRadius: 10, border: 'none',
                  background: `linear-gradient(135deg, ${activeTemplate.accent}, ${activeTemplate.accent}dd)`,
                  color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                  boxShadow: `0 4px 16px ${activeTemplate.accent}40`,
                }}
              >
                🖨️ Imprimer ({copies})
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={onClose}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 10,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94a3b8', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Fermer
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
