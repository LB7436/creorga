import { useState, useRef } from 'react'
import { useRoomDesigner, ELEMENT_STYLES, type ElementType, type RoomElement } from '@/stores/roomDesignerStore'

/**
 * Visual room designer — drag tools from the palette onto the canvas.
 * Drawing mode: click-drag to create an element of the active tool.
 * Select mode: click an element to select/move/resize/delete.
 */

const TOOLS: ElementType[] = ['wall', 'window', 'door', 'counter', 'bar', 'stairs', 'plant']

export default function RoomDesignerPage() {
  const rooms = useRoomDesigner((s) => s.rooms)
  const activeRoomId = useRoomDesigner((s) => s.activeRoomId)
  const { addRoom, setActiveRoom, addElement, updateElement, removeElement, clearElements } = useRoomDesigner()

  const room = rooms.find((r) => r.id === activeRoomId) ?? rooms[0]
  const [tool, setTool] = useState<ElementType | 'select'>('select')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragRect, setDragRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)

  if (!room) {
    return (
      <div style={{ padding: 32 }}>
        <button onClick={() => addRoom('Nouvelle salle')} style={btnPrimary}>+ Créer une salle</button>
      </div>
    )
  }

  const screenToSvg = (evt: React.MouseEvent) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = evt.clientX
    pt.y = evt.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: evt.clientX, y: evt.clientY }
    const loc = pt.matrixTransform(ctm.inverse())
    return { x: loc.x, y: loc.y }
  }

  const onMouseDown = (e: React.MouseEvent) => {
    if (tool === 'select') return
    const p = screenToSvg(e)
    dragStart.current = p
    setDragRect({ x: p.x, y: p.y, w: 0, h: 0 })
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragStart.current) return
    const p = screenToSvg(e)
    const x = Math.min(dragStart.current.x, p.x)
    const y = Math.min(dragStart.current.y, p.y)
    const w = Math.abs(p.x - dragStart.current.x)
    const h = Math.abs(p.y - dragStart.current.y)
    setDragRect({ x, y, w, h })
  }

  const onMouseUp = () => {
    if (dragRect && tool !== 'select' && dragRect.w > 6 && dragRect.h > 6) {
      addElement(room.id, { type: tool, ...dragRect })
    }
    setDragRect(null)
    dragStart.current = null
  }

  const selected = room.elements.find((e) => e.id === selectedId) ?? null

  return (
    <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '260px 1fr 260px', gap: 16, height: '100%', minHeight: 720 }}>
      {/* Tool palette */}
      <aside style={paletteStyle}>
        <h3 style={titleStyle}>Outils</h3>

        <button onClick={() => { setTool('select'); setSelectedId(null) }}
          style={{ ...toolBtn, background: tool === 'select' ? '#6366f1' : '#fff', color: tool === 'select' ? '#fff' : '#1e293b' }}>
          🖱 Sélection
        </button>

        {TOOLS.map((t) => {
          const s = ELEMENT_STYLES[t]
          const active = tool === t
          return (
            <button key={t} onClick={() => setTool(t)}
              style={{ ...toolBtn, background: active ? s.stroke : '#fff', color: active ? '#fff' : '#1e293b' }}>
              <span style={{ fontSize: 18 }}>{s.emoji}</span> {s.label}
            </button>
          )
        })}

        <div style={{ height: 1, background: '#e2e8f0', margin: '12px 0' }} />
        <button onClick={() => clearElements(room.id)} style={{ ...toolBtn, background: '#fee2e2', color: '#991b1b' }}>
          🗑 Tout effacer
        </button>
        <button onClick={() => addRoom('Nouvelle salle')} style={{ ...toolBtn, background: '#ecfdf5', color: '#065f46' }}>
          + Nouvelle salle
        </button>
      </aside>

      {/* Canvas */}
      <section style={{ background: '#f1f5f9', borderRadius: 12, padding: 10, position: 'relative', overflow: 'hidden' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          {rooms.map((r) => (
            <button key={r.id} onClick={() => setActiveRoom(r.id)}
              style={{ ...chipBtn, background: r.id === room.id ? '#6366f1' : '#fff', color: r.id === room.id ? '#fff' : '#1e293b' }}>
              {r.name}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: 13 }}>
            {room.elements.length} éléments · {tool === 'select' ? 'cliquez pour sélectionner' : `cliquez-glissez pour dessiner un ${ELEMENT_STYLES[tool].label.toLowerCase()}`}
          </span>
        </header>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${room.width} ${room.height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{
            width: '100%', height: 'calc(100% - 40px)', minHeight: 600,
            background: `
              linear-gradient(#e2e8f0 1px, transparent 1px) 0 0/40px 40px,
              linear-gradient(90deg, #e2e8f0 1px, transparent 1px) 0 0/40px 40px,
              #fff
            `,
            borderRadius: 8, cursor: tool === 'select' ? 'default' : 'crosshair',
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {room.elements.map((el) => (
            <ElementNode key={el.id} el={el}
              selected={el.id === selectedId}
              onClick={(e) => { e.stopPropagation(); if (tool === 'select') setSelectedId(el.id) }}
            />
          ))}

          {dragRect && tool !== 'select' && (
            <rect x={dragRect.x} y={dragRect.y} width={dragRect.w} height={dragRect.h}
              fill={ELEMENT_STYLES[tool].fill} fillOpacity={0.5}
              stroke={ELEMENT_STYLES[tool].stroke} strokeDasharray="6 4" strokeWidth={2} />
          )}
        </svg>
      </section>

      {/* Inspector */}
      <aside style={paletteStyle}>
        <h3 style={titleStyle}>Propriétés</h3>
        {selected ? (
          <ElementInspector
            key={selected.id}
            el={selected}
            onChange={(patch) => updateElement(room.id, selected.id, patch)}
            onDelete={() => { removeElement(room.id, selected.id); setSelectedId(null) }}
          />
        ) : (
          <p style={{ color: '#64748b', fontSize: 13 }}>
            Sélectionnez un élément pour le modifier, ou choisissez un outil pour dessiner.
          </p>
        )}

        <div style={{ marginTop: 24, padding: 12, background: '#eef2ff', borderRadius: 10, fontSize: 13, color: '#4338ca' }}>
          💡 Astuce : dessinez les murs d'abord, puis les fenêtres et portes dessus. Ajoutez ensuite comptoir, bar et escaliers.
        </div>
      </aside>
    </div>
  )
}

function ElementNode({ el, selected, onClick }: { el: RoomElement; selected: boolean; onClick: (e: React.MouseEvent) => void }) {
  const s = ELEMENT_STYLES[el.type]
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      {el.type === 'window' ? (
        <>
          <rect x={el.x} y={el.y} width={el.w} height={el.h} fill={s.fill} stroke={s.stroke} strokeWidth={2} />
          <line x1={el.x} y1={el.y + el.h / 2} x2={el.x + el.w} y2={el.y + el.h / 2} stroke={s.stroke} strokeWidth={1} />
        </>
      ) : el.type === 'stairs' ? (
        <g>
          <rect x={el.x} y={el.y} width={el.w} height={el.h} fill={s.fill} stroke={s.stroke} strokeWidth={2} />
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={i} x1={el.x} y1={el.y + (i + 1) * (el.h / 7)}
              x2={el.x + el.w} y2={el.y + (i + 1) * (el.h / 7)}
              stroke={s.stroke} strokeWidth={1.5} />
          ))}
        </g>
      ) : el.type === 'plant' ? (
        <g>
          <circle cx={el.x + el.w / 2} cy={el.y + el.h / 2} r={Math.min(el.w, el.h) / 2} fill={s.fill} stroke={s.stroke} strokeWidth={2} />
          <text x={el.x + el.w / 2} y={el.y + el.h / 2 + 6} textAnchor="middle" fontSize={18}>🪴</text>
        </g>
      ) : (
        <rect x={el.x} y={el.y} width={el.w} height={el.h} fill={s.fill} stroke={s.stroke} strokeWidth={2} rx={el.type === 'wall' ? 0 : 4} />
      )}

      {el.label && (
        <text x={el.x + el.w / 2} y={el.y + el.h / 2 + 4}
          textAnchor="middle" fontSize={12} fontWeight={600} fill="#1e293b" pointerEvents="none">
          {el.label}
        </text>
      )}

      {selected && (
        <rect x={el.x - 4} y={el.y - 4} width={el.w + 8} height={el.h + 8}
          fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 3" pointerEvents="none" />
      )}
    </g>
  )
}

