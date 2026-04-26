import { useRef, useState } from 'react'
import { usePhotoWall, type PhotoCategory } from '@/stores/photoWallStore'
import { fileToDataUrl } from '@/stores/brandStore'

/**
 * Reusable photo wall — album of staff + clients + café + events.
 * Drop-in for any module: <PhotoWall moduleId="pos" />
 */
const CATEGORIES: { value: PhotoCategory; label: string; emoji: string }[] = [
  { value: 'staff',   label: 'Staff',   emoji: '👥' },
  { value: 'clients', label: 'Clients', emoji: '😊' },
  { value: 'café',    label: 'Café',    emoji: '☕' },
  { value: 'event',   label: 'Events',  emoji: '🎉' },
  { value: 'other',   label: 'Autres',  emoji: '📸' },
]

export default function PhotoWall({ moduleId, compact = false }: { moduleId: string; compact?: boolean }) {
  const photos = usePhotoWall((s) => s.photos.filter((p) => p.moduleId === moduleId))
  const { addPhoto, removePhoto } = usePhotoWall()
  const [filter, setFilter] = useState<PhotoCategory | 'all'>('all')
  const [uploadCategory, setUploadCategory] = useState<PhotoCategory>('café')
  const [caption, setCaption] = useState('')
  const [lightbox, setLightbox] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = filter === 'all' ? photos : photos.filter((p) => p.category === filter)

  const handleFiles = async (files: FileList | null) => {
    if (!files) return
    for (const f of Array.from(files).slice(0, 10)) {
      if (!f.type.startsWith('image/')) continue
      if (f.size > 3 * 1024 * 1024) { alert(`${f.name} > 3 Mo ignoré`); continue }
      const dataUrl = await fileToDataUrl(f)
      addPhoto(moduleId, dataUrl, uploadCategory, caption.trim() || undefined)
    }
    setCaption('')
  }

  return (
    <section style={{
      background: '#fff', borderRadius: 14, padding: compact ? 12 : 20,
      border: '1px solid #e2e8f0', marginTop: 16,
    }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
          📷 Mur photos
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>({photos.length})</span>
        </h3>

        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', flexWrap: 'wrap' }}>
          <button onClick={() => setFilter('all')} style={chip(filter === 'all')}>Tous</button>
          {CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setFilter(c.value)} style={chip(filter === c.value)}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </header>

      {/* Upload bar */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        padding: 10, background: '#f8fafc', borderRadius: 10, marginBottom: 14, flexWrap: 'wrap',
      }}>
        <select
          value={uploadCategory}
          onChange={(e) => setUploadCategory(e.target.value as PhotoCategory)}
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
        >
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
        </select>
        <input
          type="text"
          value={caption}
          placeholder="Légende (optionnelle)"
          onChange={(e) => setCaption(e.target.value)}
          style={{ flex: 1, minWidth: 160, padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
        />
        <button onClick={() => inputRef.current?.click()} style={{
          padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: '#6366f1', color: '#fff', fontWeight: 600, fontSize: 13,
        }}>+ Ajouter photos</button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          style={{ display: 'none' }}
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
          Aucune photo pour le moment — ajoutez-en pour égayer votre mur !
        </div>
      ) : (
        <div style={{
          display: 'grid', gap: 10,
          gridTemplateColumns: `repeat(auto-fill, minmax(${compact ? 100 : 140}px, 1fr))`,
        }}>
          {filtered.map((p) => (
            <div key={p.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: '#f1f5f9' }}>
              <img
                src={p.dataUrl}
                alt={p.caption ?? ''}
                onClick={() => setLightbox(p.dataUrl)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }}
              />
              <div style={{
                position: 'absolute', top: 6, left: 6,
                background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 10,
                padding: '2px 6px', borderRadius: 999,
              }}>{CATEGORIES.find((c) => c.value === p.category)?.emoji}</div>
              <button
                onClick={() => removePhoto(p.id)}
                style={{
                  position: 'absolute', top: 6, right: 6,
                  background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none',
                  width: 22, height: 22, borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                }}
              >×</button>
              {p.caption && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                  color: '#fff', fontSize: 11, padding: '8px 6px 6px',
                }}>{p.caption}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out',
          }}
        >
          <img src={lightbox} alt="" style={{ maxWidth: '92vw', maxHeight: '92vh', borderRadius: 10 }} />
        </div>
      )}
    </section>
  )
}

const chip = (active: boolean): React.CSSProperties => ({
  padding: '5px 10px', borderRadius: 999, border: '1px solid #e2e8f0',
  background: active ? '#6366f1' : '#fff', color: active ? '#fff' : '#1e293b',
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
})
