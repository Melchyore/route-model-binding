/*
 * @adonisjs/route-model-binding
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module '@adonisjs/core/http' {
  interface HttpContext {
    resources: Record<string, any>
  }
}
