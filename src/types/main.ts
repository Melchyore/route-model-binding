import type { HttpContext } from '@adonisjs/core/http'
import type { Constructor } from '@adonisjs/core/types/container'
import type { LucidModel, LucidRow } from '@adonisjs/lucid/types/model'

export type Controller = Constructor<any> & {
  bindings?: Record<string, any[]>
  getHandlerArguments?: (ctx: HttpContext) => [HttpContext, ...LucidRow[]]
}

export type Param = {
  parent: null | string
  scoped: boolean
  name: string
  param: string
  lookupKey: string | '$primaryKey'
}

export interface RouteRow extends LucidRow {
  findRelatedForRequest?(ctx: HttpContext, param: Param, value: any): this | Promise<this>
}

export interface RouteModel extends LucidModel {
  findForRequest?(ctx: HttpContext, param: Param, value: any): LucidRow | Promise<LucidRow>
  routeLookupKey?: string

  new (): RouteRow
}
