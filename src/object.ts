import { JSAtom, JSHostValueToAtom } from './atom'
import { Context } from './context'
import { JSToBoolean, JSToObject } from './conversion'
import { JSThrowReferenceErrorNotDefine, JSThrowTypeError, JSInitErrorProto } from './error'
import { callInternal } from './executor'
import { HostFunction, HostFunctionType, JSNewHostFunctionWithProto } from './function'
import { debug } from './log'
import { Runtime } from './runtime'
import { Scope } from './scope'
import {
  FunctionBytecode,
  JSBoolValue,
  JSNumberValue,
  JSObjectValue,
  JSStringValue,
  JSValue,
  JSValueType,
  JS_NULL,
  JS_UNDEFINED,
  createBoolValue,
  createNumberValue,
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
  Boolean,
  String,

  Arguments,

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
    argc: number
    rt: Runtime
    type: HostFunctionType
    isConstructor: boolean
  }
  // use a better type
  [JSObjectType.Array]: unknown[] & Record<JSAtom, unknown>
  [JSObjectType.Number]: JSNumberValue
  [JSObjectType.Boolean]: JSBoolValue
  [JSObjectType.String]: JSStringValue
  [JSObjectType.ForInIterator]: {
    keys: JSAtom[]
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
export type JSBooleanObject = JSObject<JSObjectType.Boolean>

export interface Property {
  configure: boolean
  writable: boolean
  enumerable: boolean

  value: JSValue
  getter: JSValue
  setter: JSValue

  getset: boolean
}

interface PropertyDesc {
  flags: number
  value: JSValue
  get: JSValue
  set: JSValue
}

export function jsValueToPropertyDesc(ctx: Context, value: JSValue): PropertyDesc | null {
  if (!isObjectValue(value)) {
    JSThrowTypeError(ctx, 'descriptor is not a object')
    return null
  }

  const desc: PropertyDesc = {
    flags: JS_PROPERTY_NONE,
    value: JS_UNDEFINED,
    get: JS_UNDEFINED,
    set: JS_UNDEFINED,
  }

  if (JSHasProperty(ctx, value, 'enumerable')) {
    const propValue = JSGetProperty(ctx, value, 'enumerable')
    if (isExceptionValue(propValue)) {
      return null
    }
    const ret = JSToBoolean(ctx, propValue)

    desc.flags |= ret.value ? JS_PROPERTY_ENUMERABLE : JS_PROPERTY_NONE
  }

  if (JSHasProperty(ctx, value, 'configurable')) {
    const propValue = JSGetProperty(ctx, value, 'configurable')
    if (isExceptionValue(propValue)) {
      return null
    }
    const ret = JSToBoolean(ctx, propValue)
    desc.flags |= ret.value ? JS_PROPERTY_CONFIGURE : JS_PROPERTY_NONE
  }

  if (JSHasProperty(ctx, value, 'value')) {
    const propValue = JSGetProperty(ctx, value, 'value')
    if (isExceptionValue(propValue)) {
      return null
    }
    desc.value = propValue
  }

  if (JSHasProperty(ctx, value, 'writable')) {
    const propValue = JSGetProperty(ctx, value, 'writable')
    if (isExceptionValue(propValue)) {
      return null
    }
    const ret = JSToBoolean(ctx, propValue)
    desc.flags |= ret.value ? JS_PROPERTY_WRITABLE : JS_PROPERTY_NONE
  }

  if (JSHasProperty(ctx, value, 'get')) {
    const propValue = JSGetProperty(ctx, value, 'get')
    if (isExceptionValue(propValue)) {
      return null
    }
    // TODO: check function
    desc.get = propValue
    desc.flags |= JS_PROPERTY_GETSET
  }

  if (JSHasProperty(ctx, value, 'set')) {
    const propValue = JSGetProperty(ctx, value, 'set')
    if (isExceptionValue(propValue)) {
      return null
    }
    // TODO: check function
    desc.set = propValue
    desc.flags |= JS_PROPERTY_GETSET
  }

  // TODO: check get/set and value cannot using together

  return desc
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

export function JSNewObjectProtoClass(ctx: Context, proto: JSValue, type: number) {
  return JSNewObject(ctx, proto, type)
}

export function JSNewPlainObjectProto(ctx: Context, proto: JSValue) {
  return JSNewObject(ctx, proto, JSObjectType.Object)
}

export function JSNewForInIteratorObject(ctx: Context, value: JSValue): JSValue {
  const keys: JSAtom[] = []
  if (!isObjectValue(value)) {
    return JSThrowTypeError(ctx, `value is not a object`)
  }
  let obj: JSObject | null = value.value
  while (obj) {
    keys.push(...Array.from(obj.props.keys()))
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
      // TODO: symbol
      return createStringValue(data.keys[data.pos] as string)
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

export function jsPropertyToDescValue(ctx: Context, pr: Property): JSValue {
  const desc = JSNewPlainObject(ctx)
  JSDefinePropertyValue(ctx, desc, 'configurable', createBoolValue(pr.configure), JS_PROPERTY_C_W_E)
  JSDefinePropertyValue(ctx, desc, 'enumerable', createBoolValue(pr.enumerable), JS_PROPERTY_C_W_E)
  if (pr.getset) {
    JSDefinePropertyValue(ctx, desc, 'get', pr.getter, JS_PROPERTY_C_W_E)
    JSDefinePropertyValue(ctx, desc, 'set', pr.setter, JS_PROPERTY_C_W_E)
  } else {
    JSDefinePropertyValue(ctx, desc, 'writable', createBoolValue(pr.writable), JS_PROPERTY_C_W_E)
    JSDefinePropertyValue(ctx, desc, 'value', pr.value, JS_PROPERTY_C_W_E)
  }

  return desc
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

  if (obj.type === JSObjectType.Array && prop === 'length') {
    // TODO
    const obj1 = obj as JSArrayObject
    obj1.data.length = (value as JSNumberValue).value
    return 0
  }

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

export function JSDefinePropertyDesc(
  ctx: Context,
  objValue: JSValue,
  prop: JSAtom,
  descVal: JSValue,
  extraFlags: number = 0
): number {
  const desc = jsValueToPropertyDesc(ctx, descVal)
  if (!desc) {
    return -1
  }
  return JSDefineProperty(ctx, objValue, prop, desc.value, desc.get, desc.set, desc.flags | extraFlags)
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

  if (obj.type === JSObjectType.Array) {
    const data = (obj as JSArrayObject).data
    const originalValue = data[prop]
    if (originalValue === undefined) {
      // markit as used
      data[prop] = true
    }
  }

  return 0
}

export function JSGetProperty(ctx: Context, obj: JSValue, prop: JSAtom) {
  return getPropertyLikeJS(ctx, obj, prop, obj, false)
}

export function JSGetOwnPropertyDescValue(ctx: Context, objValue: JSValue, prop: JSAtom) {
  if (!isObjectValue(objValue)) {
    return JS_UNDEFINED
  }
  const obj = objValue.value
  const pr = findOwnProperty(ctx, obj, prop)
  if (!pr) {
    return JS_UNDEFINED
  }
  return jsPropertyToDescValue(ctx, pr)
}

export function getPropertyLikeJS(
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

  if (o.type === JSObjectType.Array) {
    const data = (o as JSArrayObject).data
    if (prop === 'length') {
      return createNumberValue(data.length)
    }
    // TODO: remove any
    if ((data as any)[prop] === true) {
      // TODO: remove error
      // @ts-expect-error
      return o.props.get(prop).value
    }

    // fallback to normal object
  }

  const p = findProperty(ctx, o, prop)
  if (!p) {
    if (throwError) {
      return JSThrowReferenceErrorNotDefine(ctx, prop)
    }
    return JS_UNDEFINED
  }

  if (p.getset) {
    debug('- call getset')
    return callInternal(ctx, p.getter, objValue, JS_UNDEFINED, [])
  } else {
    return p.value
  }
}

export function JSHasProperty(ctx: Context, value: JSValue, prop: JSAtom): boolean {
  if (!isObjectValue(value)) {
    return false
  }
  return !!findProperty(ctx, value.value, prop)
}

export function JSHasOwnProperty(ctx: Context, value: JSValue, prop: JSAtom): boolean {
  if (!isObjectValue(value)) {
    return false
  }
  return !!findOwnProperty(ctx, value.value, prop)
}

export function jsFindOwnProperty(ctx: Context, value: JSValue, prop: JSAtom): Property | null {
  if (!isObjectValue(value)) {
    return null
  }
  return findOwnProperty(ctx, value.value, prop)
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
    return findProperty(ctx, proto, prop)
  }

  return null
}

export function JSNewObjectFromCtor(ctx: Context, ctor: JSValue, type: number) {
  let proto: JSValue
  if (ctor === JS_UNDEFINED) {
    proto = ctx.protos[type]
  } else {
    proto = JSGetProperty(ctx, ctor, 'prototype')
    if (isExceptionValue(proto)) {
      return proto
    }
  }
  return JSNewObjectProtoClass(ctx, proto, type)
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

export function JSInitBasicPrototype(ctx: Context) {
  const objProto = (ctx.objProto = ctx.protos[JSObjectType.Object] = JSNewObject(ctx, JS_NULL, JSObjectType.Object))

  ctx.fnProto = ctx.protos[JSObjectType.Function] = JSNewHostFunctionWithProto(
    ctx,
    emptyFn,
    'Function',
    0,
    objProto,
    HostFunctionType.ConstructorOrFunction
  )

  JSInitErrorProto(ctx)

  const arrayProto = (ctx.protos[JSObjectType.Array] = JSNewObject(ctx, objProto, JSObjectType.Array))
  setObjectData(arrayProto.value as JSArrayObject, [] as unknown[] as unknown[] & Record<JSAtom, unknown>)
}

function convertPropsToObject(props: Map<JSAtom, Property>, transferedSets: WeakSet<object>) {
  return Object.fromEntries(
    Array.from(props.entries())
      .filter(([_, desc]) => desc.enumerable)
      .map(([prop, desc]) => [prop, toHostValue(desc.value, transferedSets)])
  )
}

export function toHostObject(obj: JSObject, transferedSets: WeakSet<object>) {
  if (transferedSets.has(obj)) {
    return `<circle_object>`
  }
  transferedSets.add(obj)
  switch (obj.type) {
    case JSObjectType.Object:
      return convertPropsToObject(obj.props, transferedSets)
    case JSObjectType.Error:
      return new Error(`${toHostValue(obj.props.get('message')!.value, transferedSets) as string}`)
    case JSObjectType.Array:
      return (obj.props as unknown as any[]).map((v) => (v ? toHostValue(v.value, transferedSets) : v))
    case JSObjectType.Function:
      return `[object Function]`
    case JSObjectType.Arguments: {
      const o = convertPropsToObject(obj.props, transferedSets)
      o.__TYPE__ = 'arguments'
      return o
    }
    default: {
      return { __INTERNAL__: `Unknown object type ${obj.type}` }
    }
  }
}

export function JSNewArgumentsObjectWithArgs(ctx: Context, args: JSValue[]) {
  const obj = JSNewObject(ctx, ctx.objProto, JSObjectType.Arguments)
  JSDefinePropertyValue(ctx, obj, 'length', createNumberValue(args.length), JS_PROPERTY_C_W)
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    // TODO: handle error?
    JSDefinePropertyValue(ctx, obj, JSHostValueToAtom(ctx, i), arg, JS_PROPERTY_C_W_E)
  }

  return obj
}

export function JSValueIsArrayObject(ctx: Context, value: JSValue): boolean {
  // TODO: handle proxy
  return isObjectValue(value) && value.value.type === JSObjectType.Array
}

export function JSDeleteProp(ctx: Context, objValue: JSValue, prop: JSAtom): boolean {
  const obj = JSToObject(ctx, objValue)
  if (isExceptionValue(obj)) {
    return false
  }
  const ret = deleteProperty(ctx, obj.value, prop)
  if (ret) {
    return true
  }
  JSThrowTypeError(ctx, `could not delete "${String(prop)}" property`)
  return false
}

function deleteProperty(ctx: Context, obj: JSObject, prop: JSAtom): boolean {
  const pr = findOwnProperty(ctx, obj, prop)
  if (pr) {
    if (!pr.configure) {
      return false
    }
    obj.props.delete(prop)

    if (obj.type === JSObjectType.Array) {
      const data = (obj as JSArrayObject).data
      if (data[prop] === true) {
        delete data[prop]
      }
    }

    return true
  }

  return true
}

// check a is prototype of b
export function isPrototypeOf(a: JSObject, b: JSObject) {
  while (a.proto !== b && a.proto) {
    a = a.proto
  }
  return a.proto === b
}
