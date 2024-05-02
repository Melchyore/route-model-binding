/*
 * @adonisjs/route-model-binding
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { HttpContext } from '@adonisjs/core/http'
import type { ContainerProvider } from '@adonisjs/fold/types'

import { defineStaticProperty } from '@poppinss/utils'

import { resolveRouteHandler } from '../utils.js'
import { ApplicationService } from '@adonisjs/core/types'

/**
 * Automatically query Lucid models for the current HTTP
 * request. The decorator is meant to work only
 * with controllers
 */
export function bind() {
  return function (target: any, method: string) {
    const methodParams = Reflect.getMetadata('design:paramtypes', target, method)
    if (!target.constructor.hasOwnProperty('containerProvider')) {
      const containerProvider: ContainerProvider = (
        binding,
        property,
        resolver,
        defaultProvider,
        runtimeValues
      ) => {
        if (runtimeValues) {
          /**
           * Add model instances to the runtime values from HTTP context resources
           */
          for (const modelInstance of Object.values(runtimeValues[0].resources)) {
            runtimeValues.push(modelInstance)
          }
        }

        return defaultProvider(binding, property, resolver, runtimeValues)
      }

      defineStaticProperty(target.constructor, 'containerProvider', {
        initialValue: containerProvider,
        strategy: 'inherit',
      })
    }

    /**
     * Instantiate static bindings property on the controller class
     */
    if (!target.constructor.hasOwnProperty('bindings')) {
      defineStaticProperty(target.constructor, 'bindings', {
        initialValue: {},
        strategy: 'inherit',
      })

      Object.defineProperty(target, 'getHandlerArguments', {
        value: async function (ctx: HttpContext, app: ApplicationService) {
          const handler = ctx.route!.handler
          if (!handler || typeof handler === 'function') {
            return [ctx]
          }

          const resolvedHandler = await resolveRouteHandler(handler.reference, app)

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

    target.constructor.bindings[method] = target.constructor.bindings[method] || []
    methodParams.forEach((param: any, index: number) => {
      /**
       * The first method param is always the HTTP context
       */
      if (index !== 0) {
        target.constructor.bindings[method].push(param)
      }
    })
  }
}
