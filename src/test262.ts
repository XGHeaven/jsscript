import { Context } from "./context";
import { newHostFunctionValue } from "./function";
import { JSDefinePropertyValue, JS_PROPERTY_C_W_E, newObjectValue } from "./object";
import { JS_UNDEFINED } from "./value";

export function initTest262(ctx: Context) {
  const $262 = newObjectValue(ctx)
  ctx.defineGlobalValue('$262', $262)

  const $destory = newHostFunctionValue(ctx, (ctx, thisObj, args) => JS_UNDEFINED, 'destory', 0)

  JSDefinePropertyValue(ctx, $262, 'destroy', $destory, JS_PROPERTY_C_W_E)
}
