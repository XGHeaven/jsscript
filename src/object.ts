import { JSAtom } from "./atom";
import { Context } from "./context";
import { JSThrowReferenceErrorNotDefine, JSThrowTypeError, initNativeErrorProto } from "./error";
import { HostFunction, newHostFunctionValueWithProto } from "./function";
import { Runtime } from "./runtime";
import { Scope } from "./scope";
import { FunctionBytecode, JSObjectValue, JSValue, JSValueType, JS_EXCEPTION, JS_NULL, JS_UNDEFINED, createStringValue, isNullValue, isObjectValue, toHostValue } from "./value";

export const enum JSObjectType {
  Object,
  Function,
  BoundFunction,
  HostFunction,
  Array,
  Error,
  ForInIterator,
  ForOfIterator,
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

export interface JSArrayObject extends JSBaseObject {
  type: JSObjectType.Array
}

export interface JSPlainObject extends JSBaseObject {
  type: JSObjectType.Object
}

export interface JSErrorObject extends JSBaseObject {
  type: JSObjectType.Error
}

export interface JSForInIteratorObject extends JSBaseObject {
  type: JSObjectType.ForInIterator,
  keys: string[]
  pos: number
}

export interface JSForOfIteratorObject extends JSBaseObject {
  type: JSObjectType.ForOfIterator,
  iter: Iterator<unknown, unknown, unknown>
}

export type JSIteratorObject = JSForInIteratorObject | JSForOfIteratorObject
export type JSObject = JSFunctionObject | JSArrayObject | JSBoundFunctionObject | JSPlainObject | JSErrorObject | JSIteratorObject | JSHostFunctionObject

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
  proto: JSObject | null
}

export function getProtoObject(ctx: Context, proto: JSValue): JSObject | null {
  return isObjectValue(proto) ? proto.value : null
}

export function newFunctionObject(ctx: Context, body: FunctionBytecode, scope: Scope): JSFunctionObject {
  return {
    type: JSObjectType.Function,
    body,
    scope,
    props: Object.create(null),
    proto: getProtoObject(ctx, ctx.protos[JSObjectType.Function])
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
    props: Object.create(null),
    proto: getProtoObject(ctx, ctx.protos[JSObjectType.Object])
  }
}

