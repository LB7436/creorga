import { useRef } from 'react'
import { useBrand, fileToDataUrl } from '@/stores/brandStore'

/**
 * Drag-and-drop / file-picker logo uploader.
 * Stores the image as a data-URL in Zustand (persisted to localStorage).
 */
export default function LogoUploader() {
  const logo = useBrand((s) => s.logoDataUrl)
  const setLogo = useBrand((s) => s.setLogo)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files[0]) return
    const f = files[0]
    if (!/^image\/(png|jpeg|jpg|svg\+xml|webp)$/i.test(f.type)) {
      alert('Format non supporté — utilisez PNG, JPG, SVG ou WebP')
      return
    }
    if (f.size > 2 * 1024 * 1024) {
      alert('Fichier trop lourd — max 2 Mo')
      return
    }
    const dataUrl = await fileToDataUrl(f)
    setLogo(dataUrl)
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
      onClick={() => inputRef.current?.click()}
      style={{
        border: '2px dashed #cbd5e1', borderRadius: 12,
        padding: 24, textAlign: 'center', cursor: 'pointer',
        background: logo ? '#fff' : '#f8fafc',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        minHeight: 180, justifyContent: 'center',
      }}
    >
      {logo ? (
        <>
          <img src={logo} alt="Logo" style={{ maxHeight: 120, maxWidth: '100%', borderRadius: 8 }} />
          <button
            onClick={(e) => { e.stopPropagation(); setLogo(null) }}
            style={{
              padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: '#fee2e2', color: '#991b1b', fontSize: 12, fontWeight: 600,
            }}
          >🗑 Supprimer</button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 40 }}>🖼</div>
          <div style={{ color: '#1e293b', fontSize: 14, fontWeight: 600 }}>
            Glissez votre logo ici ou cliquez pour parcourir
          </div>
          <div style={{ color: '#64748b', fontSize: 12 }}>
            PNG, JPG, SVG ou WebP — max 2 Mo
          </div>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        onChange={(e) => handleFiles(e.target.files)}
        style={{ display: 'none' }}
      />
    </div>
  )
}
