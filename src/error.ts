import { JSAtom, JSAtomToString } from './atom'
import { PropertyDefinitions, defHostValue, defHostFunction, JSApplyPropertyDefinitions } from './builtin/helper'
import { Context } from './context'
import { JSToString } from './conversion'
import { HostFunction, JSNewHostConstructor } from './function'
import {
  JSDefinePropertyValue,
  JSNewObject,
  JSObjectType,
  JS_PROPERTY_C_W,
  JSNewPlainObjectProto,
  JSGetProperty,
  JSNewObjectProtoClass,
} from './object'
import {
  JSExpectionValue,
  JSValue,
  JS_EMPTY_STRING,
  JS_EXCEPTION,
  JS_UNDEFINED,
  createStringValue,
  isEmptyStringValue,
  isExceptionValue,
  isObjectValue,
  isUndefinedValue,
} from './value'

export const enum NativeErrorType {
  TypeError,
  RangeError,
  ReferenceError,
}

type NativeErrorConfig = [type: NativeErrorType, name: string]

const configs: NativeErrorConfig[] = [
  [NativeErrorType.TypeError, 'TypeError'],
  [NativeErrorType.RangeError, 'RangeError'],
  [NativeErrorType.ReferenceError, 'ReferenceError'],
]

const errorProtoToString: HostFunction = (ctx, thisVal, args) => {
  if (!isObjectValue(thisVal)) {
    return JSThrowTypeError(ctx, 'error not a object')
  }

  const nameVal = JSGetProperty(ctx, thisVal, 'name')
  const name = nameVal === JS_UNDEFINED ? createStringValue('Error') : JSToString(ctx, nameVal)

  if (isExceptionValue(name)) {
    return name
  }

  const messageVal = JSGetProperty(ctx, thisVal, 'message')
  const message = messageVal === JS_UNDEFINED ? createStringValue('') : JSToString(ctx, messageVal)

  if (isExceptionValue(message)) {
    return message
  }

  if (isEmptyStringValue(name)) {
    return message
  }

  if (isEmptyStringValue(message)) {
    return name
  }

  return createStringValue(`${name.value}: ${message.value}`)
}

const errorProtoDefs: PropertyDefinitions = [
  defHostValue('message', ''),
  defHostValue('name', 'Error'),
  defHostFunction('toString', errorProtoToString, 0),
]

const jsErrorConstructorBuilder: (type: number) => HostFunction = (errorType) => (ctx, targetObj, args) => {
  if (isUndefinedValue(targetObj)) {
    // TODO: import others
    return JSThrowTypeError(ctx, 'Error is not a constructor')
  }

  let proto = JSGetProperty(ctx, targetObj, 'prototype')

  if (isExceptionValue(proto)) {
    return proto
  }

  if (!isObjectValue(proto)) {
    if (errorType < 0) {
      proto = ctx.protos[JSObjectType.Error]
    } else {
      proto = ctx.protos[errorType]
    }
  }

  const errObj = JSNewObjectProtoClass(ctx, proto, JSObjectType.Error)

  if (isExceptionValue(errObj)) {
    return errObj
  }

  const messageVal = args[0]

  if (!isUndefinedValue(messageVal)) {
    const message = JSToString(ctx, messageVal)
    if (isExceptionValue(message)) {
      return message
    }
    JSDefinePropertyValue(ctx, errObj, 'message', message, JS_PROPERTY_C_W)
  }

  return errObj
}

export function JSInitErrorProto(ctx: Context) {
  const errorProto = (ctx.protos[JSObjectType.Error] = JSNewObject(
    ctx,
    ctx.protos[JSObjectType.Object],
    JSObjectType.Error
  ))
  JSApplyPropertyDefinitions(ctx, errorProto, errorProtoDefs)

  for (const [type, name] of configs) {
    const errProto = JSNewPlainObjectProto(ctx, errorProto)
    JSDefinePropertyValue(ctx, errProto, 'name', createStringValue(name), JS_PROPERTY_C_W)
    JSDefinePropertyValue(ctx, errProto, 'message', JS_EMPTY_STRING, JS_PROPERTY_C_W)
    ctx.nativeErrorProtos[type] = errProto
  }
}

export function JSAddBuiltinError(ctx: Context) {
  const ctor = JSNewHostConstructor(ctx, jsErrorConstructorBuilder(-1), 'Error', 1, ctx.protos[JSObjectType.Error])
  ctx.defineGlobalValue('Error', ctor)

  for (const config of configs) {
    const [type, name] = config
    const ctor = JSNewHostConstructor(ctx, jsErrorConstructorBuilder(type), name, 1, ctx.nativeErrorProtos[type])
    ctx.defineGlobalValue(name, ctor)
  }
}

export function JSThrow(ctx: Context, err: JSValue): JSExpectionValue {
  ctx.runtime.currentException = err
  return JS_EXCEPTION
}

export function JSThrowError(ctx: Context, type: NativeErrorType, message: string): JSExpectionValue {
  const errValue = JSNewObject(ctx, ctx.nativeErrorProtos[type], JSObjectType.Error)
  JSDefinePropertyValue(ctx, errValue, 'message', createStringValue(message), JS_PROPERTY_C_W)
  return JSThrow(ctx, errValue)
}

export function JSThrowTypeError(ctx: Context, message: string): JSExpectionValue {
  return JSThrowError(ctx, NativeErrorType.TypeError, message)
}

export function JSThrowTypeErrorNotAFunction(ctx: Context): JSValue {
  return JSThrowTypeError(ctx, 'not a function')
}

export function JSThrowReferenceError(ctx: Context, message: string): JSValue {
  return JSThrowError(ctx, NativeErrorType.ReferenceError, message)
}

export function JSThrowReferenceErrorNotDefine(ctx: Context, prop: JSAtom) {
  return JSThrowReferenceError(ctx, `'${JSAtomToString(ctx, prop)}' is not defined.`)
}
