import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

let sharedSocket: Socket | null = null

function getSharedSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io(window.location.origin, {
      path: '/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    })
  }
  return sharedSocket
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const [, force] = useState(0)

  useEffect(() => {
    socketRef.current = getSharedSocket()
    force((n) => n + 1)
    // Do not disconnect shared socket on unmount; components share the same instance.
    return () => {
      // noop
    }
  }, [])

  return socketRef.current
}

export function useSocketEvent<T = unknown>(
  event: string,
  handler: (data: T) => void,
) {
  const socket = useSocket()
  useEffect(() => {
    if (!socket) return
    socket.on(event, handler as (data: unknown) => void)
    return () => {
      socket.off(event, handler as (data: unknown) => void)
    }
  }, [socket, event, handler])
}
