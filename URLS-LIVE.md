# 🚀 Creorga · URLs live (session v3.14)

## ⚡ TOUT FONCTIONNE — Liens à ouvrir sur ton Samsung Android

### 📱 1. Télécharger l'APK directement sur le téléphone

Ouvre Chrome sur ton **Samsung** et colle :

```
https://hygiene-funny-grams-verde.trycloudflare.com/creorga-robi.apk
```

→ Le `.apk` (5.1 MB) télécharge dans `Downloads` du téléphone.
→ Tap le fichier → "Autoriser apps inconnues" → **Installer**.
→ Ouvre l'app **Creorga · Robi** depuis l'écran d'accueil.

### 🌐 2. Alternative : PWA installable (sans APK)

Ouvre cette URL dans Chrome Android et fais menu → **"Ajouter à l'écran d'accueil"** :

```
https://hygiene-funny-grams-verde.trycloudflare.com/m/demo
```

→ Icône Creorga ajoutée → tap → app standalone (zéro install APK).
→ Auto-login démo `admin@creorga.local` / `Admin1234!`.

### 🔌 URLs sous-jacentes

| Service | URL |
|---|---|
| **Frontend PWA (preview prod)** | `https://hygiene-funny-grams-verde.trycloudflare.com` |
| **Backend API** | `https://division-diffs-stakeholders-become.trycloudflare.com` |
| **Frontend Vite dev** | `https://mem-olympus-multimedia-anatomy.trycloudflare.com` |
| **APK direct** | `https://hygiene-funny-grams-verde.trycloudflare.com/creorga-robi.apk` |

⚠️ **Tunnels gratuits** : ces URLs durent tant que `cloudflared` tourne sur le PC. Pour permanent, il faudrait un compte Cloudflare et tunnel nommé sur ton domaine `n8nautomatisations`.

### 🔑 Credentials démo (pré-remplis dans l'APK)

```
Email    : admin@creorga.local
Password : Admin1234!
```

### 📦 Fichier APK local

```
C:\Users\Bryan\Desktop\creorga-robi.apk           (5.1 MB)
C:\Users\Bryan\Desktop\claude code\creorga\apps\web\android\app\build\outputs\apk\debug\app-debug.apk
C:\Users\Bryan\Desktop\claude code\creorga\apps\web\dist\creorga-robi.apk    (servi via tunnel)
```

### 🔧 Commandes pour relancer (après reboot)

```bash
# 1. Backend
cd "C:\Users\Bryan\Desktop\claude code\creorga\apps\backend"
npm run dev

# 2. Frontend production preview (dist/)
cd "C:\Users\Bryan\Desktop\claude code\creorga\apps\web"
npx vite preview --port 5180 --host

# 3. Tunnel backend (port 3002)
cloudflared tunnel --url http://localhost:3002

# 4. Tunnel frontend preview (port 5180)
cloudflared tunnel --url http://localhost:5180
```

### ❌ Drive : non automatisable

Chrome MCP refuse l'upload sur drive.google.com (sécurité extension).

**Workaround** :
- Ouvre l'URL APK sur ton PC → l'APK télécharge dans `Downloads`
- Drag-drop manuellement dans le dossier Drive **Creorga** déjà créé
  https://drive.google.com/drive/folders/1ZtR6VPysysQNRm5CGYNIga8j6wMwQxAn

OU plus rapide :
- Tu n'as PAS besoin de Drive — l'URL APK marche directement depuis le tel.

### 🛠 Build APK (refaire après modifs code)

```bash
export ANDROID_HOME="C:/Users/Bryan/.bubblewrap/android_sdk"
export JAVA_HOME="C:/Program Files/Microsoft/jdk-21.0.10.7-hotspot"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

cd "C:\Users\Bryan\Desktop\claude code\creorga\apps\web"
npx vite build
npx cap sync android
cd android
./gradlew.bat assembleDebug

# Output :
# C:\Users\Bryan\Desktop\claude code\creorga\apps\web\android\app\build\outputs\apk\debug\app-debug.apk
```

## ✅ Ce qui est démontré et fonctionnel

1. **Cloudflared installé** v2025.8.1 (déjà là)
2. **Bubblewrap** a téléchargé Android SDK 1+ GB + JDK 17
3. **Capacitor** projet Android scaffolded
4. **Java 21 hotspot** utilisé pour la compilation (Capacitor 8 le requiert)
5. **Gradle assembleDebug SUCCESS** en 30s (5.1 MB APK)
6. **2 tunnels actifs** : backend + frontend preview
7. **Auto-login démo** opérationnel via `/m/demo`
8. **Page testée** : KPIs live affichés (2/12 tables · 8 € · 0 alertes · 4 personnes planning)
9. **APK servi en HTTPS** : 200 OK · Content-Length 5273601

## 🎯 Pour tester maintenant

Sur ton **Samsung** depuis n'importe où dans le monde :

1. **Chrome Android** ouvre :
   `https://hygiene-funny-grams-verde.trycloudflare.com/creorga-robi.apk`
2. Le `.apk` télécharge → tape dessus depuis `Téléchargements`
3. **Autorise apps inconnues** au premier lancement
4. **Installer** → ouverture auto
5. Page **demo login** se charge → connexion automatique
6. **Dashboard live KPIs** s'affiche
7. Tap **🤖 Parler à Robi** → micro fonctionne → ordres vocaux exécutés à distance
