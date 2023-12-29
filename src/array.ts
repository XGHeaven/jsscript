import { Context } from './context'
import { JSValue, createNumberValue } from './value'
import {
  JSArrayObject,
  JSDefinePropertyValue,
  JSObjectType,
  JS_PROPERTY_WRITABLE,
  getProtoObject,
  makeObject,
} from './object'
import { JSAtom } from './atom'

export function JSNewArray(ctx: Context): JSValue {
  const arrObj: JSArrayObject = {
    type: JSObjectType.Array,
    props: new Map(),
    proto: getProtoObject(ctx, ctx.protos[JSObjectType.Array]),
    data: [] as unknown[] as unknown[] & Record<JSAtom, unknown>,
  }
  const arrVal = makeObject(arrObj)

  JSDefinePropertyValue(ctx, arrVal, 'length', createNumberValue(0), JS_PROPERTY_WRITABLE)

  return arrVal
}
