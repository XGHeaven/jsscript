import { Context } from "./context"
import { Scope } from "./scope"
import { BlockStatement, FunctionExpression, Identifier, Pattern, RestElement } from '@babel/types'
import { EnvironmentRecord } from "./environment"
import { Bytecodes } from "./bytecode"
import { JSObject, toHostObject } from "./object"

export enum JSValueType {
  Undefined,
  Null,
  Number,
  String,
  Symbol,
  Bool,
  Object,
  Exception,
  // Function
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

export type JSValue = JSNumberValue | JSObjectValue | JSSymbolValue | JSStringValue | JSBoolValue | JSUndefinedValue | JSExpectionValue | JSNullValue
export type JSHostValue = JSNumberValue | JSBoolValue | JSStringValue | JSUndefinedValue

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
  return {
    type: JSValueType.Bool,
    value
  }
}

export function getRealValue(value: JSValue): any {
  if (value.type === JSValueType.Function) {
    return undefined
  }
  return value.value
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

export function createHostValue(value: number | string | boolean | undefined): JSHostValue {
  if (typeof value === 'number') {
    return createNumberValue(value)
  }
  if (typeof value === 'string') {
    return createStringValue(value)
  }
  if (typeof value === 'boolean') {
    return createBoolValue(value)
  }
  if (typeof value === 'undefined') {
    return JS_UNDEFINED
  }
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

export function formatValue(value: JSValue) {
  switch(value.type) {
    case JSValueType.Bool:
    case JSValueType.Number: return `${value.value}`
    case JSValueType.String: return `"${value.value}"`
    case JSValueType.Object: return `[object]`
    case JSValueType.Undefined: return 'undefined'
    case JSValueType.Exception: return `[expection]`
  }
}

export function toHostValue(value: JSValue): unknown {
  switch (value.type) {
    case JSValueType.Bool:
    case JSValueType.Number:
    case JSValueType.String:
    case JSValueType.Undefined: return value.value
    case JSValueType.Null: return null
    case JSValueType.Object: return toHostObject(value.value)

    case JSValueType.Exception: return null
  }
}

export function typeofValue(value: JSValue, typeDef?: any): typeof typeDef {
  switch(value.type) {
    case JSValueType.Bool: return 'boolean'
    case JSValueType.Number: return 'number'
    case JSValueType.String: return 'string'
    case JSValueType.Symbol: return 'symbol'
    case JSValueType.Undefined: return 'undefined'
    case JSValueType.Object: return 'object'
    default:  {
      throw new Error('xx')
    }
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
