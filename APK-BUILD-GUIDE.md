# 📱 Générer l'APK Creorga (Robi distant)

L'app PWA est packagée avec **Capacitor** prête à compiler en APK Android.
Page d'entrée : `/m/demo` qui se logue automatiquement avec
`admin@creorga.local` / `Admin1234!` (config démo).

---

## 🚀 Méthode 1 — PWA Builder (recommandée, 5 minutes, zéro install)

PWA Builder de Microsoft est un outil web gratuit qui transforme une PWA
en APK signé.

### Étapes

1. **Mets ton serveur en ligne** (URL HTTPS publique). Le plus simple :
   ```bash
   # Sur l'ordi du restaurant (Luxembourg)
   cloudflared tunnel --url http://localhost:5174
   # → t'imprime une URL https://xxx.trycloudflare.com
   ```

2. **Ouvre** https://www.pwabuilder.com/

3. **Colle l'URL** `https://xxx.trycloudflare.com/m/demo`

4. PWA Builder analyse le manifest et le service worker → score / 100

5. Onglet **"Package for stores"** → **Android** → **Sign me**

6. Télécharge le ZIP qui contient :
   - `app-release-signed.apk` ← l'APK que tu installes sur Samsung
   - Le keystore Java associé (à garder pour les futures updates)

7. **Installe l'APK** :
   - Transfère le `.apk` dans Google Drive / clé USB / câble
   - Sur Samsung : Paramètres → Sécurité → "Installer apps inconnues" → autoriser Drive
   - Tap le `.apk` → Installer

8. Ouvre l'app → **Robi te connecte automatiquement**

---

## 🛠 Méthode 2 — Compile local avec Android Studio (plus long, 1× setup)

Si tu veux tout maîtriser et signer toi-même.

### Prérequis (1× pour toujours)

1. Télécharge **Android Studio** : https://developer.android.com/studio
2. Lance-le, accepte les licences SDK
3. Ajoute la variable d'environnement Windows :
   ```
   ANDROID_HOME = C:\Users\Bryan\AppData\Local\Android\Sdk
   ```
   *(Panneau Windows → Variables d'environnement → Nouvelle utilisateur)*

### Build

```bash
cd "apps/web"

# 1. Build du web Vite
npm run build

# 2. Sync vers Android (copie dist/ dans android/app/src/main/assets/)
npx cap sync android

# 3. Compile l'APK debug (auto-signé)
cd android
./gradlew.bat assembleDebug

# → APK prêt à :
# apps/web/android/app/build/outputs/apk/debug/app-debug.apk
```

OU bien plus simple :

```bash
cd apps/web
npx cap open android
# → Ouvre Android Studio
# Build → Build Bundle(s) / APK(s) → Build APK(s)
```

### Pour signer en release (Play Store)

```bash
cd apps/web/android
./gradlew.bat assembleRelease
# Configure d'abord un keystore dans ~/.gradle/gradle.properties :
#   CREORGA_RELEASE_STORE_FILE=path/to/release.keystore
#   CREORGA_RELEASE_KEY_ALIAS=creorga
#   CREORGA_RELEASE_STORE_PASSWORD=...
#   CREORGA_RELEASE_KEY_PASSWORD=...
```

---

## 🔌 Méthode 3 — GitHub Actions (CI/CD auto)

Pour builder l'APK automatiquement à chaque commit (zero install local).

`.github/workflows/build-apk.yml` :

```yaml
name: Build Android APK
on: [push, workflow_dispatch]
jobs:
  apk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: 21 }
      - uses: android-actions/setup-android@v3
      - run: cd apps/web && npm ci && npm run build && npx cap sync android
      - run: cd apps/web/android && ./gradlew assembleDebug
      - uses: actions/upload-artifact@v4
        with:
          name: creorga-apk-debug
          path: apps/web/android/app/build/outputs/apk/debug/app-debug.apk
```

→ À chaque push, un APK est dispo dans l'onglet **Actions** GitHub.
Tu télécharges → Drive → install.

---

## 📦 Méthode 4 — PWA installable directe (zéro APK)

**Si tu n'as PAS besoin d'APK distribuable**, le plus simple :

1. Ouvre Chrome Android → ton URL `https://xxx.trycloudflare.com/m/demo`
2. Menu → **"Ajouter à l'écran d'accueil"** → **Installer**
3. L'icône Creorga apparaît sur l'écran d'accueil
4. Tap → app standalone (sans la barre Chrome)

C'est exactement la même expérience qu'un APK, mais zéro setup et
mises à jour automatiques au navigate.

---

## 📤 Transfert vers Google Drive

Une fois l'APK généré (méthode 1, 2 ou 3) :

```
1. Ordi → Google Drive web (drive.google.com)
2. Drag l'APK dans le dossier de ton choix
3. Tel Samsung → app Google Drive
4. Tap l'APK → Télécharger
5. Tap depuis "Téléchargements" → Installer
```

OU plus rapide :

```
1. Câble USB ou ShareDrop (https://www.sharedrop.io/) → APK direct dans Téléchargements
2. Tap → Installer
```

---

## 🔑 Credentials de démo (déjà pré-configurés)

```
Email    : admin@creorga.local
Password : Admin1234!
```

L'app `/m/demo` log automatiquement avec ces credentials au premier lancement.
Modifiable dans `apps/web/src/pages/mobile/MobileDemoLogin.tsx` lignes 22-23.

---

## 🌐 Configuration backend distant

L'APK pointe par défaut vers `http://localhost:3002`. Pour pointer ton tunnel
Cloudflare :

**Option A — au build** (gravée dans l'APK) :
```bash
cd apps/web
echo "VITE_REMOTE_BACKEND=https://xxx.trycloudflare.com" > .env.production
npm run build
npx cap sync android
```

**Option B — runtime** (modifiable dans l'app) :
- Lance l'app
- Page `/m/demo` → bouton "⚙️ Changer le serveur"
- Colle l'URL → "Réessayer"
- L'URL est sauvée dans `localStorage` et persiste

---

## 🛡 Sécurité de la version démo

⚠️ **Ne PAS distribuer cet APK publiquement.**

Cette version :
- Contient les credentials admin en dur (plain text dans le bundle)
- Désactive les vérifications de signature (debug)
- Active les logs verbeux

Pour une version production :
1. Retire `MobileDemoLogin` ou met un vrai écran de login
2. Build en `release` mode (méthode 2)
3. Signe avec ton propre keystore
4. Active ProGuard / R8 obfuscation

---

## ✅ Checklist du test

- [ ] Backend démarré : `cd apps/backend && npm run dev`
- [ ] Tunnel Cloudflare actif : `cloudflared tunnel --url http://localhost:5174`
- [ ] APK généré (méthode 1, 2, 3 ou 4)
- [ ] APK transféré sur le téléphone Samsung
- [ ] Installation autorisée pour les apps inconnues
- [ ] App ouverte → écran "Connexion au serveur Creorga…"
- [ ] Login auto OK → arrivée sur `/m` (KPIs live)
- [ ] Tap "🤖 Parler à Robi" → micro fonctionne → ordre vocal exécuté

---

Mascotte chargée par défaut : 🤖 **Robot Pixel**.
Nom par défaut : **Robi** (modifiable dans `/m/settings`).
