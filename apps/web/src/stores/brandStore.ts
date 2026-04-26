import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Restaurant branding — logo, accent color, welcome message, portal URL base.
 * Stored locally (logo is a data-URL so it survives reloads without server).
 */
interface BrandState {
  logoDataUrl: string | null
  accentColor: string
  welcomeMessage: string
  portalBaseUrl: string
  setLogo: (dataUrl: string | null) => void
  setAccent: (hex: string) => void
  setWelcome: (msg: string) => void
  setPortalBase: (url: string) => void
}

export const useBrand = create<BrandState>()(
  persist(
    (set) => ({
      logoDataUrl: null,
      accentColor: '#10b981',
      welcomeMessage: 'Bienvenue chez nous ! Scannez le QR code pour découvrir notre carte.',
      portalBaseUrl: 'https://portail.creorga.lu/cafe-um-rond-point',
      setLogo: (dataUrl) => set({ logoDataUrl: dataUrl }),
      setAccent: (hex) => set({ accentColor: hex }),
      setWelcome: (msg) => set({ welcomeMessage: msg }),
      setPortalBase: (url) => set({ portalBaseUrl: url }),
    }),
    { name: 'creorga-brand' }
  )
)

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
