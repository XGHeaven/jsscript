import { Context } from '../context'
import { JSToBoolean } from '../conversion'
import { JSThrowTypeError } from '../error'
import { HostFunction, JSNewHostConstructor } from '../function'
import {
  JSBooleanObject,
  JSNewObject,
  JSNewObjectFromCtor,
  JSObjectType,
  getObjectData,
  setObjectData,
} from '../object'
import {
  JSBoolValue,
  JSExpectionValue,
  JSValue,
  JSValueType,
  createBoolValue,
  createStringValue,
  isExceptionValue,
  isObjectValue,
  isUndefinedValue,
} from '../value'
import { JSApplyPropertyDefinitions, PropertyDefinitions, defHostFunction } from './helper'

const getThisValue = (ctx: Context, value: JSValue): JSBoolValue | JSExpectionValue => {
  if (value.type === JSValueType.Bool) {
    return value
  }

  if (isObjectValue(value)) {
    if (value.value.type === JSObjectType.Boolean) {
      return getObjectData(value.value as JSBooleanObject)
    }
  }

  return JSThrowTypeError(ctx, 'not a boolean')
}

const booleanConstructor: HostFunction = (ctx, targetObj, args) => {
  const boolValue = JSToBoolean(ctx, args[0])
  if (isUndefinedValue(targetObj)) {
    return boolValue
  }

  const obj = JSNewObjectFromCtor(ctx, targetObj, JSObjectType.Boolean)
  if (isExceptionValue(obj)) {
    return obj
  }
  setObjectData(obj.value as JSBooleanObject, boolValue)
  return obj
}

const protoDefs: PropertyDefinitions = [
  defHostFunction(
    'toString',
    (ctx, thisVal, _) => {
      const value = getThisValue(ctx, thisVal)
      if (isExceptionValue(value)) {
        return value
      }
      return createStringValue(value.value ? 'true' : 'false')
    },
    0
  ),
  defHostFunction('valueOf', (ctx, thisVal, _) => getThisValue(ctx, thisVal), 0),
]

export function JSAddBuiltinBoolean(ctx: Context) {
  const booleanProto = (ctx.protos[JSObjectType.Boolean] = JSNewObject(ctx, ctx.objProto, JSObjectType.Boolean))
  setObjectData(booleanProto.value as JSBooleanObject, createBoolValue(false))

  JSApplyPropertyDefinitions(ctx, booleanProto, protoDefs)

  const ctorObj = JSNewHostConstructor(ctx, booleanConstructor, 'Boolean', 1, booleanProto)
  ctx.defineGlobalValue('Boolean', ctorObj)
}
