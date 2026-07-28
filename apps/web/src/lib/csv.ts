/**
 * Export CSV lisible par Excel en français.
 *
 * Trois pièges, tous constatés à l'export sur PC Windows le 27/07/2026 :
 *
 *  1. **BOM UTF-8.** Une fois le fichier sur disque, Excel ignore l'en-tête
 *     HTTP `charset=utf-8` et ouvre en ANSI (CP1252) : « Prénom » devient
 *     « PrÃ©nom ». Seul un BOM en tête force la lecture en UTF-8.
 *
 *  2. **Séparateur `;`.** En locale FR, la virgule est le séparateur décimal,
 *     donc le séparateur de liste est le point-virgule. Un CSV à virgules
 *     s'ouvre avec toutes les colonnes empilées dans la colonne A.
 *
 *  3. **Décimales à la virgule.** `toFixed(2)` produit « 15.00 » : Excel FR
 *     lit ça comme du texte, et la colonne n'est plus sommable. C'est
 *     rédhibitoire sur un export de paie.
 *
 * Et l'échappement, qui n'était fait nulle part : un client « Dupont, Jean »
 * décalait toute la ligne.
 */

/** Échappe un champ : guillemets doublés, encadrement si nécessaire. */
export function csvField(valeur: unknown): string {
  if (valeur === null || valeur === undefined) return ''

  if (typeof valeur === 'number') {
    if (!Number.isFinite(valeur)) return ''
    // Décimale à la virgule pour qu'Excel FR y voie un nombre.
    return String(valeur).replace('.', ',')
  }

  const texte = String(valeur)
  // Toujours encadrer : un texte contenant ; " ou un retour-ligne casse la
  // ligne sinon.
  return `"${texte.replace(/"/g, '""')}"`
}

/**
 * Construit le contenu CSV complet, BOM inclus.
 * Les lignes sont séparées par CRLF, attendu par Excel sous Windows.
 */
export function buildCsv(entetes: string[], lignes: unknown[][]): string {
  const corps = [entetes.map(csvField).join(';'), ...lignes.map((l) => l.map(csvField).join(';'))]
  return '﻿' + corps.join('\r\n')
}

/** Déclenche le téléchargement d'un CSV correctement encodé. */
export function downloadCsv(nomFichier: string, entetes: string[], lignes: unknown[][]): void {
  const blob = new Blob([buildCsv(entetes, lignes)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomFichier
  a.click()
  URL.revokeObjectURL(url)
}
