import { JSNewArray } from '../array'
import { JSHostValueToAtom } from '../atom'
import { Context } from '../context'
import { JSToObject, JSToString } from '../conversion'
import { JSThrowTypeError } from '../error'
import { HostFunction, JSNewHostConstructor } from '../function'
import { JSGetProperty, JSObjectType, JSSetPropertyValue, JSValueIsArrayObject } from '../object'
import {
  JS_EXCEPTION,
  createBoolValue,
  createNumberValue,
  createStringValue,
  isExceptionValue,
  isNullValue,
  isNumberValue,
  isUndefinedValue,
} from '../value'
import { JSApplyPropertyDefinitions, PropertyDefinitions, defHostFunction } from './helper'

const arrayConstructor: HostFunction = (ctx, targetValue, args) => {
  const arrayValue = JSNewArray(ctx)

  if (args.length === 1 && isNumberValue(args[0])) {
    if (JSSetPropertyValue(ctx, arrayValue, 'length', args[0]) < 0) {
      return JS_EXCEPTION
    }
  } else {
    for (let i = 0; i < args.length; i++) {
      if (JSSetPropertyValue(ctx, arrayValue, `${i}`, args[i]) < 0) {
        return JS_EXCEPTION
      }
    }
  }

  return arrayValue
}

const arrayProtoPush: HostFunction = (ctx, thisVal, args) => {
  const objValue = JSToObject(ctx, thisVal)
  if (isExceptionValue(objValue)) {
    return objValue
  }

  const length = JSGetProperty(ctx, objValue, 'length')
  // TODO: using to int function
  if (!isNumberValue(length)) {
    return JSThrowTypeError(ctx, 'array length is not number')
  }
  const len = length.value
  for (let i = 0; i < args.length; i++) {
    // TODO: handle error
    JSSetPropertyValue(ctx, objValue, JSHostValueToAtom(ctx, i + len), args[i])
  }

  const newLength = createNumberValue(len + args.length)
  JSSetPropertyValue(ctx, objValue, 'length', newLength)

  return newLength
}

const arrayProtoJoin: HostFunction = (ctx, thisVal, args) => {
  const objVal = JSToObject(ctx, thisVal)
  if (isExceptionValue(objVal)) {
    return objVal
  }

  const lengthValue = JSGetProperty(ctx, objVal, 'length')
  if (isExceptionValue(lengthValue)) {
    return lengthValue
  }
  if (!isNumberValue(lengthValue)) {
    return JSThrowTypeError(ctx, 'array length is not number')
  }

  // TODO: check integer
  const len = lengthValue.value

  let sep: string | undefined = undefined
  if (args.length > 0 && !isUndefinedValue(args[0])) {
    const sepValue = JSToString(ctx, args[0])
    if (isExceptionValue(sepValue)) {
      return sepValue
    }
    sep = sepValue.value
  }

  const arr = new Array(len)

  for (let i = 0; i < len; i++) {
    const val = JSGetProperty(ctx, objVal, JSHostValueToAtom(ctx, i))
    if (isExceptionValue(val)) {
      return val
    }
    if (!isNullValue(val) && !isUndefinedValue(val)) {
      const str = JSToString(ctx, val)
      if (isExceptionValue(str)) {
        return str
      }
      arr[i] = str.value
    }
  }

  return createStringValue(arr.join(sep))
}

const arrayProtoDefs: PropertyDefinitions = [
  defHostFunction('push', arrayProtoPush, 1),
  defHostFunction('join', arrayProtoJoin, 1),
]

const arrayIsArray: HostFunction = (ctx, _, args) => {
  const ret = JSValueIsArrayObject(ctx, args[0])
  return createBoolValue(ret)
}

const arrayDefs: PropertyDefinitions = [defHostFunction('isArray', arrayIsArray, 1)]

export function JSAddBuiltinArray(ctx: Context) {
  const arrayProto = ctx.protos[JSObjectType.Array]

  JSApplyPropertyDefinitions(ctx, arrayProto, arrayProtoDefs)

  const arrayCtor = JSNewHostConstructor(ctx, arrayConstructor, 'Array', 1, arrayProto)
  JSApplyPropertyDefinitions(ctx, arrayCtor, arrayDefs)

  ctx.defineGlobalValue('Array', arrayCtor)
}
