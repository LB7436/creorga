import { Router as expressRouter, type Router, type RouterOptions } from 'express'
import { METHODS } from 'node:http'
import { markTrackedRouter, observeHttpArguments, observeHttpParam } from './http-work'

const methods = [...new Set([...METHODS.map(method => method.toLowerCase()), 'all'])]

/**
 * Façade d'enregistrement explicite : aucune pile/prototype Express modifiée.
 * Chaque callback retournant une promesse reste suivi, même après res.end().
 * Les routeurs imbriqués doivent eux aussi être créés par cette façade.
 */
export function createTrackedRouter(options?: RouterOptions): Router {
  const router = expressRouter(options)
  const facade = ((req, res, next) => router(req, res, next)) as Router
  markTrackedRouter(facade)
  const register = (target: any, wrapped: any, middleware: boolean) => {
    for (const method of methods) {
      wrapped[method] = (...args: unknown[]) => {
        target[method](...observeHttpArguments(args, middleware))
        return wrapped
      }
    }
  }
  register(router, facade, false)
  facade.use = ((...args: unknown[]) => {
    router.use(...observeHttpArguments(args, true))
    return facade
  }) as Router['use']
  facade.route = ((path: any) => {
    const route = router.route(path)
    const builder = { path }
    register(route, builder, false)
    return builder
  }) as Router['route']
  facade.param = ((name: any, handler?: any) => {
    if (typeof name === 'function') {
      // Surcharge publique historique : le mapper est exécuté à
      // l'enregistrement, seul le callback produit traite une requête.
      router.param((parameter: string, matcher: RegExp) => {
        const callback = name(parameter, matcher)
        return typeof callback === 'function' ? observeHttpParam(callback) : callback
      })
    } else router.param(name, observeHttpParam(handler))
    return facade
  }) as Router['param']
  return facade
}
