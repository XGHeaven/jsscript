import { Context } from '../context'
import { JSToNumber } from '../conversion'
import { JSThrowTypeError } from '../error'
import { HostFunction, JSNewHostConstructor } from '../function'
import { JSNewObjectFromCtor, JSObjectType, JSNewObject, setObjectData, JSNumberObject, getObjectData } from '../object'
import {
  JSExpectionValue,
  JSNumberValue,
  JSValue,
  JS_UNDEFINED,
  createHostValue,
  createNumberValue,
  isExceptionValue,
  isNumberValue,
  isObjectValue,
  isUndefinedValue,
} from '../value'
import {
  defHostFunction,
  PropertyDefinitions,
  JSApplyPropertyDefinitions,
  defHostValueImmutable,
  FilterTypeKeys,
} from './helper'

function getThisNumberValue(ctx: Context, thisValue: JSValue): JSNumberValue | JSExpectionValue {
  if (isNumberValue(thisValue)) {
    return thisValue
  }

  if (isObjectValue(thisValue)) {
    const obj = thisValue.value
    if (obj.type === JSObjectType.Number) {
      return getObjectData(obj as JSNumberObject)
    }
  }

  return JSThrowTypeError(ctx, 'not a number')
}

const numberProtoValueOf: HostFunction = (ctx, thisObj, args) => {
  return getThisNumberValue(ctx, thisObj)
}

const numberConstructor: HostFunction = (ctx, targetObj, args) => {
  let value: JSValue
  if (!args.length || isUndefinedValue(args[0])) {
    value = createNumberValue(0)
  } else {
    value = JSToNumber(ctx, args[0])
    if (isExceptionValue(value)) {
      return value
    }
  }

  if (targetObj !== JS_UNDEFINED) {
    const obj = JSNewObjectFromCtor(ctx, targetObj, JSObjectType.Number)
    if (!isExceptionValue(obj)) {
      setObjectData(obj.value as JSNumberObject, value)
    }
    return obj
  }

  return value
}

function defProtoFn<T extends keyof Number>(name: T) {
  const protoFn = (Number.prototype as any)[name]
  const length = protoFn.length
  const hostFn: HostFunction = (ctx, targetObj, args) => {
    const numVal = getThisNumberValue(ctx, targetObj)
    if (isExceptionValue(numVal)) {
      return numVal
    }
    const numArgs: (number | undefined)[] = []
    for (const arg of args) {
      if (isUndefinedValue(arg)) {
        numArgs.push(undefined)
        continue
      }
      const argNum = JSToNumber(ctx, arg)
      if (isExceptionValue(argNum)) {
        return numVal
      }
      numArgs.push(argNum.value)
    }

    let ret: number
    try {
      ret = protoFn.apply(numVal.value, numArgs)
      return createHostValue(ret)
    } catch (e) {
      // TODO: convert host error to vm error
      return JSThrowTypeError(ctx, `Run number fn "${name}" error: ${(e as any)?.message}`)
    }
  }

  return defHostFunction(name, hostFn, length)
}

function defNumberValue<T extends FilterTypeKeys<NumberConstructor, number>>(name: T) {
  return defHostValueImmutable(name, Number[name])
}

const NumberProtoFunctions: PropertyDefinitions = [
  defHostFunction('valueOf', numberProtoValueOf, 0),
  defProtoFn('toString'),
  defProtoFn('toLocaleString'),
  defProtoFn('toFixed'),
  defProtoFn('toExponential'),
  defProtoFn('toPrecision'),
]

const NumberProperties: PropertyDefinitions = [
  defNumberValue('EPSILON'),
  defNumberValue('MAX_SAFE_INTEGER'),
  defNumberValue('MAX_VALUE'),
  defNumberValue('MIN_SAFE_INTEGER'),
  defNumberValue('MIN_VALUE'),
  defNumberValue('NEGATIVE_INFINITY'),
  defNumberValue('NaN'),
  defNumberValue('POSITIVE_INFINITY'),
]

export function JSAddBuiltinNumber(ctx: Context) {
  const proto = (ctx.protos[JSObjectType.Number] = JSNewObject(
    ctx,
    ctx.protos[JSObjectType.Object],
    JSObjectType.Number
  ))
  setObjectData(proto.value as JSNumberObject, createNumberValue(0))

  JSApplyPropertyDefinitions(ctx, proto, NumberProtoFunctions)

  const ctor = JSNewHostConstructor(ctx, numberConstructor, 'Number', 1, ctx.protos[JSObjectType.Number])

  JSApplyPropertyDefinitions(ctx, ctor, NumberProperties)

  ctx.defineGlobalValue('Number', ctor)
}
