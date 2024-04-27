/*
 * @adonisjs/route-model-bindings
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { LucidModel } from '@adonisjs/lucid/types/model'
import type { HttpContext } from '@adonisjs/core/http'
import type { Param, RouteModel, RouteRow } from './types.js'

import string from '@poppinss/utils/string'
import { HttpRouterService } from '@adonisjs/core/types'

import { ParamsParser } from './params_parser.js'
import { MissingRelationshipException } from './exceptions/missing_relationship.js'

/**
 * Resource loader job is to query the Lucid models for the given
 * request using the route params.
 *
 * One can provide an array of models matching the position of params
 * inside a route to conventionally query the database using Lucid
 * models. For example:
 *
 * ```
 * Route - /posts/:post_id/comments/:id
 * Models: [Post, Comment]
 * ```
 *
 * The resource loader will return the following response.
 *
 * ```ts
 * {
 *   post_id: Post.findOrFail(post_id),
 *   id: Comment.findOrFail(id)
 * }
 * ```
 *
 * The first model will be matched against the first param. We use the position,
 * since we plan to grab models using decorators and in TypeScript decorators
 * cannot get the name of the parameter on a method.
 *
 * One can customize the lookup logic in one of the few ways.
 *
 * - /posts/:post(slug) - The slug field will be used for the lookup
 * - /posts/:post/comments/:>comment - The comment will be loaded as the post relationship
 * - Post.routeLookupKey - Define the key to be used to lookup the route
 * - Post.findForRequest() - Define a custom static method to lookup Post for a given request
 * - Post.findRelatedForRequest() - Define a custom method to lookup Comment for a given post
 */
export class ResourceLoader {
  #router: HttpRouterService

  resources: Record<string, any> = {}

  constructor(
    public ctx: HttpContext,
    router: HttpRouterService
  ) {
    this.#router = router
  }

  /**
   * Returns true when value is a resource model
   */
  #isResourceModel(value: any): value is RouteModel {
    if (!value) {
      return false
    }

    return (
      typeof value['findForRequest'] === 'function' ||
      typeof value['findOrFail'] === 'function' ||
      typeof value['findRelatedForRequest'] === 'function'
    )
  }

  /**
   * Returns the relationship name for a scoped resource
   */
  #getRelationshipName(param: Param, parentModel: LucidModel): string {
    /**
     * Search relationship by singular name
     */
    let relationshipName = string.singular(string.camelCase(param.name))
    if (parentModel.$hasRelation(relationshipName)) {
      return relationshipName
    }

    /**
     * Search relationship by plural name
     */
    relationshipName = string.pluralize(relationshipName)
    if (parentModel.$hasRelation(relationshipName)) {
      return relationshipName
    }

    throw MissingRelationshipException.invoke(param.name, this.ctx.route!.pattern, parentModel.name)
  }

  /**
   * Instantiate scoped model. The parent model instance is passed as
   * the first argument.
   */
  async #instantiateScopedModel(model: RouteModel, param: Param, value: any) {
    const parentModel = this.resources[param.parent!] as RouteRow
    const parentModelConstructor = parentModel.constructor as RouteModel

    /**
     * The first priority is given to the model "findRelatedForRequest" method
     */
    if (typeof parentModel['findRelatedForRequest'] === 'function') {
      return parentModel['findRelatedForRequest'](this.ctx, param, value)
    }

    const relatedQuery = parentModel
      .related(this.#getRelationshipName(param, parentModelConstructor) as any)
      .query()

    /**
     * Next, we find the model by the custom key defined on the route
     */
    if (param.lookupKey !== '$primaryKey') {
      return relatedQuery.where(param.lookupKey, value).firstOrFail()
    }

    /**
     * Next, we find the model by the custom key defined on the model
     */
    if (model.routeLookupKey) {
      return relatedQuery.where(model.routeLookupKey, value).firstOrFail()
    }

    /**
     * Fallback to primaryKey lookup
     */
    return relatedQuery.where(model.primaryKey, value).firstOrFail()
  }

  /**
   * Instantiate model
   */
  async #instantiateModel(model: RouteModel, param: Param, value: any) {
    /**
     * The first priority is given to the model static "findForRequest" method
     */
    if (typeof model.findForRequest === 'function') {
      return model.findForRequest(this.ctx, param, value)
    }

    /**
     * Next, we find the model by the custom key defined on the route
     */
    if (param.lookupKey !== '$primaryKey') {
      return model.findByOrFail(param.lookupKey, value)
    }

    /**
     * Next, we find the model by the custom key defined on the model
     */
    if (model.routeLookupKey) {
      return model.findByOrFail(model.routeLookupKey, value)
    }

    /**
     * Fallback to primaryKey lookup
     */
    return model.findOrFail(value)
  }

  /**
   * Rewrite ctx.params to use normalized param names
   */
  #rewriteParams(params: Param[]) {
    params.forEach((param) => {
      if (param.name !== param.param) {
        this.ctx.params[param.name] = this.ctx.params[param.param]
        delete this.ctx.params[param.param]
      }
    })
  }

  /**
   * Load models based upon the current request route params
   */
  async load(models: any[]) {
    let index = 0
    if (!this.ctx.route!.meta.resolvedParams) {
      this.ctx.route!.meta.resolvedParams = new ParamsParser(
        this.#router.match(this.ctx.request.url(), this.ctx.request.method())!.route.meta.params,
        this.ctx.route!.pattern
      ).parse()
    }

    const routeParams = this.ctx.route!.meta.resolvedParams as Param[]

    /**
     * Loading models one by one, since some models can be scoped to the
     * parent
     */
    for (let param of routeParams) {
      const model = models[index]
      const value = this.ctx.request.param(param.param)

      /**
       * Instantiate model if
       *
       * - Model for the given position is defined
       * - The param has values other than undefined and null.
       *     - Param is undefined when it is not and not defined
       *     - Param can be null when custom "cast" function sets it to null
       */
      if (value !== undefined && value !== null) {
        if (this.#isResourceModel(model)) {
          this.resources[param.name] = param.scoped
            ? await this.#instantiateScopedModel(model, param, value)
            : await this.#instantiateModel(model, param, value)
        } else {
          this.resources[param.name] = value
        }
      }

      index++
    }

    this.#rewriteParams(routeParams)
  }
}
