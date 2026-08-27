import { beforeEach, describe, expect, it } from 'vitest'
import type { Company, User, UserCompany } from '@/types'
import { useAuthStore } from './authStore'
import { useAssistant } from './assistantStore'
import { useChairs } from './chairStore'
import { useRoomDesigner } from './roomDesignerStore'

const user: User = {
  id: 'user-1', email: 'client@example.com', firstName: 'Nouveau', lastName: 'Client', avatar: null,
}

function membership(companyId: string, role: UserCompany['role']): UserCompany {
  const company: Company = {
    id: companyId, name: companyId, legalName: null, vatNumber: null, currency: 'EUR',
  }
  return { id: `membership-${companyId}`, userId: user.id, companyId, role, isActive: true, company }
}

describe('transitions critiques des stores', () => {
  beforeEach(() => {
    useAuthStore.getState().logout()
    useAssistant.setState({
      conversations: [], currentConversationId: null, messages: [], attachments: [],
    })
    useChairs.setState({ chairs: [] })
    useRoomDesigner.setState({ rooms: [], activeRoomId: null })
  })

  it('recalcule le rôle et la vue lors du changement de société', () => {
    const companies = [membership('company-owner', 'OWNER'), membership('company-employee', 'EMPLOYEE')]
    useAuthStore.getState().setAuth({ accessToken: 'token', user, companies })
    useAuthStore.getState().setActiveCompany('company-employee')

    const state = useAuthStore.getState()
    expect(state.companyId).toBe('company-employee')
    expect(state.role).toBe('employee')
    expect(state.viewMode).toBe('employee')
    expect(state.viewAsEmployeeId).toBe(user.id)
    expect(state.viewAsEmployeeName).toBe('Nouveau Client')
  })

  it('synchronise les messages après suppression de la conversation active', () => {
    const first = { id: 'first', title: 'Première', messages: [{ id: 'm1', role: 'user' as const, text: 'ancien', ts: 1 }], createdAt: 1, updatedAt: 1, archived: false }
    const second = { id: 'second', title: 'Deuxième', messages: [{ id: 'm2', role: 'bot' as const, text: 'suivant', ts: 2 }], createdAt: 2, updatedAt: 2, archived: false }
    useAssistant.setState({ conversations: [first, second], currentConversationId: first.id, messages: first.messages })

    useAssistant.getState().deleteConversation(first.id)

    expect(useAssistant.getState().currentConversationId).toBe(second.id)
    expect(useAssistant.getState().messages).toEqual(second.messages)
  })

  it('ouvre une conversation neuve quand la conversation active est la dernière non archivée', () => {
    const only = { id: 'only', title: 'Seule', messages: [], createdAt: 1, updatedAt: 1, archived: false }
    useAssistant.setState({ conversations: [only], currentConversationId: only.id, messages: [] })

    useAssistant.getState().archiveConversation(only.id)

    const state = useAssistant.getState()
    expect(state.currentConversationId).not.toBe(only.id)
    expect(state.conversations.find((c) => c.id === state.currentConversationId)?.archived).toBe(false)
  })

  it('ne vide pas une commande transférée vers la même chaise', () => {
    useChairs.setState({ chairs: [{ id: 'chair-1', label: 'C1', tableId: 'table-1', x: 0, y: 0, items: [{ id: 'item-1', name: 'Café', price: 2, qty: 1 }] }] })

    useChairs.getState().transferItems('chair-1', 'chair-1')

    expect(useChairs.getState().chairs[0].items).toHaveLength(1)
  })

  it('sélectionne une salle restante après suppression de la salle active', () => {
    useRoomDesigner.setState({
      rooms: [
        { id: 'room-a', name: 'A', elements: [], width: 800, height: 600 },
        { id: 'room-b', name: 'B', elements: [], width: 800, height: 600 },
      ],
      activeRoomId: 'room-a',
    })

    useRoomDesigner.getState().removeRoom('room-a')

    expect(useRoomDesigner.getState().activeRoomId).toBe('room-b')
  })
})
