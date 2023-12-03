import { Context } from "./context";
import { JSDefinePropertyValue, JSHostFunctionObject, JSObjectType, JS_PROPERTY_C_W, JS_PROPERTY_WRITABLE, getProtoObject, makeObject, newFunctionObjectValue, newObjectValue } from "./object";
import { Scope } from "./scope";
import { FunctionBytecode, JSObjectValue, JSValue } from "./value";

export type HostFunction = (ctx: Context, thisObj: JSValue, args: JSValue[]) => JSValue

export function newHostFunctionValueWithProto(ctx: Context, hostFn: HostFunction, fnName: string, argLength: number, proto: JSValue): JSObjectValue {
  const hostFnObj: JSHostFunctionObject = {
    type: JSObjectType.HostFunction,
    props: Object.create(null),
    fn: hostFn,
    rt: ctx.runtime,
    proto: getProtoObject(ctx, proto)
  }

  const fnValue = makeObject(hostFnObj)

  initFunctionObject(ctx, fnValue)

  return fnValue
}

export function newHostFunctionValue(ctx: Context, hostFn: HostFunction, fnName: string, argLength: number) {
  return newHostFunctionValueWithProto(ctx, hostFn, fnName, argLength, ctx.fnProto)
}

function initFunctionObject(ctx: Context, fnValue: JSValue) {
  const prototype = newObjectValue(ctx)
  JSDefinePropertyValue(ctx, prototype, 'constructor', fnValue, JS_PROPERTY_C_W)
  JSDefinePropertyValue(ctx, fnValue, 'prototype', prototype, JS_PROPERTY_WRITABLE)
}

export function JSNewFunctionObject(ctx: Context, bc: FunctionBytecode, scope: Scope) {
  const fnValue = newFunctionObjectValue(ctx, bc, scope)

  initFunctionObject(ctx, fnValue)

  return fnValue
}
