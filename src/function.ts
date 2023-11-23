import { Context } from "./context";
import { JSBaseObject, JSHostFunctionObject, JSObjectType, JSPlainObject, makeObject, newObjectFromProto } from "./object";
import { JSObjectValue, JSValue } from "./value";

export type HostFunction = (ctx: Context, thisObj: JSValue, args: JSValue[]) => JSValue

export function newHostFunctionValueWithProto(ctx: Context, hostFn: HostFunction, fnName: string, argLength: number, proto: JSValue): JSObjectValue {
  const obj = newObjectFromProto(ctx, proto, JSObjectType.HostFunction) as JSPlainObject;
  const hostFnObj: JSHostFunctionObject = {
    ...obj,
    fn: hostFn,
    rt: ctx.runtime
  }

  return makeObject(hostFnObj)
}
