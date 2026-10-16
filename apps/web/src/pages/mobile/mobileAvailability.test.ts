import { beforeAll, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { StaticRouter } from 'react-router-dom'

beforeAll(() => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} })
})

describe('disponibilité honnête des réglages mobiles', () => {
  it('ne promet pas une protection biométrique financière inexistante', async () => {
    const { default: MobileSettings } = await import('./MobileSettings')
    const html = renderToStaticMarkup(createElement(StaticRouter, { location: '/m/settings', children: createElement(MobileSettings) }))
    expect(html).not.toContain('Confirmer biométrie pour &gt; 200')
    expect(html).toContain('Biométrie financière — indisponible')
    expect(html).not.toContain('Tester biométrie (Face ID / empreinte)')
  })
})