function ElementInspector({
  el, onChange, onDelete,
}: { el: RoomElement; onChange: (patch: Partial<RoomElement>) => void; onDelete: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
      <div style={{ fontWeight: 700 }}>{ELEMENT_STYLES[el.type].emoji} {ELEMENT_STYLES[el.type].label}</div>

      <label>Label
        <input type="text" value={el.label ?? ''} onChange={(e) => onChange({ label: e.target.value })}
          style={inputStyle} />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <label>X <input type="number" value={Math.round(el.x)} onChange={(e) => onChange({ x: +e.target.value })} style={inputStyle} /></label>
        <label>Y <input type="number" value={Math.round(el.y)} onChange={(e) => onChange({ y: +e.target.value })} style={inputStyle} /></label>
        <label>L <input type="number" value={Math.round(el.w)} onChange={(e) => onChange({ w: +e.target.value })} style={inputStyle} /></label>
        <label>H <input type="number" value={Math.round(el.h)} onChange={(e) => onChange({ h: +e.target.value })} style={inputStyle} /></label>
      </div>

      <button onClick={onDelete} style={{ ...toolBtn, background: '#fee2e2', color: '#991b1b', marginTop: 8 }}>
        🗑 Supprimer
      </button>
    </div>
  )
}

// ─── Styles ──
const paletteStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: 14,
  border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 6,
  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
}
const titleStyle: React.CSSProperties = { margin: '0 0 8px', fontSize: 15, fontWeight: 700 }
const toolBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
  fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
  transition: 'all .15s',
}
const chipBtn: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 999, border: '1px solid #e2e8f0',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 8px', marginTop: 3,
  border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13,
}
const btnPrimary: React.CSSProperties = {
  padding: '10px 20px', borderRadius: 10, border: 'none',
  background: '#6366f1', color: '#fff', fontWeight: 600, cursor: 'pointer',
}
