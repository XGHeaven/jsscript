import { Context } from './context'
import { JSThrowTypeError } from './error'
import {
  JSBoolValue,
  JSExpectionValue,
  JSNumberValue,
  JSObjectValue,
  JSValue,
  JSValueType,
  JS_NAN,
  JS_UNDEFINED,
  createBoolValue,
  createNumberValue,
  createStringValue,
  isObjectValue,
  isUseHostValue,
} from './value'

export function JSToString(ctx: Context, value: JSValue): JSValue {
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
  // switch(value.type) {
  //   case JSValueType.Bool:
  //   case JSValueType.Undefined:
  //   case JSValueType.Symbol:
  //   case JSValueType.String:
  //   case JSValueType.Number:
  //     return value.value
  //   case JSValueType.Object
  // }

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
