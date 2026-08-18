import { useEffect, useState } from 'react'

/**
 * Détection de la largeur d'écran pour la caisse.
 *
 * L'audit a compté ZÉRO media query dans les 15 800 lignes de la caisse :
 * layouts en colonnes fixes (ticket 30 % / menu 70 %, panneau de paiement
 * 40 %, panneau sièges 460 px) sur un téléphone de 375 px — panneaux hors
 * écran, colonnes de 110 px illisibles. Tous les styles sont inline, une
 * feuille de style ne peut pas les cibler : ce hook est le point unique de
 * décision, les écrans basculent en colonne unique en dessous du seuil.
 */

/** En dessous : téléphone → une seule colonne, panneaux empilés. */
export const SEUIL_ETROIT = 900

export function useEcranEtroit(seuil = SEUIL_ETROIT): boolean {
  const lire = () => (typeof window !== 'undefined' ? window.innerWidth < seuil : false)
  const [etroit, setEtroit] = useState<boolean>(lire)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(`(max-width: ${seuil - 1}px)`)
    const maj = () => setEtroit(mq.matches)
    maj()
    mq.addEventListener('change', maj)
    return () => mq.removeEventListener('change', maj)
  }, [seuil])

  return etroit
}
