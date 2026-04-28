import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Capacitor config — wraps the Vite PWA into a native Android APK.
 *
 * Build flow :
 *   1. cd apps/web
 *   2. npm run build           (Vite -> dist/)
 *   3. npx cap sync android    (copies dist/ into android/app/src/main/assets/)
 *   4. cd android && ./gradlew assembleDebug    (requires Android SDK)
 *      OR open in Android Studio -> Build APK
 *
 * Pour générer un APK distribuable sans Android Studio :
 *   - Use PWA Builder (https://www.pwabuilder.com/) : 5 min, signed APK
 *   - Or GitHub Actions with android-actions/setup-android
 */

const config: CapacitorConfig = {
  appId: 'lu.creorga.os',
  appName: 'Creorga · Robi',
  webDir: 'dist',
  server: {
    // Le mode démo charge directement /m/demo
    androidScheme: 'https',
    // Permet HTTP cleartext en dev pour pointer vers backend local
    cleartext: true,
    // Si tu fournis VITE_REMOTE_BACKEND au build, l'app pointe directement
    // vers ton tunnel Cloudflare. Sinon, tu peux changer dans /m/demo.
  },
  android: {
    buildOptions: {
      // Pour signer un APK release, ajoute keystore + alias + password
      // dans un fichier ~/.gradle/gradle.properties ou via env
    },
  },
  // Plugins natifs
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0a0a14',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a14',
    },
  },
}

export default config
