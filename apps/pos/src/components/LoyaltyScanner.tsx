import { useEffect, useRef, useState } from 'react'

/**
 * Loyalty card scanner
 * - QR scan via getUserMedia + BarcodeDetector (Chrome/Edge)
 * - NFC scan via Web NFC API (NDEFReader — Android Chrome)
 *
 * Expected card payload formats:
 *   - QR: JSON {"customerId":"cus_abc","name":"Marie"} OR "CREORGA:cus_abc"
 *   - NFC NDEF text record: "CREORGA:cus_abc"
 */

export interface LoyaltyCardData {
  customerId: string
  name?: string
  points?: number
}

interface LoyaltyScannerProps {
  open: boolean
  onClose: () => void
  onScan: (data: LoyaltyCardData) => void
}

function parsePayload(raw: string): LoyaltyCardData | null {
  const s = raw.trim()
  if (!s) return null
  // JSON payload
  if (s.startsWith('{')) {
    try {
      const obj = JSON.parse(s)
      if (obj.customerId) return obj as LoyaltyCardData
    } catch { /* fallthrough */ }
  }
  // CREORGA:<id> payload
  if (s.startsWith('CREORGA:')) {
    return { customerId: s.slice('CREORGA:'.length) }
  }
  // Fallback — raw id
  if (s.length >= 3 && s.length <= 64) return { customerId: s }
  return null
}

export default function LoyaltyScanner({ open, onClose, onScan }: LoyaltyScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const loopRef = useRef<number | null>(null)
  const [mode, setMode] = useState<'qr' | 'nfc'>('qr')
  const [error, setError] = useState<string>('')
  const [status, setStatus] = useState<string>('Initialisation…')

  // ── QR (camera) ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || mode !== 'qr') return
    let cancelled = false

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setStatus('Scannez la carte…')

        const BD = (window as any).BarcodeDetector
        if (!BD) {
          setError('BarcodeDetector non supporté — utilisez Chrome/Edge ou passez en mode NFC')
          return
        }
        const detector = new BD({ formats: ['qr_code'] })
        const loop = async () => {
          if (cancelled || !videoRef.current) return
          try {
            const codes = await detector.detect(videoRef.current)
            if (codes && codes.length > 0) {
              const data = parsePayload(codes[0].rawValue || '')
              if (data) { onScan(data); onClose(); return }
            }
          } catch { /* ignore frame errors */ }
          loopRef.current = requestAnimationFrame(loop) as unknown as number
        }
        loop()
      } catch (e: any) {
        setError(`Caméra indisponible : ${e.message}`)
      }
    }
    start()

    return () => {
      cancelled = true
      if (loopRef.current) cancelAnimationFrame(loopRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [open, mode, onScan, onClose])

  // ── NFC ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || mode !== 'nfc') return
    const NDEFReader = (window as any).NDEFReader
    if (!NDEFReader) {
      setError('Web NFC non supporté — utilisez Android Chrome')
      return
    }
    const reader = new NDEFReader()
    const ctrl = new AbortController()
    setStatus('Approchez la carte du lecteur NFC…')
    reader.scan({ signal: ctrl.signal }).then(() => {
      reader.onreading = (event: any) => {
        const dec = new TextDecoder()
        for (const rec of event.message.records) {
          if (rec.recordType === 'text') {
            const data = parsePayload(dec.decode(rec.data))
            if (data) { onScan(data); onClose(); return }
          }
        }
      }
    }).catch((e: any) => setError(`NFC : ${e.message}`))
    return () => ctrl.abort()
  }, [open, mode, onScan, onClose])

  if (!open) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 480, background: '#111827', borderRadius: 16, padding: 20, color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Scan carte fidélité</h2>
          <button onClick={onClose} style={{ background: 'transparent', color: '#fff', border: 'none', fontSize: 24, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['qr', 'nfc'] as const).map(m => (
            <button key={m}
              onClick={() => { setMode(m); setError(''); setStatus('Initialisation…') }}
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: mode === m ? '#6366f1' : '#374151', color: '#fff', fontWeight: 600,
              }}>
              {m === 'qr' ? '📷 QR' : '📡 NFC'}
            </button>
          ))}
        </div>

        {mode === 'qr' && (
          <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', aspectRatio: '1/1' }}>
            <video ref={videoRef} playsInline muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{
              position: 'absolute', inset: '15%',
              border: '3px solid #10b981', borderRadius: 12,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
            }} />
          </div>
        )}

        {mode === 'nfc' && (
          <div style={{ padding: 40, textAlign: 'center', background: '#1f2937', borderRadius: 12 }}>
            <div style={{ fontSize: 64 }}>📡</div>
            <div style={{ marginTop: 12 }}>{status}</div>
          </div>
        )}

        {error && <p style={{ color: '#f87171', marginTop: 12, fontSize: 14 }}>{error}</p>}
        {!error && <p style={{ color: '#9ca3af', marginTop: 12, fontSize: 13 }}>{status}</p>}
      </div>
    </div>
  )
}
