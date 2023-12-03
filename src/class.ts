import { Context } from "./context"
import { JSHostFunctionObject, JSObjectType } from "./object"
import { Runtime } from "./runtime"
import { JSObjectValue, JSValue } from "./value"

export interface JSClassExoticMethods {
  // TODO: return JSDescriptor
  getOwnProperty?: (ctx: Context, obj: JSValue, prop: string) => {}
  hasProperty?: (ctx: Context, obj: JSValue, prop: string) => boolean
  // TODO: others
}

export type JSClassCall = (ctx: Context, fnObj: JSValue, thisObj: JSValue, args: JSValue[], flags: number) => JSValue

export interface JSClassDefine {
  type: number
  name: string
  exotic: JSClassExoticMethods | null
  call: JSClassCall | null
}

const hostFunctionCallHandler: JSClassCall = (ctx, fnObj, thisObj, args) => {
  const obj = (fnObj as JSObjectValue).value as JSHostFunctionObject
  const hostFn = obj.fn
  const returnValue = hostFn(ctx, thisObj, args)
  return returnValue
}

function X(type: number, name: string, exotic: JSClassExoticMethods | null, call: JSClassCall | null): JSClassDefine {
  return {type, name, exotic, call}
}

const configs = [
  X(JSObjectType.Object, 'Object', null, null),
  X(JSObjectType.HostFunction, 'Function', null, hostFunctionCallHandler),
  X(JSObjectType.Function, 'Function', null, null),
  X(JSObjectType.Array, 'Array', null, null)
]

export function initClasses(rt: Runtime) {
  configs.forEach(config => {
    rt.classes[config.type] = config
  })
}
