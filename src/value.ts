import { Context } from "./context"
import { Scope } from "./scope"
import { BlockStatement, FunctionExpression, Identifier, Pattern, RestElement } from '@babel/types'
import { EnvironmentRecord } from "./environment"
import { Bytecodes } from "./bytecode"
import { JSObject, JSObjectType, toHostObject } from "./object"

export enum JSValueType {
  Undefined,
  Null,
  Number,
  String,
  Symbol,
  Bool,
  Object,

  // internal usage
  Exception,
  TryContext,
}

export interface JSCoreValue {
  type: JSValueType
  context: Context
}

export interface JSNumberValue {
  type: JSValueType.Number,
  value: number
}

export interface JSBoolValue {
  type: JSValueType.Bool
  value: boolean
}

export interface JSStringValue {
  type: JSValueType.String
  value: string
}

export interface JSObjectValue {
  type: JSValueType.Object,
  value: JSObject
}

export interface JSSymbolValue {
  type: JSValueType.Symbol,
  value: symbol
}

export interface JSUndefinedValue {
  type: JSValueType.Undefined
  value: undefined
}

export interface JSExpectionValue {
  type: JSValueType.Exception
}

export interface JSNullValue {
  type: JSValueType.Null,
  value: null
}

export interface JSTryContextValue {
  type: JSValueType.TryContext,
  value: number
  scope: Scope
}

// export interface JSReferenceValue {
//   type: JSValueType.Reference,
//   host: JSInstrinsicValue,
//   value: JSInstrinsicValue
// }

export type JSHostValue = JSNumberValue | JSBoolValue | JSStringValue | JSUndefinedValue | JSNullValue
export type JSInstrinsicValue = JSHostValue | JSObjectValue | JSSymbolValue
export type JSValue = JSInstrinsicValue | JSExpectionValue | JSTryContextValue

export const JS_UNDEFINED: JSUndefinedValue = {
  type: JSValueType.Undefined,
  value: undefined
}

export const JS_EXCEPTION : JSExpectionValue = {
  type: JSValueType.Exception
}

export const JS_NULL: JSNullValue = {
  type: JSValueType.Null,
  value: null
}

export const JS_NAN: JSNumberValue = {
  type: JSValueType.Number,
  value: NaN
}

export const JS_INFINITY: JSNumberValue = {
  type: JSValueType.Number,
  value: Infinity
}

export const JS_TRUE: JSBoolValue = {
  type: JSValueType.Bool,
  value: true
}

export const JS_FALSE: JSBoolValue = {
  type: JSValueType.Bool,
  value: false
}

export const JS_EMPTY_STRING = createStringValue('')

export function createNumberValue(num: number): JSNumberValue {
  return {
    type: JSValueType.Number,
    value: num
  }
}

export function createStringValue(str: string): JSStringValue {
  return {
    type: JSValueType.String,
    value: str
  }
}

export function createBoolValue(value: boolean): JSBoolValue {
  return value ? JS_TRUE : JS_FALSE
}

export function createTryContextValue(pos: number, scope: Scope): JSTryContextValue {
  return {
    type: JSValueType.TryContext,
    value: pos,
    scope
  }
}

export interface FunctionBytecode {
  codes: Bytecodes
  maxValueStackSize: number
  argNames: string[]
  scopeNames: [letNames: string[], constNames: string[]][]
  children: FunctionBytecode[]
}

export function isPrimitiveValue(value: JSValue): value is JSBoolValue | JSNumberValue | JSStringValue | JSSymbolValue | JSUndefinedValue {
  return value.type === JSValueType.Bool || value.type === JSValueType.Number || value.type === JSValueType.String || value.type === JSValueType.Symbol || value.type === JSValueType.Undefined
}

export function isUseHostValue(value: JSValue): value is JSBoolValue | JSNumberValue | JSStringValue | JSUndefinedValue {
  return value.type === JSValueType.Bool || value.type === JSValueType.Number || value.type === JSValueType.String || value.type === JSValueType.Undefined
}

