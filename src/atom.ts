import { Context } from './context'
import { JSValue, JSValueType } from './value'

export type JSAtom = string | symbol

export function JSToPropertyKey(ctx: Context, value: JSValue): JSAtom {
  switch (value.type) {
    case JSValueType.Bool:
    case JSValueType.Undefined:
    case JSValueType.Null:
    case JSValueType.Number:
      return `${value.value}`
    case JSValueType.String:
      return value.value
    case JSValueType.Symbol:
      return value.value
    // TODO
    case JSValueType.Object:
      return ''
    default: {
      return ''
    }
  }
}

export function JSAtomToString(ctx: Context, value: JSAtom): string {
  if (typeof value === 'symbol') {
    return `Symbol(${value.description})`
  }
  return `${value}`
}

export function JSHostValueToAtom(ctx: Context, hostValue: string | number | symbol): JSAtom {
  if (typeof hostValue === 'number') {
    return `${hostValue}`
  }
  if (typeof hostValue !== 'symbol' && typeof hostValue !== 'string') {
    throw new Error(`JSHostValueToAtom error: found ${typeof hostValue}`)
  }
  return hostValue
}
