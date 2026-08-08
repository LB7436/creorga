/**
 * Impression et téléchargement — utilitaires partagés.
 *
 * Beaucoup de boutons « Télécharger », « Imprimer » et « Exporter » de
 * l'application étaient purement décoratifs : aucun `onClick`. Plutôt que de
 * réécrire la même mécanique dans chaque page, tout passe par ici.
 *
 * L'impression se fait dans une iframe cachée alimentée par `srcdoc` — jamais
 * `document.write`, et sans fenêtre pop-up à autoriser. Dans la boîte
 * d'impression, « Enregistrer au format PDF » produit le PDF : c'est ce qui
 * permet d'avoir un PDF sans embarquer de bibliothèque.
 */

/** Échappe le texte inséré dans le HTML d'impression. */
export function echapperHtml(valeur: unknown): string {
  return String(valeur ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
}

/** Déclenche le téléchargement d'une URL (blob, data: ou distante). */
export function telechargerFichier(href: string, nomFichier: string): void {
  const a = document.createElement('a')
  a.href = href
  a.download = nomFichier
  document.body.appendChild(a)
  a.click()
  a.remove()
}

const STYLE_IMPRESSION = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; }
  body { color: #0f172a; margin: 0; font-size: 12px; }
  h1 { font-size: 22px; margin: 0 0 2px; }
  .sous { color: #64748b; font-size: 12px; margin: 0 0 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .04em;
       color: #475569; border-bottom: 2px solid #cbd5e1; padding: 6px 4px; }
  td { padding: 5px 4px; border-bottom: 1px solid #e2e8f0; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  tfoot td { font-weight: 700; border-top: 2px solid #cbd5e1; border-bottom: none; }
  .pied { margin-top: 18px; font-size: 10px; color: #94a3b8; text-align: center; }
`

/**
 * Imprime un document A4. `corps` est du HTML déjà échappé par l'appelant.
 * Renvoie false si l'impression n'a pas pu être lancée.
 */
export function imprimerHtml(titre: string, corps: string, styleSup = ''): boolean {
  if (typeof document === 'undefined') return false
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
    <title>${echapperHtml(titre)}</title>
    <style>${STYLE_IMPRESSION}${styleSup}</style></head>
    <body>${corps}<div class="pied">Creorga — ${echapperHtml(titre)} — imprimé le ${new Date().toLocaleString('fr-LU')}</div></body></html>`

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  Object.assign(iframe.style, {
    position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0',
  })
  iframe.srcdoc = html
  iframe.onload = () => {
    const win = iframe.contentWindow
    if (!win) return
    win.focus()
    win.print()
    // On laisse la boîte d'impression s'ouvrir avant de retirer l'iframe.
    setTimeout(() => iframe.remove(), 2000)
  }
  document.body.appendChild(iframe)
  return true
}

/** Construit un tableau HTML d'impression à partir d'en-têtes et de lignes. */
export function tableauHtml(
  entetes: string[],
  lignes: Array<Array<string | number>>,
  colonnesNum: number[] = [],
): string {
  const th = entetes
    .map((e, i) => `<th class="${colonnesNum.includes(i) ? 'num' : ''}">${echapperHtml(e)}</th>`)
    .join('')
  const tr = lignes
    .map((l) => `<tr>${l
      .map((c, i) => `<td class="${colonnesNum.includes(i) ? 'num' : ''}">${echapperHtml(c)}</td>`)
      .join('')}</tr>`)
    .join('')
  return `<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`
}
