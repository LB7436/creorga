import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { toastWarning } from '@/lib/toast'
import { useRef } from 'react'

interface RequireRoleProps {
  /** Rôles autorisés (rôles du store : 'owner' | 'manager' | 'employee'). */
  roles: Array<'owner' | 'manager' | 'employee'>
  children: React.ReactNode
}

/**
 * Garde de rôle au niveau des routes.
 *
 * Avant elle, le masquage des modules sensibles n'existait que dans
 * l'interface du sélecteur : un employé qui tapait /backup ou /rgpd dans la
 * barre d'adresse y accédait (constat critique de l'audit, confirmé par
 * contre-vérification). S'utilise SOUS RequireAuth — l'authentification est
 * déjà garantie, on ne vérifie ici que le rôle.
 */
export default function RequireRole({ roles, children }: RequireRoleProps) {
  const role = useAuthStore((s) => s.role)
  const dejaPrevenu = useRef(false)

  if (!roles.includes(role as any)) {
    // Le toast dans le rendu est volontairement gardé par un ref : Navigate
    // peut faire re-rendre ce composant avant le démontage.
    if (!dejaPrevenu.current) {
      dejaPrevenu.current = true
      toastWarning('Accès réservé au propriétaire ou au manager.')
    }
    return <Navigate to="/modules" replace />
  }

  return <>{children}</>
}
