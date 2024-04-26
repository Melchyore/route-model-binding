/*
 * @adonisjs/route-model-binding
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import { ResourceLoader } from '../../src/resource_loader.js'
import { setupApp, getContextForRoute, migrate, rollback } from '../../test_helpers/index.js'

test.group('Resource Loader', () => {
  test('load model by primary key', async ({ assert }) => {
    const app = await setupApp()
    await migrate(await app.container.make('lucid.db'))

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare title: string

      @column()
      declare slug: string
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

    const ctx = await getContextForRoute(app, '/posts/:post', 'posts/1', 'GET', async () => {})
    const loader = new ResourceLoader(ctx, await app.container.make('router'))
    await loader.load([Post])

    await rollback(await app.container.make('lucid.db'))

    assert.property(loader.resources, 'post')
    assert.instanceOf(loader.resources.post, Post)
    assert.equal(loader.resources.post.id, 1)
    assert.equal(loader.resources.post.slug, 'hello-world')
  })

  test('load model by custom model key', async ({ assert }) => {
    const app = await setupApp()
    await migrate(await app.container.make('lucid.db'))

    class Post extends BaseModel {
      static routeLookupKey = 'slug'

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare title: string

      @column()
      declare slug: string
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

    const ctx = await getContextForRoute(
      app,
      '/posts/:post',
      'posts/hello-adonisjs',
      'GET',
      async () => {}
    )
    const loader = new ResourceLoader(ctx, await app.container.make('router'))
    await loader.load([Post])

    await rollback(await app.container.make('lucid.db'))

    assert.property(loader.resources, 'post')
    assert.instanceOf(loader.resources.post, Post)
    assert.equal(loader.resources.post.id, 2)
    assert.equal(loader.resources.post.slug, 'hello-adonisjs')
  })

  test('load model by custom route key', async ({ assert }) => {
    const app = await setupApp()
    await migrate(await app.container.make('lucid.db'))

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare title: string

      @column()
      declare slug: string
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

    const ctx = await getContextForRoute(
      app,
      '/posts/:post(slug)',
      'posts/hello-adonisjs',
      'GET',
      async () => {}
    )
    const loader = new ResourceLoader(ctx, await app.container.make('router'))
    await loader.load([Post])

    await rollback(await app.container.make('lucid.db'))

    assert.deepEqual(ctx.params, { post: 'hello-adonisjs' })
    assert.deepEqual(ctx.request.params(), { post: 'hello-adonisjs' })
    assert.equal(ctx.request.param('post'), 'hello-adonisjs')

    assert.property(loader.resources, 'post')
    assert.instanceOf(loader.resources.post, Post)
    assert.equal(loader.resources.post.id, 2)
    assert.equal(loader.resources.post.slug, 'hello-adonisjs')
  })

  test('load model by static "findForRequest" method', async ({ assert }) => {
    const app = await setupApp()
    await migrate(await app.container.make('lucid.db'))

    class Post extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare title: string

      @column()
      declare slug: string

      static findForRequest(_: any, __: any, value: string) {
        return this.query().where('slug', value).firstOrFail()
      }
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

    const ctx = await getContextForRoute(
      app,
      '/posts/:post',
      'posts/hello-adonisjs',
      'GET',
      async () => {}
    )
    const loader = new ResourceLoader(ctx, await app.container.make('router'))
    await loader.load([Post])

    await rollback(await app.container.make('lucid.db'))

    assert.property(loader.resources, 'post')
    assert.instanceOf(loader.resources.post, Post)
    assert.equal(loader.resources.post.id, 2)
    assert.equal(loader.resources.post.slug, 'hello-adonisjs')
  })

  test('load nested independent resource', async ({ assert }) => {
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

    const [post1, post2] = await Post.createMany([
      {
        title: 'Hello world',
        slug: 'hello-world',
      },
      {
        title: 'Hello AdonisJS',
        slug: 'hello-adonisjs',
      },
    ])

    await post1.related('comments').create({ title: 'Nice post', slug: 'nice-post' })
    await post2.related('comments').create({ title: 'Awesome post', slug: 'awesome-post' })

    const ctx = await getContextForRoute(
      app,
      '/posts/:post/comments/:comment',
      'posts/1/comments/1',
      'GET',
      async () => {}
    )
    const loader = new ResourceLoader(ctx, await app.container.make('router'))
    await loader.load([Post, Comment])

    await rollback(await app.container.make('lucid.db'))

    assert.property(loader.resources, 'post')
    assert.instanceOf(loader.resources.post, Post)
    assert.equal(loader.resources.post.id, 1)
    assert.equal(loader.resources.post.slug, 'hello-world')

    assert.property(loader.resources, 'comment')
    assert.instanceOf(loader.resources.comment, Comment)
    assert.equal(loader.resources.comment.id, 1)
    assert.equal(loader.resources.comment.slug, 'nice-post')
  })

  test('do not load resource for optional missing param', async ({ assert }) => {
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

    const [post1, post2] = await Post.createMany([
      {
        title: 'Hello world',
        slug: 'hello-world',
      },
      {
        title: 'Hello AdonisJS',
        slug: 'hello-adonisjs',
      },
    ])

    await post1.related('comments').create({ title: 'Nice post', slug: 'nice-post' })
    await post2.related('comments').create({ title: 'Awesome post', slug: 'awesome-post' })

    const ctx = await getContextForRoute(
      app,
      '/posts/:post/comments/:comment?',
      'posts/1/comments',
      'GET',
      async () => {}
    )
    const loader = new ResourceLoader(ctx, await app.container.make('router'))
    await loader.load([Post, Comment])

    await rollback(await app.container.make('lucid.db'))

    assert.property(loader.resources, 'post')
    assert.instanceOf(loader.resources.post, Post)
    assert.equal(loader.resources.post.id, 1)
    assert.equal(loader.resources.post.slug, 'hello-world')

    assert.notProperty(loader.resources, 'comment')
  })

  test('disable model binding by setting param type to null', async ({ assert }) => {
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

    const [post1, post2] = await Post.createMany([
      {
        title: 'Hello world',
        slug: 'hello-world',
      },
      {
        title: 'Hello AdonisJS',
        slug: 'hello-adonisjs',
      },
    ])

    await post1.related('comments').create({ title: 'Nice post', slug: 'nice-post' })
    await post2.related('comments').create({ title: 'Awesome post', slug: 'awesome-post' })

    const ctx = await getContextForRoute(
      app,
      '/posts/:post/comments/:comment?',
      'posts/1/comments/1',
      'GET',
      async () => {}
    )
    const loader = new ResourceLoader(ctx, await app.container.make('router'))
    await loader.load([null, Comment])

    await rollback(await app.container.make('lucid.db'))

    assert.property(loader.resources, 'post')
    assert.equal(loader.resources.post, '1')
    assert.property(loader.resources, 'comment')
    assert.instanceOf(loader.resources.comment, Comment)
    assert.equal(loader.resources.comment.id, 1)
    assert.equal(loader.resources.comment.slug, 'nice-post')
  })
})
