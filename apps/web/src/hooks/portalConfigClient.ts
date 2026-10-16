export interface PortalConfig {
  companyId: string; toggles: Record<string, boolean>; games: Record<string, boolean>
  welcomeMessage: string; accentColor: string; tableNumber: string; updatedAt: number
  themeMode?: 'dark' | 'light'; logoDataUrl?: string | null; restaurantName?: string
}
export class PortalConfigError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
type Scope = { key: string; companyId: string | null; headers: Record<string, string> }
type Options = { scope: () => Scope; publish: (data: PortalConfig) => void; fail: (message: string | null) => void;
  transport?: typeof fetch; backend?: string }

/** Réponses bornées à une identité et une révision ; aucune persistance navigateur. */
export class PortalConfigClient {
  private disposed = false
  private revision = -1
  private epoch = 0
  private busy = false
  private readonly key: string
  constructor(private options: Options) { this.key = options.scope().key }
  private current() { return !this.disposed && this.key === this.options.scope().key }
  dispose() { this.disposed = true; this.epoch++ }
  private read(data: unknown, companyId: string): PortalConfig {
    const value = data as PortalConfig
    if (!value || value.companyId !== companyId || !Number.isFinite(value.updatedAt)
      || !value.toggles || Array.isArray(value.toggles) || typeof value.toggles !== 'object'
      || !value.games || Array.isArray(value.games) || typeof value.games !== 'object') {
      throw new PortalConfigError(0, 'Réponse de configuration invalide ou d’une autre entreprise.')
    }
    return value
  }
  private url(companyId: string) {
    const url = new URL('/api/portal-config', this.options.backend || 'http://localhost:3002')
    url.searchParams.set('companyId', companyId); return url
  }
  async refresh() {
    if (!this.current()) return
    const scope = this.options.scope(), epoch = this.epoch
    try {
      if (!scope.companyId) throw new Error('QR sans identifiant d’entreprise')
      const response = await (this.options.transport || fetch)(this.url(scope.companyId), { headers: scope.headers })
      if (!response.ok) throw new Error(`Configuration indisponible (HTTP ${response.status})`)
      const data = this.read(await response.json(), scope.companyId)
      if (!this.current() || epoch !== this.epoch || this.busy || data.updatedAt < this.revision) return
      this.revision = data.updatedAt; this.options.publish(data); this.options.fail(null)
    } catch (error) {
      if (this.current() && epoch === this.epoch && !this.busy) this.options.fail(error instanceof Error ? error.message : 'Configuration indisponible')
    }
  }
  async update(patch: Partial<PortalConfig>): Promise<PortalConfig> {
    if (!this.current()) throw new PortalConfigError(0, 'Le contexte de l’établissement a changé.')
    if (this.busy) throw new PortalConfigError(409, 'Un enregistrement est déjà en cours.')
    const scope = this.options.scope()
    if (!scope.companyId) throw new PortalConfigError(0, 'Aucune entreprise active.')
    this.busy = true; this.epoch++
    try {
      const response = await (this.options.transport || fetch)(this.url(scope.companyId), { method: 'PATCH',
        headers: { ...scope.headers, 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new PortalConfigError(response.status, response.status === 401 || response.status === 403
          ? 'Enregistrement refusé : réservé au propriétaire de l’établissement.' : body.error || body.message || `Enregistrement refusé (HTTP ${response.status})`)
      }
      const data = this.read(await response.json(), scope.companyId)
      if (!this.current()) throw new PortalConfigError(0, 'Le contexte de l’établissement a changé ; rechargez ses réglages.')
      if (data.updatedAt < this.revision) throw new PortalConfigError(409, 'Réponse ancienne : rechargez les réglages confirmés.')
      this.revision = data.updatedAt; this.options.publish(data); this.options.fail(null)
      return data
    } catch (error) {
      const failure = error instanceof PortalConfigError ? error : new PortalConfigError(0, 'Serveur injoignable : le résultat doit être vérifié en rechargeant les réglages.')
      if (this.current()) this.options.fail(failure.message)
      throw failure
    } finally { this.busy = false; this.epoch++ }
  }
}
