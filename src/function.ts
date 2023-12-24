import { Context } from './context'
import { JSThrowTypeErrorNotAFunction } from './error'
import { callInternal } from './executor'
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
  JSNewObjectFromCtor,
} from './object'
import { Scope } from './scope'
import {
  FunctionBytecode,
  JSValue,
  createNumberValue,
  createStringValue,
  isExceptionValue,
  isObjectValue,
} from './value'

export type HostFunction = (ctx: Context, thisObj: JSValue, args: JSValue[]) => JSValue

export const enum HostFunctionType {
  Constructor,
  ConstructorOrFunction,
  Function,
}

function newHostFunctionBasic(
  ctx: Context,
  hostFn: HostFunction,
  fnName: string,
  argLength: number,
  proto: JSValue,
  type: HostFunctionType
) {
  const hostFnObj = newObjectInternal(ctx, getProtoObject(ctx, proto), JSObjectType.HostFunction, {
    fn: hostFn,
    rt: ctx.runtime,
    type,
    isConstructor: type === HostFunctionType.Constructor || type === HostFunctionType.ConstructorOrFunction,
  })
  const fnValue = makeObject(hostFnObj)
  initBasicFunctionProperties(ctx, fnValue, fnName, argLength)

  return fnValue
}

function initBasicFunctionProperties(ctx: Context, fnValue: JSValue, name: string, length: number) {
  JSDefinePropertyValue(ctx, fnValue, 'length', createNumberValue(length), JS_PROPERTY_CONFIGURE)
  JSDefinePropertyValue(ctx, fnValue, 'name', createStringValue(name), JS_PROPERTY_CONFIGURE)
}

export function JSNewHostFunction(
  ctx: Context,
  hostFn: HostFunction,
  fnName: string,
  argLength: number,
  type: HostFunctionType
) {
  return JSNewHostFunctionWithProto(ctx, hostFn, fnName, argLength, ctx.fnProto, type)
}

export function JSNewHostFunctionWithProto(
  ctx: Context,
  hostFn: HostFunction,
  fnName: string,
  argLength: number,
  proto: JSValue,
  type: HostFunctionType
) {
  const fnValue = newHostFunctionBasic(ctx, hostFn, fnName, argLength, proto, type)

  initFunctionObject(ctx, fnValue)

  return fnValue
}

export function JSNewHostConstructor(
  ctx: Context,
  hostFn: HostFunction,
  fnName: string,
  argLength: number,
  prototype: JSValue
) {
  const fnValue = newHostFunctionBasic(
    ctx,
    hostFn,
    fnName,
    argLength,
    ctx.fnProto,
    HostFunctionType.ConstructorOrFunction
  )

  initConstructorObject(ctx, fnValue, prototype)

  return fnValue
}

function initFunctionObject(ctx: Context, fnValue: JSValue) {
  const prototype = JSNewPlainObject(ctx)
  JSDefinePropertyValue(ctx, prototype, 'constructor', fnValue, JS_PROPERTY_C_W)
  JSDefinePropertyValue(ctx, fnValue, 'prototype', prototype, JS_PROPERTY_WRITABLE)
}

function initConstructorObject(ctx: Context, ctor: JSValue, prototype: JSValue) {
  JSInitConstructorFlags(ctx, ctor, prototype, JS_PROPERTY_C_W)
}

export function JSInitConstructorFlags(ctx: Context, ctor: JSValue, prototype: JSValue, flags: number) {
  JSDefinePropertyValue(ctx, prototype, 'constructor', ctor, flags)
  JSDefinePropertyValue(ctx, ctor, 'prototype', prototype, flags)
}

export function JSNewFunctionObject(ctx: Context, bc: FunctionBytecode, scope: Scope) {
  const fnValue = JSNewFunction(ctx, bc, scope)

  initFunctionObject(ctx, fnValue)

  return fnValue
}

export function callConstructor(ctx: Context, fnValue: JSValue, newTarget: JSValue, args: JSValue[]): JSValue {
  if (!isObjectValue(fnValue)) {
    return JSThrowTypeErrorNotAFunction(ctx)
  }

  const fnObj = fnValue.value

  if (fnObj.type !== JSObjectType.Function) {
    const call = ctx.runtime.classes[fnObj.type]?.call
    if (!call) {
      return JSThrowTypeErrorNotAFunction(ctx)
    }
    return call(ctx, fnValue, newTarget, args, true)
  }

  // TODO: support modern way

  // legacy way
  const thisValue = JSNewObjectFromCtor(ctx, newTarget, JSObjectType.Object)
  if (isExceptionValue(thisValue)) {
    return thisValue
  }

  const ret = callInternal(ctx, fnValue, thisValue, newTarget, args)
  if (isObjectValue(ret) || isExceptionValue(ret)) {
    return ret
  }

  return thisValue
}
