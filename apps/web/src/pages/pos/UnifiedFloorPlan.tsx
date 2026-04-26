import { useState, useMemo, useRef, useCallback } from 'react'
import { useFloorState, tableTotal, chairTotal, type FloorTable, type FloorChair } from '@/hooks/useFloorState'
import TransferSplitModal from '@/components/TransferSplitModal'
import TransferWizard from '@/components/TransferWizard'
import ChairCountPicker from '@/components/ChairCountPicker'
import ChairVisual from '@/components/ChairVisual'
import AIFloorPlanner from '@/components/AIFloorPlanner'
import FloorPhotoManager from '@/components/FloorPhotoManager'
import { computeHeat, HeatmapPicker, type HeatMode, type HeatValue } from '@/components/FloorHeatmap'
import { PresetPicker, FLOOR_PRESETS, type FloorPreset } from '@/components/FloorPresets'
import { useTheme, THEMES } from '@/stores/themeStore'

/**
 * Unified Floor Plan — visual, real-time, admin-side.
 * - 100% synced with POS :5175 via /api/floor-state
 * - Shows section zones (Salle / Bar / Terrasse) with colored frames
 * - Tables positioned by their x/y coordinates
 * - Chair dots around each table (click → open order)
 * - Side panel: chair list, order items, transfer/split/pay actions
 * - CONFIG mode (gear button) — allows patron to drag tables, resize zones
 *
 * This view is for the PATRON. Waiters work on :5175 which is simplified.
 */

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  LIBRE:     { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.55)',  text: '#6ee7b7', dot: '#10b981' },
  OCCUPEE:   { bg: 'rgba(245,158,11,0.18)',  border: 'rgba(245,158,11,0.6)',   text: '#fcd34d', dot: '#f59e0b' },
  RESERVEE:  { bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.55)',  text: '#93c5fd', dot: '#3b82f6' },
  NETTOYAGE: { bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.55)',   text: '#fca5a5', dot: '#ef4444' },
}

const SECTION_COLORS: Record<string, { label: string; bg: string; border: string; glow: string }> = {
  Salle:    { label: '🏛  SALLE PRINCIPALE', bg: 'rgba(139,92,246,0.04)', border: 'rgba(139,92,246,0.25)', glow: '#8b5cf6' },
  Bar:      { label: '🍸  BAR',              bg: 'rgba(245,158,11,0.05)', border: 'rgba(245,158,11,0.28)', glow: '#f59e0b' },
  Terrasse: { label: '🌿  TERRASSE',         bg: 'rgba(16,185,129,0.05)', border: 'rgba(16,185,129,0.28)', glow: '#10b981' },
}

const QUICK_MENU = [
  { id: 'q1', name: 'Café',     price: 2.80 },
  { id: 'q2', name: 'Espresso', price: 2.50 },
  { id: 'q3', name: 'Bière',    price: 3.20 },
  { id: 'q4', name: 'Vin',      price: 4.40 },
  { id: 'q5', name: 'Crémant',  price: 6.70 },
  { id: 'q6', name: 'Burger',   price: 4.50 },
  { id: 'q7', name: 'Frites',   price: 4.50 },
  { id: 'q8', name: 'Plancha',  price: 25.50 },
]

// Action handlers — defined inside component below. Declared here for typing.
type FloorActions = ReturnType<typeof useFloorState>

