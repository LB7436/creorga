import { useState } from 'react'
import type { FloorState, FloorTable, FloorChair } from '@/hooks/useFloorState'

/**
 * Unified Transfer / Split modal.
 *
 * Transfer mode:
 *   - Pick source (chair or table)
 *   - Select items to move (all OR individual)
 *   - Pick destination (chair or table)
 *
 * Split mode:
 *   - Divide an order across multiple bills (per chair or percentages)
 *
 * The modal closes automatically after a successful action.
 */
export interface TransferSplitProps {
  open: boolean
  onClose: () => void
  mode: 'transfer' | 'split'
  state: FloorState
  originTableId: string | null
  // Actions from useFloorState
  onTransferItems: (fromType: 'chair' | 'table', fromId: string, toType: 'chair' | 'table', toId: string, itemIds: string[]) => Promise<any>
  onTransferChair: (chairId: string, toTableId: string) => Promise<any>
}

type SourceType = 'chair' | 'table'

export default function TransferSplitModal(props: TransferSplitProps) {
  const { open, onClose, mode, state, originTableId, onTransferItems, onTransferChair } = props
  const [sourceType, setSourceType] = useState<SourceType>('table')
  const [sourceId, setSourceId] = useState<string>(originTableId || '')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [destType, setDestType] = useState<SourceType>('table')
  const [destId, setDestId] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [moveEntireChair, setMoveEntireChair] = useState(false)

  if (!open) return null

  const sourceItems = (() => {
    if (sourceType === 'table') {
      const t = state.tables.find((x) => x.id === sourceId)
      return t?.items || []
    }
    const c = state.chairs.find((x) => x.id === sourceId)
    return c?.items || []
  })()

  const allTables = state.tables
  const allChairs = state.chairs

  const toggleItem = (id: string) => {
    const next = new Set(selectedItems)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelectedItems(next)
  }

  const selectAll = () => setSelectedItems(new Set(sourceItems.map((i) => i.id)))
  const selectNone = () => setSelectedItems(new Set())

  const handleConfirm = async () => {
    setBusy(true)
    try {
      if (mode === 'transfer') {
        if (moveEntireChair && sourceType === 'chair' && destType === 'table') {
          await onTransferChair(sourceId, destId)
        } else {
          await onTransferItems(sourceType, sourceId, destType, destId, Array.from(selectedItems))
        }
      }
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const canConfirm = sourceId && destId && sourceId !== destId &&
    (moveEntireChair || selectedItems.size > 0)

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modal}>
        <header style={header}>
          <h2 style={{ margin: 0, fontSize: 20 }}>
            {mode === 'transfer' ? '🔀 Transférer' : '✂️ Splitter'}
          </h2>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: 18 }}>
          {/* ── SOURCE ── */}
          <div style={panel}>
            <div style={panelTitle}>1. Source</div>
            <TypeToggle value={sourceType} onChange={(v) => { setSourceType(v); setSourceId(''); setSelectedItems(new Set()) }} />
            <SelectEntity
              type={sourceType}
              tables={allTables}
              chairs={allChairs}
              value={sourceId}
              onChange={(id) => { setSourceId(id); setSelectedItems(new Set()) }}
            />

            {/* Move entire chair option */}
            {sourceType === 'chair' && sourceId && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13, color: '#475569' }}>
                <input type="checkbox" checked={moveEntireChair} onChange={(e) => setMoveEntireChair(e.target.checked)} />
                Déplacer la chaise entière (items + occupant)
              </label>
            )}

            {/* Items selection */}
            {!moveEntireChair && sourceId && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                    Articles ({sourceItems.length})
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={selectAll} style={smallBtn}>Tout</button>
                    <button onClick={selectNone} style={smallBtn}>Rien</button>
                  </div>
                </div>

                {sourceItems.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#94a3b8', padding: 10, textAlign: 'center' }}>
                    Aucun article à transférer
                  </div>
                ) : (
                  <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                    {sourceItems.map((item) => {
                      const checked = selectedItems.has(item.id)
                      return (
                        <label key={item.id} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 10px', background: checked ? '#eef2ff' : '#f8fafc',
                          borderRadius: 8, marginBottom: 4, cursor: 'pointer',
                          border: checked ? '1px solid #6366f1' : '1px solid transparent',
                        }}>
                          <input type="checkbox" checked={checked} onChange={() => toggleItem(item.id)} />
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
                            {item.qty}× {item.name}
                          </span>
                          <span style={{ fontSize: 12, color: '#475569' }}>
                            {(item.price * item.qty).toFixed(2)} €
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── DESTINATION ── */}
          <div style={panel}>
            <div style={panelTitle}>2. Destination</div>
            <TypeToggle value={destType} onChange={(v) => { setDestType(v); setDestId('') }} />
            <SelectEntity
              type={destType}
              tables={allTables.filter((t) => t.id !== sourceId)}
              chairs={allChairs.filter((c) => c.id !== sourceId)}
              value={destId}
              onChange={setDestId}
            />

            {/* Preview */}
            {destId && (selectedItems.size > 0 || moveEntireChair) && (
              <div style={{
                marginTop: 14, padding: 12, background: '#ecfdf5', borderRadius: 10,
                border: '1px solid #10b981',
              }}>
                <div style={{ fontSize: 12, color: '#065f46', fontWeight: 700, marginBottom: 4 }}>✓ Prêt à transférer</div>
                <div style={{ fontSize: 13, color: '#047857' }}>
                  {moveEntireChair
                    ? 'Chaise complète (avec tous ses items)'
                    : `${selectedItems.size} article(s)`}
                  {' '}→{' '}
                  {destType === 'table'
                    ? allTables.find((t) => t.id === destId)?.name
                    : allChairs.find((c) => c.id === destId)?.label}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer style={footer}>
          <button onClick={onClose} style={btnSecondary}>Annuler</button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || busy}
            style={{ ...btnPrimary, opacity: (!canConfirm || busy) ? 0.5 : 1 }}
          >
            {busy ? 'Traitement…' : '✓ Confirmer le transfert'}
          </button>
        </footer>
      </div>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────
function TypeToggle({ value, onChange }: { value: SourceType; onChange: (v: SourceType) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: 3, background: '#f1f5f9', borderRadius: 8, marginBottom: 10 }}>
      {(['table', 'chair'] as SourceType[]).map((t) => {
        const active = value === t
        return (
          <button key={t} onClick={() => onChange(t)} style={{
            flex: 1, padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: active ? '#6366f1' : 'transparent',
            color: active ? '#fff' : '#64748b', fontWeight: 600, fontSize: 12,
          }}>
            {t === 'table' ? '🍽 Table' : '🪑 Chaise'}
          </button>
        )
      })}
    </div>
  )
}

function SelectEntity({
  type, tables, chairs, value, onChange,
}: {
  type: SourceType
  tables: FloorTable[]
  chairs: FloorChair[]
  value: string
  onChange: (id: string) => void
}) {
  const list = type === 'table' ? tables : chairs
  return (
    <div style={{ maxHeight: 180, overflowY: 'auto', display: 'grid', gap: 4 }}>
      {list.length === 0 && <div style={{ padding: 12, color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>Aucun</div>}
      {list.map((entity) => {
        const isTable = 'section' in entity
        const selected = value === entity.id
        const tbl = isTable ? entity as FloorTable : null
        const ch = !isTable ? entity as FloorChair : null
        return (
          <button key={entity.id} onClick={() => onChange(entity.id)} style={{
            padding: '8px 10px', borderRadius: 8, border: selected ? '2px solid #6366f1' : '1px solid #e2e8f0',
            background: selected ? '#eef2ff' : '#fff', cursor: 'pointer', textAlign: 'left',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>
              {isTable ? `🍽 ${tbl!.name}` : `🪑 ${ch!.label}`}
            </span>
            <span style={{ fontSize: 11, color: '#64748b' }}>
              {isTable ? tbl!.section : `table ${tables.find((t) => t.id === ch!.tableId)?.name || ''}`}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
}
const modal: React.CSSProperties = {
  background: '#fff', borderRadius: 18, minWidth: 680, maxWidth: 900, maxHeight: '90vh',
  overflow: 'hidden', display: 'flex', flexDirection: 'column',
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
}
const header: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '14px 20px', borderBottom: '1px solid #e2e8f0',
  background: 'linear-gradient(135deg, #eef2ff, #fdf4ff)',
}
const closeBtn: React.CSSProperties = {
  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
  width: 34, height: 34, cursor: 'pointer', fontSize: 16,
}
const panel: React.CSSProperties = {
  background: '#f8fafc', borderRadius: 12, padding: 14, border: '1px solid #e2e8f0',
}
const panelTitle: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8,
}
const smallBtn: React.CSSProperties = {
  padding: '4px 8px', fontSize: 11, border: '1px solid #e2e8f0', borderRadius: 6,
  background: '#fff', cursor: 'pointer', fontWeight: 600,
}
const footer: React.CSSProperties = {
  display: 'flex', justifyContent: 'flex-end', gap: 10,
  padding: '12px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc',
}
const btnPrimary: React.CSSProperties = {
  padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 13,
}
const btnSecondary: React.CSSProperties = {
  padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0', cursor: 'pointer',
  background: '#fff', color: '#475569', fontWeight: 600, fontSize: 13,
}
