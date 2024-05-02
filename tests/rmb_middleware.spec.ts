/*
 * @adonisjs/route-model-binding
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { HasMany } from '@adonisjs/lucid/types/relations'
import type { HttpContext } from '@adonisjs/core/http'
import type { Controller } from '../src/types.js'

import { test } from '@japa/runner'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'

import { setupApp, getContextForRoute, migrate, rollback } from '../test_helpers/index.js'
import RouteModelBindingMiddleware from '../src/rmb_middleware.js'
import { bind } from '../src/decorators/bind.js'

test.group('Route model binding | middleware', () => {
  test('load resources for a given request', async ({ assert }) => {
    const app = await setupApp()
    await migrate(await app.container.make('lucid.db'))

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare title: string

      @column()
      declare slug: string

      @hasMany(() => Comment)
      declare comments: HasMany<typeof Comment>
    }

    class Comment extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare postId: number

      @column()
      declare title: string

      @column()
      declare slug: string
    }

    class PostsController {
      @bind()
      show(_: HttpContext, __: Post) {}
    }

    await Post.createMany([
      {
        title: 'Hello world',
        slug: 'hello-world',
      },
      {
        title: 'Hello AdonisJS',
        slug: 'hello-adonisjs',
      },
    ])

    const ctx = await getContextForRoute(app, '/posts/:post', 'posts/2', 'GET', [
      PostsController,
      'show',
    ])

    await new RouteModelBindingMiddleware(app).handle(ctx, async () => {
      assert.property(ctx.resources, 'post')
      assert.instanceOf(ctx.resources.post, Post)
      assert.equal(ctx.resources.post.id, 2)
      assert.equal(ctx.resources.post.slug, 'hello-adonisjs')
    })

    await rollback(await app.container.make('lucid.db'))
  })

  test('load resources with a custom route param', async ({ assert }) => {
    const app = await setupApp()
    await migrate(await app.container.make('lucid.db'))

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare title: string

      @column()
      declare slug: string

      @hasMany(() => Comment)
      declare comments: HasMany<typeof Comment>
    }

    class Comment extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare postId: number

      @column()
      declare title: string

      @column()
      declare slug: string
    }

    class PostsController {
      @bind()
      show(_: HttpContext, __: Post) {}
    }

    await Post.createMany([
      {
        title: 'Hello world',
        slug: 'hello-world',
      },
      {
        title: 'Hello AdonisJS',
        slug: 'hello-adonisjs',
      },
    ])

    const ctx = await getContextForRoute(app, '/posts/:post(slug)', 'posts/hello-adonisjs', 'GET', [
      PostsController,
      'show',
    ])

    await new RouteModelBindingMiddleware(app).handle(ctx, async () => {
      assert.property(ctx.resources, 'post')
      assert.instanceOf(ctx.resources.post, Post)
      assert.equal(ctx.resources.post.id, 2)
      assert.equal(ctx.resources.post.slug, 'hello-adonisjs')
    })

    await rollback(await app.container.make('lucid.db'))
  })

  test("do not load resources when controller isn't using the bind decorator", async ({
    assert,
  }) => {
    const app = await setupApp()
    await migrate(await app.container.make('lucid.db'))

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare title: string

      @column()
      declare slug: string

      @hasMany(() => Comment)
      declare comments: HasMany<typeof Comment>
    }

    class Comment extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare postId: number

      @column()
      declare title: string

      @column()
      declare slug: string
    }

    class PostsController {
      show(_: HttpContext, __: Post) {}
    }

    await Post.createMany([
      {
        title: 'Hello world',
        slug: 'hello-world',
      },
      {
        title: 'Hello AdonisJS',
        slug: 'hello-adonisjs',
      },
    ])

    const ctx = await getContextForRoute(app, '/posts/:post', 'posts/2', 'GET', [
      PostsController,
      'show',
    ])
    await new RouteModelBindingMiddleware(app).handle(ctx, async () => {
      assert.deepEqual(ctx.resources, {})
    })

    await rollback(await app.container.make('lucid.db'))
  })

  test('do not load resources when route handler is a closure', async ({ assert }) => {
    const app = await setupApp()
    await migrate(await app.container.make('lucid.db'))

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare title: string

      @column()
      declare slug: string

      @hasMany(() => Comment)
      declare comments: HasMany<typeof Comment>
    }

    class Comment extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare postId: number

      @column()
      declare title: string

      @column()
      declare slug: string
    }

    class PostsController {
      show(_: HttpContext, __: Post) {}
    }

    await Post.createMany([
      {
        title: 'Hello world',
        slug: 'hello-world',
      },
      {
        title: 'Hello AdonisJS',
        slug: 'hello-adonisjs',
      },
    ])

    const ctx = await getContextForRoute(app, '/posts/:post', 'posts/2', 'GET', [
      PostsController,
      async () => {},
    ])

    await new RouteModelBindingMiddleware(app).handle(ctx, async () => {
      assert.deepEqual(ctx.resources, {})
    })

    await rollback(await app.container.make('lucid.db'))
  })

  test('disable model binding by setting argument type to null', async ({ assert }) => {
    const app = await setupApp()
    await migrate(await app.container.make('lucid.db'))

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare title: string

      @column()
      declare slug: string

      @hasMany(() => Comment)
      declare comments: HasMany<typeof Comment>
    }

    class Comment extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare postId: number

      @column()
      declare title: string

      @column()
      declare slug: string
    }

    class PostsController {
      @bind()
      show(_: HttpContext, __: null, ___: Post) {}
    }

    await Post.createMany([
      {
        title: 'Hello world',
        slug: 'hello-world',
      },
      {
        title: 'Hello AdonisJS',
        slug: 'hello-adonisjs',
      },
    ])

    const ctx = await getContextForRoute(app, '/:sessionId/posts/:post', '1/posts/2', 'GET', [
      PostsController,
      'show',
    ])

    await new RouteModelBindingMiddleware(app).handle(ctx, async () => {
      assert.property(ctx.resources, 'post')
      assert.instanceOf(ctx.resources.post, Post)
      assert.equal(ctx.resources.post.id, 2)
      assert.equal(ctx.resources.post.slug, 'hello-adonisjs')

      const postsController = new PostsController() as InstanceType<Controller>
      const injections = await postsController.getHandlerArguments(ctx, app)
      assert.deepEqual(injections, [ctx, '1', ctx.resources.post])
    })

    await rollback(await app.container.make('lucid.db'))
  })

  test('disable model binding by setting argument type to a primitive type', async ({ assert }) => {
    const app = await setupApp()
    await migrate(await app.container.make('lucid.db'))

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare title: string

      @column()
      declare slug: string

      @hasMany(() => Comment)
      declare comments: HasMany<typeof Comment>
    }

    class Comment extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare postId: number

      @column()
      declare title: string

      @column()
      declare slug: string
    }

    class PostsController {
      @bind()
      show(_: HttpContext, __: string, ___: Post) {}
    }

    await Post.createMany([
      {
        title: 'Hello world',
        slug: 'hello-world',
      },
      {
        title: 'Hello AdonisJS',
        slug: 'hello-adonisjs',
      },
    ])

    const ctx = await getContextForRoute(app, '/:sessionId/posts/:post', '1/posts/2', 'GET', [
      PostsController,
      'show',
    ])

    await new RouteModelBindingMiddleware(app).handle(ctx, async () => {
      assert.property(ctx.resources, 'post')
      assert.instanceOf(ctx.resources.post, Post)
      assert.equal(ctx.resources.post.id, 2)
      assert.equal(ctx.resources.post.slug, 'hello-adonisjs')

      const postsController = new PostsController() as InstanceType<Controller>
      const injections = await postsController.getHandlerArguments(ctx, app)
      assert.deepEqual(injections, [ctx, '1', ctx.resources.post])
    })

    await rollback(await app.container.make('lucid.db'))
  })

  test('ignore bindings which have no parameters in route', async ({ assert }) => {
    const app = await setupApp()
    await migrate(await app.container.make('lucid.db'))

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare title: string

      @column()
      declare slug: string

      @hasMany(() => Comment)
      declare comments: HasMany<typeof Comment>
    }

    class Comment extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare postId: number

      @column()
      declare title: string

      @column()
      declare slug: string
    }

    class PostsController {
      @bind()
      show(_: HttpContext, __: Post, ___: Comment) {}
    }

    await Post.createMany([
      {
        title: 'Hello world',
        slug: 'hello-world',
      },
      {
        title: 'Hello AdonisJS',
        slug: 'hello-adonisjs',
      },
    ])

    const ctx = await getContextForRoute(app, '/posts/:post', 'posts/2', 'GET', [
      PostsController,
      'show',
    ])

    await new RouteModelBindingMiddleware(app).handle(ctx, async () => {
      assert.property(ctx.resources, 'post')
      assert.instanceOf(ctx.resources.post, Post)
      assert.equal(ctx.resources.post.id, 2)
      assert.equal(ctx.resources.post.slug, 'hello-adonisjs')

      const postsController = new PostsController() as InstanceType<Controller>
      const injections = await postsController.getHandlerArguments(ctx, app)
      assert.deepEqual(injections, [ctx, ctx.resources.post])
    })

    await rollback(await app.container.make('lucid.db'))
  })
})
