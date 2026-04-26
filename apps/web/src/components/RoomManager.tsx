import { useState } from 'react'
import type { FloorZone } from '@/hooks/useFloorState'

/**
 * Room (zone) manager modal.
 * Lets the patron add / rename / delete rooms (Salle, Bar, Terrasse, Cave...).
 * Each new zone gets a color and is auto-detected by floor plan rendering.
 */
interface Props {
  open: boolean
  onClose: () => void
  zones: FloorZone[]
  onAdd: (data: { name: string; color: string }) => Promise<any>
  onPatch: (id: string, data: { name?: string; color?: string }) => Promise<any>
  onDelete: (id: string) => Promise<any>
  theme: any
}

const COLORS = [
  '#8b5cf6', '#6366f1', '#ec4899', '#f43f5e',
  '#f59e0b', '#10b981', '#14b8a6', '#06b6d4',
]

export default function RoomManager({ open, onClose, zones, onAdd, onPatch, onDelete, theme }: Props) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleAdd = async () => {
    if (!name.trim()) { setError('Nom requis'); return }
    setBusy(true); setError(null)
    try {
      await onAdd({ name: name.trim(), color })
      setName(''); setColor(COLORS[0])
    } catch (e: any) {
      setError(e.message || 'Erreur')
    } finally { setBusy(false) }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer la salle « ${name} » ?`)) return
    setBusy(true)
    try {
      await onDelete(id)
    } catch (e: any) {
      alert(e.message || 'Erreur — la salle n\'est peut-être pas vide')
    } finally { setBusy(false) }
  }

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modal}>
        <header style={header}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>🏛 Gérer les salles</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
              Ajoutez, renommez ou supprimez des salles. Chaque salle = sa propre zone sur le plan.
            </p>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </header>

        <div style={{ padding: 20 }}>
          {/* Existing zones */}
          <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', letterSpacing: 1, marginBottom: 8 }}>
            SALLES ACTUELLES ({zones.length})
          </div>
          <div style={{ display: 'grid', gap: 6, marginBottom: 20 }}>
            {zones.map((z) => (
              <div key={z.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: 12, background: '#f8fafc', borderRadius: 10,
                border: `1px solid ${z.color}30`,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: z.color, flexShrink: 0,
                }} />
                <input
                  defaultValue={z.name}
                  onBlur={(e) => {
                    if (e.target.value && e.target.value !== z.name) onPatch(z.id, { name: e.target.value })
                  }}
                  style={{
                    flex: 1, padding: '6px 10px', border: '1px solid #e2e8f0',
                    borderRadius: 6, fontSize: 14, fontWeight: 600,
                  }}
                />
                <code style={{ fontSize: 10, color: '#94a3b8' }}>{z.id}</code>
                <button
                  onClick={() => handleDelete(z.id, z.name)}
                  disabled={busy}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: '#ef4444', fontSize: 16, padding: 4,
                  }}
                  title="Supprimer (vide les tables d'abord)"
                >🗑</button>
              </div>
            ))}
          </div>

          {/* Add new */}
          <div style={{
            padding: 14, background: 'linear-gradient(135deg,#eef2ff,#fdf4ff)',
            borderRadius: 12, border: '1px solid #c7d2fe',
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#4338ca', letterSpacing: 1, marginBottom: 8 }}>
              + AJOUTER UNE NOUVELLE SALLE
            </div>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null) }}
              placeholder="Ex: Cave à vins, Salon privé, Mezzanine…"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid #c7d2fe', background: '#fff',
                fontSize: 14, boxSizing: 'border-box', marginBottom: 10,
              }}
            />
            <div style={{ fontSize: 11, fontWeight: 600, color: '#4338ca', marginBottom: 6 }}>Couleur</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              {COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)} style={{
                  width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: c,
                  outline: color === c ? '3px solid #6366f1' : 'none',
                  outlineOffset: color === c ? 2 : 0,
                }} />
              ))}
            </div>
            {error && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>{error}</div>}
            <button onClick={handleAdd} disabled={busy || !name.trim()} style={{
              width: '100%', padding: '10px 14px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              opacity: (busy || !name.trim()) ? 0.5 : 1,
            }}>
              {busy ? '⏳ Création…' : '✓ Ajouter cette salle'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  backdropFilter: 'blur(4px)',
}
const modal: React.CSSProperties = {
  background: '#fff', borderRadius: 18, width: '100%', maxWidth: 560,
  maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
}
const header: React.CSSProperties = {
  padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  background: 'linear-gradient(135deg,#eef2ff,#fdf4ff)',
}
const closeBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0',
  background: '#fff', cursor: 'pointer', fontSize: 14,
}
