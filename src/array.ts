import { Context } from './context'
import { JSValue } from './value'
import { JSArrayObject, JSObjectType, getProtoObject, makeObject } from './object'

export function JSNewArray(ctx: Context): JSValue {
  const arrObj: JSArrayObject = {
    type: JSObjectType.Array,
    props: new Map(),
    proto: getProtoObject(ctx, ctx.protos[JSObjectType.Array]),
    data: [],
  }
  return makeObject(arrObj)
}
