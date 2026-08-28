import { afterEach, describe, expect, it } from 'vitest'
import {
  EmailNotConfiguredError,
  emailConfigured,
  retryableSmtpConnectionError,
  sendEmail,
  smtpTransportConfiguration,
} from './email'

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

  it('sérialise les envois Zoho dans un pool IPv4 unique', () => {
    process.env.SMTP_HOST = 'smtp.zoho.eu'
    process.env.SMTP_PORT = '465'
    process.env.SMTP_SECURE = 'true'
    process.env.SMTP_USER = 'contact@n8nautomatisations.org'
    process.env.SMTP_PASS = 'mot-de-passe-application-test'

    expect(smtpTransportConfiguration()).toMatchObject({
      pool: true,
      maxConnections: 1,
      family: 4,
      connectionTimeout: 30_000,
      host: 'smtp.zoho.eu',
      port: 465,
      secure: true,
    })
  })

  it('ne retente que les erreurs survenues avant l’envoi SMTP', () => {
    expect(retryableSmtpConnectionError({ code: 'ETIMEDOUT', command: 'CONN' })).toBe(true)
    expect(retryableSmtpConnectionError({ code: 'EAI_AGAIN', command: 'CONN' })).toBe(true)
    expect(retryableSmtpConnectionError({ code: 'ETIMEDOUT', command: 'DATA' })).toBe(false)
    expect(retryableSmtpConnectionError({ code: 'EAUTH', command: 'AUTH LOGIN' })).toBe(false)
  })
})
