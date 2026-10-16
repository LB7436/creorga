import type { PortalConfig } from './portalConfigClient'
type Settings = Pick<PortalConfig, 'toggles' | 'games' | 'welcomeMessage' | 'accentColor' | 'tableNumber' | 'themeMode'>
/** Un onglet ne réécrit pas les réglages qu'il n'a pas modifiés. */
export function portalSettingsPatch(previous: Settings, next: Settings, gamesEnabled: boolean): Partial<PortalConfig> {
  const patch: Partial<PortalConfig> = {}
  for (const field of ['toggles', ...(gamesEnabled ? ['games'] as const : [])] as const) {
    const changed = Object.fromEntries(Object.entries(next[field]).filter(([key, value]) => value !== previous[field][key]))
    if (Object.keys(changed).length) patch[field] = changed
  }
  for (const field of ['welcomeMessage', 'accentColor', 'tableNumber', 'themeMode'] as const) {
    if (next[field] !== previous[field]) Object.assign(patch, { [field]: next[field] })
  }
  return patch
}
