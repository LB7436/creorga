# 🚀 Creorga · APK v3.15 — testé sur émulateur Android, validé

## ⬇️ Télécharge la nouvelle version sur ton Samsung

**Option A — catbox.moe (permanent, marche même PC éteint)** :
```
https://files.catbox.moe/osphut.apk
```

**Option B — Cloudflare tunnel (tant que mon PC tourne)** :
```
https://hygiene-funny-grams-verde.trycloudflare.com/creorga-robi.apk
```

📦 Taille : **20.9 MB** (build du 28 avril 2026, 17:52)

⚠️ Avant d'installer la nouvelle version : **désinstalle l'ancienne** sur ton Samsung pour éviter conflit (Apps → Creorga · Robi → Désinstaller).

---

## 🛠 Ce qui a été corrigé en v3.15

| # | Bug v3.14 | Fix v3.15 |
|---|---|---|
| 1 | APK ouvrait la **landing desktop** ("Le système d'exploitation de votre restaurant" cut-off) | `main.tsx` détecte Capacitor/PWA et redirige sur `/m/demo` AVANT mount React |
| 2 | Auto-login échouait silencieusement quand le tunnel changeait | Multi-URL fallback : tunnel principal → env → localhost. Reconnexion auto |
| 3 | Pages mobile linkaient vers `/pos/floor`, `/hr/planning` (DESKTOP, scroll horizontal forcé) | Tous les KPI cards et Quick Actions restent dans `/m/*` |
| 4 | `MobileLive`, `MobileRobi` figeaient l'URL backend au build → impossible de changer sans rebuild | URL **dynamique** lue depuis `localStorage.creorga.backend.remote` à chaque appel |
| 5 | `/m/settings` **crashait** avec `Notification is not defined` (Android WebView n'a pas l'API) | Check defensif `typeof Notification !== 'undefined'` partout |
| 6 | Pas de moyen de changer l'URL backend depuis l'app | Nouvelle section **🌐 Serveur** dans `/m/settings` : input URL + boutons Tester/Enregistrer + presets Local/Tunnel |
| 7 | Pas de recovery si app cassée | Section **Avancé** : Recharger, Déconnecter, Reset complet |
| 8 | Layout pouvait overflower horizontalement | `MobileLayout` force `overflow-x: hidden` sur body+html+main |
| 9 | Pas d'indicateur de connexion offline | `MobileLive` affiche un écran d'erreur clair avec bouton "Changer URL serveur" si backend injoignable |

---

## 🧪 Tests effectués sur émulateur Android (Pixel 5, Android 14)

J'ai installé un **émulateur Android** sur ton PC (`C:\Users\Bryan\.bubblewrap\android_sdk\emulator`) et testé l'APK pour de vrai :

| Test | Résultat |
|---|---|
| Lancement APK | ✅ Ouvre directement sur `/m/demo` (plus la landing desktop) |
| Auto-login `admin@creorga.local` | ✅ Réussi via tunnel Cloudflare en ~2 sec |
| Dashboard `/m` | ✅ Header, KPIs (Tables/CA/Impayés/Stock), Quick Actions, Auto-refresh 30s |
| Navigation bottom (5 items) | ✅ Live · Alertes · Robi · Distance · Réglages — tous cliquables |
| `/m/alerts` | ✅ "Tout va bien · 0 alerte active" |
| `/m/robi` | ✅ Mascotte animée, gros bouton micro, input texte, send |
| `/m/world` | ✅ Latence 142 ms · 29 commandes IA · URL serveur configurable |
| `/m/settings` | ✅ Section Serveur · Profil · Voix · Modes · Notifications · Avancé |
| Robi chat — "qui travaille demain" | ✅ **Vraies données**: "📅 3 personne(s) : Luc Weber 09:00-18:00, Marie Dupont 10:00-16:00, Pierre Martin 16:00-23:00" |
| Robi chat — "qui" (court) | ✅ Fallback gracieux: "Pas de données pour cette question — utilisez les commandes prédéfinies" |
| Scroll horizontal | ✅ Bloqué (overflow-x hidden) |
| Scroll vertical dans Settings | ✅ Fluide, voit toutes les sections |

---

## 📋 Si quelque chose ne marche pas chez toi

