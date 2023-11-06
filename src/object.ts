import { Scope } from "./scope";
import { FunctionBytecode, JSValue } from "./value";

export const enum JSObjectType {
  Function,
  BoundFunction,
  Array,
}

export interface JSFunctionObject {
  type: JSObjectType.Function
  body: FunctionBytecode
  scope: Scope
}

export interface JSBoundFunctionObject {
  type: JSObjectType.BoundFunction
  thisValue: JSValue
  fnValue: JSFunctionObject
}

export interface JSArrayObject {
  type: JSObjectType.Array
}

export type JSObject = JSFunctionObject | JSArrayObject | JSBoundFunctionObject
