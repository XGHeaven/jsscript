import { Context } from '../context'
import { JSThrowTypeError } from '../error'
import { callInternal } from '../executor'
import { HostFunction } from '../function'
import { JS_UNDEFINED } from '../value'
import { JSApplyPropertyDefinitions, PropertyDefinitions, defHostFunction } from './helper'

const fnProtoApply: HostFunction = (ctx, thisVal, args) => {
  return JSThrowTypeError(ctx, 'Unsupported apply')
}

const fnProtoCall: HostFunction = (ctx, thisVal, args) => {
  return callInternal(ctx, thisVal, args[0], JS_UNDEFINED, args.slice(1))
}

const fnProtoPropertyDefs: PropertyDefinitions = [
  defHostFunction('call', fnProtoCall, 1),
  defHostFunction('apply', fnProtoApply, 1),
]

export function JSAddBuiltinFunction(ctx: Context) {
  const fnProto = ctx.fnProto
  JSApplyPropertyDefinitions(ctx, fnProto, fnProtoPropertyDefs)
}
