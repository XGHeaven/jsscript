import { JSAtom } from "./atom";
import { Context } from "./context";
import { JSThrowTypeError, initNativeErrorProto } from "./error";
import { HostFunction, newHostFunctionValueWithProto } from "./function";
import { Runtime } from "./runtime";
import { Scope } from "./scope";
import { FunctionBytecode, JSObjectValue, JSValue, JSValueType, JS_EXCEPTION, JS_NULL, JS_UNDEFINED, isNullValue, isObjectValue, toHostValue } from "./value";

export const enum JSObjectType {
  Object,
  Function,
  BoundFunction,
  HostFunction,
  Array,
  Error,
}

export interface JSFunctionObject extends JSBaseObject {
  type: JSObjectType.Function
  body: FunctionBytecode
  scope: Scope
}

export interface JSBoundFunctionObject extends JSBaseObject {
  type: JSObjectType.BoundFunction
  thisValue: JSValue
  fnValue: JSFunctionObject
}

export interface JSHostFunctionObject extends JSBaseObject {
  type: JSObjectType.HostFunction,
  fn: HostFunction
  rt: Runtime
}

export interface JSArrayObject extends Omit<JSBaseObject, 'props'> {
  type: JSObjectType.Array
  props: JSValue[]
}

export interface JSPlainObject extends JSBaseObject {
  type: JSObjectType.Object
}

export type JSObject = JSFunctionObject | JSArrayObject | JSBoundFunctionObject | JSPlainObject

export interface Property {
  configure: boolean
  writable: boolean
  enumerable: boolean

  value: JSValue
  getter: JSValue
  setter: JSValue

  getset: boolean
}

export interface JSBaseObject {
  props: Record<JSAtom, Property>
  proto: JSValue
}

export function newFunctionObject(ctx: Context, body: FunctionBytecode, scope: Scope): JSFunctionObject {
  return {
    type: JSObjectType.Function,
    body,
    scope,
    props: {},
    proto: ctx.protos[JSObjectType.Function]
  }
}

export function newFunctionObjectValue(ctx: Context, body: FunctionBytecode, scope: Scope): JSObjectValue {
  return {
    type: JSValueType.Object,
    value: newFunctionObject(ctx, body, scope)
  }
}

export function newObject(ctx: Context): JSObject {
  return {
    type: JSObjectType.Object,
    props: {},
    proto: ctx.protos[JSObjectType.Object]
  }
}

export function newObjectFromProto(ctx: Context, proto: JSValue, type: JSObjectType): JSObject {
  return {
    type,
    props: {},
    proto,
  }
}

export function newObjectValueFromProto(ctx: Context, proto: JSValue, type: JSObjectType): JSObjectValue {
  return {
    type: JSValueType.Object,
    value: newObjectFromProto(ctx, proto, type)
  }
}

export function newObjectValue(ctx: Context): JSObjectValue {
  return {
    type: JSValueType.Object,
    value: newObject(ctx)
  }
}

export function makeObject(obj: JSObject): JSObjectValue {
  return {
    type: JSValueType.Object,
    value: obj
  }
}

export function newObjectProto(ctx: Context, proto: JSValue) {
  return newObjectFromProto(ctx, proto, JSObjectType.Object)
}

export function newObjectProtoValue(ctx: Context, proto: JSValue) {
  return newObjectValueFromProto(ctx, proto, JSObjectType.Object)
}

export const JS_PROPERTY_WRITABLE = 1 << 0;
export const JS_PROPERTY_CONFIGURE = 1 << 1;
export const JS_PROPERTY_ENUMERABLE = 1 << 2;
export const JS_PROPERTY_GETSET = 1 << 3;

export const JS_PROPERTY_C_W = JS_PROPERTY_CONFIGURE | JS_PROPERTY_WRITABLE;
export const JS_PROPERTY_C_W_E = JS_PROPERTY_CONFIGURE | JS_PROPERTY_WRITABLE | JS_PROPERTY_ENUMERABLE;

