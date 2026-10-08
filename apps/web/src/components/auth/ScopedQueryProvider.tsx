import { type ReactNode, useSyncExternalStore } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { createScopedQueryClient } from '@/lib/scopedQueryClient'

const boundary = createScopedQueryClient(useAuthStore)
if (import.meta.hot) import.meta.hot.dispose(() => boundary.dispose())

export default function ScopedQueryProvider({ children }: { children: ReactNode }) {
  const { client, generation } = useSyncExternalStore(boundary.subscribe, boundary.getSnapshot, boundary.getSnapshot)
  // La clé remonte aussi les formulaires/détails en mémoire : le client neuf
  // seul ne suffirait pas à effacer un useState rempli par la société précédente.
  return <QueryClientProvider key={generation} client={client}>{children}</QueryClientProvider>
}
