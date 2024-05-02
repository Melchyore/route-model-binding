import type { LazyImport } from '@adonisjs/core/types/http'
import type { Constructor } from '@adonisjs/core/types/container'

import is from '@adonisjs/core/helpers/is'
import { Controller } from './types.js'
import { ApplicationService } from '@adonisjs/core/types'

/**
 * Resolve route handler.
 */
export async function resolveRouteHandler(
  binding: string | [LazyImport<Constructor<any>> | Constructor<any>, any?],
  app: ApplicationService
) {
  if (typeof binding === 'string') {
    const parts = binding.split('.')
    const method = parts.length === 1 ? 'handle' : parts.pop()!
    const controller = await app.import(parts[0])

    return {
      controllerConstructor: controller.default as Controller,
      method,
    }
  }

  if (Array.isArray(binding)) {
    const [bindingReference, method] = binding

    if (is.class(bindingReference)) {
      return {
        controllerConstructor: bindingReference as Controller,
        method: (method as string) || 'handle',
      }
    }

    const controller = await (bindingReference as LazyImport<Controller>)()

    return {
      controllerConstructor: controller.default,
      method: (method as string) || 'handle',
    }
  }

  return binding
}
