import { afterEach, describe, expect, it } from 'vitest'
import { EmailNotConfiguredError, emailConfigured, sendEmail } from './email'

const VARIABLES = ['RESEND_API_KEY', 'EMAIL_FROM', 'SMTP_USER', 'SMTP_PASS', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE'] as const
const anciennesValeurs = Object.fromEntries(VARIABLES.map((key) => [key, process.env[key]]))

afterEach(() => {
  for (const key of VARIABLES) {
    const valeur = anciennesValeurs[key]
    if (valeur === undefined) delete process.env[key]
    else process.env[key] = valeur
  }
})

describe('sendEmail', () => {
  it('refuse clairement un envoi non configuré au lieu de simuler un succès', async () => {
    for (const key of VARIABLES) delete process.env[key]
    expect(emailConfigured()).toBe(false)
    await expect(sendEmail({
      to: 'destinataire@example.test',
      subject: 'Test',
      html: '<p>Test</p>',
    })).rejects.toBeInstanceOf(EmailNotConfiguredError)
  })

  it('reconnaît la configuration SMTP Zoho sans exiger Resend', () => {
    delete process.env.RESEND_API_KEY
    process.env.SMTP_USER = 'contact@n8nautomatisations.org'
    process.env.SMTP_PASS = 'mot-de-passe-application-test'
    process.env.EMAIL_FROM = 'Creorga <contact@n8nautomatisations.org>'
    expect(emailConfigured()).toBe(true)
  })
})
