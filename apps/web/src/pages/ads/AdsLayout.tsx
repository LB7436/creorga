import { Tv, Music } from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'

// v4.1 — Nouveau Layout regroupant l'affichage TV publicitaire + ambiance musicale :
// /ads/regie (régie pub IA pour écrans TV)
// /ads/music (radio, Spotify, Apple Music, YouTube)
const items = [
  { label: 'Régie publicitaire', path: '/ads/regie', icon: Tv },
  { label: 'Musique & Radio', path: '/ads/music', icon: Music },
]

export default function AdsLayout() {
  return <ModuleLayout title="Affichage TV & Ambiance" color="#ef4444" items={items} />
}
