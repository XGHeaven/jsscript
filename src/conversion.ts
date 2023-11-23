import { Context } from "./context";
import { JSThrowTypeError } from "./error";
import { JSObject } from "./object";
import { JSExpectionValue, JSObjectValue, JSStringValue, JSValue, JSValueType, JS_UNDEFINED, createStringValue, isObjectValue } from "./value";

export function JSToString(ctx: Context, value: JSValue): JSValue {
  switch(value.type) {
    case JSValueType.Bool:
    case JSValueType.Number:
    case JSValueType.Null:
    case JSValueType.Undefined: return createStringValue(`${value.value}`)
    case JSValueType.Exception:
    case JSValueType.String: return value
    case JSValueType.Symbol: {
      return JSThrowTypeError(ctx, 'cannot convert symbol to a string')
    }
    case JSValueType.Object: {
      const priVal = JSToPrimitive(ctx, value, ToPrimitivePreferredType.String)
      return JSToString(ctx, priVal);
    }
  }
}

export const enum ToPrimitivePreferredType {
  String,
  Number
}

export function JSToPrimitive(ctx: Context, value: JSValue, preferredType: ToPrimitivePreferredType = ToPrimitivePreferredType.Number): JSValue {
  if (isObjectValue(value)) {
    return JSOridinaryToPrimitive(ctx, value, preferredType)
  }
  return value
}



export function JSOridinaryToPrimitive(ctx: Context, value: JSObjectValue, preferredType: ToPrimitivePreferredType): JSValue {
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

