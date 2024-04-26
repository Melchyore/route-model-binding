/*
 * @adonisjs/route-model-binding
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { HttpContext } from '@adonisjs/core/http'
import { resolveRouteHandler } from '../utils.js'

/**
 * Automatically query Lucid models for the current HTTP
 * request. The decorator is meant to work only
 * with controllers
 */
export function bind() {
  return function (target: any, propertyKey: string) {
    const methodParams = Reflect.getMetadata('design:paramtypes', target, propertyKey)

    /**
     * Instantiate static bindings property on the controller class
     */
    const parentBindings = target.constructor.bindings
    if (!target.constructor.hasOwnProperty('bindings')) {
      Object.defineProperty(target.constructor, 'bindings', {
        value: parentBindings ? Object.assign({}, parentBindings) : {},
      })

      Object.defineProperty(target, 'getHandlerArguments', {
        value: async function (ctx: HttpContext) {
          const handler = ctx.route!.handler
          if (!handler || typeof handler === 'function') {
            return [ctx]
          }

          const resolvedHandler = await resolveRouteHandler(handler.reference)

          const bindings = this.constructor.bindings[resolvedHandler.method]
          if (!bindings) {
            return [ctx]
          }

          return bindings.reduce(
            (result: any[], _: any, index: number) => {
              const param = ctx.route!.meta.resolvedParams[index]
              if (param) {
                result.push(ctx.resources[param.name])
              }
              return result
            },
            [ctx]
          )
        },
      })
    }

    target.constructor.bindings[propertyKey] = target.constructor.bindings[propertyKey] || []
    methodParams.forEach((param: any, index: number) => {
      /**
       * The first method param is always the HTTP context
       */
      if (index !== 0) {
        target.constructor.bindings[propertyKey].push(param)
      }
    })
  }
}
