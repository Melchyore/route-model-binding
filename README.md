# @adonisjs/route-model-binding

<br />

[![gh-workflow-image]][gh-workflow-url] [![npm-image]][npm-url] ![][typescript-image] [![license-image]][license-url]

## Introduction
> Bind the route parameters with Lucid models and automatically query the database

Route model binding is a neat way to remove one-liner Lucid queries from your codebase and use conventions to query the database during HTTP requests.

In the following example, we connect the route params `:post` and `:comments` with the arguments accepted by the `show` method.

- The value of the first param from the URL will be used to query the first typed hinted model on the `show` method (i.e., Post).
- Similarly, the value of the second param will be used to query the second typed hinted model (i.e., Comment).

> **Note**: The params and models are connected using the order they appear and not the name. This is because TypeScript decorators have no way to know the names of the arguments accepted by a method.

```ts
// Routes file
import router from '@adonisjs/core/services/router'

const PostsController = () => import('#controllers/posts_controller')

router.get('/posts/:post/comments/:comment', [PostsController, 'show'])
```

```ts
// Controller
import { bind } from '@adonisjs/route-model-binding'

import Post from '#models/post'
import Comment from '#models/comment'

export default class PostsController {
  @bind()
  async show({}, post: Post, comment: Comment) {
    return { post, comment }
  }
}
```

