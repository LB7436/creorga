import { Router, Request, Response } from 'express'
import { sendEmail, emailTemplates } from '../lib/email'

const router = Router()

// Endpoint test générique
router.post('/test', async (req: Request, res: Response) => {
  const { to, template, data } = req.body as { to: string; template: keyof typeof emailTemplates; data: any }
  if (!to || !template) return res.status(400).json({ error: 'to et template requis' })
  const builder = emailTemplates[template] as ((d: any) => string) | undefined
  if (!builder) return res.status(400).json({ error: `Template inconnu: ${template}` })

  try {
    const html = builder(data || {})
    const result = await sendEmail({ to, subject: `[Test] ${template}`, html })
    res.json({ ok: true, result })
  } catch (err: any) {
    res.status(500).json({ error: err?.message })
  }
})

// Endpoints spécifiques
router.post('/welcome', async (req: Request, res: Response) => {
  const { to, name } = req.body
  try {
    const result = await sendEmail({ to, subject: `Bienvenue sur Creorga, ${name}`, html: emailTemplates.welcome(name) })
    res.json({ ok: true, result })
  } catch (err: any) { res.status(500).json({ error: err?.message }) }
})

router.post('/password-reset', async (req: Request, res: Response) => {
  const { to, link } = req.body
  try {
    const result = await sendEmail({ to, subject: 'Réinitialisation mot de passe', html: emailTemplates.passwordReset(link) })
    res.json({ ok: true, result })
  } catch (err: any) { res.status(500).json({ error: err?.message }) }
})

router.post('/invoice-paid', async (req: Request, res: Response) => {
  const { to, invoice } = req.body
  try {
    const result = await sendEmail({ to, subject: `Paiement reçu - ${invoice.number}`, html: emailTemplates.invoicePaid(invoice) })
    res.json({ ok: true, result })
  } catch (err: any) { res.status(500).json({ error: err?.message }) }
})

router.post('/trial-ending', async (req: Request, res: Response) => {
  const { to, daysLeft } = req.body
  try {
    const result = await sendEmail({ to, subject: `Essai se termine dans ${daysLeft} jours`, html: emailTemplates.trialEnding(daysLeft) })
    res.json({ ok: true, result })
  } catch (err: any) { res.status(500).json({ error: err?.message }) }
})

router.get('/templates', (_req: Request, res: Response) => {
  res.json({ templates: Object.keys(emailTemplates) })
})

export default router
