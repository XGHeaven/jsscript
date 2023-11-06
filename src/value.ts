import { Context } from "./context"
import { Scope } from "./scope"
import { BlockStatement, FunctionExpression, Identifier, Pattern, RestElement } from '@babel/types'
import { EnvironmentRecord } from "./environment"
import { Bytecodes } from "./bytecode"
import { JSObject } from "./object"

export enum JSValueType {
  Undefined,
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

export type JSValue = JSNumberValue | JSObjectValue | JSSymbolValue | JSStringValue | JSBoolValue | JSUndefinedValue | JSExpectionValue
export type JSHostValue = JSNumberValue | JSBoolValue | JSStringValue | JSUndefinedValue

export const undefinedValue: JSUndefinedValue = {
  type: JSValueType.Undefined,
  value: undefined
}

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
}

export function isPrimitiveValue(value: JSValue): value is JSBoolValue | JSNumberValue | JSStringValue | JSSymbolValue | JSUndefinedValue {
  return value.type === JSValueType.Bool || value.type === JSValueType.Number || value.type === JSValueType.String || value.type === JSValueType.Symbol || value.type === JSValueType.Undefined
}

export function isUseHostValue(value: JSValue): value is JSBoolValue | JSNumberValue | JSStringValue | JSUndefinedValue {
  return value.type === JSValueType.Bool || value.type === JSValueType.Number || value.type === JSValueType.String || value.type === JSValueType.Undefined
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
    return undefinedValue
  }
}
