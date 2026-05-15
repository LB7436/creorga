/**
 * v4.6 — Push notifications natives (Capacitor).
 *
 * Sur Android/iOS (Capacitor native), enregistre les push notifications
 * et envoie le token au backend pour broadcast ciblé.
 *
 * Sur web (PWA), noop silencieux — la Web Push API peut être branchée plus tard
 * via service worker register + VAPID keys (TODO follow-up).
 *
 * Le backend doit exposer POST /api/auth/register-push-token (TODO si absent).
 */

function getBackend(): string {
  if (typeof window === 'undefined') return 'http://localhost:3002'
  try {
    const stored = localStorage.getItem('creorga.backend.remote')
    if (stored) return stored
  } catch { /* */ }
  return (import.meta as any).env?.VITE_REMOTE_BACKEND
      || (import.meta as any).env?.VITE_BACKEND_URL
      || 'http://localhost:3002'
}

/**
 * registerPush : init push notifs si on tourne sur Capacitor (Android/iOS APK).
 * Import dynamique pour ne pas casser le bundle web sans Capacitor.
 */
export async function registerPush(): Promise<void> {
  // Skip côté serveur (SSR) ou bundle web sans Capacitor
  if (typeof window === 'undefined') return

  // Détection Capacitor via globalThis (injecté par le runtime natif Capacitor).
  // Évite d'importer @capacitor/core en mode web où le paquet n'est pas installé.
  const Capacitor: any = (globalThis as any).Capacitor
  if (!Capacitor || typeof Capacitor.isNativePlatform !== 'function') return
  if (!Capacitor.isNativePlatform()) {
    // Mode web/PWA — noop pour l'instant
    return
  }

  // Plugin push : disponible via Capacitor.Plugins en runtime natif.
  const PushNotifications: any = Capacitor.Plugins?.PushNotifications
  if (!PushNotifications) return

  if (!PushNotifications) return

  try {
    // Demande la permission utilisateur (Android 13+ : popup système)
    const perm = await PushNotifications.requestPermissions()
    if (perm.receive !== 'granted') return

    // Enregistre auprès du service push (FCM/APNS)
    await PushNotifications.register()

    // Token reçu → POST vers backend
    PushNotifications.addListener('registration', async (token: { value: string }) => {
      try {
        await fetch(`${getBackend()}/api/auth/register-push-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token.value, platform: Capacitor.getPlatform?.() || 'android' }),
        })
      } catch { /* backend offline = silent */ }
    })

    // Erreur d'enregistrement (rare)
    PushNotifications.addListener('registrationError', (err: any) => {
      console.warn('[push] registrationError', err)
    })

    // Notif reçue app au premier plan
    PushNotifications.addListener('pushNotificationReceived', (notif: any) => {
      console.log('[push] received', notif)
      // TODO : afficher toast Creorga avec le payload
    })

    // Notif cliquée par l'utilisateur (app en arrière-plan)
    PushNotifications.addListener('pushNotificationActionPerformed', (action: any) => {
      console.log('[push] action', action)
      // TODO : router vers action.notification.data?.route si présent
    })
  } catch (e) {
    console.warn('[push] register failed', e)
  }
}
