import { JSAtom } from './atom'
import { Context } from './context'
import { JSThrowReferenceErrorNotDefine, JSThrowTypeError, initNativeErrorProto } from './error'
import { HostFunction, JSNewHostFunctionWithProto } from './function'
import { Runtime } from './runtime'
import { Scope } from './scope'
import {
  FunctionBytecode,
  JSNumberValue,
  JSObjectValue,
  JSValue,
  JSValueType,
  JS_NULL,
  JS_UNDEFINED,
  createStringValue,
  isExceptionValue,
  isNullValue,
  isObjectValue,
  toHostValue,
} from './value'

export const enum JSObjectType {
  Object,
  Function,
  BoundFunction,
  HostFunction,
  Array,
  Error,
  ForInIterator,
  ForOfIterator,
  Number,
  String,

  LastMark,
}

type JSObjectDataMap = {
  [JSObjectType.Object]: unknown
  [JSObjectType.Function]: {
    body: FunctionBytecode
    scope: Scope
  }
  [JSObjectType.BoundFunction]: {
    thisValue: JSValue
    fnValue: JSFunctionObject
  }
  [JSObjectType.HostFunction]: {
    fn: HostFunction
    rt: Runtime
    ctr: boolean
  }
  [JSObjectType.Number]: JSNumberValue
  [JSObjectType.ForInIterator]: {
    keys: string[]
    pos: number
  }
  [JSObjectType.ForOfIterator]: {
    iter: Iterator<unknown, unknown, unknown>
  }
}

export type JSObjectData<T extends number> = JSObjectDataMap extends {
  [K in T]: infer V
}
  ? V
  : undefined

export interface JSObject<T extends number = number> {
  type: T
  props: Map<JSAtom, Property>
  proto: JSObject | null
  data: JSObjectData<T>
}

export function JSNewObject<T extends number>(
  ctx: Context,
  proto: JSValue | null,
  type: T,
  data?: JSObjectData<T>
): JSObjectValue {
  return makeObject(newObjectInternal(ctx, getProtoObject(ctx, proto), type, data))
}

export function newObjectInternal<T extends number>(
  ctx: Context,
  proto: JSObject | null,
  type: T,
  data?: JSObjectData<T>
): JSObject<T> {
  return {
    type,
    proto,
    props: new Map(),
    // TODO: should check data is setted when inited
    data: data!,
  }
}

export function JSNewPlainObject(ctx: Context): JSObjectValue {
  return makeObject(newObjectInternal(ctx, getProtoObject(ctx, ctx.protos[JSObjectType.Object]), JSObjectType.Object))
}

export function setObjectData<T extends number>(obj: JSObject<T>, data: JSObjectData<T>) {
  obj.data = data
}

export function getObjectData<T extends number>(obj: JSObject<T>): JSObjectData<T> {
  return obj.data
}

export type JSFunctionObject = JSObject<JSObjectType.Function>
export type JSBoundFunctionObject = JSObject<JSObjectType.BoundFunction>
export type JSHostFunctionObject = JSObject<JSObjectType.HostFunction>
export type JSArrayObject = JSObject<JSObjectType.Array>
export type JSPlainObject = JSObject<JSObjectType.Object | JSObjectType.String | JSObjectType.Error>
export type JSForInIteratorObject = JSObject<JSObjectType.ForInIterator>
export type JSForOfIteratorObject = JSObject<JSObjectType.ForOfIterator>
export type JSNumberObject = JSObject<JSObjectType.Number>

export interface Property {
  configure: boolean
  writable: boolean
  enumerable: boolean

  value: JSValue
  getter: JSValue
  setter: JSValue

  getset: boolean
}

export function getProtoObject(ctx: Context, proto: JSValue | null): JSObject | null {
  return proto && isObjectValue(proto) ? proto.value : null
}

export function newFunctionObject(ctx: Context, body: FunctionBytecode, scope: Scope): JSFunctionObject {
  return newObjectInternal(ctx, getProtoObject(ctx, ctx.fnProto), JSObjectType.Function, {
    body,
    scope,
  })
}

export function JSNewFunction(ctx: Context, body: FunctionBytecode, scope: Scope): JSObjectValue {
  return {
    type: JSValueType.Object,
    value: newFunctionObject(ctx, body, scope),
  }
}

export function makeObject<T extends number>(obj: JSObject<T>): JSObjectValue {
  return {
    type: JSValueType.Object,
    value: obj as unknown as JSObject<number>,
  }
}

