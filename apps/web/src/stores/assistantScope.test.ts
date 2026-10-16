import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Company, User, UserCompany } from '@/types'

const saved = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => saved.get(key) ?? null,
  setItem: (key: string, value: string) => saved.set(key, value),
  removeItem: (key: string) => saved.delete(key),
})
const { useAuthStore } = await import('./authStore')
const { useAssistant } = await import('./assistantStore')

function login(userId = 'utilisateur-a', companyId = 'societe-a') {
  const user: User = { id: userId, email: `${userId}@example.invalid`, firstName: 'Fictif', lastName: 'Recette', avatar: null }
  const company: Company = { id: companyId, name: companyId, legalName: null, vatNumber: null, currency: 'EUR' }
  const membership: UserCompany = { id: 'adhesion', userId, companyId, role: 'OWNER', isActive: true, company }
  useAuthStore.getState().setAuth({ accessToken: 'jeton-fictif', user, companies: [membership] })
}

describe('cloisonnement des conversations de l’assistant', () => {
  beforeEach(() => {
    useAuthStore.getState().logout()
    useAssistant.setState({ conversations: [], currentConversationId: null, messages: [], attachments: [], histories: {} } as any)
    saved.clear()
  })

  it('ne montre ni messages ni pièces jointes lors du changement de société, puis retrouve seulement son historique', () => {
    login()
    useAssistant.getState().newConversation()
    useAssistant.getState().addMessage({ role: 'user', text: 'Dossier privé société A' })
    useAssistant.getState().addAttachment({ kind: 'image', name: 'document-prive.png', mimeType: 'image/png', size: 10, dataUrl: 'data:image/png;base64,AAAA' })
    useAssistant.getState().setMode('thinking')

    login('utilisateur-a', 'societe-b')
    expect(useAssistant.getState().messages).toEqual([])
    expect(useAssistant.getState().attachments).toEqual([])
    expect(useAssistant.getState().mode).toBe('idle')
    expect(useAssistant.getState().conversations.flatMap(c => c.messages)).toEqual([])

    login()
    expect(useAssistant.getState().messages.map(m => m.text)).toEqual(['Dossier privé société A'])
    expect(useAssistant.getState().attachments).toEqual([])
  })

  it('ne réattribue pas les messages au prochain utilisateur de la même société', () => {
    login()
    useAssistant.getState().newConversation()
    useAssistant.getState().addMessage({ role: 'user', text: 'Message utilisateur A' })
    useAuthStore.getState().logout()
    expect(useAssistant.getState().messages).toEqual([])
    login('utilisateur-b')
    expect(useAssistant.getState().messages).toEqual([])
  })

  it('rattache une réponse tardive à la conversation demandée, jamais à la nouvelle conversation', () => {
    login()
    const first = useAssistant.getState().newConversation()
    const state = useAssistant.getState() as any
    expect(typeof state.captureContext).toBe('function')
    const context = state.captureContext()
    const second = state.newConversation()
    expect(state.addMessageForContext(context, { role: 'bot', text: 'Réponse première discussion' })).toBe(true)
    expect(useAssistant.getState().currentConversationId).toBe(second)
    expect(useAssistant.getState().messages).toEqual([])
    expect(useAssistant.getState().conversations.find(c => c.id === first)?.messages.map(m => m.text)).toEqual(['Réponse première discussion'])
  })

  it('rejette une réponse après déconnexion puis reconnexion du même compte', () => {
    login()
    useAssistant.getState().newConversation()
    const state = useAssistant.getState() as any
    expect(typeof state.captureContext).toBe('function')
    const context = state.captureContext()
    useAuthStore.getState().logout()
    login()
    expect(state.addMessageForContext(context, { role: 'bot', text: 'Retour périmé' })).toBe(false)
    expect(useAssistant.getState().conversations.flatMap(c => c.messages)).toEqual([])
  })

  it('préserve en quarantaine un ancien historique non attribuable, sans l’afficher', () => {
    const old = [{ id: 'ancien', title: 'Privé', messages: [{ id: 'm', role: 'user', text: 'Historique ancien', ts: 1 }], createdAt: 1, updatedAt: 1, archived: false }]
    const migrate = useAssistant.persist.getOptions().migrate!
    const migrated = migrate({ conversations: old, currentConversationId: 'ancien', name: 'Robi ancien' }, 2) as any
    expect(migrated.quarantinedHistory?.conversations).toEqual(old)
    expect(migrated.conversations ?? []).toEqual([])
    expect(migrated.histories ?? {}).toEqual({})
  })

  it('refuse une réponse après changement des droits ou de la vue employé', () => {
    login()
    useAssistant.getState().newConversation()
    const state = useAssistant.getState()
    const context = state.captureContext()
    useAuthStore.getState().setViewMode('employee', 'salarie-fictif')
    expect(state.addMessageForContext(context, { role: 'bot', text: 'Données de la vue propriétaire' })).toBe(false)
    expect(useAssistant.getState().messages).toEqual([])
  })

  it('restaure seulement l’historique scoped lors de l’hydratation et ne persiste pas les octets joints', () => {
    login()
    useAssistant.getState().newConversation()
    useAssistant.getState().addMessage({ role: 'user', text: 'Message scoped', attachments: [{ id: 'fictif', name: 'fictif.pdf', kind: 'file', mimeType: 'application/pdf', size: 1, dataUrl: 'data:application/pdf;base64,AAAA' }] })
    const persisted = JSON.parse(saved.get('creorga-assistant')!).state
    expect(JSON.stringify(persisted)).not.toContain('data:application/pdf')
    expect(persisted.conversations).toBeUndefined()
    const merge = useAssistant.persist.getOptions().merge!
    const own = merge(persisted, useAssistant.getState())
    expect(own.messages.map(m => m.text)).toEqual(['Message scoped'])
    login('utilisateur-b')
    const other = merge(persisted, useAssistant.getState())
    expect(other.messages).toEqual([])
  })
})
