import { Component, type ErrorInfo, type ReactNode } from 'react'
import { trackError } from '@/lib/analytics'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  detailsOpen: boolean
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    detailsOpen: false,
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, errorInfo)
    this.setState({ errorInfo })
    trackError(error, errorInfo.componentStack ?? 'ErrorBoundary')
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      detailsOpen: false,
    })
  }

  handleGoDashboard = (): void => {
    this.reset()
    if (typeof window !== 'undefined') {
      window.location.href = '/modules'
    }
  }

  handleReload = (): void => {
    if (typeof window !== 'undefined') window.location.reload()
  }

  handleReport = (): void => {
    const { error, errorInfo } = this.state
    const subject = encodeURIComponent(
      `[Creorga] Erreur: ${error?.message ?? 'inconnue'}`,
    )
    const body = encodeURIComponent(
      `Erreur: ${error?.message ?? ''}\n\n` +
        `Stack:\n${error?.stack ?? ''}\n\n` +
        `Component stack:\n${errorInfo?.componentStack ?? ''}\n\n` +
        `URL: ${typeof window !== 'undefined' ? window.location.href : ''}\n` +
        `Date: ${new Date().toISOString()}`,
    )
    window.open(`mailto:support@creorga.lu?subject=${subject}&body=${body}`)
    trackError(error, 'user_reported')
  }

  render(): ReactNode {
    if (!this.state.hasError || !this.state.error) {
      return this.props.children
    }

    if (this.props.fallback) {
      return this.props.fallback(this.state.error, this.reset)
    }

    const { error, errorInfo, detailsOpen } = this.state

    return (
      <div
        role="alert"
        aria-live="assertive"
        style={{
          minHeight: '100vh',
          background:
            'linear-gradient(135deg, #fef2f2 0%, #fef3c7 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: 560,
            width: '100%',
            background: '#ffffff',
            borderRadius: 20,
            padding: 32,
            border: '1px solid #fecaca',
            boxShadow: '0 20px 60px rgba(239,68,68,0.15)',
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #ef4444, #f97316)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              fontSize: 30,
            }}
            aria-hidden="true"
          >
            {'\u26A0\uFE0F'}
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 800,
              color: '#111827',
              letterSpacing: '-0.02em',
            }}
          >
            Oups ! Quelque chose s'est mal passé
          </h1>
          <p
            style={{
              margin: '8px 0 20px',
              fontSize: 14,
              color: '#6b7280',
              lineHeight: 1.5,
            }}
          >
            Une erreur inattendue est survenue. Nos équipes ont été notifiées.
            Vous pouvez tenter de revenir au tableau de bord ou recharger la page.
          </p>

          {/* Error details (collapsible) */}
          <details
            open={detailsOpen}
            onToggle={(e) =>
              this.setState({ detailsOpen: (e.target as HTMLDetailsElement).open })
            }
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 10,
              padding: 12,
              marginBottom: 20,
            }}
          >
            <summary
              style={{
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: '#b91c1c',
                outline: 'none',
              }}
            >
              Détails techniques
            </summary>
            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                color: '#7f1d1d',
                fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 200,
                overflowY: 'auto',
              }}
            >
              <strong>{error.name}:</strong> {error.message}
              {error.stack && (
                <>
                  {'\n\n'}
                  {error.stack}
                </>
              )}
              {errorInfo?.componentStack && (
                <>
                  {'\n\nComponent stack:'}
                  {errorInfo.componentStack}
                </>
              )}
            </div>
          </details>

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={this.handleGoDashboard}
              style={{
                flex: 1,
                minWidth: 150,
                padding: '12px 18px',
                borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
              }}
            >
              Retour au Dashboard
            </button>
            <button
              onClick={this.handleReload}
              style={{
                flex: 1,
                minWidth: 150,
                padding: '12px 18px',
                borderRadius: 10,
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                color: '#374151',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Recharger la page
            </button>
            <button
              onClick={this.handleReport}
              style={{
                flex: 1,
                minWidth: 150,
                padding: '12px 18px',
                borderRadius: 10,
                border: '1px solid #fecaca',
                background: '#fff1f2',
                color: '#b91c1c',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Signaler le problème
            </button>
          </div>

          <p
            style={{
              margin: '20px 0 0',
              fontSize: 11,
              color: '#9ca3af',
              textAlign: 'center',
            }}
          >
            Creorga OS · Si le problème persiste, contactez support@creorga.lu
          </p>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
