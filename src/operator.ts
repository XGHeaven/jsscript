import { Context } from './context'
import { JSToNumber, JSToPrimitive, JSToString } from './conversion'
import {
  JSHostValue,
  JSValue,
  createHostValue,
  createNumberValue,
  createStringValue,
  isExceptionValue,
  isStringValue,
  isUseHostValue,
} from './value'

type HostValueOperationHandler = (left: JSHostValue, right: JSHostValue) => JSValue

const addOperationHandler: HostValueOperationHandler = (left, right) => {
  return createHostValue((left.value as number) + (right.value as number))
}

export function JSAddOperator(ctx: Context, left: JSValue, right: JSValue) {
  return JSStringOrNumberBinaryOperator(ctx, left, right, addOperationHandler)
}

export function JSStringOrNumberBinaryOperator(
  ctx: Context,
  left: JSValue,
  right: JSValue,
  handler: HostValueOperationHandler
) {
  if (isUseHostValue(left) && isUseHostValue(right)) {
    return handler(left, right)
  }

  const leftPri = JSToPrimitive(ctx, left)
  if (isExceptionValue(leftPri)) {
    return leftPri
  }

  const rightPri = JSToPrimitive(ctx, right)
  if (isExceptionValue(rightPri)) {
    return rightPri
  }

  if (isStringValue(leftPri) || isStringValue(rightPri)) {
    const leftStr = JSToString(ctx, leftPri)
    if (isExceptionValue(leftStr)) {
      return leftStr
    }
    const rightStr = JSToString(ctx, rightPri)
    if (isExceptionValue(rightStr)) {
      return rightStr
    }

    return createStringValue(leftStr.value + rightStr.value)
  }

  // TODO: using to numberic
  const leftNum = JSToNumber(ctx, leftPri)
  if (isExceptionValue(leftNum)) {
    return leftNum
  }
  const rightNum = JSToNumber(ctx, rightPri)
  if (isExceptionValue(rightNum)) {
    return rightNum
  }

  return createNumberValue(leftNum.value + rightNum.value)
}
