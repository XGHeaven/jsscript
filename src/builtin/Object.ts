import { JSToPropertyKey } from '../atom'
import { isStrictEqual } from '../comparison'
import { Context } from '../context'
import { JSToObject } from '../conversion'
import { JSThrowTypeError } from '../error'
import { HostFunction, JSNewHostConstructor } from '../function'
import {
  JSDefinePropertyDesc,
  JSGetOwnPropertyDescValue,
  JSHasOwnProperty,
  JSNewObjectFromCtor,
  JSNewPlainObject,
  JSObjectType,
  isPrototypeOf,
  jsFindOwnProperty,
  makeObject,
} from '../object'
import {
  JSObjectValue,
  JSValueType,
  JS_EXCEPTION,
  JS_FALSE,
  JS_NULL,
  createBoolValue,
  createStringValue,
  isExceptionValue,
  isObjectValue,
  isUndefinedValue,
} from '../value'
import { JSApplyPropertyDefinitions, PropertyDefinitions, defHostFunction } from './helper'

const objectConstructor: HostFunction = (ctx, newTarget, args) => {
  if (!isUndefinedValue(newTarget) && isStrictEqual(newTarget, ctx.getActiveFunction())) {
    return JSNewObjectFromCtor(ctx, newTarget, JSObjectType.Object)
  } else {
    const input = args[0]
    switch (input.type) {
      case JSValueType.Undefined:
      case JSValueType.Null:
        return JSNewPlainObject(ctx)
    }
    return JSToObject(ctx, input)
  }
}

const objectProtoHasOwnProperty: HostFunction = (ctx, thisVal, args) => {
  const [propValue] = args
  const objValue = JSToObject(ctx, thisVal)
  if (isExceptionValue(objValue)) {
    return objValue
  }
  const prop = JSToPropertyKey(ctx, propValue)
  return createBoolValue(JSHasOwnProperty(ctx, objValue, prop))
}

const objectProtoPropertyIsEnumerable: HostFunction = (ctx, thisVal, args) => {
  const objValue = JSToObject(ctx, thisVal)
  if (isExceptionValue(objValue)) {
    return objValue
  }
  const prop = JSToPropertyKey(ctx, args[0])
  const pr = jsFindOwnProperty(ctx, objValue, prop)
  if (!pr) {
    return createBoolValue(false)
  }
  return createBoolValue(pr.enumerable)
}

const objectProtoIsPrototypeOf: HostFunction = (ctx, thisVal, [protoObj]) => {
  if (!isObjectValue(protoObj)) {
    return JS_FALSE
  }
  const objValue = JSToObject(ctx, thisVal)
  if (isExceptionValue(objValue)) {
    return objValue
  }

  return createBoolValue(isPrototypeOf(protoObj.value, objValue.value))
}

const objectToStringTagMap: Partial<Record<number, string>> = {
  [JSObjectType.Arguments]: 'Arguments',
  [JSObjectType.Array]: 'Array',
  [JSObjectType.Error]: 'Error',
  [JSObjectType.Function]: 'Function',
  [JSObjectType.Boolean]: 'Boolean',
  [JSObjectType.Number]: 'Number',
  [JSObjectType.String]: 'String',
}

const objectProtoToString: HostFunction = (ctx, thisVal, _) => {
  switch (thisVal.type) {
    case JSValueType.Undefined:
      return createStringValue(`[object Undefined]`)
    case JSValueType.Null:
      return createStringValue(`[object Null]`)
  }

  // ASSERT: cannot be exception value
  const obj = JSToObject(ctx, thisVal) as JSObjectValue

  const tag = objectToStringTagMap[obj.value.type] ?? 'Object'
  return createStringValue(`[object ${tag}]`)
}

const objectProtoPropertyDefs: PropertyDefinitions = [
  defHostFunction('hasOwnProperty', objectProtoHasOwnProperty, 1),
  defHostFunction('propertyIsEnumerable', objectProtoPropertyIsEnumerable, 1),
  defHostFunction('isPrototypeOf', objectProtoIsPrototypeOf, 1),
  defHostFunction('toString', objectProtoToString, 0),
]

const objectDefineProperty: HostFunction = (ctx, _, args) => {
  const [objValue, nameValue, descValue] = args
  if (!isObjectValue(objValue)) {
    return JSThrowTypeError(ctx, 'not a object')
  }
  const prop = JSToPropertyKey(ctx, nameValue)
  if (JSDefinePropertyDesc(ctx, objValue, prop, descValue) < -1) {
    return JS_EXCEPTION
  }
  return objValue
}

const objectGetOwnPropertyDescriptor: HostFunction = (ctx, _, args) => {
  const [objValue, propValue] = args
  const ensureObjValue = JSToObject(ctx, objValue)
  if (isExceptionValue(ensureObjValue)) {
    return ensureObjValue
  }
  const prop = JSToPropertyKey(ctx, propValue)
  return JSGetOwnPropertyDescValue(ctx, ensureObjValue, prop)
}

const objectGetPrototypeOf: HostFunction = (ctx, _, args) => {
  const obj = JSToObject(ctx, args[0])
  if (isExceptionValue(obj)) {
    return obj
  }
  return obj.value.proto ? makeObject(obj.value.proto) : JS_NULL
}

const objectPropertyDefs: PropertyDefinitions = [
  defHostFunction('defineProperty', objectDefineProperty, 3),
  defHostFunction('getOwnPropertyDescriptor', objectGetOwnPropertyDescriptor, 2),
  defHostFunction('getPrototypeOf', objectGetPrototypeOf, 1),
]

export function JSAddBuiltinObject(ctx: Context) {
  const objProto = ctx.protos[JSObjectType.Object]

  JSApplyPropertyDefinitions(ctx, objProto, objectProtoPropertyDefs)

  const ctor = JSNewHostConstructor(ctx, objectConstructor, 'Object', 1, objProto)
  JSApplyPropertyDefinitions(ctx, ctor, objectPropertyDefs)
  ctx.defineGlobalValue('Object', ctor)
}
