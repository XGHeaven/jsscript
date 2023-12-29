import { Context } from '../context'
import { JSToNumberOrInfinity, JSToString } from '../conversion'
import { JSThrowTypeError } from '../error'
import { HostFunction, JSNewHostConstructor } from '../function'
import {
  JSDefinePropertyValue,
  JSNewObjectFromCtor,
  JSNewObjectProtoClass,
  JSObjectType,
  JS_PROPERTY_NONE,
  setObjectData,
} from '../object'
import {
  JSValue,
  JSValueType,
  createNumberValue,
  createStringValue,
  isExceptionValue,
  isUndefinedValue,
} from '../value'
import { JSApplyPropertyDefinitions, PropertyDefinitions, defHostFunction } from './helper'

function toStringValueWithCheck(ctx: Context, value: JSValue) {
  if (value.type === JSValueType.Null || value.type === JSValueType.Undefined) {
    return JSThrowTypeError(ctx, 'null or undefined are forbidden')
  }
  return JSToString(ctx, value)
}

const stringConstructor: HostFunction = (ctx, targetValue, args) => {
  let strVal: JSValue

  if (!args.length) {
    strVal = createStringValue('')
  } else {
    // TODO: consider String(symbol)
    strVal = JSToString(ctx, args[0])
    if (isExceptionValue(strVal)) {
      return strVal
    }
  }

  if (!isUndefinedValue(targetValue)) {
    const strObj = JSNewObjectFromCtor(ctx, targetValue, JSObjectType.String)
    if (!isExceptionValue(strObj)) {
      setObjectData(strObj.value, strVal)
      JSDefinePropertyValue(ctx, strObj, 'length', createNumberValue(strVal.value.length), JS_PROPERTY_NONE)
    }

    return strObj
  }

  return strVal
}

const stringProtoIndexOf: HostFunction = (ctx, thisVal, args) => {
  const str = toStringValueWithCheck(ctx, thisVal)
  if (isExceptionValue(str)) {
    return str
  }
  const searchStr = JSToString(ctx, args[0])
  if (isExceptionValue(searchStr)) {
    return searchStr
  }

  const pos = args[1] ? JSToNumberOrInfinity(ctx, args[1]) : createNumberValue(0)
  if (isExceptionValue(pos)) {
    return pos
  }

  return createNumberValue(str.value.indexOf(searchStr.value, pos.value))
}

const stringProtoPropertyDefs: PropertyDefinitions = [defHostFunction('indexOf', stringProtoIndexOf, 1)]

export function JSAddBuiltinString(ctx: Context) {
  const stringProto = (ctx.protos[JSObjectType.String] = JSNewObjectProtoClass(
    ctx,
    ctx.protos[JSObjectType.Object],
    JSObjectType.String
  ))
  setObjectData(stringProto.value, createStringValue(''))
  JSApplyPropertyDefinitions(ctx, stringProto, stringProtoPropertyDefs)

  const ctor = JSNewHostConstructor(ctx, stringConstructor, 'String', 1, stringProto)

  ctx.defineGlobalValue('String', ctor)
}