export function JSNewObject2ProtoClass(ctx: Context, proto: JSValue, type: number) {
  return JSNewObject(ctx, getProtoObject(ctx, proto), type)
}

export function JSNewPlainObjectProto(ctx: Context, proto: JSValue) {
  return JSNewObject(ctx, proto, JSObjectType.Object)
}

export function newArray(ctx: Context): JSArrayObject {
  return {
    type: JSObjectType.Array,
    props: [] as unknown as JSArrayObject['props'],
    proto: getProtoObject(ctx, ctx.protos[JSObjectType.Array]),
    data: undefined,
  }
}

export function newArrayValue(ctx: Context): JSValue {
  return {
    type: JSValueType.Object,
    value: newArray(ctx),
  }
}

export function JSNewForInIteratorObject(ctx: Context, value: JSValue): JSValue {
  const keys: string[] = []
  if (!isObjectValue(value)) {
    return JSThrowTypeError(ctx, `value is not a object`)
  }
  let obj: JSObject | null = value.value
  while (obj) {
    keys.push(...Object.keys(obj.props))
    obj = obj.proto
  }
  return makeObject(
    newObjectInternal(ctx, null, JSObjectType.ForInIterator, {
      keys,
      pos: -1,
    })
  )
}

export function JSIteratorObjectNext(ctx: Context, value: JSValue): JSValue | null {
  if (!isObjectValue(value)) {
    return null
  }
  const obj = value.value
  switch (obj.type) {
    case JSObjectType.ForInIterator: {
      const data = getObjectData(obj as JSObject<JSObjectType.ForInIterator>)
      data.pos += 1
      if (data.pos >= data.keys.length) {
        return null
      }
      return createStringValue(data.keys[data.pos])
    }
  }

  return null
}

export const JS_PROPERTY_NONE = 0
export const JS_PROPERTY_WRITABLE = 1 << 0
export const JS_PROPERTY_CONFIGURE = 1 << 1
export const JS_PROPERTY_ENUMERABLE = 1 << 2
export const JS_PROPERTY_GETSET = 1 << 3

export const JS_PROPERTY_C_W = JS_PROPERTY_CONFIGURE | JS_PROPERTY_WRITABLE
export const JS_PROPERTY_C_W_E = JS_PROPERTY_CONFIGURE | JS_PROPERTY_WRITABLE | JS_PROPERTY_ENUMERABLE

export function propertyFlagsFromDescriptor(desc: PropertyDescriptor) {
  let flags = JS_PROPERTY_NONE
  if (desc.enumerable) flags ||= JS_PROPERTY_ENUMERABLE
  if (desc.configurable) flags ||= JS_PROPERTY_CONFIGURE
  if (desc.writable) flags ||= JS_PROPERTY_WRITABLE
  if (desc.get || desc.set) flags ||= JS_PROPERTY_GETSET
  return flags
}

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
          return 0
        } else {
          JSThrowTypeError(ctx, `${String(prop)} is readonly`)
          return -1
        }
      }
      break
    }
    obj = obj.proto
  }

  return JSCreateProperty(ctx, objValue.value, prop, value, JS_UNDEFINED, JS_UNDEFINED, JS_PROPERTY_C_W_E)
}

export function JSDefinePropertyValue(
  ctx: Context,
  objValue: JSValue,
  prop: JSAtom,
  value: JSValue,
  flags: number
): number {
  return JSDefineProperty(ctx, objValue, prop, value, JS_UNDEFINED, JS_UNDEFINED, flags)
}

