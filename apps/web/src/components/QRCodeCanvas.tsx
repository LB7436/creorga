import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

/**
 * Matrice QR Model 2 standard, niveau de correction M.
 *
 * L'ancien encodeur maison omettait notamment les motifs d'alignement des
 * versions supérieures à 1 : une URL Creorga réelle pouvait donc produire une
 * image ressemblant à un QR sans être lisible. La bibliothèque `qrcode`
 * implémente les versions, blocs Reed–Solomon et masques conformes.
 */
export function generateQR(text: string): boolean[][] {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' })
  const size = qr.modules.size
  const data = qr.modules.data
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => Boolean(data[row * size + column])),
  )
}

interface QRCodeCanvasProps {
  value: string
  size?: number
  color?: string
  background?: string
  margin?: number
  label?: string
}

export default function QRCodeCanvas({
  value,
  size = 240,
  color = '#0f172a',
  background = '#fff',
  margin = 4,
  label,
}: QRCodeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !value) return
    void QRCode.toCanvas(canvas, value, {
      width: size,
      margin,
      errorCorrectionLevel: 'M',
      color: { dark: color, light: background },
    }).catch((error) => {
      // eslint-disable-next-line no-console
      console.error('QR generation failed:', error)
    })
  }, [value, size, color, background, margin])

  const download = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `${label || 'qrcode'}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <canvas
        ref={canvasRef}
        aria-label={label ? `QR code ${label}` : 'QR code'}
        style={{ width: size, height: size, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
      />
      {label && <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>}
      <button onClick={download} style={{
        padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
        background: '#6366f1', color: '#fff', fontWeight: 600, fontSize: 13,
      }}>
        Télécharger le QR en PNG
      </button>
    </div>
  )
}