export default function UnifiedFloorPlan() {
  const floor = useFloorState(1500)
  const themeId = useTheme((s) => s.themeId)
  const setTheme = useTheme((s) => s.setTheme)
  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0]

  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [selectedChair, setSelectedChair] = useState<string | null>(null)
  const [configMode, setConfigMode] = useState(false)
  const [modalOpen, setModalOpen] = useState<null | 'transfer' | 'split'>(null)
  const [showAI, setShowAI] = useState(false)
  const [showPhotos, setShowPhotos] = useState(false)
  const [chairPickerTableId, setChairPickerTableId] = useState<string | null>(null)
  // ── Améliorations 2026-04 ────────────────────────────────────────
  const [heatMode, setHeatMode] = useState<HeatMode>('off')
  const [showPresets, setShowPresets] = useState(false)
  const [view3D, setView3D] = useState(false)
  const [showRuler, setShowRuler] = useState(false)
  const [draggingTableId, setDraggingTableId] = useState<string | null>(null)
  const dragOffset = useRef<{ dx: number; dy: number } | null>(null)
  const sectionRef = useRef<HTMLDivElement>(null)

  const tables = floor.state?.tables || []
  const chairs = floor.state?.chairs || []
  const photos = floor.state?.photos || []
  const globalBg = floor.state?.globalBackground

  // A chair can be selected independently (standalone) or through a table.
  const selectedChairObj = chairs.find((c) => c.id === selectedChair) || null
  const selectedTableFromChair = selectedChairObj?.tableId
    ? tables.find((t) => t.id === selectedChairObj.tableId)
    : null

  // Heatmap values per table
  const heat = useMemo(() => computeHeat(floor.state, heatMode), [floor.state, heatMode])

  // Apply preset → reset state with new tables
  const applyPreset = useCallback(async (preset: FloorPreset) => {
    if (!floor.state) return
    const newTables = preset.tables.map((t) => ({
      ...t, items: [], status: 'LIBRE' as const,
    }))
    await fetch((import.meta as any).env?.VITE_BACKEND_URL ?
      `${(import.meta as any).env.VITE_BACKEND_URL}/api/floor-state` :
      'http://localhost:3002/api/floor-state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tables: newTables, chairs: [] }),
    })
    floor.refresh()
  }, [floor])

  // Drag & Drop handlers
  const handleTableDragStart = (e: React.PointerEvent, tableId: string, currentX: number, currentY: number) => {
    if (!configMode) return
    e.stopPropagation()
    const rect = sectionRef.current?.getBoundingClientRect()
    if (!rect) return
    dragOffset.current = {
      dx: e.clientX - rect.left - currentX,
      dy: e.clientY - rect.top - currentY,
    }
    setDraggingTableId(tableId)
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  const handleTableDragMove = (e: React.PointerEvent) => {
    if (!draggingTableId || !dragOffset.current) return
    const rect = sectionRef.current?.getBoundingClientRect()
    if (!rect) return
    const newX = e.clientX - rect.left - dragOffset.current.dx
    const newY = e.clientY - rect.top - dragOffset.current.dy
    // Optimistic local update via direct mutation of state would be ideal,
    // but since we poll, let's just call moveTable on drop.
    ;(window as any).__dragPreview = { id: draggingTableId, x: newX, y: newY }
  }

  const handleTableDragEnd = async (e: React.PointerEvent) => {
    if (!draggingTableId || !dragOffset.current) return
    const preview = (window as any).__dragPreview
    if (preview) {
      // Snap to 8px grid
      const snappedX = Math.round(preview.x / 8) * 8
      const snappedY = Math.round(preview.y / 8) * 8
      await floor.moveTable(draggingTableId, snappedX, snappedY)
      delete (window as any).__dragPreview
    }
    setDraggingTableId(null)
    dragOffset.current = null
  }

  const sections = useMemo(
    () => Array.from(new Set(tables.map((t) => t.section))),
    [tables]
  )

  const current = tables.find((t) => t.id === selectedTable) || null

  // Group tables by section + compute bounding box per section
  const sectionBounds = useMemo(() => {
    const out: Record<string, { x: number; y: number; w: number; h: number; tables: FloorTable[] }> = {}
    for (const t of tables) {
      if (!out[t.section]) out[t.section] = { x: Infinity, y: Infinity, w: 0, h: 0, tables: [] }
      out[t.section].tables.push(t)
      out[t.section].x = Math.min(out[t.section].x, t.x - 60)
      out[t.section].y = Math.min(out[t.section].y, t.y - 60)
    }
    for (const k in out) {
      let maxX = 0, maxY = 0
      for (const t of out[k].tables) {
        maxX = Math.max(maxX, t.x + 120)
        maxY = Math.max(maxY, t.y + 120)
      }
      out[k].w = maxX - out[k].x
      out[k].h = maxY - out[k].y
    }
    return out
  }, [tables])

  if (!floor.state) {
    return <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
      🔄 Chargement du plan de salle…
    </div>
  }

  const occupied = tables.filter(t => t.status === 'OCCUPEE').length
  const free = tables.filter(t => t.status === 'LIBRE').length
  const reserved = tables.filter(t => t.status === 'RESERVEE').length
  const cleaning = tables.filter(t => t.status === 'NETTOYAGE').length
  const totalRevenue = tables.reduce((s, t) => s + tableTotal(floor.state, t.id), 0)

  const showSidePanel = !!(current || selectedChairObj)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: showSidePanel ? '1fr 420px' : '1fr',
      minHeight: '100vh',
      background: globalBg ? `${theme.bg}, url(${globalBg}) center/cover` : theme.bg,
      color: theme.text,
    }}>
      {/* ═══ LEFT — visual floor plan ═══ */}
      <div style={{ padding: 20, overflow: 'auto', position: 'relative' }}>
        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: theme.text }}>
              Plan de salle <span style={{ fontSize: 11, color: theme.textMuted, fontWeight: 500 }}>— vue patron</span>
            </h1>
            <p style={{ fontSize: 12, color: theme.textMuted, margin: '2px 0 0' }}>
              🔗 Synchronisé temps réel avec POS 5175 · màj {new Date(floor.state.updatedAt).toLocaleTimeString()}
            </p>
          </div>

          {/* Theme pastilles */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center', background: 'rgba(255,255,255,0.06)', padding: 4, borderRadius: 999 }}>
            {THEMES.map((t) => (
              <button key={t.id} onClick={() => setTheme(t.id)} title={t.name}
                style={{
                  width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: t.gradient,
                  transform: themeId === t.id ? 'scale(1.15)' : 'scale(1)',
                  boxShadow: themeId === t.id ? `0 0 0 2px ${theme.bg}, 0 0 0 4px ${t.primary}` : 'none',
                }} />
            ))}
          </div>

          {/* Config toggle */}
          <button
            onClick={() => setConfigMode(!configMode)}
            style={{
              padding: '8px 16px', borderRadius: 10,
              border: configMode ? `1px solid ${theme.primary}` : '1px solid rgba(255,255,255,0.1)',
              background: configMode ? `${theme.primary}30` : 'rgba(255,255,255,0.04)',
              color: configMode ? theme.primary : theme.text,
              cursor: 'pointer', fontWeight: 700, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
            ⚙ {configMode ? 'Mode Config ON' : 'Mode Config'}
          </button>

          {/* Heatmap toggle row */}
          <HeatmapPicker mode={heatMode} onChange={setHeatMode} theme={theme} />

          <button
            onClick={() => setShowPresets(true)}
            title="Charger un layout pré-fait"
            style={{
              padding: '8px 14px', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: theme.text, cursor: 'pointer', fontWeight: 700, fontSize: 13,
            }}>
            📐 Modèles
          </button>

          <button
            onClick={() => setView3D((v) => !v)}
            title="Vue 3D isométrique"
            style={{
              padding: '8px 14px', borderRadius: 10,
              border: view3D ? `1px solid ${theme.primary}` : '1px solid rgba(255,255,255,0.1)',
              background: view3D ? `${theme.primary}30` : 'rgba(255,255,255,0.04)',
              color: view3D ? theme.primary : theme.text,
              cursor: 'pointer', fontWeight: 700, fontSize: 13,
            }}>
            👁 {view3D ? '3D' : '2D'}
          </button>

          <button
            onClick={() => setShowRuler((v) => !v)}
            title="Afficher la règle (passages 90 cm)"
            style={{
              padding: '8px 14px', borderRadius: 10,
              border: showRuler ? `1px solid ${theme.primary}` : '1px solid rgba(255,255,255,0.1)',
              background: showRuler ? `${theme.primary}30` : 'rgba(255,255,255,0.04)',
              color: showRuler ? theme.primary : theme.text,
              cursor: 'pointer', fontWeight: 700, fontSize: 13,
            }}>
            📏 Règle
          </button>

          <button
            onClick={() => setShowAI((v) => !v)}
            style={{
              padding: '8px 16px', borderRadius: 10,
              border: showAI ? `1px solid ${theme.primary}` : '1px solid rgba(255,255,255,0.1)',
              background: showAI ? `${theme.primary}30` : 'rgba(255,255,255,0.04)',
              color: showAI ? theme.primary : theme.text,
              cursor: 'pointer', fontWeight: 700, fontSize: 13,
            }}>
            🤖 IA planner
          </button>

          <button
            onClick={() => setShowPhotos((v) => !v)}
            style={{
              padding: '8px 16px', borderRadius: 10,
              border: showPhotos ? `1px solid ${theme.primary}` : '1px solid rgba(255,255,255,0.1)',
              background: showPhotos ? `${theme.primary}30` : 'rgba(255,255,255,0.04)',
              color: showPhotos ? theme.primary : theme.text,
              cursor: 'pointer', fontWeight: 700, fontSize: 13,
            }}>
            🖼 Photos
          </button>

          <button
            onClick={() => window.open('http://localhost:5175/', '_blank')}
            style={{
              padding: '8px 16px', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: theme.text, cursor: 'pointer', fontWeight: 700, fontSize: 13,
            }}>
            📱 POS serveurs
          </button>
        </header>

        {/* AI planner panel (collapsible) */}
        {showAI && (
          <AIFloorPlanner onGenerate={floor.aiGeneratePlan} theme={theme} />
        )}

        {/* Photo manager (collapsible) */}
        {showPhotos && (
          <FloorPhotoManager
            photos={photos}
            globalBackground={globalBg}
            onAddPhoto={floor.addPhoto}
            onRemovePhoto={floor.removePhoto}
            onSetGlobalBackground={floor.setGlobalBackground}
            theme={theme}
          />
        )}

        {/* Stats bar */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10, marginBottom: 16,
        }}>
          <StatCard label="Libres"    value={free}     color="#10b981" theme={theme} />
          <StatCard label="Occupées"  value={occupied} color="#f59e0b" theme={theme} />
          <StatCard label="Réservées" value={reserved} color="#3b82f6" theme={theme} />
          <StatCard label="Nettoyage" value={cleaning} color="#ef4444" theme={theme} />
          <StatCard label="CA en cours" value={`${totalRevenue.toFixed(2)} €`} color={theme.primary} theme={theme} />
        </div>

        {/* Floating photos layer (above canvas, below selection) */}
        {photos.length > 0 && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 2 }}>
            {photos.map((p) => (
              <div key={p.id} style={{
                position: 'absolute', left: p.x, top: p.y, width: p.w, height: p.h,
                transform: `rotate(${p.rotate || 0}deg)`,
                pointerEvents: 'auto',
              }}>
                <img src={p.dataUrl} alt="" style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                  border: '2px solid rgba(255,255,255,0.15)',
                }} />
                <button onClick={() => floor.removePhoto(p.id)} style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', lineHeight: 1,
                }}>×</button>
              </div>
            ))}
          </div>
        )}

        {/* Sections with tables positioned (with 3D + ruler overlays) */}
        <div
          ref={sectionRef}
          onPointerMove={handleTableDragMove}
          onPointerUp={handleTableDragEnd}
          style={{
            display: 'flex', flexDirection: 'column', gap: 20,
            perspective: view3D ? '1400px' : 'none',
            transformStyle: view3D ? 'preserve-3d' : 'flat',
            transition: 'all .4s ease',
            transform: view3D ? 'rotateX(38deg) translateZ(-30px)' : 'none',
            transformOrigin: 'center top',
            cursor: configMode && draggingTableId ? 'grabbing' : 'default',
            position: 'relative',
          }}>
          {sections.map((sectionName) => {
            const sec = SECTION_COLORS[sectionName] || SECTION_COLORS.Salle
            const bounds = sectionBounds[sectionName]
            const secTables = tables.filter((t) => t.section === sectionName)

            return (
              <div key={sectionName} style={{
                position: 'relative',
                minHeight: bounds?.h ? Math.max(200, bounds.h + 30) : 260,
                background: sec.bg,
                border: `1px dashed ${sec.border}`,
                borderRadius: 16,
                padding: 20,
                boxShadow: `inset 0 0 40px ${sec.glow}08`,
                overflow: 'hidden',
              }}>
                {/* Section title */}
                <div style={{
                  fontSize: 11, fontWeight: 800, letterSpacing: 2,
                  color: sec.glow, opacity: 0.9, marginBottom: 20,
                }}>
                  {sec.label} · {secTables.length} table{secTables.length > 1 ? 's' : ''}
                </div>

                {/* Grid background */}
                {(configMode || showRuler) && <GridOverlay />}
                {showRuler && <RulerOverlay />}

                {/* Tables positioned */}
                <div style={{ position: 'relative', minHeight: 200 }}>
                  {secTables.map((t) => {
                    const offsetX = t.x - (bounds?.x || 0) - 20
                    const offsetY = t.y - (bounds?.y || 0) - 20
                    const tableChairs = chairs.filter((c) => c.tableId === t.id)
                    return (
                      <TableVisual
                        key={t.id}
                        table={t}
                        chairs={tableChairs}
                        offsetX={offsetX}
                        offsetY={offsetY}
                        selected={t.id === selectedTable}
                        selectedChairId={selectedChair}
                        total={tableTotal(floor.state, t.id)}
                        heat={heat.get(t.id)}
                        onDragStart={(e) => handleTableDragStart(e, t.id, offsetX, offsetY)}
                        isDragging={draggingTableId === t.id}
                        onClick={() => {
                          if (configMode) {
                            setChairPickerTableId(t.id)
                          } else {
                            setSelectedTable(t.id === selectedTable ? null : t.id)
                            setSelectedChair(null)
                          }
                        }}
                        onChairClick={(chairId) => {
                          if (configMode) {
                            // In config mode, clicking a chair removes it
                            if (confirm('Supprimer cette chaise ?')) floor.removeChair(chairId)
                          } else {
                            setSelectedChair(chairId === selectedChair ? null : chairId)
                            setSelectedTable(null)
                          }
                        }}
                        onAddChair={() => floor.addChair(t.id)}
                        configMode={configMode}
                        theme={theme}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div style={{
          display: 'flex', gap: 18, marginTop: 16, padding: 10,
          background: 'rgba(255,255,255,0.04)', borderRadius: 10,
          fontSize: 11, color: theme.textMuted, flexWrap: 'wrap',
        }}>
          <LegendItem color="#10b981" label="Libre" />
          <LegendItem color="#f59e0b" label="Occupée" />
          <LegendItem color="#3b82f6" label="Réservée" />
          <LegendItem color="#ef4444" label="À nettoyer" />
          {configMode && <span style={{ marginLeft: 'auto', color: theme.primary, fontWeight: 700 }}>⚙ Mode config : glissez les tables pour repositionner</span>}
        </div>
      </div>

      {/* ═══ RIGHT — side panel (table OR chair) ═══ */}
      {showSidePanel && (
        <aside style={{
          background: 'rgba(0,0,0,0.25)', borderLeft: `1px solid ${theme.primary}30`,
          padding: 18, overflowY: 'auto', backdropFilter: 'blur(14px)',
        }}>
          {selectedChairObj ? (
            <ChairPanel
              chair={selectedChairObj}
              parentTable={selectedTableFromChair}
              floor={floor}
              theme={theme}
              onClose={() => setSelectedChair(null)}
              onTransfer={() => setModalOpen('transfer')}
              onSplit={() => setModalOpen('split')}
            />
          ) : current && (
            <TablePanel
              table={current}
              chairs={chairs.filter((c) => c.tableId === current.id)}
              total={tableTotal(floor.state, current.id)}
              selectedChair={selectedChair}
              onSelectChair={setSelectedChair}
              floor={floor}
              theme={theme}
              onClose={() => { setSelectedTable(null); setSelectedChair(null) }}
              onTransfer={() => setModalOpen('transfer')}
              onSplit={() => setModalOpen('split')}
            />
          )}
        </aside>
      )}

      {/* Preset picker — load a pre-built layout */}
      <PresetPicker
        open={showPresets}
        onClose={() => setShowPresets(false)}
        onPick={applyPreset}
        theme={theme}
      />

      {/* Chair count picker (config mode) */}
      {chairPickerTableId && floor.state && (() => {
        const pickerTable = tables.find((t) => t.id === chairPickerTableId)
        if (!pickerTable) return null
        const currentChairs = chairs.filter((c) => c.tableId === pickerTable.id)
        const handleSetCount = async (target: number) => {
          const diff = target - currentChairs.length
          if (diff > 0) {
            for (let i = 0; i < diff; i++) await floor.addChair(pickerTable.id)
          } else if (diff < 0) {
            const toRemove = currentChairs.slice(diff) // last N chairs
            for (const c of toRemove) await floor.removeChair(c.id)
          }
        }
        return (
          <ChairCountPicker
            table={pickerTable}
            currentChairCount={currentChairs.length}
            onSelect={handleSetCount}
            onClose={() => setChairPickerTableId(null)}
            onAddOne={() => floor.addChair(pickerTable.id)}
            onRemoveOne={() => {
              const last = currentChairs[currentChairs.length - 1]
              if (last) floor.removeChair(last.id)
            }}
          />
        )
      })()}

      {/* Transfer wizard (3 steps) or Split modal */}
      {modalOpen === 'transfer' && floor.state && (
        <TransferWizard
          open
          state={floor.state}
          originTableId={selectedTable}
          onClose={() => setModalOpen(null)}
          onTransferItems={floor.transferItems}
          onTransferChair={floor.transferChair}
        />
      )}
      {modalOpen === 'split' && floor.state && (
        <TransferSplitModal
          open
          mode="split"
          state={floor.state}
          originTableId={selectedTable}
          onClose={() => setModalOpen(null)}
          onTransferItems={floor.transferItems}
          onTransferChair={floor.transferChair}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Table visual — positioned absolutely, with chair dots around
// ═══════════════════════════════════════════════════════════════════════════
function TableVisual({
  table, chairs, offsetX, offsetY, selected, selectedChairId, total,
  onClick, onChairClick, onAddChair, configMode, theme,
  heat, onDragStart, isDragging,
}: {
  table: FloorTable
  chairs: FloorChair[]
  offsetX: number
  offsetY: number
  selected: boolean
  selectedChairId: string | null
  total: number
  onClick: () => void
  onChairClick: (chairId: string) => void
  onAddChair: () => void
  configMode: boolean
  theme: any
  heat?: HeatValue
  onDragStart?: (e: React.PointerEvent) => void
  isDragging?: boolean
}) {
  const cfg = STATUS_COLORS[table.status]
  const size = table.shape === 'bar' ? { w: 160, h: 70 }
    : table.shape === 'rect' ? { w: 140, h: 88 }
    : table.shape === 'square' ? { w: 96, h: 96 }
    : { w: 92, h: 92 }
  const borderRadius = table.shape === 'round' ? '50%' : 12

  // Heatmap override colors
  const useHeat = !!heat
  const heatBg = useHeat ? `${heat.color}30` : undefined
  const heatBorder = useHeat ? heat.color : undefined

  // Chair dots around the table
  const chairCount = Math.max(chairs.length, table.seats || 2)
  const dotPositions = getChairDotPositions(table.shape, size, chairCount)

  return (
    <div style={{
      position: 'absolute', left: offsetX, top: offsetY,
      width: size.w + 40, height: size.h + 40,
      padding: 20,
    }}>
      {/* Clickable chair dots — each is a full-fledged entity */}
      {dotPositions.map((pos, i) => {
        const linked = chairs[i]
        const isSelected = linked && linked.id === selectedChairId
        return (
          <ChairVisual
            key={i}
            chair={linked || null}
            placeNumber={i + 1}
            x={pos.x + 20}
            y={pos.y + 20}
            selected={!!isSelected}
            onClick={() => {
              if (linked) onChairClick(linked.id)
              else onAddChair()
            }}
            theme={theme}
          />
        )
      })}

      {/* Table itself */}
      <button
        onClick={onClick}
        onPointerDown={configMode ? onDragStart : undefined}
        style={{
          position: 'absolute', left: 20, top: 20,
          width: size.w, height: size.h,
          borderRadius,
          background: useHeat ? heatBg : cfg.bg,
          border: `2px solid ${selected ? theme.primary : useHeat ? heatBorder : cfg.border}`,
          color: cfg.text,
          cursor: configMode ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 2, fontWeight: 700,
          transition: isDragging ? 'none' : 'all .15s',
          boxShadow: selected
            ? `0 0 0 4px ${theme.primary}40, 0 8px 24px ${theme.primary}50`
            : useHeat
              ? `0 0 24px ${heat!.color}80, 0 0 0 1px ${heat!.color}40 inset`
              : '0 2px 8px rgba(0,0,0,0.25)',
          transform: selected || isDragging ? 'scale(1.08)' : 'scale(1)',
          touchAction: configMode ? 'none' : 'auto',
          opacity: isDragging ? 0.7 : 1,
        }}>
        <div style={{ fontSize: 14, color: '#fff' }}>{table.name}</div>
        <div style={{ fontSize: 10, opacity: 0.8 }}>{table.seats} pl.</div>
        {total > 0 && !useHeat && (
          <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 800 }}>
            {total.toFixed(2)} €
          </div>
        )}
        {useHeat && (
          <div style={{ fontSize: 11, color: heat!.color, fontWeight: 800 }}>
            {heat!.label}
          </div>
        )}
        {/* Heat badge */}
        {useHeat && heat!.badge && (
          <div style={{
            position: 'absolute', top: -10, left: -10,
            width: 24, height: 24, borderRadius: '50%',
            background: heat!.color, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800,
            boxShadow: `0 0 10px ${heat!.color}`,
          }}>{heat!.badge}</div>
        )}
        {/* Status dot */}
        {!useHeat && (
          <div style={{
            position: 'absolute', top: 6, right: 6,
            width: 8, height: 8, borderRadius: '50%',
            background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}`,
          }} />
        )}
      </button>
    </div>
  )
}

// ─── Ruler overlay (90 cm passages indicator) ──────────────────────────────
function RulerOverlay() {
  // 1 grid square = 40px ≈ 50 cm in the demo scale
  // 90 cm passage = 72px between table edges
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4,
      backgroundImage:
        'linear-gradient(rgba(99,102,241,0.18) 2px, transparent 2px),' +
        'linear-gradient(90deg, rgba(99,102,241,0.18) 2px, transparent 2px)',
      backgroundSize: '72px 72px',
    }}>
      <div style={{
        position: 'absolute', top: 6, right: 12,
        padding: '4px 10px', background: 'rgba(99,102,241,0.85)',
        color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 6,
      }}>
        📏 Maillage 90 cm (passage serveur)
      </div>
    </div>
  )
}

function getChairDotPositions(shape: string, size: { w: number; h: number }, n: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = []
  if (shape === 'round') {
    const cx = size.w / 2
    const cy = size.h / 2
    const r = size.w / 2 + 10
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2
      positions.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) })
    }
  } else if (shape === 'bar') {
    for (let i = 0; i < n; i++) {
      positions.push({ x: 20 + (i * (size.w - 40)) / Math.max(1, n - 1), y: size.h + 10 })
    }
  } else {
    // square/rect — distribute on 4 sides
    const perSide = Math.ceil(n / 4)
    let idx = 0
    for (let s = 0; s < 4 && idx < n; s++) {
      for (let i = 0; i < perSide && idx < n; i++, idx++) {
        const frac = (i + 1) / (perSide + 1)
        if (s === 0) positions.push({ x: size.w * frac, y: -10 }) // top
        else if (s === 1) positions.push({ x: size.w + 10, y: size.h * frac }) // right
        else if (s === 2) positions.push({ x: size.w * frac, y: size.h + 10 }) // bottom
        else positions.push({ x: -10, y: size.h * frac }) // left
      }
    }
  }
  return positions
}

// ═══════════════════════════════════════════════════════════════════════════
// Right side-panel
// ═══════════════════════════════════════════════════════════════════════════
function TablePanel({
  table, chairs, total, selectedChair, onSelectChair, floor, theme,
  onClose, onTransfer, onSplit,
}: any) {
  const cfg = STATUS_COLORS[table.status]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>🍽 {table.name}</h2>
          <div style={{ fontSize: 12, color: theme.textMuted }}>{table.section} · {table.seats} couverts</div>
        </div>
        <button onClick={onClose} style={{
          width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.04)', color: theme.text, cursor: 'pointer',
        }}>✕</button>
      </div>

      {/* Status card */}
      <div style={{
        padding: 14, borderRadius: 12, marginBottom: 14,
        background: cfg.bg, border: `1px solid ${cfg.border}`,
      }}>
        <div style={{ fontSize: 10, color: theme.textMuted, letterSpacing: 1 }}>STATUT</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: cfg.dot }}>{table.status}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12 }}>
          <span style={{ color: theme.textMuted }}>
            {chairs.length} chaise(s) · {chairs.reduce((s: number, c: FloorChair) => s + c.items.length, 0)} articles
          </span>
          <span style={{ fontSize: 20, fontWeight: 800, color: theme.primary }}>
            {total.toFixed(2)} €
          </span>
        </div>
      </div>

      {/* Quick actions grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
        <ActionBtn emoji="🔀" label="Transférer" onClick={onTransfer} color="#8b5cf6" />
        <ActionBtn emoji="✂️" label="Splitter"   onClick={onSplit}    color="#06b6d4" />
        <ActionBtn emoji="💳" label={`Payer ${total > 0 ? total.toFixed(2) + ' €' : ''}`}
                   onClick={() => alert(`Paiement ${total.toFixed(2)} €`)} color="#10b981" disabled={total === 0} />
        <ActionBtn emoji="🚪" label="Fermer"     onClick={() => floor.closeTable(table.id)} color="#ef4444" />
      </div>

      {/* Chairs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: theme.textMuted, letterSpacing: 1 }}>
          🪑 CHAISES ({chairs.length})
        </span>
        <button
          onClick={() => floor.addChair(table.id)}
          style={{
            padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryLight})`,
            color: '#fff', fontSize: 11, fontWeight: 700,
          }}>+ Chaise</button>
      </div>

      {chairs.length === 0 ? (
        <div style={{
          padding: 14, textAlign: 'center', color: theme.textMuted, fontSize: 12,
          background: 'rgba(255,255,255,0.03)', borderRadius: 10,
        }}>
          Aucune chaise active — ajoutez-en pour commander par personne.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {chairs.map((ch: FloorChair) => {
            const active = ch.id === selectedChair
            const chTotal = chairTotal(ch)
            return (
              <div key={ch.id}
                onClick={() => onSelectChair(active ? null : ch.id)}
                style={{
                  background: active ? `${theme.primary}20` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${active ? theme.primary : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 10, padding: 10, cursor: 'pointer',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>🪑 {ch.label}</div>
                    <input
                      placeholder="Nom client…"
                      value={ch.customerName || ''}
                      onChange={(e) => floor.setChairCustomer(ch.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        background: 'transparent', border: 'none', color: theme.textMuted,
                        fontSize: 11, outline: 'none', padding: 0, width: '100%', marginTop: 2,
                      }}
                    />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: theme.primary }}>
                      {chTotal.toFixed(2)} €
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm('Supprimer la chaise ?')) floor.removeChair(ch.id) }}
                      style={{ background: 'transparent', border: 'none', color: theme.textMuted, fontSize: 11, cursor: 'pointer' }}>
                      🗑
                    </button>
                  </div>
                </div>

                {ch.items.length > 0 && (
                  <div style={{ marginTop: 6, fontSize: 11, color: theme.textMuted }}>
                    {ch.items.map((i: any) => (
                      <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                        <span>{i.qty}× {i.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{(i.price * i.qty).toFixed(2)} €</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); floor.removeItemFromChair(ch.id, i.id) }}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11 }}
                          >×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Quick order */}
      {selectedChair && (
        <div style={{ marginTop: 14, padding: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: theme.textMuted, letterSpacing: 1, marginBottom: 8 }}>
            + AJOUTER À LA CHAISE
          </div>
          <div style={{ display: 'grid', gap: 4, gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {QUICK_MENU.map((m) => (
              <button key={m.id}
                onClick={() => floor.addItemToChair(selectedChair, { name: m.name, price: m.price, qty: 1 })}
                style={{
                  padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)', color: theme.text, cursor: 'pointer',
                  fontSize: 12, textAlign: 'left',
                }}>
                <div style={{ fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: 10, color: theme.textMuted }}>{m.price.toFixed(2)} €</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Chair-level panel — same feature set as TablePanel but for a single chair
// ═══════════════════════════════════════════════════════════════════════════
function ChairPanel({ chair, parentTable, floor, theme, onClose, onTransfer, onSplit }: any) {
  const total = chair.items.reduce((s: number, i: any) => s + i.price * i.qty, 0)
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>🪑 {chair.label}</h2>
          <div style={{ fontSize: 12, color: theme.textMuted }}>
            {parentTable ? `sur ${parentTable.name}` : 'chaise indépendante'}
          </div>
        </div>
        <button onClick={onClose} style={{
          width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.04)', color: theme.text, cursor: 'pointer',
        }}>✕</button>
      </div>

      {/* Customer name */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: theme.textMuted, letterSpacing: 1 }}>CLIENT</label>
        <input
          placeholder="Nom du client…"
          value={chair.customerName || ''}
          onChange={(e) => floor.setChairCustomer(chair.id, e.target.value)}
          style={{
            width: '100%', marginTop: 4, padding: '8px 10px',
            background: 'rgba(0,0,0,0.3)', border: `1px solid ${theme.primary}30`,
            borderRadius: 8, color: theme.text, outline: 'none', fontSize: 13,
          }}
        />
      </div>

      {/* Total */}
      <div style={{
        padding: 14, borderRadius: 12, marginBottom: 14,
        background: total > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.1)',
        border: `1px solid ${total > 0 ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.3)'}`,
      }}>
        <div style={{ fontSize: 10, color: theme.textMuted, letterSpacing: 1 }}>TOTAL CHAISE</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: theme.primary }}>
          {total.toFixed(2)} €
        </div>
        <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
          {chair.items.length} article{chair.items.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Actions — identical to TablePanel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
        <ActionBtn emoji="🔀" label="Transférer" onClick={onTransfer} color="#8b5cf6" />
        <ActionBtn emoji="✂️" label="Splitter"   onClick={onSplit}    color="#06b6d4" />
        <ActionBtn emoji="💳" label={`Payer ${total > 0 ? total.toFixed(2) + ' €' : ''}`}
                   onClick={() => alert(`Paiement chaise ${chair.label}: ${total.toFixed(2)} €`)}
                   color="#10b981" disabled={total === 0} />
        <ActionBtn emoji="🚪" label="Libérer" onClick={() => floor.closeChair(chair.id)} color="#ef4444" />
      </div>

      {/* Items list */}
      <div style={{ fontSize: 11, fontWeight: 800, color: theme.textMuted, letterSpacing: 1, marginBottom: 8 }}>
        📋 COMMANDE ({chair.items.length})
      </div>

      {chair.items.length === 0 ? (
        <div style={{
          padding: 14, textAlign: 'center', color: theme.textMuted, fontSize: 12,
          background: 'rgba(255,255,255,0.03)', borderRadius: 10, marginBottom: 14,
        }}>
          Aucun article — ajoutez depuis le menu rapide ci-dessous
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          {chair.items.map((i: any) => (
            <div key={i.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 10px', marginBottom: 4,
              background: 'rgba(255,255,255,0.04)', borderRadius: 8,
            }}>
              <span style={{ flex: 1, fontSize: 13 }}>
                <strong>{i.qty}×</strong> {i.name}
              </span>
              <span style={{ fontSize: 12, color: theme.primary, fontWeight: 700, marginRight: 8 }}>
                {(i.price * i.qty).toFixed(2)} €
              </span>
              <button onClick={() => floor.removeItemFromChair(chair.id, i.id)}
                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14 }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Quick menu */}
      <div style={{ padding: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: theme.textMuted, letterSpacing: 1, marginBottom: 8 }}>
          + AJOUTER
        </div>
        <div style={{ display: 'grid', gap: 4, gridTemplateColumns: 'repeat(2, 1fr)' }}>
          {QUICK_MENU.map((m) => (
            <button key={m.id}
              onClick={() => floor.addItemToChair(chair.id, { name: m.name, price: m.price, qty: 1 })}
              style={{
                padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)', color: theme.text, cursor: 'pointer',
                fontSize: 12, textAlign: 'left',
              }}>
              <div style={{ fontWeight: 600 }}>{m.name}</div>
              <div style={{ fontSize: 10, color: theme.textMuted }}>{m.price.toFixed(2)} €</div>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Small components
// ═══════════════════════════════════════════════════════════════════════════
function StatCard({ label, value, color, theme }: any) {
  return (
    <div style={{
      padding: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 10,
    }}>
      <div style={{ fontSize: 10, color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
      {label}
    </div>
  )
}

function ActionBtn({ emoji, label, onClick, color, disabled }: any) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '12px 10px', borderRadius: 10, border: `1px solid ${color}40`,
      background: disabled ? 'rgba(148,163,184,0.1)' : `${color}20`,
      color: disabled ? '#64748b' : color,
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      fontWeight: 700, fontSize: 11, transition: 'all .15s',
    }}>
      <span style={{ fontSize: 18 }}>{emoji}</span>
      {label}
    </button>
  )
}

function GridOverlay() {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      backgroundImage:
        'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),' +
        'linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
      backgroundSize: '40px 40px',
    }} />
  )
}