> ▶️ : **Are you a visual learner**? Checkout [these screencasts](https://learn.adonisjs.com/series/route-model-binding/introduction) to learn about Route model binding, its setup and usage.

## Setup
Install the package from the npm registry as follows.

```sh
npm i @adonisjs/route-model-binding

# yarn lovers
yarn add @adonisjs/route-model-binding
```

Next, configure the package by running the following ace command.

```sh
node ace configure @adonisjs/route-model-binding
```

The final step is to register the `RmbMiddleware` inside the `start/kernel.ts` file.

```ts
import router from '@adonisjs/core/services/router'

router.use([
  // ...other middleware
  () => import('@adonisjs/route-model-binding/rmb_middleware'),
])
```

## Basic usage
Start with the most basic example and then tune up the complexity level to serve different use cases.

In the following example, we will bind the `Post` model with the first parameter in the `posts/:id` route.

```ts
import router from '@adonisjs/core/services/router'

const PostsController = () => import('#controllers/posts_controller.js')

router.get('/posts/:id', [PostsController, 'show'])
```

```ts
import { bind } from '@adonisjs/route-model-binding'

import Post from '#models/post'

export default class PostsController {
  @bind()
  async show({}, post: Post) {
    return { post }
  }
}
```

The params and models are matched in the order they are defined. So the first param in the URL matches the first type-hinted model in the controller method.

The match is not performed using the name of the controller method argument because TypeScript decorators cannot read them (so the technical limitation leaves us with the order-based matching only).

## Changing the lookup key
By default, the model's primary key is used to find a matching row in the database. You can either change that globally or change it for just one specific route.

### Change lookup key globally via model
After the following change, the post will be queried using the `slug` property and not the primary key. In a nutshell, the `Post.findByOrFail('slug', value)` query is executed.

```ts
class Post extends BaseModel {
  static routeLookupKey = 'slug'
}
```

### Change the lookup key for a single route.
In the following example, we define the lookup key directly on the route enclosed with parenthesis.

```ts
import router from '@adonisjs/core/services/router'

const PostsController = () => import('#controllers/posts_controller')

router.get('/posts/:id(slug)', [PostsController, 'show'])
```

**Did you notice that our route now reads a bit funny?**\
The param is written as `:id(slug)`, which does not translate well. Therefore, with Route model binding, we recommend using the model name as the route param because we are not dealing with the `id` anymore. We are fetching model instances from the database.

Following is the better way to write the same route.

```ts
import router from '@adonisjs/core/services/router'

const PostsController = () => import('#controllers/posts_controller')

router.get('/posts/:post(slug)', [PostsController, 'show'])
```

## Change lookup logic
You can change the lookup logic by defining a static `findForRequest` method on the model itself. The method receives the following parameters.

- `ctx` - The HTTP context for the current request
- `param` - The parsed parameter. The parameter has the following properties.
    - `param.name` - The normalized name of the parameter.
    - `param.param` - The original name of the parameter defined on the route.
    - `param.scoped` - If `true`, the parameter must be scoped to its parent model.
    - `param.lookupKey` - The lookup key defined on the route or the model.
    - `param.parent` - The name of the parent param.
- `value` - The value of the param during the current request.

In the following example, we query only published posts. Also, make sure that this method either returns an instance of the model or raises an exception.

```ts
class Post extends BaseModel {
  static findForRequest(ctx, param, value) {
    const lookupKey = param.lookupKey === '$primaryKey' ? 'id' : param.lookupKey

    return this
      .query()
      .where(lookupKey, value)
      .whereNotNull('publishedAt')
      .firstOrFail()
  }
}
```

## Scoped params
When working with nested route resources, you might want to scope the second param as a relationship with the first param.

A great example of this is finding a post comment by id and making sure that it is a child of the post mentioned within the same URL.

The `posts/1/comments/2` should return 404 if the post id of the comment is not `1`.

You can define scoped params using the `>` greater than a sign or famously known as the [breadcrumb sign](https://www.smashingmagazine.com/2009/03/breadcrumbs-in-web-design-examples-and-best-practices/#:~:text=You%20also%20see%20them%20in,the%20page%20links%20beside%20it.)

```ts
import router from '@adonisjs/core/services/router'

const PostsController = () => import('#controllers/posts_controller')

router.get('/posts/:post/comments/:>comment', [PostsController, 'show'])
```

```ts
import { bind } from '@adonisjs/route-model-binding'

import Post from '#models/post'
import Comment from '#models/comment'

export default class PostsController {
  @bind()
  async show({}, post: Post, comment: Comment) {
    return { post, comment }
  }
}
```

For the above example to work, you will have to define the `comments` as a relationship on the `Post` model. The type of the relationship does not matter.

```ts
class Post extends BaseModel {
  @hasMany(() => Comment)
  declare comments: HasMany<typeof Comment>
}
```

The name of the relationship is looked up, converting the param name to `camelCase`. We will use both plural and singular forms to find the relationship.

### Customizing relationship lookup
By default, the relationship is fetched using the lookup key of the bound child model. Effectively the following query is executed.

```ts
await parent
  .related('relationship')
  .query()
  .where(lookupKey, value)
  .firstOrFail()
```

However, you can customize the lookup by defining the `findRelatedForRequest` method on the model (note, this is not a static method).

```ts
class Post extends BaseModel {
  findRelatedForRequest(ctx, param, value) {
    /**
     * Have to do this weird dance because of
     * https://github.com/microsoft/TypeScript/issues/37778
     */
    const self = this as unknown as Post
    const lookupKey = param.lookupKey === '$primaryKey' ? 'id' : param.lookupKey

    if (param.name === 'comment') {
      return self
      .related('comments')
      .query()
      .where(lookupKey, value)
      .firstOrFail()
    }
  }
}
```

## Unbound params
You will often have parameters that are raw values and cannot be tied to a model. In the following example, the `version` is a regular string value and not backed using the database.

```ts
import router from '@adonisjs/core/services/router'

const PostsController = () => import('#controllers/posts_controller')

router.get(
  '/api/:version/posts/:post',
  [PostsController, 'show']
)
```

You can represent the `version` as a string on the controller method, and we will perform no database lookup. For example:

```ts
import { bind } from '@adonisjs/route-model-binding'

import Post from '#models/post'

class PostsController {
  @bind()
  async show({}, version: string, post: Post) {}
}
```

Since the route params and the controller method arguments are matched in the same order they are defined, you will always have to type-hint all the parameters.

## Code of Conduct
In order to ensure that the AdonisJS community is welcoming to all, please review and abide by the [Code of Conduct](https://github.com/adonisjs/.github/blob/main/docs/CODE_OF_CONDUCT.md).

## License
AdonisJS route model binding is open-sourced software licensed under the [MIT license](LICENSE.md).

[gh-workflow-image]: https://img.shields.io/github/actions/workflow/status/adonisjs/route-model-binding/checks.yml?style=for-the-badge
[gh-workflow-url]: https://github.com/adonisjs/route-model-binding/actions/workflows/checks.yml "Github action"

[npm-image]: https://img.shields.io/npm/v/@adonisjs/route-model-binding/latest.svg?style=for-the-badge&logo=npm
[npm-url]: https://www.npmjs.com/package/@adonisjs/route-model-binding/v/latest "npm"

[typescript-image]: https://img.shields.io/badge/Typescript-294E80.svg?style=for-the-badge&logo=typescript

[license-url]: LICENSE.md
[license-image]: https://img.shields.io/github/license/adonisjs/route-model-binding?style=for-the-badge
