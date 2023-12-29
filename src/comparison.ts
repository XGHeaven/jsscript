import { Context } from './context'
import { JSThrowTypeError } from './error'
import { JSGetProperty } from './object'
import { JSObjectValue, JSValue, isExceptionValue, isObjectValue, isUseHostValue } from './value'

export function isStrictEqual(left: JSValue, right: JSValue): boolean {
  if (left.type !== right.type) {
    return false
  }

  if (isUseHostValue(left) && isUseHostValue(right)) {
    return left.value === right.value
  }

  return sameValueNonNumber(left, right)
}

export function sameValueNonNumber(left: JSValue, right: JSValue): boolean {
  // ASSERT: left must not be number
  // ASSERT: left.type === right.type
  // ASSERT: left and right is not host value
  return (left as JSObjectValue).value === (right as JSObjectValue).value
}

export function JSInstanceOf(ctx: Context, objVal: JSValue, targetVal: JSValue): number {
  if (!isObjectValue(targetVal)) {
    JSThrowTypeError(ctx, 'instanceof is not object')
    return -1
  }

  const ret = JSOrdinaryHasInstance(ctx, targetVal, objVal)
  if (ret < -1) {
    return -1
  }

  return ret
}

export function JSOrdinaryHasInstance(ctx: Context, ctorVal: JSObjectValue, objVal: JSValue): number {
  if (!isObjectValue(objVal)) {
    return 0
  }

  const prototype = JSGetProperty(ctx, ctorVal, 'prototype')
  if (isExceptionValue(prototype)) {
    return -1
  }
  if (!isObjectValue(prototype)) {
    JSThrowTypeError(ctx, 'prototype is not a object')
    return -1
  }
  const proto = prototype.value
  let obj = objVal.value
  while (true) {
    const objProto = obj.proto
    if (!objProto) {
      return 0
    }
    if (proto === objProto) {
      return 1
    }
    obj = objProto
  }
}
