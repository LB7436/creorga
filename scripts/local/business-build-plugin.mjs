import fs from 'node:fs'
import path from 'node:path'

export function businessBuildPlugin(appRoot, businessOnly) {
  const forbidden = /\/pages\/guest\/(?:games\/|GamesSection\.|GamesLeaderboard\.)|\/node_modules\/(?:three|@react-three)\//
  return {
    name: 'creorga-profile-proof',
    generateBundle(_options, bundle) {
      const modules = [...new Set(Object.values(bundle).flatMap(output => output.type === 'chunk' ? Object.keys(output.modules) : []))]
      const gameModules = modules.filter(id => forbidden.test(id.replaceAll('\\', '/')))
      if (businessOnly && gameModules.length) this.error('Profil professionnel refusé : du code ludique reste dans le graphe de compilation.')
      this.emitFile({ type: 'asset', fileName: 'profile-manifest.json', source: JSON.stringify({ version: 1,
        profile: businessOnly ? 'business' : 'full', gameModuleCount: gameModules.length,
        games: gameModules.map(id => path.relative(appRoot, id).replaceAll('\\', '/')),
        note: 'Graphe compilé, pas une preuve de recette métier.' }, null, 2) })
    },
    writeBundle(options) {
      if (!businessOnly) return
      const publicRoot = path.join(appRoot, 'public')
      if (!fs.existsSync(publicRoot)) return
      fs.cpSync(publicRoot, path.resolve(appRoot, options.dir), { recursive: true, filter: source => {
        const relative = path.relative(publicRoot, source).replaceAll('\\', '/')
        return relative !== 'cards/scopa' && !relative.startsWith('cards/scopa/')
      } })
    },
  }
}
