import { callInternal } from './executor'
import { StackFrame } from './frame'
import { Runtime } from './runtime'
import { JSValue, JS_UNDEFINED, JS_NULL, JSObjectValue, JS_NAN, JS_INFINITY } from './value'
import {
  JSDefinePropertyValue,
  JSNewPlainObject,
  JSObject,
  JS_PROPERTY_CONFIGURE,
  JS_PROPERTY_C_W_E,
  initPrototype,
} from './object'
import { JSAtom } from './atom'
import { initMath } from './builtin/Math'
import { initNumber } from './builtin/Number'

export class Context {
  globalValue: JSValue
  globalObject: JSObject

  currentStackFrame: StackFrame | null = null

  protos: JSValue[] = []

  fnProto: JSValue = JS_NULL

  objProto: JSValue = JS_NULL

  nativeErrorProtos: JSValue[] = []

  constructor(public runtime: Runtime) {
    initPrototype(this)

    this.globalValue = JSNewPlainObject(this)
    this.globalObject = (this.globalValue as JSObjectValue).value

    JSDefinePropertyValue(this, this.globalValue, 'global', this.globalValue, JS_PROPERTY_C_W_E)
    JSDefinePropertyValue(this, this.globalValue, 'NaN', JS_NAN, JS_PROPERTY_CONFIGURE)
    JSDefinePropertyValue(this, this.globalValue, 'Infinity', JS_INFINITY, JS_PROPERTY_CONFIGURE)

    initMath(this)
    initNumber(this)
  }

  run(fn: JSValue) {
    return callInternal(this, fn, JS_UNDEFINED, JS_UNDEFINED, [])
  }

  defineGlobalValue(name: JSAtom, value: JSValue) {
    JSDefinePropertyValue(this, this.globalValue, name, value, JS_PROPERTY_C_W_E)
  }
}
