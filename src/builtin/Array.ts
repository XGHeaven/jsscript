import { JSNewArray } from '../array'
import { Context } from '../context'
import { HostFunction, JSNewHostConstructor } from '../function'
import { JSObjectType, JSSetPropertyValue } from '../object'
import { JS_EXCEPTION, isNumberValue } from '../value'
import { JSApplyPropertyDefinitions, PropertyDefinitions } from './helper'

const arrayConstructor: HostFunction = (ctx, targetValue, args) => {
  const arrayValue = JSNewArray(ctx)

  if (args.length === 1 && isNumberValue(args[0])) {
    if (JSSetPropertyValue(ctx, arrayValue, 'length', args[0]) < 0) {
      return JS_EXCEPTION
    }
  } else {
    for (let i = 0; i < args.length; i++) {
      if (JSSetPropertyValue(ctx, arrayValue, i, args[i]) < 0) {
        return JS_EXCEPTION
      }
    }
  }

  return arrayValue
}

const arrayProtoDefs: PropertyDefinitions = []

const arrayDefs: PropertyDefinitions = []

export function JSAddBuiltinArray(ctx: Context) {
  const arrayProto = ctx.protos[JSObjectType.Array]

  JSApplyPropertyDefinitions(ctx, arrayProto, arrayProtoDefs)

  const arrayCtor = JSNewHostConstructor(ctx, arrayConstructor, 'Array', 1, arrayProto)
  JSApplyPropertyDefinitions(ctx, arrayCtor, arrayDefs)

  ctx.defineGlobalValue('Array', arrayCtor)
}
