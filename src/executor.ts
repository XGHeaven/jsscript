import { Context } from './context'
import {
  JSValue,
  JSValueType,
  JS_UNDEFINED,
  isUseHostValue,
  createHostValue,
  formatValue,
  JS_EXCEPTION,
  isValueTruly,
  valueToString,
  isExceptionValue,
  createBoolValue,
  createTryContextValue,
  isTryContextValue,
  JSTypeOf,
  typeofValue,
} from './value'
import { Bytecode } from './bytecode'
import { createStackFrame } from './frame'
import {
  JSDefinePropertyValue,
  JSFunctionObject,
  JSGetProperty,
  JSGetPropertyValue,
  JSIteratorObjectNext,
  JSNewForInIteratorObject,
  JSNewPlainObject,
  JSObjectType,
  JSSetPropertyValue,
  JS_PROPERTY_C_W_E,
  getObjectData,
  newArrayValue,
} from './object'
import { Scope } from './scope'
import { JSThrow, JSThrowTypeError } from './error'
import { JSAtom } from './atom'
import { JSNewFunctionObject } from './function'
import { debug } from './log'
import { JSToNotBoolean, JSToNumber } from './conversion'

export function callInternal(
  ctx: Context,
  fnValue: JSValue,
  thisValue: JSValue,
  newTarget: JSValue,
  args: JSValue[]
): JSValue {
  // TODO: create args binding
  if (fnValue.type !== JSValueType.Object) {
    return JSThrowTypeError(ctx, `${typeofValue(ctx, fnValue)} not a function`)
  }
  const obj = fnValue.value as JSFunctionObject
  if (obj.type !== JSObjectType.Function) {
    const callFn = ctx.runtime.classes[obj.type].call
    if (callFn) {
      return callFn(ctx, fnValue, thisValue, args, false)
    }
    return JSThrowTypeError(ctx, `not a function`)
  }

  const frame = createStackFrame(ctx, obj)
  frame.parentFrame = ctx.currentStackFrame
  ctx.currentStackFrame = frame
  let pc = 0
  let sp = 0
  const data = getObjectData(obj)
  const fbc = data.body
  const ops = fbc.codes
  const v = frame.values
  let scope = frame.scope

  for (let i = 0; i < fbc.scopeNames[0][0].length; i++) {
    scope.bind(fbc.scopeNames[0][0][i], {})
  }
  for (let i = 0; i < fbc.scopeNames[0][1].length; i++) {
    scope.bind(fbc.scopeNames[0][1][i], { isConst: true })
  }

  for (; pc < ops.length; ) {
    if (sp < 0) {
      throw new Error(`sp is not negative, now is ${sp}`)
    }
    const op = ops[pc++]
    debug(`${(Bytecode as any)[op as any]}(${op})\t${pc} ${sp}`)
    switch (op) {
      case Bytecode.PushConst:
        debug(`\tvalue=${ops[pc]}`)
        v[++sp] = createHostValue(ops[pc++] as any)
        break
      case Bytecode.PushVoid: {
        v[++sp] = JS_UNDEFINED
        break
      }
      case Bytecode.Plus: {
        const l = v[sp--]
        const r = v[sp]
        if (isUseHostValue(l) && isUseHostValue(r)) {
          v[sp] = createHostValue((l.value as any) + (r.value as any))
        } else {
          // TODO: slow add
          v[sp] = createHostValue(-1)
        }
        break
      }
      case Bytecode.Sub: {
        const a = v[sp--]
        const b = v[sp]
        if (isUseHostValue(a) && isUseHostValue(b)) {
          v[sp] = createHostValue((a.value as number) - (b.value as number))
        } else {
          // TODO: slow sub
          v[sp] = createHostValue(-1)
        }
        break
      }
      case Bytecode.Goto: {
        pc = ops[pc] as number
        debug(`\tgoto ${pc}`)
        break
      }
      case Bytecode.Call:
      case Bytecode.CallMethod: {
        const argc = ops[pc++] as number
        const args = v.slice(sp - argc + 1, sp + 1)
        debug(`\tfn=${formatValue(v[sp - argc])}`)
        debug(`\targc=${argc}`)
        args.forEach((arg, i) => debug(`\targ${i}=${formatValue(arg)}`))
        sp -= argc
        const fnValue = v[sp]
        const thisValue = op === Bytecode.CallMethod ? v[--sp] : JS_UNDEFINED
        const returnValue = callInternal(ctx, fnValue, thisValue, JS_UNDEFINED, args)
        debug(`\tCallReturn: ${formatValue(returnValue)}`)
        if (!isExceptionValue(returnValue)) {
          v[sp] = returnValue
        }
        break
      }
      case Bytecode.Return: {
        ctx.currentStackFrame = frame.parentFrame
        return v[sp]
      }
      case Bytecode.GetVar: {
        const name = ops[pc++] as string
        const value = scope.get(name)
        if (value) {
          v[++sp] = value
          debug(`\t${name}=${formatValue(value!)}`)
        } else {
          const globalValue = JSGetProperty(ctx, ctx.globalValue, name, JS_UNDEFINED, true)
          if (!isExceptionValue(globalValue)) {
            debug(`\tglobal ${name}=${formatValue(globalValue)}`)
            v[++sp] = globalValue
          }
        }
        break
      }
      case Bytecode.GetVarFromArg: {
        const argi = ops[pc++] as number
        if (argi >= args.length) {
          v[++sp] = JS_UNDEFINED
        } else {
          v[++sp] = args[argi]
        }
        debug(`\ti=${argi} v=${formatValue(v[sp])}`)
        break
      }
      case Bytecode.PushScope: {
        const scopeId = ops[pc++] as number
        const newScope = Scope.newChild(scope)
        const scopeConfig = fbc.scopeNames[scopeId]
        for (let i = 0; i < scopeConfig[0].length; i++) {
          newScope.bind(scopeConfig[0][i], {})
        }
        for (let i = 0; i < scopeConfig[1].length; i++) {
          newScope.bind(scopeConfig[1][i], { isConst: true })
        }
        scope = newScope
        break
      }
      case Bytecode.PopScope: {
        // TODO: check
        scope = scope.parent!
        break
      }
      case Bytecode.SetVar: {
        const name = ops[pc++] as string
        scope.set(name, v[sp])
        debug(`\t${name}=${formatValue(v[sp])}`)
        break
      }
      case Bytecode.Object: {
        v[++sp] = JSNewPlainObject(ctx)
        break
      }
      case Bytecode.DefineField: {
        const name = ops[pc++] as string
        const ret = JSDefinePropertyValue(ctx, v[sp - 1], name, v[sp--], JS_PROPERTY_C_W_E)
        debug(`\t${ret}`)
        if (ret) {
          JSThrowTypeError(ctx, `Cannot define value of ${name}`)
        }
        break
      }
      case Bytecode.SetField: {
        const name = ops[pc++] as string
        // @ts-expect-error
        const ret = JSSetPropertyValue(ctx, v[sp--], name, v[sp])
        // TODO
        break
      }
      case Bytecode.DefineArrayElement: {
        const value = v[sp--]
        const name = valueToString(v[sp--])
        // @ts-expect-error
        const ret = JSDefinePropertyValue(ctx, v[sp], name, value, JS_PROPERTY_C_W_E)
        // TODO: ret
        break
      }
      case Bytecode.GetAarryElement: {
        const prop = valueToString(v[sp--])
        const obj = v[sp]
        const val = JSGetPropertyValue(ctx, obj, prop)
        if (!isExceptionValue(val)) {
          v[++sp] = val
        }
        break
      }
      case Bytecode.GetArrayElementReplace: {
        const prop = valueToString(v[sp--])
        const obj = v[sp]
        const val = JSGetPropertyValue(ctx, obj, prop)
        if (!isExceptionValue(val)) {
          v[++sp] = val
        }
        break
      }
      case Bytecode.GetField: {
        const name = ops[pc++] as string
        const val = JSGetPropertyValue(ctx, v[sp], name)
        if (!isExceptionValue(val)) {
          v[++sp] = val
        }
        break
      }
      case Bytecode.GetFieldReplace: {
        const name = ops[pc++] as JSAtom
        const val = JSGetPropertyValue(ctx, v[sp], name)
        if (!isExceptionValue(val)) {
          v[sp] = val
        }
        break
      }
      case Bytecode.NewFn: {
        const index = ops[pc++] as number
        v[++sp] = JSNewFunctionObject(ctx, fbc.children[index], scope)
        break
      }
      case Bytecode.ArrayFrom: {
        const argc = ops[pc++] as number
        const array = newArrayValue(ctx)
        for (let i = argc - 1; i >= 0; i--) {
          JSDefinePropertyValue(ctx, array, argc - 1 - i, v[sp - i], JS_PROPERTY_C_W_E)
        }
        sp -= argc
        v[sp] = array
        break
      }
      case Bytecode.Drop: {
        sp--
        break
      }
      case Bytecode.Dup: {
        v[sp + 1] = v[sp]
        sp++
        break
      }
      case Bytecode.IfFalse: {
        const pos = ops[pc++] as number
        debug(`\tvalue=${formatValue(v[sp])}`)
        if (!isValueTruly(v[sp--])) {
          debug(`\tgoto ${pos}`)
          pc = pos
        }
        break
      }
      case Bytecode.IfTrue: {
        const pos = ops[pc++] as number
        if (isValueTruly(v[sp--])) {
          debug(`\goto ${pos}`)
          pc = pos
        }
        break
      }
      // skip
      case Bytecode.Label: {
        pc++
        break
      }
      case Bytecode.ForInStart: {
        const value = JSNewForInIteratorObject(ctx, v[sp])
        debug(`\t${formatValue(value)}`)
        if (!isExceptionValue(value)) {
          v[sp] = value
        }
        break
      }
      case Bytecode.ForIterNextOrGoto: {
        const pos = ops[pc++] as number
        const next = JSIteratorObjectNext(ctx, v[sp])
        if (!next) {
          // end, goto
          pc = pos
          debug(`\tgoto=${pos}`)
        } else {
          v[++sp] = next
          debug(`\t${formatValue(next)}`)
        }
        break
      }
      case Bytecode.EqEqEq: {
        const a = v[sp--]
        const b = v[sp]
        if (isUseHostValue(a) && isUseHostValue(b)) {
          v[sp] = createBoolValue(a.value === b.value)
        } else {
          // TODO: slow compare
          v[sp] = createBoolValue(false)
        }
        debug(`\t${formatValue(a)} "===" ${formatValue(b)} = ${formatValue(v[sp])}`)
        break
      }
      case Bytecode.EqEq: {
        const b = v[sp--]
        const a = v[sp]
        if (isUseHostValue(a) && isUseHostValue(b)) {
          v[sp] = createBoolValue(a.value == b.value)
        } else {
          // TODO: slow compare
          v[sp] = createBoolValue(false)
        }
        break
      }
      case Bytecode.Not: {
        v[sp] = JSToNotBoolean(ctx, v[sp])
        break
      }
      case Bytecode.Gt: {
        const b = v[sp--]
        const a = v[sp]
        let ret: boolean
        if (isUseHostValue(a) && isUseHostValue(b)) {
          ret = (a.value as number) > (b.value as number)
        } else {
          ret = false
        }
        v[sp] = createBoolValue(ret)
        break
      }
      case Bytecode.Ge: {
        const b = v[sp--]
        const a = v[sp]
        let ret: boolean
        if (isUseHostValue(a) && isUseHostValue(b)) {
          ret = (a.value as number) >= (b.value as number)
        } else {
          ret = false
        }
        v[sp] = createBoolValue(ret)
        break
      }
      case Bytecode.Lt: {
        const b = v[sp--]
        const a = v[sp]
        let ret: boolean
        if (isUseHostValue(a) && isUseHostValue(b)) {
          ret = (a.value as number) < (b.value as number)
        } else {
          ret = false
        }
        v[sp] = createBoolValue(ret)
        break
      }
      case Bytecode.Le: {
        const b = v[sp--]
        const a = v[sp]
        let ret: boolean
        if (isUseHostValue(a) && isUseHostValue(b)) {
          ret = (a.value as number) <= (b.value as number)
        } else {
          ret = false
        }
        v[sp] = createBoolValue(ret)
        break
      }
      case Bytecode.Neg: {
        const value = v[sp]
        if (isUseHostValue(value)) {
          // TODO: remove !
          v[sp] = createHostValue(-value.value!)
        } else {
          v[sp] = createHostValue(-1)
        }
        break
      }
      case Bytecode.ToNumber: {
        v[sp] = JSToNumber(ctx, v[sp])
        break
      }
      case Bytecode.Throw: {
        JSThrow(ctx, v[sp--])
        break
      }
      case Bytecode.TryContext: {
        const currentScope = scope
        const pos = ops[pc++] as number
        v[sp++] = createTryContextValue(pos, currentScope)
        break
      }
      case Bytecode.Div: {
        const b = v[sp--]
        const a = v[sp]
        let ret: any
        if (isUseHostValue(a) && isUseHostValue(b)) {
          ret = (a.value as number) / (b.value as number)
        } else {
          // TODO
          ret = 0
        }
        v[sp] = createHostValue(ret)
        break
      }
      case Bytecode.AndAnd: {
        const b = v[sp--]
        const a = v[sp]
        let ret: any
        if (isUseHostValue(a) && isUseHostValue(b)) {
          ret = a.value && b.value
        } else {
          // TODO
          ret = false
        }
        v[sp] = createHostValue(ret)
        break
      }
      case Bytecode.OrOr: {
        const b = v[sp--]
        const a = v[sp]
        let ret: any
        if (isUseHostValue(a) && isUseHostValue(b)) {
          ret = a.value || b.value
        } else {
          // TODO
          ret = false
        }
        v[sp] = createHostValue(ret)
        break
      }
      case Bytecode.TypeOf: {
        v[sp] = JSTypeOf(ctx, v[sp])
        break
      }
      case Bytecode.PushThis: {
        v[++sp] = thisValue
        break
      }
      case Bytecode.Warning: {
        console.warn(`Warning: ${ops[pc++]}`)
        break
      }
      default: {
        throw new Error(`Unsupport opcode: ${(Bytecode as any)[op as any]} ${op}`)
      }
    }

    if (ctx.runtime.currentException) {
      let resume = false
      while (sp >= 0) {
        const val = v[sp--]
        if (isTryContextValue(val)) {
          const { value, scope: targetScope } = val
          while (scope && scope !== targetScope) scope = scope.parent!
          pc = value
          v[++sp] = ctx.runtime.currentException!
          ctx.runtime.currentException = null
          resume = true
          break
        }
      }
      if (resume) {
        continue
      }
      ctx.currentStackFrame = frame.parentFrame
      return JS_EXCEPTION
    }
  }
  ctx.currentStackFrame = frame.parentFrame
  // debug(v.slice(0, 4))
  return v[sp + 1]
}