export function isExceptionValue(value: JSValue): value is JSExpectionValue {
  return value.type === JSValueType.Exception
}

export function isObjectValue(value: JSValue): value is JSObjectValue {
  return value.type === JSValueType.Object
}

export function isNullValue(value: JSValue): value is JSNullValue {
  return value.type === JSValueType.Null
}

export function isTryContextValue(value: JSValue): value is JSTryContextValue {
  return value.type === JSValueType.TryContext
}

export function isNumberValue(value: JSValue): value is JSNumberValue {
  return value.type === JSValueType.Number
}

// export function isReferenceValue(value: JSValue): value is JSReferenceValue {
//   return value.type === JSValueType.Reference
// }

export function createHostValue(value: number | string | boolean | undefined | null): JSHostValue {
  if (value === null) {
    return JS_NULL
  }
  if (value === undefined) {
    return JS_UNDEFINED
  }
  if (typeof value === 'number') {
    return createNumberValue(value)
  }
  if (typeof value === 'string') {
    return createStringValue(value)
  }
  if (typeof value === 'boolean') {
    return createBoolValue(value)
  }

  // unreachable: just for type check
  return JS_UNDEFINED
}

export function valueToString(value: JSValue): string {
  switch (value.type) {
    case JSValueType.Bool:
    case JSValueType.String:
    case JSValueType.Number: return value.value.toString()
    case JSValueType.Undefined: return 'undefined'
    case JSValueType.Object: return `[object Object]`
    case JSValueType.Null: return 'null'
    default: {
      return 'UNKNOWN_VALUE'
    }
  }
}

export function formatValue(value: JSValue): string {
  switch(value.type) {
    case JSValueType.Bool:
    case JSValueType.Number: return `${value.value}`
    case JSValueType.String: return `"${value.value}"`
    case JSValueType.Object: return `[object ${value.type}]`
    case JSValueType.Undefined: return 'undefined'
    case JSValueType.Exception: return `[expection]`
    case JSValueType.Null: return `null`
    case JSValueType.Symbol: return `[Symbol]`
    case JSValueType.TryContext: return `[trycontext]`
  }
}

export function toHostValue(value: JSValue, transferedSets: WeakSet<object> = new Set()): unknown {
  switch (value.type) {
    case JSValueType.Bool:
    case JSValueType.Number:
    case JSValueType.String:
    case JSValueType.Undefined: return value.value
    case JSValueType.Null: return null
    case JSValueType.Object: return toHostObject(value.value, transferedSets)

    case JSValueType.Exception: return null
  }
}

// export function toInstrinsiccValue(value: JSValue): JSInstrinsicValue {
//   switch (value.type) {
//     case JSValueType.Reference: return value.value
//     case JSValueType.Exception: return JS_UNDEFINED
//     default: return value
//   }
// }

function typeofFn(v: any) {
  return typeof v
}

type TypeofType = ReturnType<typeof typeofFn>

export function typeofValue(ctx: Context, value: JSValue): TypeofType {
  switch(value.type) {
    case JSValueType.Bool: return 'boolean'
    case JSValueType.Number: return 'number'
    case JSValueType.String: return 'string'
    case JSValueType.Symbol: return 'symbol'
    case JSValueType.Undefined: return 'undefined'
    case JSValueType.Null: return 'object'
    case JSValueType.Object: {
      if (value.value.type === JSObjectType.Function || ctx.runtime.classes[value.value.type].call) {
        return 'function'
      }
      return 'object'
    }
    default: return 'object'
  }
}

export function isValueTruly(value: JSValue): boolean {
  if (isUseHostValue(value)) {
    return !!value.value
  }
  switch (value.type) {
    case JSValueType.Object: return true;
  }

  return false
}

export function JSTypeOf(ctx: Context, value: JSValue): JSValue {
  const type = typeofValue(ctx, value)
  return createStringValue(type)
}
