import { describe, expect, it } from 'vitest'
import { confirmAssistantPreview } from './assistantConfirmation'

const preview = { confirmEndpoint: '/api/agent/intent/confirm', confirmPayload: { intent: 'fictif' } }

describe('confirmation métier de l’assistant après le RED navigateur', () => {
  it.each([403, 409, 503])('ne transforme pas HTTP %s en succès', async status => {
    const send = async () => Response.json({ error: 'Refus explicite' }, { status })
    await expect(confirmAssistantPreview('http://localhost:3002', preview, send)).rejects.toThrow('Refus explicite')
  })

  it('exige une confirmation explicite même après HTTP 200', async () => {
    await expect(confirmAssistantPreview('http://localhost:3002', preview, async () => Response.json({ summary: 'Texte non probant' }))).rejects.toMatchObject({ uncertain: true })
    await expect(confirmAssistantPreview('http://localhost:3002', preview, async () => Response.json({ success: false, message: 'Aucune action appliquée' }))).rejects.toMatchObject({ message: 'Aucune action appliquée', uncertain: false })
  })

  it('retourne uniquement un succès confirmé par la réponse métier', async () => {
    const summary = await confirmAssistantPreview('http://localhost:3002', preview, async () => Response.json({ success: true, summary: 'Action fictive confirmée' }))
    expect(summary).toBe('Action fictive confirmée')
  })

  it('conserve l’incertitude après panne réseau ou réponse serveur ambiguë', async () => {
    await expect(confirmAssistantPreview('http://localhost:3002', preview, async () => { throw new Error('Réseau interrompu') })).rejects.toMatchObject({ uncertain: true })
    await expect(confirmAssistantPreview('http://localhost:3002', preview, async () => Response.json({}, { status: 500 }))).rejects.toMatchObject({ uncertain: true })
    await expect(confirmAssistantPreview('http://localhost:3002', preview, async () => Response.json({ code: 'ASSISTANT_ACTION_MIGRATION_REQUIRED' }, { status: 503 }))).rejects.toMatchObject({ uncertain: false })
  })

  it('refuse toute autre destination avant de lancer une requête', async () => {
    let called = false
    await expect(confirmAssistantPreview('http://localhost:3002', { ...preview, confirmEndpoint: '/api/payments/refund' }, async () => { called = true; return Response.json({ success: true }) })).rejects.toMatchObject({ uncertain: false })
    expect(called).toBe(false)
  })
})
