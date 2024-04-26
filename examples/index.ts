/*
 * @adonisjs/route-model-binding
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import 'reflect-metadata'
import type { HttpContext } from '@adonisjs/core/http'

import { bind } from '../src/decorators/bind.js'

class User {}

export class UsersController {
  @bind()
  show(_: HttpContext, __: User) {}
}
