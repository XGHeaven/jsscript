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
  jsFindOwnProperty,
} from '../object'
import { JSValueType, JS_EXCEPTION, createBoolValue, isExceptionValue, isObjectValue, isUndefinedValue } from '../value'
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

const objectProtoPropertyDefs: PropertyDefinitions = [
  defHostFunction('hasOwnProperty', objectProtoHasOwnProperty, 1),
  defHostFunction('propertyIsEnumerable', objectProtoPropertyIsEnumerable, 1),
]

const objectPropertyDefs: PropertyDefinitions = [
  defHostFunction('defineProperty', objectDefineProperty, 3),
  defHostFunction('getOwnPropertyDescriptor', objectGetOwnPropertyDescriptor, 2),
]

export function JSAddBuiltinObject(ctx: Context) {
  const objProto = ctx.protos[JSObjectType.Object]

  JSApplyPropertyDefinitions(ctx, objProto, objectProtoPropertyDefs)

  const ctor = JSNewHostConstructor(ctx, objectConstructor, 'Object', 1, objProto)
  JSApplyPropertyDefinitions(ctx, ctor, objectPropertyDefs)
  ctx.defineGlobalValue('Object', ctor)
}
