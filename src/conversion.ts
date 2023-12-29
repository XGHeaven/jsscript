import { Context } from './context'
import { JSThrowTypeError } from './error'
import { JSNewPlainObject, JSObject, JSObjectType, getObjectData } from './object'
import {
  JSBoolValue,
  JSExpectionValue,
  JSNumberValue,
  JSObjectValue,
  JSStringValue,
  JSValue,
  JSValueType,
  JS_NAN,
  JS_UNDEFINED,
  createBoolValue,
  createNumberValue,
  createStringValue,
  isExceptionValue,
  isObjectValue,
  isUseHostValue,
} from './value'

export function JSToString(ctx: Context, value: JSValue): JSStringValue | JSExpectionValue {
  switch (value.type) {
    case JSValueType.Bool:
    case JSValueType.Number:
    case JSValueType.Null:
    case JSValueType.Undefined:
      return createStringValue(`${value.value}`)
    case JSValueType.Exception:
    case JSValueType.String:
      return value
    case JSValueType.Symbol: {
      return JSThrowTypeError(ctx, 'cannot convert symbol to a string')
    }
    case JSValueType.Object: {
      const priVal = JSToPrimitive(ctx, value, ToPrimitivePreferredType.String)
      return JSToString(ctx, priVal)
    }
  }
  return JSThrowTypeError(ctx, `JSToString: unexpected type ${value.type}`)
}

export const enum ToPrimitivePreferredType {
  String,
  Number,
}

export function JSToPrimitive(
  ctx: Context,
  value: JSValue,
  preferredType: ToPrimitivePreferredType = ToPrimitivePreferredType.Number
): JSValue {
  if (isObjectValue(value)) {
    return JSOridinaryToPrimitive(ctx, value, preferredType)
  }
  return value
}

export function JSOridinaryToPrimitive(
  ctx: Context,
  value: JSObjectValue,
  preferredType: ToPrimitivePreferredType
): JSValue {
  switch (value.value.type) {
    case JSObjectType.String:
      return getObjectData(value.value as JSObject<JSObjectType.String>)
  }

  // TODO
  return JS_UNDEFINED
}

export function JSToNumber(ctx: Context, value: JSValue): JSNumberValue | JSExpectionValue {
  switch (value.type) {
    case JSValueType.Number:
      return value
    case JSValueType.Bool: {
      if (value.value === true) {
        return createNumberValue(1)
      }
      // fallthrough to 0
    }
    case JSValueType.Null:
      return createNumberValue(0)
    case JSValueType.Undefined:
      return JS_NAN
    case JSValueType.String:
      return createNumberValue(+value.value)
  }
  // TODO: assert is an object
  const pri = JSToPrimitive(ctx, value, ToPrimitivePreferredType.Number)
  // TODO: assert is not a object
  return JSToNumber(ctx, pri)
}

export function JSToNumberOrInfinity(ctx: Context, value: JSValue): JSNumberValue | JSExpectionValue {
  const numVal = JSToNumber(ctx, value)
  if (isExceptionValue(numVal)) {
    return numVal
  }
  const num = numVal.value
  // change NaN +0 -0 0 to 0
  if (isNaN(num) || num === -0) {
    return createNumberValue(0)
  }
  return numVal
}

export function JSToBoolean(ctx: Context, value: JSValue): JSBoolValue {
  if (isUseHostValue(value)) {
    return createBoolValue(value.value ? true : false)
  }
  return createBoolValue(true)
}

export function JSToNotBoolean(ctx: Context, value: JSValue): JSBoolValue {
  if (isUseHostValue(value)) {
    return createBoolValue(value.value ? false : true)
  }
  return createBoolValue(false)
}

export function JSToObject(ctx: Context, value: JSValue): JSObjectValue | JSExpectionValue {
  switch (value.type) {
    case JSValueType.Null:
    case JSValueType.Undefined:
      return JSThrowTypeError(ctx, 'Cannot convert undefined or null to object')
    case JSValueType.Object:
      return value
  }
  return JSNewPlainObject(ctx)
}
