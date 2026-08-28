const LEGACY_KEY = 'creorga-onboarded'
const ONBOARDING_VERSION = 'v2'

export function onboardingKey(companyId: string | null | undefined): string {
  return `creorga-onboarded-${ONBOARDING_VERSION}:${companyId || 'sans-societe'}`
}

export function isOnboardingComplete(companyId: string | null | undefined): boolean {
  if (typeof window === 'undefined') return false
  if (window.localStorage.getItem(onboardingKey(companyId))) return true

  // Migration ponctuelle : l'ancienne clé globale est attribuée seulement à
  // la société active puis supprimée. Sans cela, un nouveau client créé dans
  // le même navigateur héritait du statut « déjà configuré » d'un autre.
  if (companyId && window.localStorage.getItem(LEGACY_KEY)) {
    window.localStorage.setItem(onboardingKey(companyId), '1')
    window.localStorage.removeItem(LEGACY_KEY)
    return true
  }
  return false
}

export function setOnboardingComplete(companyId: string | null | undefined): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(onboardingKey(companyId), '1')
  window.localStorage.removeItem(LEGACY_KEY)
}
