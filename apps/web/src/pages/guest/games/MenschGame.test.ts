import { describe, expect, it } from 'vitest'
import { canMove, createState, FINISH_STEP, TRACK_LENGTH } from './MenschGame'

describe('Petits Chevaux — règles essentielles', () => {
  it('exige un 6 pour sortir un pion de la maison', () => {
    const state = createState(2)
    state.rolled = true
    state.die = 5
    expect(canMove(state, state.players[0].pieces[0], 0)).toBe(false)
    state.die = 6
    expect(canMove(state, state.players[0].pieces[0], 0)).toBe(true)
  })

  it('refuse de sortir sur une case de départ déjà occupée', () => {
    const state = createState(2)
    state.rolled = true
    state.die = 6
    state.players[0].pieces[0].steps = 0
    expect(canMove(state, state.players[0].pieces[1], 0)).toBe(false)
  })

  it('exige le nombre exact pour la prochaine case finale', () => {
    const state = createState(2)
    state.rolled = true
    state.players[0].pieces[0].steps = TRACK_LENGTH - 1
    state.die = 5
    expect(canMove(state, state.players[0].pieces[0], 0)).toBe(false)
    state.die = 6
    expect(canMove(state, state.players[0].pieces[0], 0)).toBe(true)
    expect(FINISH_STEP).toBe(TRACK_LENGTH + 5)
  })
})