export function newObjectFromProto(ctx: Context, proto: JSValue, type: JSObjectType): JSObject {
  // TODO
  return {
    type,
    props: Object.create(null),
    proto: getProtoObject(ctx, proto),
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

export function newArray(ctx: Context): JSArrayObject {
  return {
    type: JSObjectType.Array,
    props: [] as unknown as JSArrayObject['props'],
    proto: getProtoObject(ctx, ctx.protos[JSObjectType.Array]),
  }
}

export function newArrayValue(ctx: Context): JSValue {
  return {
    type: JSValueType.Object,
    value: newArray(ctx)
  }
}

export function JSNewForInIteratorObject(ctx: Context, value: JSValue): JSValue {
  const keys: string[] = []
  if (!isObjectValue(value)) {
    return JSThrowTypeError(ctx, `value is not a object`)
  }
  let obj: JSObject | null = value.value;
  while (obj) {
    keys.push(...Object.keys(obj.props))
    obj = obj.proto
  }
  return {
    type: JSValueType.Object,
    value: {
      type: JSObjectType.ForInIterator,
      props: Object.create(null),
      proto: null,
      keys,
      pos: -1
    }
  }
}

export function JSIteratorObjectNext(ctx: Context, value: JSValue): JSValue | null {
  if (!isObjectValue(value)) {
    return null
  }
  const obj = value.value
  switch (obj.type) {
    case JSObjectType.ForInIterator: {
      obj.pos += 1
      if (obj.pos >= obj.keys.length) {
        return null
      }
      return createStringValue(obj.keys[obj.pos])
    }
  }

  return null
}

export const JS_PROPERTY_WRITABLE = 1 << 0;
export const JS_PROPERTY_CONFIGURE = 1 << 1;
export const JS_PROPERTY_ENUMERABLE = 1 << 2;
export const JS_PROPERTY_GETSET = 1 << 3;

export const JS_PROPERTY_C_W = JS_PROPERTY_CONFIGURE | JS_PROPERTY_WRITABLE;
export const JS_PROPERTY_C_W_E = JS_PROPERTY_CONFIGURE | JS_PROPERTY_WRITABLE | JS_PROPERTY_ENUMERABLE;

export function JSSetPropertyValue(ctx: Context, objValue: JSValue, prop: JSAtom, value: JSValue): number {
  if (isNullValue(objValue)) {
    JSThrowTypeError(ctx, 'null is not a object')
    return -1
  }
  if (!isObjectValue(objValue)) {
    JSThrowTypeError(ctx, 'value is not a object')
    return -1
  }

  let obj: JSObject | null = objValue.value
  while (obj) {
    const pr = findOwnProperty(ctx, obj, prop)
    if (pr) {
      if (pr.getset) {
        // TODO
      } else {
        if (pr.writable) {
          pr.value = value
          return 0;
        } else {
          JSThrowTypeError(ctx, `${String(prop)} is readonly`)
          return -1
        }
      }
      break;
    }
    obj = obj.proto
  }

  return JSCreateProperty(ctx, objValue.value, prop, value, JS_UNDEFINED, JS_UNDEFINED, JS_PROPERTY_C_W_E)
}

export function JSDefinePropertyValue(ctx: Context, objValue: JSValue, prop: JSAtom, value: JSValue, flags: number): number {
  return JSDefineProperty(ctx, objValue, prop, value, JS_UNDEFINED, JS_UNDEFINED, flags);
}

export function JSDefineProperty(ctx: Context, objValue: JSValue, prop: JSAtom, value: JSValue, getter: JSValue, setter: JSValue, flags: number): number {
  if (objValue.type !== JSValueType.Object) {
    JSThrowTypeError(ctx, `not a object`)
    return -1
  }

  const obj = objValue.value
  
  switch(obj.type) {
    case JSObjectType.Array: {
      if (prop === 'length') {
        // TODO
      }
    }
  }

  const pr = obj.props[prop]
  if (pr) {
    if (!pr.configure) {
      JSThrowTypeError(ctx, `${String(prop)} is not configurable`)
      return -1
    }
    pr.configure = (flags & JS_PROPERTY_CONFIGURE) === JS_PROPERTY_CONFIGURE
    pr.enumerable = (flags & JS_PROPERTY_ENUMERABLE) === JS_PROPERTY_ENUMERABLE
    pr.writable = (flags & JS_PROPERTY_WRITABLE) === JS_PROPERTY_WRITABLE
    pr.value = value
    pr.getter = getter
    pr.setter = setter
    pr.getset = (flags & JS_PROPERTY_GETSET) === JS_PROPERTY_GETSET
    return 0
  }

  return JSCreateProperty(ctx, obj, prop, value, getter, setter, flags)
}

export function JSCreateProperty(ctx: Context, obj: JSObject, prop: JSAtom, value: JSValue, getter: JSValue, setter: JSValue, flags: number): number {
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
  return 0
}

export function JSGetPropertyValue(ctx: Context, obj: JSValue, prop: string) {
  return JSGetProperty(ctx, obj, prop, obj, false)
}

export function JSGetProperty(ctx: Context, objValue: JSValue, prop: string, thisObj: JSValue, throwError: boolean): JSValue {
  if (!isObjectValue(objValue) || isNullValue(objValue)) {
    JSThrowTypeError(ctx, 'is not object')
    return JS_EXCEPTION
  }

  const {value: o} = objValue

  if (o.type === JSObjectType.Array && typeof prop === 'number') {
    // TODO
    return (o as JSArrayObject).props[prop]
  }

  const p = findProperty(ctx, objValue.value, prop)
  if (!p) {
    if (throwError) {
      return JSThrowReferenceErrorNotDefine(ctx, prop);
    }
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
  if (proto) {
    return findOwnProperty(ctx, proto, prop)
  }

  return null
}

const emptyFn: HostFunction = () => JS_UNDEFINED

export function initPrototype(ctx: Context) {
  const objProto = ctx.objProto = ctx.protos[JSObjectType.Object] = newObjectValueFromProto(ctx, JS_NULL, JSObjectType.Object)

  ctx.fnProto = ctx.protos[JSObjectType.Function] = newHostFunctionValueWithProto(ctx, emptyFn, 'Function', 0, objProto)

  ctx.protos[JSObjectType.Error] = newObjectValueFromProto(ctx, objProto, JSObjectType.Error)
  initNativeErrorProto(ctx)

  ctx.protos[JSObjectType.Array] = newObjectValueFromProto(ctx, objProto, JSObjectType.Array)
}

export function toHostObject(obj: JSObject, transferedSets: WeakSet<object>) {
  if (transferedSets.has(obj)) {
    return `<circle_object>`
  }
  transferedSets.add(obj)
  switch (obj.type) {
    case JSObjectType.Object: return Object.fromEntries(Object.entries(obj.props).filter(([_, desc]) => desc.enumerable && desc.configure).map(([prop, desc]) => [prop, toHostValue(desc.value, transferedSets)]));
    case JSObjectType.Error: return new Error(`${toHostValue(obj.props.message.value, transferedSets) as string}`);
    case JSObjectType.Array: return (obj.props as unknown as any[]).map(v => v ? toHostValue(v.value, transferedSets) : v)
    case JSObjectType.Function: return `[object Function]`
    default: {
      return {__INTERNAL__: `Unknown object type ${obj.type}`}
    }
  }
}
