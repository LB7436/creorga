import { Tv, Music, CalendarDays } from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'

// v4.1 — Nouveau Layout regroupant l'affichage TV publicitaire + ambiance musicale :
// /ads/regie         (régie pub IA pour écrans TV)
// /ads/programmation (médiathèque vidéo, séquences, grille hebdomadaire)
// /ads/music         (radio, Spotify, Apple Music, YouTube)
const items = [
  { label: 'Régie publicitaire', path: '/ads/regie', icon: Tv },
  { label: 'Programmation', path: '/ads/programmation', icon: CalendarDays },
  { label: 'Musique & Radio', path: '/ads/music', icon: Music },
]

export default function AdsLayout() {
  return <ModuleLayout title="Affichage TV & Ambiance" color="#ef4444" items={items} />
}
