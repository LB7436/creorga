import { randomBytes } from 'node:crypto'
import { createTrackedRouter as Router } from '../lib/tracked-router'
import { z } from 'zod'
import { DocumentLinkError, downloadInvoiceDocument } from '../lib/invoice-document-links'

const router = Router()
router.use((_req, res, next) => {
  res.set({ 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'Permissions-Policy': 'camera=(), microphone=()' })
  next()
})
router.get('/', (req, res) => {
  if (Object.keys(req.query).length) return res.status(400).send('Le lien doit conserver son fragment privé, pas une query HTTP.')
  const nonce = randomBytes(18).toString('base64')
  res.set('Content-Security-Policy', `default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'`)
  res.type('html').send(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><title>Document CréOrga</title><style nonce="${nonce}">body{font:18px system-ui,sans-serif;background:#f8fafc;color:#0f172a;margin:0;padding:32px}main{max-width:600px;margin:5vh auto;padding:28px;background:white;border:1px solid #cbd5e1;border-radius:16px}button{font:inherit;padding:12px 18px;background:#1d4ed8;color:white;border:0;border-radius:8px;cursor:pointer}button:focus-visible{outline:3px solid #f59e0b;outline-offset:3px}button:disabled{background:#475569;cursor:default}p{line-height:1.6}#state{min-height:3em}</style></head><body><main><h1>Votre document PDF</h1><p>Ce lien temporaire permet de télécharger un seul original de facture. Toute personne qui possède ce lien peut l'utiliser jusqu'à son échéance ou sa révocation.</p><button id="download" type="button">Télécharger le PDF original</button><p id="state" role="status" aria-live="polite">Aucun document téléchargé.</p><p>Ce téléchargement ne vous connecte pas à CréOrga et ne vous inscrit à aucune publicité.</p></main><script nonce="${nonce}">
const token=location.hash.slice(1);history.replaceState(null,'',location.pathname);const button=document.getElementById('download'),state=document.getElementById('state');
if(!/^v1\\.[a-f0-9-]{36}\\.\\d+\\.[A-Za-z0-9_-]{43}$/.test(token)){button.disabled=true;state.textContent='Lien incomplet. Rouvrez le lien reçu du responsable.';}
button.addEventListener('click',async()=>{button.disabled=true;state.textContent='Vérification du lien et du PDF…';try{const response=await fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',cache:'no-store',redirect:'error',body:JSON.stringify({token})});if(!response.ok||!(response.headers.get('Content-Type')||'').includes('application/pdf'))throw Error('Lien expiré, révoqué ou indisponible. Demandez un nouveau lien au responsable.');const blob=await response.blob(),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=(response.headers.get('Content-Disposition')||'').match(/filename="([a-zA-Z0-9_.-]+)"/)?.[1]||'facture.pdf';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),60000);state.textContent='PDF original téléchargé. Conservez-le dans un emplacement privé.';}catch(error){state.textContent='Téléchargement refusé ou interrompu. Le lien peut être expiré, révoqué ou indisponible ; aucun succès annoncé.';}finally{button.disabled=false;}});
</script></body></html>`)
})
router.post('/', async (req, res) => {
  try {
    if (Object.keys(req.query).length) return res.status(400).json({ message: 'Paramètres HTTP non autorisés.' })
    const result = await downloadInvoiceDocument(req.body)
    return res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${result.filename}"`, 'X-Creorga-Document-Hash': result.hash, 'X-Creorga-Document-State': 'original-frozen' }).send(result.bytes)
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: 'Capacité documentaire invalide.' })
    if (error instanceof DocumentLinkError) return res.status(error.status).json({ message: error.message })
    // Pas de corps/URL/erreur SQL dans les logs : cette requête porte une capacité.
    return res.status(503).json({ message: 'Vérification du document indisponible. Aucun fichier communiqué.' })
  }
})
export default router
