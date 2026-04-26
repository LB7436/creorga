import { useState, useMemo } from 'react'
import type { FloorState, FloorTable, FloorChair } from '@/hooks/useFloorState'

/**
 * Transfer wizard 3-steps with VISUAL floor plan picker.
 *
 *   Étape 1 — Source       : plan de salle visible, on clique une table OU une chaise
 *   Étape 2 — Articles     : on valide ce qu'on veut transférer (qté + sélection)
 *   Étape 3 — Destination  : plan visible à nouveau, on clique la table/chaise cible
 *                            → confirmation auto au clic
 */

type EntityType = 'table' | 'chair'
type Step = 1 | 2 | 3

export interface TransferWizardProps {
  open: boolean
  onClose: () => void
  state: FloorState
  originTableId: string | null
  onTransferItems: (fromType: EntityType, fromId: string, toType: EntityType, toId: string, itemIds: string[]) => Promise<any>
  onTransferChair: (chairId: string, toTableId: string) => Promise<any>
}

export default function TransferWizard({
  open, onClose, state, originTableId, onTransferItems, onTransferChair,
}: TransferWizardProps) {
  const [step, setStep] = useState<Step>(1)
  const [sourceType, setSourceType] = useState<EntityType | null>(originTableId ? 'table' : null)
  const [sourceId, setSourceId] = useState<string | null>(originTableId)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [moveEntireChair, setMoveEntireChair] = useState(false)
  const [busy, setBusy] = useState(false)
  const [filterSection, setFilterSection] = useState<string>('all')

  const sections = useMemo(
    () => Array.from(new Set(state.tables.map((t) => t.section))),
    [state.tables]
  )

  const sourceItems = useMemo(() => {
    if (!sourceId || !sourceType) return []
    if (sourceType === 'table') return state.tables.find((t) => t.id === sourceId)?.items || []
    return state.chairs.find((c) => c.id === sourceId)?.items || []
  }, [sourceId, sourceType, state])

  if (!open) return null

  const reset = () => {
    setStep(1)
    setSourceType(originTableId ? 'table' : null)
    setSourceId(originTableId)
    setSelectedItems(new Set())
    setMoveEntireChair(false)
    setFilterSection('all')
  }
  const handleClose = () => { reset(); onClose() }

  const sourceEntity = sourceType === 'table'
    ? state.tables.find((t) => t.id === sourceId)
    : state.chairs.find((c) => c.id === sourceId)

  const canGoStep2 = !!sourceEntity
  const canGoStep3 = moveEntireChair || selectedItems.size > 0

  const handlePickSource = (type: EntityType, id: string) => {
    setSourceType(type)
    setSourceId(id)
    setSelectedItems(new Set())
  }

  const handlePickDestination = async (type: EntityType, id: string) => {
    if (!sourceType || !sourceId) return
    if (id === sourceId) return
    setBusy(true)
    try {
      if (moveEntireChair && sourceType === 'chair' && type === 'table') {
        await onTransferChair(sourceId, id)
      } else {
        await onTransferItems(sourceType, sourceId, type, id, Array.from(selectedItems))
      }
      handleClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div onClick={handleClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modal}>
        {/* Header */}
        <header style={headerStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>🔀 Transférer</h2>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {step === 1 && 'Étape 1/3 · Cliquez la source sur le plan'}
              {step === 2 && 'Étape 2/3 · Sélectionnez les articles à transférer'}
              {step === 3 && 'Étape 3/3 · Cliquez la destination sur le plan'}
            </div>
          </div>
          <button onClick={handleClose} style={closeBtn}>✕</button>
        </header>

        {/* Stepper */}
        <div style={stepperRow}>
          {[1, 2, 3].map((n) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: step >= n ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#e2e8f0',
                color: step >= n ? '#fff' : '#64748b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 13,
                boxShadow: step === n ? '0 0 0 4px rgba(139,92,246,0.2)' : 'none',
                transition: 'all .2s',
              }}>{step > n ? '✓' : n}</div>
              <div style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: step >= n ? '#1e293b' : '#94a3b8' }}>
                {n === 1 ? 'Source' : n === 2 ? 'Articles' : 'Destination'}
              </div>
              {n < 3 && <div style={{ flex: 1, height: 2, margin: '0 10px', background: step > n ? '#8b5cf6' : '#e2e8f0' }} />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: 16, minHeight: 480, maxHeight: '70vh', overflowY: 'auto' }}>
          {/* STEP 1 — visual source */}
          {step === 1 && (
            <FloorPicker
              state={state}
              sections={sections}
              filterSection={filterSection}
              setFilterSection={setFilterSection}
              selectedType={sourceType}
              selectedId={sourceId}
              onPick={handlePickSource}
              hint="🍽 Cliquez sur une table ou 🪑 sur une chaise pour la définir comme source."
              acceptEmpty={false}
            />
          )}

          {/* STEP 2 — articles */}
          {step === 2 && (
            <div>
              <div style={sourceBanner}>
                Source : <strong>{sourceType === 'table' ? '🍽 ' + (sourceEntity as FloorTable)?.name : '🪑 ' + (sourceEntity as FloorChair)?.label}</strong>
                {' '}— {sourceItems.length} article(s) disponibles
              </div>

              {sourceType === 'chair' && (
                <label style={chairWholeRow}>
                  <input type="checkbox" checked={moveEntireChair} onChange={(e) => setMoveEntireChair(e.target.checked)} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    🪑 Déplacer la chaise entière (avec son occupant)
                  </span>
                </label>
              )}

              {!moveEntireChair && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={sectionLabel}>Articles</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => setSelectedItems(new Set(sourceItems.map(i => i.id)))} style={miniBtn}>Tout</button>
                      <button onClick={() => setSelectedItems(new Set())} style={miniBtn}>Rien</button>
                    </div>
                  </div>

                  {sourceItems.length === 0 ? (
                    <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13, background: '#f8fafc', borderRadius: 12 }}>
                      Aucun article sur cette source.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 6 }}>
                      {sourceItems.map((item) => {
                        const checked = selectedItems.has(item.id)
                        return (
                          <label key={item.id} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: 12, borderRadius: 10, cursor: 'pointer',
                            background: checked ? '#eef2ff' : '#f8fafc',
                            border: checked ? '2px solid #6366f1' : '2px solid transparent',
                            transition: 'all .15s',
                          }}>
                            <input type="checkbox" checked={checked} onChange={() => {
                              const next = new Set(selectedItems)
                              if (next.has(item.id)) next.delete(item.id); else next.add(item.id)
                              setSelectedItems(next)
                            }} />
                            <span style={{
                              width: 32, height: 32, borderRadius: 8,
                              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                              color: '#fff', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0,
                            }}>×{item.qty}</span>
                            <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{item.name}</span>
                            <span style={{ fontSize: 13, color: '#6366f1', fontWeight: 700 }}>
                              {(item.price * item.qty).toFixed(2)} €
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  )}

                  {selectedItems.size > 0 && (
                    <div style={hintOk}>
                      ✓ {selectedItems.size} article(s) sélectionné(s) — Total : <strong>{sourceItems.filter(i => selectedItems.has(i.id)).reduce((s, i) => s + i.price * i.qty, 0).toFixed(2)} €</strong>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* STEP 3 — visual destination */}
          {step === 3 && (
            <>
              <div style={sourceBanner}>
                {moveEntireChair
                  ? `🪑 Chaise entière "${(sourceEntity as FloorChair)?.label}"`
                  : `${selectedItems.size} article(s) depuis ${sourceType === 'table' ? '🍽 ' + (sourceEntity as FloorTable)?.name : '🪑 ' + (sourceEntity as FloorChair)?.label}`}
                {' '}→ <em>cliquez la cible</em>
              </div>

              <FloorPicker
                state={state}
                sections={sections}
                filterSection={filterSection}
                setFilterSection={setFilterSection}
                selectedType={null}
                selectedId={null}
                excludeId={sourceId}
                onPick={handlePickDestination}
                hint="🍽 Cliquez la table OU 🪑 la chaise destination — le transfert s'exécute immédiatement."
                acceptEmpty={false}
                busy={busy}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <footer style={footerStyle}>
          <button onClick={handleClose} style={btnSecondary}>Annuler</button>
          <div style={{ flex: 1 }} />
          {step > 1 && <button onClick={() => setStep((step - 1) as Step)} style={btnSecondary}>← Retour</button>}
          {step === 1 && (
            <button onClick={() => setStep(2)} disabled={!canGoStep2}
              style={{ ...btnPrimary, opacity: canGoStep2 ? 1 : 0.4 }}>
              Suivant →
            </button>
          )}
          {step === 2 && (
            <button onClick={() => setStep(3)} disabled={!canGoStep3}
              style={{ ...btnPrimary, opacity: canGoStep3 ? 1 : 0.4 }}>
              Choisir destination →
            </button>
          )}
          {step === 3 && (
            <span style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
              Cliquez directement la cible pour confirmer
            </span>
          )}
        </footer>
      </div>
    </div>
  )
}

// ─── Visual floor picker (used in step 1 + 3) ───────────────────────────────
function FloorPicker({
  state, sections, filterSection, setFilterSection,
  selectedType, selectedId, excludeId, onPick, hint, busy,
}: {
  state: FloorState
  sections: string[]
  filterSection: string
  setFilterSection: (s: string) => void
  selectedType: EntityType | null
  selectedId: string | null
  excludeId?: string | null
  onPick: (type: EntityType, id: string) => void
  hint: string
  acceptEmpty: boolean
  busy?: boolean
}) {
  const visibleTables = filterSection === 'all'
    ? state.tables
    : state.tables.filter((t) => t.section === filterSection)

  return (
    <div>
      {/* Section filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        <button onClick={() => setFilterSection('all')} style={chipBtn(filterSection === 'all')}>Toutes</button>
        {sections.map((s) => (
          <button key={s} onClick={() => setFilterSection(s)} style={chipBtn(filterSection === s)}>{s}</button>
        ))}
      </div>

      {/* Hint */}
      <div style={hintBlue}>{hint}</div>

      {/* Floor canvas */}
      <div style={{
        position: 'relative',
        background: 'linear-gradient(135deg,#f1f5f9,#e2e8f0)',
        border: '2px dashed #cbd5e1', borderRadius: 14,
        minHeight: 420, padding: 12, marginTop: 12,
        opacity: busy ? 0.5 : 1, pointerEvents: busy ? 'none' : 'auto',
      }}>
        {/* Section labels and zones */}
        {sections.map((sec) => {
          const tablesInSec = visibleTables.filter((t) => t.section === sec)
          if (tablesInSec.length === 0) return null
          const xs = tablesInSec.map((t) => t.x)
          const ys = tablesInSec.map((t) => t.y)
          const minX = Math.min(...xs) - 60
          const minY = Math.min(...ys) - 60
          const maxX = Math.max(...xs) + 80
          const maxY = Math.max(...ys) + 80
          const colorBySection: Record<string, string> = {
            Salle: '#8b5cf6', Bar: '#f59e0b', Terrasse: '#10b981',
          }
          const c = colorBySection[sec] || '#6366f1'
          return (
            <div key={sec} style={{
              position: 'absolute',
              left: minX * 0.6, top: minY * 0.55,
              width: (maxX - minX) * 0.6, height: (maxY - minY) * 0.55,
              border: `1px dashed ${c}40`,
              borderRadius: 12, background: `${c}05`,
              pointerEvents: 'none',
            }}>
              <div style={{
                position: 'absolute', top: 6, left: 10,
                fontSize: 9, fontWeight: 800, letterSpacing: 1.5,
                color: c, textTransform: 'uppercase',
              }}>{sec}</div>
            </div>
          )
        })}

        {/* Tables + chairs */}
        {visibleTables.map((t) => {
          const isExcluded = excludeId === t.id
          const isSelected = selectedType === 'table' && selectedId === t.id
          const tableChairs = state.chairs.filter((c) => c.tableId === t.id)
          const itemCount = t.items.reduce((n, i) => n + i.qty, 0)
          const hasOrder = itemCount > 0 || tableChairs.some((c) => c.items.length > 0)

          // Scale down 60% to fit modal
          const x = t.x * 0.6
          const y = t.y * 0.55
          const size = t.shape === 'bar' ? { w: 100, h: 44 }
                     : t.shape === 'rect' ? { w: 90, h: 56 }
                     : t.shape === 'square' ? { w: 60, h: 60 }
                     : { w: 60, h: 60 }
          const radius = t.shape === 'round' ? '50%' : 8

          return (
            <div key={t.id} style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%,-50%)' }}>
              {/* Chair dots */}
              {Array.from({ length: t.seats }).map((_, i) => {
                const seat = tableChairs[i]
                const seatHasOrder = seat && seat.items.length > 0
                const seatSelected = selectedType === 'chair' && selectedId === seat?.id
                const seatExcluded = seat && excludeId === seat.id
                if (!seat) return null

                let cx = 0, cy = 0
                if (t.shape === 'round') {
                  const angle = (2 * Math.PI * i) / t.seats - Math.PI / 2
                  const r = size.w / 2 + 12
                  cx = Math.cos(angle) * r
                  cy = Math.sin(angle) * r
                } else {
                  const perSide = Math.ceil(t.seats / 2)
                  if (i < perSide) {
                    cx = (size.w / (perSide + 1)) * (i + 1) - size.w / 2
                    cy = -size.h / 2 - 10
                  } else {
                    const j = i - perSide
                    cx = (size.w / (Math.min(t.seats - perSide, perSide) + 1)) * (j + 1) - size.w / 2
                    cy = size.h / 2 + 10
                  }
                }

                return (
                  <button
                    key={seat.id}
                    onClick={(e) => { e.stopPropagation(); if (!seatExcluded) onPick('chair', seat.id) }}
                    title={`${seat.label}${seat.customerName ? ' · ' + seat.customerName : ''}`}
                    style={{
                      position: 'absolute', left: cx, top: cy, transform: 'translate(-50%,-50%)',
                      width: seatSelected ? 18 : 14, height: seatSelected ? 18 : 14,
                      borderRadius: '50%', padding: 0,
                      background: seatExcluded ? '#cbd5e1'
                        : seatSelected ? '#ec4899'
                        : seatHasOrder ? '#f59e0b' : '#a78bfa',
                      border: seatSelected ? '2px solid #fff' : '2px solid rgba(255,255,255,0.6)',
                      cursor: seatExcluded ? 'not-allowed' : 'pointer',
                      boxShadow: seatSelected ? '0 0 0 3px rgba(236,72,153,0.4)' : 'none',
                      transition: 'all .15s',
                      zIndex: 5,
                    }}
                  />
                )
              })}

              {/* Table */}
              <button
                onClick={() => { if (!isExcluded) onPick('table', t.id) }}
                style={{
                  width: size.w, height: size.h, borderRadius: radius,
                  border: isSelected ? '3px solid #ec4899'
                    : isExcluded ? '2px dashed #94a3b8'
                    : '2px solid #6366f1',
                  background: isExcluded ? '#cbd5e133'
                    : isSelected ? 'linear-gradient(135deg,#ec4899,#f472b6)'
                    : hasOrder ? 'linear-gradient(135deg,#f59e0b,#fcd34d)'
                    : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  color: '#fff', cursor: isExcluded ? 'not-allowed' : 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 11, padding: 0,
                  boxShadow: isSelected ? '0 0 0 6px rgba(236,72,153,0.3), 0 8px 20px rgba(236,72,153,0.5)'
                    : '0 4px 12px rgba(0,0,0,0.15)',
                  transition: 'all .15s',
                }}
              >
                <div style={{ lineHeight: 1.1 }}>{t.name}</div>
                <div style={{ fontSize: 9, opacity: 0.85 }}>{t.seats}pl</div>
                {hasOrder && (
                  <div style={{ fontSize: 9, marginTop: 1, opacity: 0.95 }}>
                    {(t.items.reduce((s, i) => s + i.price * i.qty, 0) +
                      tableChairs.reduce((s, c) => s + c.items.reduce((ss, i) => ss + i.price * i.qty, 0), 0)
                    ).toFixed(2)}€
                  </div>
                )}
                {isExcluded && (
                  <div style={{ fontSize: 8, opacity: 0.6, color: '#475569' }}>source</div>
                )}
              </button>
            </div>
          )
        })}

        {/* Standalone chairs */}
        {state.chairs.filter((c) => !c.tableId && c.x != null && c.y != null).map((c) => {
          const seatSelected = selectedType === 'chair' && selectedId === c.id
          const seatExcluded = excludeId === c.id
          return (
            <button
              key={c.id}
              onClick={() => { if (!seatExcluded) onPick('chair', c.id) }}
              style={{
                position: 'absolute',
                left: (c.x ?? 0) * 0.6, top: (c.y ?? 0) * 0.55,
                transform: 'translate(-50%,-50%)',
                width: 22, height: 22, borderRadius: '50%',
                background: seatSelected ? '#ec4899' : c.items.length > 0 ? '#f59e0b' : '#a78bfa',
                border: '2px solid #fff', cursor: 'pointer', padding: 0,
                color: '#fff', fontSize: 10, fontWeight: 800,
                boxShadow: seatSelected ? '0 0 0 4px rgba(236,72,153,0.4)' : '0 0 8px rgba(0,0,0,0.3)',
              }}
            >🪑</button>
          )
        })}
      </div>

      {/* Legend */}
      <div style={legendRow}>
        <span style={{ ...legendItem, background: '#6366f120', color: '#6366f1' }}>🍽 Table libre</span>
        <span style={{ ...legendItem, background: '#f59e0b20', color: '#b45309' }}>🍽 Avec commande</span>
        <span style={{ ...legendItem, background: '#a78bfa20', color: '#7c3aed' }}>🪑 Chaise libre</span>
        <span style={{ ...legendItem, background: '#f59e0b20', color: '#b45309' }}>🪑 Chaise avec commande</span>
        <span style={{ ...legendItem, background: '#ec489920', color: '#be185d' }}>● Sélectionné</span>
      </div>
    </div>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  backdropFilter: 'blur(4px)',
}
const modal: React.CSSProperties = {
  background: '#fff', borderRadius: 18, width: '100%', maxWidth: 920,
  maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
  boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
}
const headerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
  background: 'linear-gradient(135deg, #eef2ff, #fdf4ff)',
}
const stepperRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', padding: '14px 20px',
  borderBottom: '1px solid #f1f5f9', background: '#fafbfc',
}
const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, color: '#475569', letterSpacing: 1,
  textTransform: 'uppercase',
}
const closeBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0',
  background: '#fff', cursor: 'pointer', fontSize: 14,
}
const miniBtn: React.CSSProperties = {
  padding: '4px 10px', fontSize: 11, border: '1px solid #e2e8f0',
  borderRadius: 6, background: '#fff', cursor: 'pointer', fontWeight: 600,
}
const sourceBanner: React.CSSProperties = {
  padding: 12, marginBottom: 14,
  background: 'linear-gradient(135deg,#eef2ff,#fdf4ff)',
  border: '1px solid #c7d2fe', borderRadius: 10,
  fontSize: 13, color: '#4338ca',
}
const chairWholeRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, padding: 12,
  background: '#eef2ff', borderRadius: 10, marginBottom: 14,
  border: '1px solid #c7d2fe', cursor: 'pointer',
}
const hintOk: React.CSSProperties = {
  marginTop: 14, padding: 12, background: '#ecfdf5', border: '1px solid #10b981',
  borderRadius: 10, fontSize: 13, color: '#065f46',
}
const hintBlue: React.CSSProperties = {
  padding: 10, background: '#eff6ff', border: '1px solid #bfdbfe',
  borderRadius: 10, fontSize: 12, color: '#1e40af',
}
const footerStyle: React.CSSProperties = {
  display: 'flex', gap: 8, padding: 14, borderTop: '1px solid #e2e8f0',
  background: '#f8fafc', alignItems: 'center',
}
const btnPrimary: React.CSSProperties = {
  padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer',
  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  color: '#fff', fontWeight: 700, fontSize: 13,
  boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
}
const btnSecondary: React.CSSProperties = {
  padding: '10px 18px', borderRadius: 10, border: '1px solid #e2e8f0',
  background: '#fff', cursor: 'pointer', color: '#475569', fontWeight: 600, fontSize: 13,
}
const chipBtn = (active: boolean): React.CSSProperties => ({
  padding: '5px 14px', borderRadius: 999, border: '1px solid #e2e8f0',
  background: active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#fff',
  color: active ? '#fff' : '#64748b', cursor: 'pointer',
  fontSize: 12, fontWeight: 700,
})
const legendRow: React.CSSProperties = {
  display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap',
}
const legendItem: React.CSSProperties = {
  padding: '3px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
}