export function JSDefineProperty(
  ctx: Context,
  objValue: JSValue,
  prop: JSAtom,
  value: JSValue,
  getter: JSValue,
  setter: JSValue,
  flags: number
): number {
  if (objValue.type !== JSValueType.Object) {
    JSThrowTypeError(ctx, `not a object`)
    return -1
  }

  const obj = objValue.value

  // TODO: convert prop to string
  switch (obj.type) {
    case JSObjectType.Array: {
      if (prop === 'length') {
        // TODO
      }
    }
  }

  const pr = obj.props.get(prop)
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

export function JSCreateProperty(
  ctx: Context,
  obj: JSObject,
  prop: JSAtom,
  value: JSValue,
  getter: JSValue,
  setter: JSValue,
  flags: number
): number {
  // TODO: check extensible

  const p: Property = {
    enumerable: (flags & JS_PROPERTY_ENUMERABLE) === JS_PROPERTY_ENUMERABLE,
    configure: (flags & JS_PROPERTY_CONFIGURE) === JS_PROPERTY_CONFIGURE,
    writable: (flags & JS_PROPERTY_WRITABLE) === JS_PROPERTY_WRITABLE,
    value,
    getter,
    setter,
    getset: (flags & JS_PROPERTY_GETSET) === JS_PROPERTY_GETSET,
  }

  obj.props.set(prop, p)
  return 0
}

export function JSGetPropertyValue(ctx: Context, obj: JSValue, prop: JSAtom) {
  return JSGetProperty(ctx, obj, prop, obj, false)
}

export function JSGetProperty(
  ctx: Context,
  objValue: JSValue,
  prop: JSAtom,
  thisObj: JSValue,
  throwError: boolean
): JSValue {
  let o: JSObject

  if (!isObjectValue(objValue)) {
    switch (objValue.type) {
      case JSValueType.Null:
        return JSThrowTypeError(ctx, `Cannot read property '${String(prop)}' of null`)
      case JSValueType.Undefined:
        return JSThrowTypeError(ctx, `Cannot read property '${String(prop)}' of undefeind`)
      case JSValueType.Exception:
        return objValue
    }
    const proto = JSGetPrototypePrimitive(ctx, objValue)
    if (!proto || !isObjectValue(proto)) {
      return JS_UNDEFINED
    }
    o = proto.value
  } else {
    o = objValue.value
  }

  if (o.type === JSObjectType.Array && typeof prop === 'number') {
    // TODO: remove error
    // @ts-expect-error
    return (o as JSArrayObject).props[prop]
  }

  const p = findProperty(ctx, o, prop)
  if (!p) {
    if (throwError) {
      return JSThrowReferenceErrorNotDefine(ctx, prop)
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
  const v = obj.props.get(prop)
  if (v) {
    return v
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

export function JSNewObjectFromCtor(ctx: Context, ctor: JSValue, type: number) {
  let proto: JSValue
  if (ctor === JS_UNDEFINED) {
    proto = ctx.protos[type]
  } else {
    proto = JSGetPropertyValue(ctx, ctor, 'prototype')
    if (isExceptionValue(proto)) {
      return proto
    }
  }
  return JSNewObject2ProtoClass(ctx, proto, type)
}

export function JSGetPrototypePrimitive(ctx: Context, value: JSValue) {
  switch (value.type) {
    case JSValueType.Number:
      return ctx.protos[JSObjectType.Number]
    case JSValueType.String:
      return ctx.protos[JSObjectType.String]
    // TODO: other
    default: {
      return null
    }
  }
}

const emptyFn: HostFunction = () => JS_UNDEFINED

export function initPrototype(ctx: Context) {
  const objProto = (ctx.objProto = ctx.protos[JSObjectType.Object] = JSNewObject(ctx, JS_NULL, JSObjectType.Object))

  ctx.fnProto = ctx.protos[JSObjectType.Function] = JSNewHostFunctionWithProto(ctx, emptyFn, 'Function', 0, objProto)

  ctx.protos[JSObjectType.Error] = JSNewObject(ctx, objProto, JSObjectType.Error)
  initNativeErrorProto(ctx)

  ctx.protos[JSObjectType.Array] = JSNewObject(ctx, objProto, JSObjectType.Array)
}

export function toHostObject(obj: JSObject, transferedSets: WeakSet<object>) {
  if (transferedSets.has(obj)) {
    return `<circle_object>`
  }
  transferedSets.add(obj)
  switch (obj.type) {
    case JSObjectType.Object:
      return Object.fromEntries(
        Object.entries(obj.props)
          .filter(([_, desc]) => desc.enumerable && desc.configure)
          .map(([prop, desc]) => [prop, toHostValue(desc.value, transferedSets)])
      )
    case JSObjectType.Error:
      return new Error(`${toHostValue(obj.props.get('message')!.value, transferedSets) as string}`)
    case JSObjectType.Array:
      return (obj.props as unknown as any[]).map((v) => (v ? toHostValue(v.value, transferedSets) : v))
    case JSObjectType.Function:
      return `[object Function]`
    default: {
      return { __INTERNAL__: `Unknown object type ${obj.type}` }
    }
  }
}
