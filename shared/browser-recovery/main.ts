import { collectSnapshot, readOfflineQueue, readRecoveryCaches, encryptSnapshot, decryptSnapshot } from './archive'
import './style.css'

const root = document.querySelector<HTMLElement>('#recovery')!
root.innerHTML = `<main>
  <p class="eyebrow">CRÉORGA · REPRISE LOCALE</p><h1>Préserver cette ancienne caisse</h1>
  <p>Export chiffré des données historiques de ce navigateur. Aucun envoi au serveur, aucune suppression et aucun rejeu de paiement.</p>
  <p class="notice">Avant de commencer : arrêter la saisie et fermer les autres onglets CréOrga. Répéter sur chaque ancien navigateur et chaque adresse exacte (domaine, protocole et port). Cet export ne remplace pas la sauvegarde PostgreSQL et des documents.</p>
  <p>Adresse actuellement lue : <strong id="origin"></strong></p>
  <label class="consent"><input id="authorized" type="checkbox"> Je suis autorisé à sauvegarder les données de cette caisse, y compris les anciennes sociétés éventuellement présentes.</label>
  <button id="collect">1. Préparer l’export chiffré</button>
  <p id="status" role="status" aria-live="polite">Aucune donnée lue pour l’instant.</p>
  <section id="downloads" hidden><h2>Deux fichiers indispensables</h2>
    <p>La clé peut ouvrir toutes les données, y compris d’anciens PIN ou jetons. Déplacez-la dans un espace privé distinct. Sans elle, la récupération est impossible. Ne publiez aucun des deux fichiers dans GitHub.</p>
    <button id="archive">2. Télécharger l’archive chiffrée</button>
    <button id="key">3. Télécharger la clé privée</button>
    <p>Les téléchargements ne sont pas encore une preuve de reprise. Relisez les deux fichiers ci-dessous avant de modifier l’ancienne installation.</p>
  </section>
  <section><h2>Vérifier des fichiers téléchargés</h2>
    <label>Archive chiffrée <input id="archive-file" type="file" accept=".json"></label>
    <label>Clé privée <input id="key-file" type="file" accept=".json"></label>
    <button id="verify">4. Vérifier sans importer</button>
    <p id="verification" role="status" aria-live="polite">Aucun fichier vérifié.</p>
  </section>
  <p class="notice">Un export vide ne prouve pas qu’aucune vente n’existe ailleurs. Aucune attribution société, conversion comptable ou confirmation bancaire n’est déduite des anciens enregistrements. Conservez les profils d’origine.</p>
</main>`
const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
element('origin').textContent = location.origin
let bundle: Awaited<ReturnType<typeof encryptSnapshot>> | undefined
const collectButton = element<HTMLButtonElement>('collect')
collectButton.onclick = async () => {
  if (!element<HTMLInputElement>('authorized').checked) { element('status').textContent = 'Confirmez votre autorisation avant de lire les données.'; return }
  collectButton.disabled = true; bundle = undefined; element('downloads').hidden = true
  element('status').textContent = 'Lecture et chiffrement en cours…'
  try {
    const snapshot = await collectSnapshot(localStorage, location.origin, () => readOfflineQueue(indexedDB), () => readRecoveryCaches(caches, location.origin))
    bundle = await encryptSnapshot(snapshot)
    const verified = await decryptSnapshot(bundle.archive, bundle.recoveryKey)
    if (JSON.stringify(verified) !== JSON.stringify(snapshot)) throw new Error('Comparaison de reprise différente.')
    element('status').textContent = `Copie préparée et déchiffrée en mémoire : ${snapshot.localStorage.length} entrées locales ; ${snapshot.offlineQueue.records.length} anciennes requêtes (non rejouées) ; ${snapshot.recoveryCaches.length} réponses/queues de cache. Téléchargez les deux fichiers.`
    element('downloads').hidden = false
  } catch (error) { element('status').textContent = error instanceof Error ? error.message : 'Export impossible ; profil préservé.' }
  finally { collectButton.disabled = false }
}
function download(contents: string, filename: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
element('archive').onclick = () => { if (bundle) download(bundle.archive, `creorga-reprise-${bundle.id}.json`) }
element('key').onclick = () => { if (bundle) download(bundle.recoveryKey, `creorga-cle-PRIVEE-${bundle.id}.json`) }
let verificationVersion = 0
for (const id of ['archive-file', 'key-file']) element(id).onchange = () => {
  verificationVersion++
  element('verification').textContent = 'Fichiers modifiés : vérification à refaire.'
}
element<HTMLButtonElement>('verify').onclick = async () => {
  const version = ++verificationVersion
  const archive = element<HTMLInputElement>('archive-file').files?.[0]
  const key = element<HTMLInputElement>('key-file').files?.[0]
  if (!archive || !key) { element('verification').textContent = 'Choisissez l’archive et sa clé.'; return }
  if (archive.size > 48 * 1024 * 1024 || key.size > 4096) { element('verification').textContent = 'Taille excessive : vérification refusée.'; return }
  try {
    const verified = await decryptSnapshot(await archive.text(), await key.text())
    if (version !== verificationVersion) return
    element('verification').textContent = `Déchiffrement et empreintes vérifiés : ${verified.localStorage.length} entrées locales, ${verified.offlineQueue.records.length} requêtes et ${verified.recoveryCaches.length} caches. Origine : ${verified.origin}. Rien importé, aucun paiement rejoué.`
  } catch { if (version === verificationVersion) element('verification').textContent = 'Vérification échouée : clé incorrecte, fichier altéré ou format non pris en charge. Conservez le navigateur d’origine.' }
}
