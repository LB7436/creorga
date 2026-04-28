@echo off
REM ─────────────────────────────────────────────────────────────────
REM  Creorga · Build APK Android (Robi distant)
REM  Usage : double-clic après installation Android Studio
REM ─────────────────────────────────────────────────────────────────

echo.
echo  🚀 Creorga APK Builder
echo  ──────────────────────
echo.

REM Vérifier ANDROID_HOME
if "%ANDROID_HOME%"=="" (
  echo  ❌ ANDROID_HOME n'est pas défini.
  echo     Installez Android Studio puis ajoutez la variable d'environnement :
  echo     ANDROID_HOME = %USERPROFILE%\AppData\Local\Android\Sdk
  echo.
  pause
  exit /b 1
)

cd /d "%~dp0apps\web"

echo  📦 [1/3] Build Vite ^(web^)…
call npm run build
if errorlevel 1 (
  echo  ❌ Build Vite a échoué.
  pause
  exit /b 1
)

echo.
echo  🔄 [2/3] Sync vers Android…
call npx cap sync android
if errorlevel 1 (
  echo  ❌ Sync Capacitor a échoué.
  pause
  exit /b 1
)

echo.
echo  🔨 [3/3] Compile l'APK…
cd android
call gradlew.bat assembleDebug
if errorlevel 1 (
  echo  ❌ Compilation Gradle a échoué.
  pause
  exit /b 1
)

echo.
echo  ✅ APK généré avec succès !
echo.
echo  📁 Emplacement :
echo     %~dp0apps\web\android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo  📤 Pour transférer sur Samsung :
echo     1. Copiez le .apk dans Google Drive
echo     2. Sur le tel, tap le fichier dans l'app Drive ^→ Installer
echo     3. Autoriser "Apps inconnues" si demandé
echo.

REM Optionnel : ouvrir l'explorer sur le dossier de l'APK
explorer "%~dp0apps\web\android\app\build\outputs\apk\debug"

pause