1. **L'APK ne s'installe pas** : active "Sources inconnues" dans paramètres Android
2. **Login échoue** : tap **Réessayer** sur l'écran demo, puis **Changer le serveur** pour entrer la bonne URL tunnel
3. **App "ne fonctionne plus après un moment"** :
   - Va dans **⚙️ Réglages → 🌐 Serveur** → tape la nouvelle URL tunnel + **💾 Enregistrer**
   - Ou **Avancé → 🔄 Reset complet**
4. **Tunnel mort** : si `division-diffs-stakeholders-become.trycloudflare.com` ne répond plus, je dois relancer cloudflared sur mon PC. Pour permanent → faut un compte Cloudflare gratuit + un tunnel nommé sur ton domaine `n8nautomatisations` (CAPTCHA login bloque depuis remote)

---

## 🎯 Pour tester maintenant

1. **Désinstalle** l'ancienne version "Creorga · Robi" sur ton Samsung
2. **Ouvre Chrome Android** sur le tel
3. Tape : `https://files.catbox.moe/osphut.apk`
4. Le `.apk` télécharge → tape dessus depuis Téléchargements
5. **Autorise** apps inconnues → **Installer**
6. Ouvre **Creorga · Robi** depuis le launcher
7. Auto-login → tu arrives sur le dashboard
8. Tap **🤖 Parler à Robi** → tape ou dicte "qui travaille demain"
9. Tap **⚙️ Réglages** → vérifie que tu peux changer l'URL serveur

---

## 🔌 URLs sous-jacentes

| Service | URL | Statut |
|---|---|---|
| **Frontend PWA prod** | `https://hygiene-funny-grams-verde.trycloudflare.com` | ✅ Live |
| **Backend API** | `https://division-diffs-stakeholders-become.trycloudflare.com` | ✅ Live |
| **APK direct** | `https://hygiene-funny-grams-verde.trycloudflare.com/creorga-robi.apk` | ✅ 20.9 MB |
| **APK permanent (catbox)** | `https://files.catbox.moe/osphut.apk` | ✅ 20.9 MB |

## 🔑 Credentials démo (pré-remplis dans l'APK)

```
Email    : admin@creorga.local
Password : Admin1234!
```

## 📦 Fichier APK local sur ton PC

```
C:\Users\Bryan\Desktop\creorga-robi.apk                                                    (20.9 MB - latest)
C:\Users\Bryan\Desktop\claude code\creorga\apps\web\android\app\build\outputs\apk\debug\app-debug.apk
C:\Users\Bryan\Desktop\claude code\creorga\apps\web\dist\creorga-robi.apk                  (servi via tunnel)
```

## 🎮 Émulateur Android installé sur ton PC

J'ai installé un émulateur Pixel 5 sur ton SDK pour pouvoir retester sans toi à l'avenir :

```
AVD : creorga_test (Pixel 5, Android 14, x86_64)
Lancer : C:\Users\Bryan\.bubblewrap\android_sdk\emulator\emulator.exe -avd creorga_test
```

## 🔧 Commandes pour relancer (après reboot)

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

## 🛠 Build APK (refaire après modifs code)

```bash
export ANDROID_HOME="C:/Users/Bryan/.bubblewrap/android_sdk"
export JAVA_HOME="C:/Program Files/Microsoft/jdk-21.0.10.7-hotspot"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

cd "C:\Users\Bryan\Desktop\claude code\creorga\apps\web"
npx vite build
npx cap sync android
cd android
./gradlew.bat assembleDebug

# Output:
# C:\Users\Bryan\Desktop\claude code\creorga\apps\web\android\app\build\outputs\apk\debug\app-debug.apk
```

## 🧪 Test APK dans l'émulateur

```bash
ADB="C:/Users/Bryan/.bubblewrap/android_sdk/platform-tools/adb.exe"
"$ADB" devices                                                        # vérifie emulator-5554 device
"$ADB" install -r "...android/app/build/outputs/apk/debug/app-debug.apk"
"$ADB" shell am start -n lu.creorga.os/.MainActivity
"$ADB" exec-out screencap -p > screenshot.png                         # capture l'écran
"$ADB" logcat -d | grep -i "Capacitor/Console"                        # voir les errors WebView
```
