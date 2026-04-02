import { useEffect, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    socketRef.current = io(window.location.origin, {
      withCredentials: true,
    })

    return () => {
      socketRef.current?.disconnect()
    }
  }, [])

  return socketRef.current
}
