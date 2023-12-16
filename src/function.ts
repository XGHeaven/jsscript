import { Context } from './context'
import {
  JSDefinePropertyValue,
  JSNewPlainObject,
  JSObjectType,
  JS_PROPERTY_CONFIGURE,
  JS_PROPERTY_C_W,
  JS_PROPERTY_WRITABLE,
  getProtoObject,
  makeObject,
  JSNewFunction,
  newObjectInternal,
} from './object'
import { Scope } from './scope'
import { FunctionBytecode, JSObjectValue, JSValue, createNumberValue, createStringValue } from './value'

export type HostFunction = (ctx: Context, thisObj: JSValue, args: JSValue[]) => JSValue

function newHostFunctionValueWithProto(
  ctx: Context,
  hostFn: HostFunction,
  fnName: string,
  argLength: number,
  proto: JSValue,
  isCtor: boolean
): JSObjectValue {
  const hostFnObj = newObjectInternal(ctx, getProtoObject(ctx, proto), JSObjectType.HostFunction, {
    fn: hostFn,
    rt: ctx.runtime,
    ctr: isCtor,
  })

  const fnValue = makeObject(hostFnObj)

  initFunctionObject(ctx, fnValue, argLength)

  JSDefinePropertyValue(ctx, fnValue, 'name', createStringValue(fnName), JS_PROPERTY_CONFIGURE)

  return fnValue
}

export function JSNewHostFunction(ctx: Context, hostFn: HostFunction, fnName: string, argLength: number) {
  return newHostFunctionValueWithProto(ctx, hostFn, fnName, argLength, ctx.fnProto, false)
}

export function JSNewHostFunctionWithProto(
  ctx: Context,
  hostFn: HostFunction,
  fnName: string,
  argLength: number,
  proto: JSValue
) {
  return newHostFunctionValueWithProto(ctx, hostFn, fnName, argLength, proto, false)
}

export function JSNewHostConstructorWithProto(
  ctx: Context,
  hostFn: HostFunction,
  fnName: string,
  argLength: number,
  proto: JSValue
): JSObjectValue {
  return newHostFunctionValueWithProto(ctx, hostFn, fnName, argLength, proto, true)
}

export function JSNewHostConstructor(ctx: Context, hostFn: HostFunction, fnName: string, argLength: number) {
  return JSNewHostConstructorWithProto(ctx, hostFn, fnName, argLength, ctx.fnProto)
}

function initFunctionObject(ctx: Context, fnValue: JSValue, length: number) {
  const prototype = JSNewPlainObject(ctx)
  JSDefinePropertyValue(ctx, prototype, 'constructor', fnValue, JS_PROPERTY_C_W)
  JSDefinePropertyValue(ctx, fnValue, 'prototype', prototype, JS_PROPERTY_WRITABLE)
  JSDefinePropertyValue(ctx, fnValue, 'length', createNumberValue(length), JS_PROPERTY_CONFIGURE)
}

export function JSNewFunctionObject(ctx: Context, bc: FunctionBytecode, scope: Scope) {
  const fnValue = JSNewFunction(ctx, bc, scope)

  initFunctionObject(ctx, fnValue, bc.argNames.length)

  return fnValue
}
