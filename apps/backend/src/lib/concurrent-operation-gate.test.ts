import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'
import { concurrentOperationGate } from './concurrent-operation-gate'
function response() {
  const events = new EventEmitter()
  return Object.assign(events, { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() })
}
describe('document resource bounds', () => {
  it('rejects another operation until the admitted response finishes, releasing once only', () => {
    const gate = concurrentOperationGate(1), next = vi.fn(), first = response(), second = response()
    gate({} as Request, first as unknown as Response, next)
    gate({} as Request, second as unknown as Response, next)
    expect(next).toHaveBeenCalledOnce(); expect(second.status).toHaveBeenCalledWith(429)
    first.emit('finish'); first.emit('close')
    const third = response(); gate({} as Request, third as unknown as Response, next)
    const fourth = response(); gate({} as Request, fourth as unknown as Response, next)
    expect(next).toHaveBeenCalledTimes(2); expect(fourth.status).toHaveBeenCalledWith(429)
  })
  it('releases when a client disconnects without a completed response', () => {
    const gate = concurrentOperationGate(1), next = vi.fn(), first = response()
    gate({} as Request, first as unknown as Response, next); first.emit('close')
    gate({} as Request, response() as unknown as Response, next)
    expect(next).toHaveBeenCalledTimes(2)
  })
})
