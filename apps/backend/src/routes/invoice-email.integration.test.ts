import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import net from 'node:net'
import { createHash, randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import prisma from '../lib/prisma'
import { deviceOrUserAuth } from '../middleware/deviceAuth'
import { requireCompany } from '../middleware/requireCompany'
import invoices from './invoices'
import { closeEmailTransport } from '../lib/email'

const app = express(); app.use(express.json()); app.use('/api/invoices', deviceOrUserAuth, requireCompany, invoices)
const companyId = 'integration-invoice-mail', userId = 'integration-invoice-mail-owner'
let token: string, invoiceId: string, dropAck = false
const mails: string[] = [], sockets = new Set<net.Socket>()
const server = net.createServer(socket => {
  sockets.add(socket); socket.on('close', () => sockets.delete(socket)); socket.write('220 localhost.invalid SMTP recette\r\n')
  let buffer = '', data = false, lines: string[] = []
  socket.on('data', chunk => {
    buffer += chunk.toString()
    let end
    while ((end = buffer.indexOf('\r\n')) >= 0) {
      const line = buffer.slice(0, end); buffer = buffer.slice(end + 2)
      if (data) {
        if (line !== '.') { lines.push(line.startsWith('..') ? line.slice(1) : line); continue }
        data = false; mails.push(lines.join('\r\n')); lines = []
        if (dropAck) { socket.destroy(); return }
        socket.write('250 accepté dans la boîte locale de test\r\n'); continue
      }
      if (/^EHLO|^HELO/.test(line)) socket.write('250-localhost.invalid\r\n250 AUTH PLAIN\r\n')
      else if (/^AUTH /.test(line)) socket.write('235 authentification fictive acceptée\r\n')
      else if (/^RCPT TO:/.test(line)) socket.write(/\.invalid>/i.test(line) ? '250 destinataire de test\r\n' : '550 domaine réel interdit\r\n')
      else if (line === 'DATA') { data = true; socket.write('354 contenu attendu\r\n') }
      else if (line === 'QUIT') { socket.end('221 terminé\r\n') }
      else socket.write('250 OK\r\n')
    }
  })
})
const auth = (r: any) => r.set('Authorization', 'Bearer ' + token).set('x-company-id', companyId)
async function delivery(id: string) {
  for (let n = 0; n < 100; n++) {
    const result = await auth(request(app).get(`/api/invoices/deliveries/${id}`))
    if (['ACCEPTED', 'UNCERTAIN', 'FAILED'].includes(result.body.status)) return result.body
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  throw new Error('Envoi non terminé dans la recette locale')
}
describe('SMTP local : vrai PDF, référence stable et accusé ambigu', () => {
  beforeAll(async () => {
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || !new URL(process.env.DATABASE_URL!).pathname.endsWith('/creorga_tests')) throw new Error('Base de tests obligatoire')
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    vi.stubEnv('SMTP_HOST', '127.0.0.1'); vi.stubEnv('SMTP_PORT', String((server.address() as net.AddressInfo).port)); vi.stubEnv('SMTP_SECURE', 'false')
    vi.stubEnv('SMTP_USER', 'fixture-only'); vi.stubEnv('SMTP_PASS', 'fixture-only'); vi.stubEnv('EMAIL_FROM', 'Recette <test@localhost.invalid>'); vi.stubEnv('EMAIL_TEST_ONLY', 'true')
    await prisma.company.create({ data: { id: companyId, name: 'Émetteur fictif SMTP', address: 'Adresse fictive' } })
    await prisma.user.create({ data: { id: userId, email: 'mail-test@localhost.invalid', firstName: 'Test', lastName: 'Owner', password: 'unused' } })
    await prisma.userCompany.create({ data: { userId, companyId, role: 'OWNER' } })
    token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '10m' })
    const created = await auth(request(app).post('/api/invoices')).send({ items: [{ description: 'Recette technique uniquement', quantity: 1, unitPrice: 10, taxRate: 17 }] }).expect(201)
    invoiceId = created.body.id
    await auth(request(app).put(`/api/invoices/${invoiceId}/status`)).send({ status: 'SENT' }).expect(200)
  })
  afterAll(async () => {
    closeEmailTransport(); for (const socket of sockets) socket.destroy()
    await new Promise<void>(resolve => server.close(() => resolve()))
    await (prisma as any).invoiceDelivery?.deleteMany({ where: { companyId } })
    await prisma.invoice.deleteMany({ where: { companyId } }); await prisma.userCompany.deleteMany({ where: { userId } }); await prisma.user.deleteMany({ where: { id: userId } })
    await prisma.company.deleteMany({ where: { id: companyId } }); await prisma.$disconnect(); vi.unstubAllEnvs()
  })
  it('reçoit le même PDF original dans la boîte locale, une fois malgré le rejeu', async () => {
    const id = randomUUID(), input = { requestId: id, to: 'destinataire@localhost.invalid' }
    await auth(request(app).post(`/api/invoices/${invoiceId}/email`)).send(input).expect(202)
    expect((await delivery(id)).status).toBe('ACCEPTED')
    await auth(request(app).post(`/api/invoices/${invoiceId}/email`)).send(input).expect(202)
    expect(mails).toHaveLength(1)
    const encoded = mails[0].match(/Content-Type: application\/pdf[\s\S]*?\r\n\r\n([a-zA-Z0-9+/=\r\n]+)\r\n--/i)?.[1]
    expect(encoded).toBeTruthy()
    const bytes = Buffer.from(encoded!.replace(/\s/g, ''), 'base64')
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-')
    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } })
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(invoice.issuedPdfHash)
  })
  it('ne réexpédie pas après perte de l’accusé, même si le serveur a reçu le message', async () => {
    dropAck = true
    const id = randomUUID(), input = { requestId: id, to: 'autre@localhost.invalid' }
    await auth(request(app).post(`/api/invoices/${invoiceId}/email`)).send(input).expect(202)
    expect((await delivery(id)).status).toBe('UNCERTAIN')
    await auth(request(app).post(`/api/invoices/${invoiceId}/email`)).send(input).expect(202)
    expect(mails).toHaveLength(2)
  })
})