export function JSDefinePropertyValue(ctx: Context, objValue: JSValue, prop: string, value: JSValue, flags: number): number {
  return JSDefineProperty(ctx, objValue, prop, value, JS_UNDEFINED, JS_UNDEFINED, flags);
}

export function JSDefineProperty(ctx: Context, objValue: JSValue, prop: string, value: JSValue, getter: JSValue, setter: JSValue, flags: number): number {
  if (objValue.type !== JSValueType.Object) {
    // TODO: throw error
    JSThrowTypeError(ctx, `not a object`)
    return -1
  }

  const obj = objValue.value
  
  switch(obj.type) {
    case JSObjectType.Array: {
      // TODO
      // obj.props[]
    }
  }

  const pr = obj.props[prop]
  if (pr) {

  } else {

  }

  return JSCreateProperty(ctx, obj, prop, value, getter, setter, flags)
}

export function JSCreateProperty(ctx: Context, obj: JSObject, prop: string, value: JSValue, getter: JSValue, setter: JSValue, flags: number): number {
  // TODO: check extensible

  const p: Property = {
    enumerable: (flags & JS_PROPERTY_ENUMERABLE) === JS_PROPERTY_ENUMERABLE,
    configure: (flags & JS_PROPERTY_CONFIGURE) === JS_PROPERTY_CONFIGURE,
    writable: (flags & JS_PROPERTY_WRITABLE) === JS_PROPERTY_WRITABLE,
    value,
    getter,
    setter,
    getset: (flags & JS_PROPERTY_GETSET) === JS_PROPERTY_GETSET
  }

  obj.props[prop] = p;
  return 1
}

export function JSGetPropertyValue(ctx: Context, obj: JSValue, prop: string) {
  return JSGetProperty(ctx, obj, prop, obj)
}

export function JSGetProperty(ctx: Context, objValue: JSValue, prop: string, thisObj: JSValue): JSValue {
  if (!isObjectValue(objValue) || isNullValue(objValue)) {
    JSThrowTypeError(ctx, 'is not object')
    return JS_EXCEPTION
  }

  const {value: o} = objValue

  if (o.type === JSObjectType.Array && typeof prop === 'number') {
    return (o as JSArrayObject).items[prop]
  }

  const p = findProperty(ctx, objValue.value, prop)
  if (!p) {
    return JS_UNDEFINED
  }

  if (p.getset) {
    // TODO
    return JS_NULL
  } else {
    return p.value
  }
}

function findOwnProperty(ctx: Context, obj: JSObject, prop: JSAtom): Property | null {
  if (obj.props[prop]) {
    return obj.props[prop]
  }
  return null
}

function findProperty(ctx: Context, obj: JSObject, prop: JSAtom): Property | null {
  const p = findOwnProperty(ctx, obj, prop)
  if (p) {
    return p
  }
  const { proto } = obj
  if (isObjectValue(proto)) {
    return findOwnProperty(ctx, proto.value, prop)
  }

  return null
}

const emptyFn: HostFunction = () => JS_UNDEFINED

export function initPrototype(ctx: Context) {
  const objProto = ctx.objProto = ctx.protos[JSObjectType.Object] = newObjectValueFromProto(ctx, JS_NULL, JSObjectType.Object)

  ctx.fnProto = ctx.protos[JSObjectType.Function] = newHostFunctionValueWithProto(ctx, emptyFn, 'Function', 0, objProto)

  ctx.protos[JSObjectType.Error] = newObjectValueFromProto(ctx, objProto, JSObjectType.Error)
  initNativeErrorProto(ctx)
}

export function toHostObject(obj: JSObject) {
  switch (obj.type) {
    case JSObjectType.Object: return Object.fromEntries(Object.entries(obj.props).map(([prop, desc]) => [prop, toHostValue(desc.value)]))
    default: {
      return {__INTERNAL__: true}
    }
  }
}
