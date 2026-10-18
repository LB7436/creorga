import { afterEach, describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { ModuleIllustration } from './ModuleIllustrations'

let renderer: ReactTestRenderer | undefined
afterEach(() => { act(() => renderer?.unmount()); renderer = undefined })

describe('illustrations de modules sans chiffres métier inventés', () => {
  it('dessine toujours une facture sans afficher un montant décoratif comme une donnée réelle', async () => {
    await act(async () => { renderer = create(createElement(ModuleIllustration, { id: 'invoices', size: 52 })) })
    const svg = renderer!.root.findByType('svg')
    expect(svg.props.width).toBe(52)
    expect(svg.props.height).toBe(52)
    expect(svg.props.viewBox).toBe('0 0 80 80')
    expect(svg.findAllByType('path').length).toBeGreaterThan(0)
    const visibleText = svg.findAllByType('text').map(node => node.children.join('')).join(' ')
    expect(visibleText).not.toMatch(/[€$£]|\d/)
  })
})
