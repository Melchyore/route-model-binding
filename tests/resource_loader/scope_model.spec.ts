/*
 * @adonisjs/route-model-binding
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { HasMany } from '@adonisjs/lucid/types/relations'
import type { Param } from '../../src/types.js'

import { test } from '@japa/runner'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'

import { setupApp, getContextForRoute, migrate, rollback } from '../../test_helpers/index.js'
import { ResourceLoader } from '../../src/resource_loader.js'

test.group('Resource Loader | Scoped', () => {
  test('load nested scoped resource', async ({ assert }) => {
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
    await post2.related('comments').create({ title: 'Awesome post', slug: 'nice-post' })

    const ctx = await getContextForRoute(
      app,
      '/posts/:post/comments/:>comment',
      'posts/2/comments/1',
      'GET',
      async () => {}
    )
    const loader = new ResourceLoader(ctx, await app.container.make('router'))
    await assert.rejects(() => loader.load([Post, Comment]), 'Row not found')

    await rollback(await app.container.make('lucid.db'))
  })

  test('load nested scoped resource by custom route key', async ({ assert }) => {
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
    await post2.related('comments').create({ title: 'Awesome post', slug: 'nice-post' })

    const ctx = await getContextForRoute(
      app,
      '/posts/:post/comments/:>comment(slug)',
      'posts/2/comments/nice-post',
      'GET',
      async () => {}
    )
    const loader = new ResourceLoader(ctx, await app.container.make('router'))
    await loader.load([Post, Comment])

    await rollback(await app.container.make('lucid.db'))

    assert.deepEqual(ctx.params, { post: '2', comment: 'nice-post' })
    assert.deepEqual(ctx.request.params(), { post: '2', comment: 'nice-post' })
    assert.equal(ctx.request.param('post'), '2')
    assert.equal(ctx.request.param('comment'), 'nice-post')

    assert.property(loader.resources, 'post')
    assert.instanceOf(loader.resources.post, Post)
    assert.equal(loader.resources.post.id, 2)
    assert.equal(loader.resources.post.slug, 'hello-adonisjs')

    assert.property(loader.resources, 'comment')
    assert.instanceOf(loader.resources.comment, Comment)
    assert.equal(loader.resources.comment.id, 2)
    assert.equal(loader.resources.comment.postId, 2)
  })

  test('load nested scoped resource by custom model key', async ({ assert }) => {
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
      static routeLookupKey = 'slug'

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
    await post2.related('comments').create({ title: 'Awesome post', slug: 'nice-post' })

    const ctx = await getContextForRoute(
      app,
      '/posts/:post/comments/:>comment',
      'posts/2/comments/nice-post',
      'GET',
      async () => {}
    )
    const loader = new ResourceLoader(ctx, await app.container.make('router'))
    await loader.load([Post, Comment])

    await rollback(await app.container.make('lucid.db'))

    assert.deepEqual(ctx.params, { post: '2', comment: 'nice-post' })
    assert.deepEqual(ctx.request.params(), { post: '2', comment: 'nice-post' })
    assert.equal(ctx.request.param('post'), '2')
    assert.equal(ctx.request.param('comment'), 'nice-post')

    assert.property(loader.resources, 'post')
    assert.instanceOf(loader.resources.post, Post)
    assert.equal(loader.resources.post.id, 2)
    assert.equal(loader.resources.post.slug, 'hello-adonisjs')

    assert.property(loader.resources, 'comment')
    assert.instanceOf(loader.resources.comment, Comment)
    assert.equal(loader.resources.comment.id, 2)
    assert.equal(loader.resources.comment.postId, 2)
  })

  test('load nested scoped resource by custom "findRelatedForRequest" method', async ({
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

      findRelatedForRequest(_: any, param: Param, value: any) {
        if (param.name === 'comment') {
          return this.related('comments' as any)
            .query()
            .where('slug', value)
            .firstOrFail()
        }
      }
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
    await post2.related('comments').create({ title: 'Awesome post', slug: 'nice-post' })

    const ctx = await getContextForRoute(
      app,
      '/posts/:post/comments/:>comment',
      'posts/2/comments/nice-post',
      'GET',
      async () => {}
    )
    const loader = new ResourceLoader(ctx, await app.container.make('router'))
    await loader.load([Post, Comment])

    await rollback(await app.container.make('lucid.db'))

    assert.deepEqual(ctx.params, { post: '2', comment: 'nice-post' })
    assert.deepEqual(ctx.request.params(), { post: '2', comment: 'nice-post' })
    assert.equal(ctx.request.param('post'), '2')
    assert.equal(ctx.request.param('comment'), 'nice-post')

    assert.property(loader.resources, 'post')
    assert.instanceOf(loader.resources.post, Post)
    assert.equal(loader.resources.post.id, 2)
    assert.equal(loader.resources.post.slug, 'hello-adonisjs')

    assert.property(loader.resources, 'comment')
    assert.instanceOf(loader.resources.comment, Comment)
    assert.equal(loader.resources.comment.id, 2)
    assert.equal(loader.resources.comment.postId, 2)
  })

  test('raise exception when relationship for a scoped param is not defined', async ({
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
      '/posts/:post/comments/:>comment',
      'posts/2/comments/nice-post',
      'GET',
      async () => {}
    )
    const loader = new ResourceLoader(ctx, await app.container.make('router'))
    await assert.rejects(
      () => loader.load([Post, Comment]),
      'Cannot load "comment" for route "/posts/:post/comments/:>comment". Make sure to define it as a relationship on model "Post"'
    )

    await rollback(await app.container.make('lucid.db'))
  })
})
