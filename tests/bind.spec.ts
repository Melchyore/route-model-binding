/*
 * @adonisjs/route-model-binding
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { HttpContext } from '@adonisjs/core/http'
import type { Controller } from '../src/types.js'

import { test } from '@japa/runner'

import { bind } from '../src/decorators/bind.js'

test.group('Bind decorator', () => {
  test('controller constructor should have containerProvider static property', async ({
    assert,
  }) => {
    class User {}

    class UsersController {
      @bind()
      async show(_: HttpContext, __: User) {}
    }

    assert.property(UsersController, 'containerProvider')
  })
  test('collect method parameter types and store on the controller', async ({ assert }) => {
    class User {}

    class UsersController {
      @bind()
      async show(_: HttpContext, __: User) {}
    }

    assert.deepEqual((UsersController as Controller)['bindings'], { show: [User] })
  })

  test('collect method parameter from the parent class', async ({ assert }) => {
    class User {}

    class BaseController {
      @bind()
      async show(_: HttpContext, __: User) {}
    }

    class UsersController extends BaseController {
      @bind()
      async update(_: HttpContext, __: User) {}
    }

    assert.deepEqual((BaseController as Controller)['bindings'], { show: [User] })
    assert.deepEqual((UsersController as Controller)['bindings'], { show: [User], update: [User] })
  })

  test('collect method parameter from the multiple parent class', async ({ assert }) => {
    class User {}

    class BaseController {
      @bind()
      async index(_: HttpContext, __: User) {}
    }

    class UserBaseController extends BaseController {
      @bind()
      async show(_: HttpContext, __: User) {}
    }

    class UsersController extends UserBaseController {
      @bind()
      async update(_: HttpContext, __: User) {}
    }

    assert.deepEqual((BaseController as Controller)['bindings'], { index: [User] })
    assert.deepEqual((UserBaseController as Controller)['bindings'], {
      show: [User],
      index: [User],
    })
    assert.deepEqual((UsersController as Controller)['bindings'], {
      show: [User],
      update: [User],
      index: [User],
    })
  })
})
