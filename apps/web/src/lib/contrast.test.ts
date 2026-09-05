import { it, expect } from 'vitest'
import { contrastInk } from './contrast'
it('assure le contraste sur les accents sombres et clairs du portail', () => {
  expect(contrastInk('#ffffff')).toBe('#000000')
  expect(contrastInk('#000000')).toBe('#ffffff')
  expect(contrastInk('#f59e0b')).toBe('#000000')
  expect(contrastInk('#22c55e')).toBe('#000000')
  expect(contrastInk('#a855f7')).toBe('#000000')
})
