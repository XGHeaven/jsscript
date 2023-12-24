import { Context } from '../context'
import { JSToString } from '../conversion'
import { HostFunction, JSNewHostConstructor } from '../function'
import {
  JSDefinePropertyValue,
  JSNewObjectFromCtor,
  JSNewObjectProtoClass,
  JSObjectType,
  JS_PROPERTY_NONE,
  setObjectData,
} from '../object'
import { JSValue, createNumberValue, createStringValue, isExceptionValue, isUndefinedValue } from '../value'

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

export function JSAddBuiltinString(ctx: Context) {
  const stringProto = (ctx.protos[JSObjectType.String] = JSNewObjectProtoClass(
    ctx,
    ctx.protos[JSObjectType.Object],
    JSObjectType.String
  ))
  setObjectData(stringProto.value, createStringValue(''))

  const ctor = JSNewHostConstructor(ctx, stringConstructor, 'String', 1, stringProto)

  ctx.defineGlobalValue('String', ctor)
}
