import { Context } from './context'
import { HostFunctionType, JSNewHostFunction } from './function'
import { JSDefinePropertyValue, JSNewPlainObject, JS_PROPERTY_C_W_E } from './object'
import { JS_UNDEFINED } from './value'

export function initTest262(ctx: Context) {
  const $262 = JSNewPlainObject(ctx)
  ctx.defineGlobalValue('$262', $262)

  const $destory = JSNewHostFunction(ctx, (ctx, thisObj, args) => JS_UNDEFINED, 'destory', 0, HostFunctionType.Function)

  JSDefinePropertyValue(ctx, $262, 'destroy', $destory, JS_PROPERTY_C_W_E)
}
