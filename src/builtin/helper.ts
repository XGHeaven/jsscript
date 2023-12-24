import { JSAtom } from '../atom'
import { Context } from '../context'
import { HostFunction, HostFunctionType, JSNewHostFunction } from '../function'
import { JSDefinePropertyValue, JS_PROPERTY_C_W, JS_PROPERTY_NONE } from '../object'
import { JSValue, createHostValue } from '../value'

type FilterType2<O extends Record<any, any>, K extends keyof O, T> = K extends any
  ? O[K] extends T
    ? T extends O[K]
      ? K
      : never
    : never
  : never

export type FilterType<O extends Record<any, any>, T> = {
  [K in keyof O]: O[K] extends T ? (T extends O[K] ? O[K] : never) : never
}

export type FilterTypeKeys<O extends Record<any, any>, T> = FilterType2<O, keyof O, T>

enum DefineType {
  HostFunction,
  HostValue,
}

interface PropertyCommonDefintion {
  type: DefineType
  flags: number
  name: JSAtom
}

interface PropertyHostFunctionDefintion extends PropertyCommonDefintion {
  type: DefineType.HostFunction
  fn: HostFunction
  length: number
}

interface PropertyHostValueDefintion extends PropertyCommonDefintion {
  type: DefineType.HostValue
  value: string | number | undefined | boolean
}

type HostValue = string | number | undefined | boolean

export type PropertyDefinition = PropertyHostFunctionDefintion | PropertyHostValueDefintion

export type PropertyDefinitions = PropertyDefinition[]

export function defHostFunction(name: string, fn: HostFunction, length: number): PropertyHostFunctionDefintion {
  return {
    type: DefineType.HostFunction,
    name,
    fn,
    length,
    flags: JS_PROPERTY_C_W,
  }
}

export function defHostValue(name: string, value: HostValue): PropertyHostValueDefintion {
  return {
    type: DefineType.HostValue,
    name,
    value,
    flags: JS_PROPERTY_C_W,
  }
}

export function defHostValueImmutable(name: string, value: HostValue): PropertyHostValueDefintion {
  return {
    type: DefineType.HostValue,
    name,
    value,
    flags: JS_PROPERTY_NONE,
  }
}

export function JSApplyPropertyDefinitions(ctx: Context, obj: JSValue, defintions: PropertyDefinitions) {
  for (const def of defintions) {
    const { name, flags } = def
    let value: JSValue
    switch (def.type) {
      case DefineType.HostFunction: {
        value = JSNewHostFunction(ctx, def.fn, name as string, def.length, HostFunctionType.Function)
        break
      }
      case DefineType.HostValue: {
        value = createHostValue(def.value)
        break
      }
    }
    if (!value) {
      continue
    }
    JSDefinePropertyValue(ctx, obj, name, value, flags)
  }
}
