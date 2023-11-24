import { Context } from "./context"
import { JSToString } from "./conversion"
import { JSValue, JSValueType } from "./value"

export type JSAtom = string | number | symbol

export type JSAtomProperty = string | symbol

export function JSToPropertyKey(ctx: Context, value: JSValue): JSAtomProperty {
  switch (value.type) {
    case JSValueType.Bool:
    case JSValueType.Undefined:
    case JSValueType.Null:
    case JSValueType.Number: return `${value.value}`
    case JSValueType.String: return value.value
    case JSValueType.Symbol: return value.value
    // TODO
    case JSValueType.Object: return ''
    default: { return ''}
  }
}