/*
 * @adonisjs/route-model-binding
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { ApplicationService } from '@adonisjs/core/types'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { ResourceLoader } from './resource_loader.js'
import { resolveRouteHandler } from './utils.js'

/**
 * HttpContext augmentations
 */
declare module '@adonisjs/core/http' {
  export interface HttpContext {
    resources: Record<string, any>
  }
}

export default class RouteModelBindingMiddleware {
  #app: ApplicationService

  constructor(application: ApplicationService) {
    this.#app = application
  }

  async handle(ctx: HttpContext, next: NextFn) {
    ctx.resources = {}

    /**
     * Ensure the route exists for which we want to load resources
     */
    const route = ctx.route
    if (!route) {
      return next()
    }

    /**
     * Ensure the route has a controller.method handler. We do not load
     * resources for inline callbacks
     */
    const handler = route.handler
    if (!handler || typeof handler === 'function') {
      return next()
    }

    /**
     * Ensure the bindings for the given controller method are defined
     */
    const { controllerConstructor, method } = await resolveRouteHandler(handler.reference)

    if (
      !controllerConstructor ||
      !('bindings' in controllerConstructor) ||
      (controllerConstructor['bindings'] && !controllerConstructor['bindings'][method])
    ) {
      return next()
    }

    /**
     * Load resources
     */
    const resourceLoader = new ResourceLoader(ctx, await this.#app.container.make('router'))
    await resourceLoader.load(controllerConstructor['bindings']![method])
    ctx.resources = resourceLoader.resources

    await next()
  }
}
