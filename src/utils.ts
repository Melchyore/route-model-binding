import type { LazyImport } from '@adonisjs/core/types/http'
import type { Constructor } from '@adonisjs/core/types/container'
import type { Controller } from './types.js'

import is from '@adonisjs/core/helpers/is'

/**
 * Resolve route handler.
 * @see {@link https://github.com/adonisjs/http-server/blob/develop/src/router/route.ts#L136}
 */
export async function resolveRouteHandler(
  binding: string | [LazyImport<Constructor<any>> | Constructor<any>, any?]
) {
  if (typeof binding === 'string') {
    const parts = binding.split('.')
    const method = parts.length === 1 ? 'handle' : parts.pop()!
    const resolvedPath = import.meta.resolve(parts[0], import.meta.url)
    const moduleExports = await import(resolvedPath)

    console.log(moduleExports.default)

    return {
      method,
      controllerConstructor: moduleExports.default,
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

    return {
      controllerConstructor: (bindingReference as LazyImport<Controller>)(),
      method: (method as string) || 'handle',
    }
  }

  return binding
}
