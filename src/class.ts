import { Context } from './context'
import { JSThrowTypeError } from './error'
import { HostFunctionType } from './function'
import { getObjectData as getObjectData, JSHostFunctionObject, JSObjectType } from './object'
import { Runtime } from './runtime'
import { JSObjectValue, JSValue, JS_UNDEFINED } from './value'

export interface JSClassExoticMethods {
  // TODO: return JSDescriptor
  getOwnProperty?: (ctx: Context, obj: JSValue, prop: string) => {}
  hasProperty?: (ctx: Context, obj: JSValue, prop: string) => boolean
  // TODO: others
}

export type JSClassCall = (ctx: Context, fnObj: JSValue, thisObj: JSValue, args: JSValue[], isNew: boolean) => JSValue

export interface JSClassDefine {
  type: number
  name: string
  exotic: JSClassExoticMethods | null
  call: JSClassCall | null
}

const hostFunctionCallHandler: JSClassCall = (ctx, fnObj, thisObj, args, isNew) => {
  const obj = (fnObj as JSObjectValue).value as JSHostFunctionObject
  const data = getObjectData(obj)
  const hostFn = data.fn

  let thisOrTarget: JSValue
  switch (data.type) {
    case HostFunctionType.Constructor:
      if (!isNew) return JSThrowTypeError(ctx, 'must be called with new')
      thisOrTarget = fnObj
      break
    case HostFunctionType.ConstructorOrFunction:
      thisOrTarget = isNew ? fnObj : JS_UNDEFINED
      break
    case HostFunctionType.Function:
      if (isNew) return JSThrowTypeError(ctx, 'not a constructor')
      thisOrTarget = thisObj
      break
  }

  if (args.length < data.argc) {
    for (let i = args.length; i < data.argc; i++) {
      args.push(JS_UNDEFINED)
    }
  }

  const returnValue = hostFn(ctx, thisOrTarget, args)
  return returnValue
}

function X(type: number, name: string, exotic: JSClassExoticMethods | null, call: JSClassCall | null): JSClassDefine {
  return { type, name, exotic, call }
}

const configs = [
  X(JSObjectType.Object, 'Object', null, null),
  X(JSObjectType.HostFunction, 'Function', null, hostFunctionCallHandler),
  X(JSObjectType.Function, 'Function', null, null),
  X(JSObjectType.Array, 'Array', null, null),
]

export function initClasses(rt: Runtime) {
  configs.forEach((config) => {
    rt.classes[config.type] = config
  })
}
