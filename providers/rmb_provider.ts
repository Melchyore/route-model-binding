/*
 * @adonisjs/route-model-binding
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { ApplicationService } from '@adonisjs/core/types'

import RouteModelBindingMiddleware from '../src/rmb_middleware.js'

/**
 * AdonisJS provider for registering the middleware to the container
 */

export default class RmbProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton(RouteModelBindingMiddleware, async () => {
      return new RouteModelBindingMiddleware(this.app)
    })
  }
}
