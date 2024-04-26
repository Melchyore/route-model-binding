/*
 * @adonisjs/route-model-binding
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { ApplicationService } from '@adonisjs/core/types'
import type { Database } from '@adonisjs/lucid/database'

import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { IgnitorFactory } from '@adonisjs/core/factories'
import { HttpContextFactory, RequestFactory } from '@adonisjs/core/factories/http'
import { defineConfig } from '@adonisjs/lucid'

export const BASE_URL = new URL('./tmp', import.meta.url)
export const BASE_PATH = fileURLToPath(BASE_URL)

/**
 * Setup AdonisJS application
 */
export async function setupApp() {
  const ignitor = new IgnitorFactory()
    .withCoreProviders()
    .withCoreConfig()
    .merge({
      rcFileContents: {
        providers: [
          () => import('@adonisjs/lucid/database_provider'),
          () => import('../providers/rmb_provider.js'),
        ],
      },
      config: {
        database: defineConfig({
          connection: 'sqlite',
          connections: {
            sqlite: {
              client: 'better-sqlite3',
              connection: {
                filename: join(BASE_PATH, 'db.sqlite3'),
              },
            },
          },
        }),
      },
    })
    .create(BASE_URL, {
      importer: (filePath) => {
        if (filePath.startsWith('./') || filePath.startsWith('../')) {
          return import(new URL(filePath, BASE_URL).href)
        }

        return import(filePath)
      },
    })

  const app = ignitor.createApp('web')
  await app.init()
  await app.boot()

  return app
}

/**
 * Migrate database
 */
export async function migrate(database: Database) {
  await database.connection().schema.createTable('posts', (table) => {
    table.increments('id')
    table.string('title').notNullable()
    table.string('slug').notNullable()
  })

  await database.connection().schema.createTable('comments', (table) => {
    table.increments('id')
    table.integer('post_id').notNullable().unsigned().references('id').inTable('posts')
    table.string('title').notNullable()
    table.string('slug').notNullable()
  })
}

/**
 * Rollback database
 */
export async function rollback(database: Database) {
  await database.connection().schema.dropTable('comments')
  await database.connection().schema.dropTable('posts')
  await database.manager.closeAll()
}

/**
 * Returns the context for a given route
 */
export async function getContextForRoute(
  app: ApplicationService,
  route: string,
  url: string,
  method: string,
  handler: any
) {
  const router = await app.container.make('router')
  router.get(route, handler)
  router.commit()

  const ctx = new HttpContextFactory()
    .merge({
      request: new RequestFactory()
        .merge({
          url,
          method,
        })
        .create(),
    })
    .create()
  ctx.route = router.findOrFail(route)
  ctx.params = router.match(ctx.request.url(), ctx.request.method())?.params ?? {}

  return ctx
}
