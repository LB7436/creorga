import { useRef } from 'react'
import { fileToDataUrl } from '@/stores/brandStore'
import type { FloorPhoto } from '@/hooks/useFloorState'

interface Props {
  photos: FloorPhoto[]
  globalBackground?: string
  onAddPhoto: (photo: { dataUrl: string; x?: number; y?: number; w?: number; h?: number }) => Promise<any>
  onRemovePhoto: (id: string) => Promise<any>
  onSetGlobalBackground: (dataUrl: string | null) => Promise<any>
  theme: any
}

export default function FloorPhotoManager({
  photos, globalBackground, onAddPhoto, onRemovePhoto, onSetGlobalBackground, theme,
}: Props) {
  const bgInput = useRef<HTMLInputElement>(null)
  const photoInput = useRef<HTMLInputElement>(null)

  const handleBg = async (f: File) => {
    if (!f.type.startsWith('image/') || f.size > 3 * 1024 * 1024) {
      alert('Image max 3 Mo')
      return
    }
    const dataUrl = await fileToDataUrl(f)
    await onSetGlobalBackground(dataUrl)
  }

  const handlePhoto = async (f: File) => {
    if (!f.type.startsWith('image/') || f.size > 2 * 1024 * 1024) {
      alert('Photo max 2 Mo')
      return
    }
    const dataUrl = await fileToDataUrl(f)
    await onAddPhoto({
      dataUrl,
      x: 80 + Math.random() * 200,
      y: 80 + Math.random() * 200,
      w: 160, h: 160,
    })
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14, padding: 14, marginBottom: 16,
    }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: theme.textMuted, letterSpacing: 1, marginBottom: 10 }}>
        🖼  PHOTOS & BACKGROUND
      </div>

      {/* Global background */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 64, height: 40, borderRadius: 6,
          background: globalBackground ? `url(${globalBackground}) center/cover` : 'rgba(255,255,255,0.06)',
          border: '1px dashed rgba(255,255,255,0.15)',
          flexShrink: 0,
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: theme.text }}>Fond du plan</div>
          <div style={{ fontSize: 10, color: theme.textMuted }}>
            {globalBackground ? 'Background actif' : 'Aucun fond'}
          </div>
        </div>
        <button onClick={() => bgInput.current?.click()} style={btnStyle(theme)}>
          {globalBackground ? '🔄' : '+'} Fond
        </button>
        {globalBackground && (
          <button onClick={() => onSetGlobalBackground(null)} style={{ ...btnStyle(theme), background: '#ef444430', color: '#fca5a5' }}>🗑</button>
        )}
        <input ref={bgInput} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleBg(e.target.files[0])} style={{ display: 'none' }} />
      </div>

      {/* Photos list */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ flex: 1, fontSize: 12, color: theme.textMuted }}>
          {photos.length} photo(s) placée(s) sur le plan
        </div>
        <button onClick={() => photoInput.current?.click()} style={btnStyle(theme)}>
          + Photo
        </button>
        <input ref={photoInput} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])} style={{ display: 'none' }} />
      </div>

      {photos.length > 0 && (
        <div style={{ display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))' }}>
          {photos.map((p) => (
            <div key={p.id} style={{ position: 'relative' }}>
              <img src={p.dataUrl} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 6 }} />
              <button onClick={() => onRemovePhoto(p.id)}
                style={{
                  position: 'absolute', top: 2, right: 2,
                  width: 18, height: 18, borderRadius: '50%',
                  background: 'rgba(239,68,68,0.85)', color: '#fff', border: 'none',
                  fontSize: 10, cursor: 'pointer', fontWeight: 700, lineHeight: 1,
                }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const btnStyle = (theme: any): React.CSSProperties => ({
  padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
  background: `${theme.primary}30`, color: theme.primary, fontSize: 11, fontWeight: 700,
  whiteSpace: 'nowrap',
})
