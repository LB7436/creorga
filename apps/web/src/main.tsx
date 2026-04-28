import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import './styles/dark-overlay.css'

// v3.15 fix : APK / PWA installée → forcer l'entrée sur /m/demo
// Capacitor charge directement https://localhost/ (root) en ignorant le manifest start_url.
// On détecte le contexte mobile/Capacitor et on rebascule sur /m/demo AVANT le mount React.
;(() => {
  if (typeof window === 'undefined') return
  const path = window.location.pathname
  const isCapacitor = !!(window as any).Capacitor
  const isPWAStandalone = window.matchMedia?.('(display-mode: standalone)').matches
  const isMobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  const onRoot = path === '/' || path === '' || path === '/index.html'

  if (onRoot && (isCapacitor || isPWAStandalone || isMobileUA)) {
    window.history.replaceState(null, '', '/m/demo')
  }
})()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                borderRadius: '12px',
                padding: '12px 16px',
              },
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
