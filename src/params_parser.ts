/*
 * @adonisjs/route-model-binding
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Param } from './types.js'

/**
 * Parses the params on a route. The params parser should not rely on the
 * request runtime values, since the parsed parameters are later cached
 * directly on the route object.
 *
 * In other words, the params parser should be idempotent across request.
 */
export class ParamsParser {
  #params: string[]

  #routePattern: string

  constructor(params: string[], routePattern: string) {
    this.#params = params
    this.#routePattern = routePattern
  }

  /**
   * A param can be one of the following
   *
   * post
   * post(slug)
   * >comment
   * >comment(slug)
   */
  #parseParam(param: string): Param {
    let scoped = false
    let [name, lookupKey] = param.split('(')

    if (lookupKey) {
      lookupKey = lookupKey.slice(0, -1)
    } else {
      lookupKey = '$primaryKey'
    }

    if (name.startsWith('>')) {
      scoped = true
      name = name.substring(1)
    }

    return {
      scoped,
      name,
      param,
      lookupKey,
      parent: null,
    }
  }

  /**
   * Loop through the params and setup the parents
   */
  #computeParamParents(params: Param[]) {
    params.forEach((param, index) => {
      if (param.scoped) {
        if (index === 0) {
          throw new Error(`The first parameter in route "${this.#routePattern}" cannot be scoped`)
        }

        param.parent = params[index - 1].name
      }
    })

    return params
  }

  /**
   * Parse route params for a given request
   */
  parse() {
    return this.#computeParamParents(this.#params.map((param) => this.#parseParam(param)))
  }
}
