import { JSAtom, JSAtomToString } from './atom'
import { Context } from './context'
import {
  JSDefinePropertyValue,
  JSNewObject,
  JSObjectType,
  JS_PROPERTY_CONFIGURE,
  JS_PROPERTY_C_W,
  JS_PROPERTY_WRITABLE,
  JSNewPlainObjectProto,
} from './object'
import { JSExpectionValue, JSValue, JS_EMPTY_STRING, JS_EXCEPTION, createStringValue } from './value'

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

export function initNativeErrorProto(ctx: Context) {
  for (const [type, name] of configs) {
    const errProto = JSNewPlainObjectProto(ctx, ctx.protos[JSObjectType.Error])
    JSDefinePropertyValue(ctx, errProto, 'name', createStringValue(name), JS_PROPERTY_CONFIGURE | JS_PROPERTY_WRITABLE)
    JSDefinePropertyValue(ctx, errProto, 'message', JS_EMPTY_STRING, JS_PROPERTY_CONFIGURE | JS_PROPERTY_WRITABLE)
    ctx.nativeErrorProtos[type] = errProto
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
