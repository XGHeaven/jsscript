import * as t from '@babel/types'
import { Context } from './context';
import { JSValue, JSValueType, JS_UNDEFINED, isUseHostValue, createHostValue, formatValue, JS_EXCEPTION, isValueTruly, valueToString, isExceptionValue, JSInstrinsicValue, createBoolValue } from './value';
import { Bytecode } from './bytecode';
import { createStackFrame } from './frame';
import { JSDefinePropertyValue, JSFunctionObject, JSGetPropertyValue, JSIteratorObjectNext, JSNewForInIteratorObject, JSObjectType, JSSetPropertyValue, JS_PROPERTY_C_W_E, newArrayValue, newFunctionObject, newFunctionObjectValue as newFunctionValue, newObject, newObjectValue } from './object';
import { Scope } from './scope';
import { JSThrowReferenceError, JSThrowTypeError } from './error';
import { JSAtom } from './atom';

export function callInternal(ctx: Context, fnValue: JSValue, thisValue: JSValue, newTarget: JSValue, args: JSValue[]): JSValue {
  // TODO: create args binding
  if (fnValue.type !== JSValueType.Object) {
    return JSThrowTypeError(ctx, 'not a function');
  }
  const obj = fnValue.value as JSFunctionObject
  if (obj.type !== JSObjectType.Function) {
    const callFn = ctx.runtime.classes[obj.type].call
    if (callFn) {
      return callFn(ctx, fnValue, thisValue, args, 0);
    }
    return JSThrowTypeError(ctx, 'not a function');
  }

  const frame = createStackFrame(ctx, obj)
  frame.parentFrame = ctx.currentStackFrame
  ctx.currentStackFrame = frame
  let pc = 0
  let sp = 0
  const fbc = obj.body
  const ops = fbc.codes
  const v = frame.values
  let scope = frame.scope;

  for (let i = 0; i < fbc.scopeNames[0][0].length; i++) {
    scope.bind(fbc.scopeNames[0][0][i], { })
  }
  for (let i = 0; i < fbc.scopeNames[0][1].length; i++) {
    scope.bind(fbc.scopeNames[0][1][i], { isConst: true })
  }
  
  for (;pc < ops.length;) {
    if (sp < 0) {
      throw new Error(`sp is not negative, now is ${sp}`)
    }
    const op = ops[pc++]
    console.log((Bytecode as any)[op as any], `(${op}) pc=${pc} sp=${sp}`);
    switch(op) {
      case Bytecode.PushConst:
        v[++sp] = createHostValue(ops[pc++] as any)
        break
      case Bytecode.PushVoid: {
        v[++sp] = JS_UNDEFINED
        break;
      }
      case Bytecode.Plus: {
        const l = v[sp--]
        const r = v[sp--]
        if (isUseHostValue(l) && isUseHostValue(r)) {
          v[++sp] = createHostValue((l.value as any) + (r.value as any))
        } else {
          // TODO: slow add
        }
        break
      }
      case Bytecode.Goto: {
        pc = ops[pc] as number
        console.log(`\tgoto ${pc}`)
        break
      }
      case Bytecode.Call: {
        const argc = ops[pc++] as number
        const args = v.slice(sp - argc + 1, sp + 1)
        console.log(`\tfn=${formatValue(v[sp - argc])}`);
        console.log(`\targc=${argc}`)
        args.forEach((arg, i) => console.log(`\targ${i}=${formatValue(arg)}`))
        const fnLike = v[sp - argc];
        let fnValue: JSValue = fnLike
        let thisValue: JSValue = JS_UNDEFINED
        // if (isReferenceValue(fnLike)) {
        //   fnValue = fnLike.value
        //   thisValue = fnLike.host
        // } else {
        //   fnValue = fnLike
        //   thisValue = JS_UNDEFINED
        // }
        const value = callInternal(ctx, fnValue, thisValue, JS_UNDEFINED, args)
        v[++sp] = value
        break
      }
      case Bytecode.Return: {
        ctx.currentStackFrame = frame.parentFrame
        return v[sp]
      }
      case Bytecode.GetVar: {
        const name = ops[pc++] as string
        const value = scope.get(name);
        if (value) {
          v[++sp] = value;
          console.log(`\t${name}=${formatValue(value!)}`)
        } else {
          JSThrowReferenceError(ctx, `${name} is not defined`)
        }
        break
      }
      case Bytecode.GetVarFromArg: {
        const argi = ops[pc++] as number;
        if (argi >= args.length) {
          v[++sp] = JS_UNDEFINED
        } else {
          v[++sp] = args[argi]
        }
        console.log(`\ti=${argi} v=${formatValue(v[sp])}`)
        break;
      }
      case Bytecode.PushScope: {
        const scopeId = ops[pc++] as number
        const newScope = Scope.newChild(scope)
        const scopeConfig = fbc.scopeNames[scopeId]
        for (let i = 0; i < scopeConfig[0].length; i++) {
          newScope.bind(scopeConfig[0][i], { })
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
        console.log(`\t${name}=${formatValue(v[sp])}`)
        break
      }
      case Bytecode.Object: {
        v[++sp] = newObjectValue(ctx)
        break;
      }
      case Bytecode.DefineField: {
        const name = ops[pc++] as string
        const ret = JSDefinePropertyValue(ctx, v[sp-1], name, v[sp--], JS_PROPERTY_C_W_E);
        console.log(`\t${ret}`)
        if (ret) {
          JSThrowTypeError(ctx, `Cannot define value of ${name}`)
        }
        break;
      }
      case Bytecode.SetField: {
        const name = ops[pc++] as string
        const ret = JSSetPropertyValue(ctx, v[sp--], name, v[sp]);
        break;
      }
      case Bytecode.DefineArrayElement: {
        const value = v[sp--];
        const name = valueToString(v[sp--]);
        const ret = JSDefinePropertyValue(ctx, v[sp], name, value, JS_PROPERTY_C_W_E);
        // TODO: ret
        break;
      }
      case Bytecode.GetAarryElement: {
        const prop = valueToString(v[sp--]);
        const obj = v[sp];
        const val = JSGetPropertyValue(ctx, obj, prop)
        if (!isExceptionValue(val)) {
          v[++sp] = val
        }
        break;
      }
      case Bytecode.GetArrayElementReplace: {
        const prop = valueToString(v[sp--]);
        const obj = v[sp];
        const val = JSGetPropertyValue(ctx, obj, prop)
        if (!isExceptionValue(val)) {
          v[++sp] = val
        }
        break;
      }
      case Bytecode.GetField: {
        const name = ops[pc++] as string
        const val = JSGetPropertyValue(ctx, v[sp], name)
        if (!isExceptionValue(val)) {
          v[++sp] = val;
        }
        break;
      }
      case Bytecode.GetFieldReplace: {
        const name = ops[pc++] as JSAtom
        const val = JSGetPropertyValue(ctx, v[sp], name)
        if (!isExceptionValue(val)) {
          v[sp] = val;
        }
        break;
      }
      case Bytecode.NewFn: {
        const index = ops[pc++] as number
        v[++sp] = newFunctionValue(ctx, fbc.children[index], scope)
        break;
      }
      case Bytecode.ArrayFrom: {
        const argc = ops[pc++] as number
        const array = newArrayValue(ctx)
        for (let i = argc - 1; i >= 0; i--) {
          JSDefinePropertyValue(ctx, array, argc - 1 - i, v[sp - i], JS_PROPERTY_C_W_E)
        }
        sp -= argc
        v[sp] = array
        break;
      }
      case Bytecode.Drop: {
        sp--;
        break;
      }
      case Bytecode.IfFalse: {
        const pos = ops[pc++] as number
        if (!isValueTruly(v[sp--])) {
          console.log(`\goto ${pos}`)
          pc = pos;
        }
        break;
      }
      case Bytecode.IfTrue: {
        const pos = ops[pc++] as number
        if (isValueTruly(v[sp--])) {
          console.log(`\goto ${pos}`)
          pc = pos;
        }
        break;
      }
      // skip
      case Bytecode.Label: {
        pc++;
        break;
      }
      case Bytecode.ForInStart: {
        const value = JSNewForInIteratorObject(ctx, v[sp])
        console.log(`\t${formatValue(value)}`)
        if (!isExceptionValue(value)) {
          v[sp] = value;
        }
        break;
      }
      case Bytecode.ForIterNextOrGoto: {
        const pos = ops[pc++] as number
        const next = JSIteratorObjectNext(ctx, v[sp])
        if (!next) {
          // end, goto
          pc = pos
          console.log(`\tgoto=${pos}`)
        } else {
          v[++sp] = next
          console.log(`\t${formatValue(next)}`)
        }
        break;
      }
      case Bytecode.EqEqEq: {
        const a = v[sp--];
        const b = v[sp];
        if (isUseHostValue(a) && isUseHostValue(b)) {
          v[sp] = createBoolValue(a.value === b.value)
        } else {
          // TODO: slow compare
          v[sp] = createBoolValue(false)
        }
      }
      case Bytecode.Not: {
        const value = v[sp];
        let bool: boolean
        if (isUseHostValue(value)) {
          bool = !value.value
        } else {
          // TODO: slow compare
          bool = false
        }
        v[sp] = createBoolValue(bool)
      }
    }

    if (ctx.runtime.currentException) {
      while (sp >= 0) {
        const val = v[sp--];
      }
      ctx.currentStackFrame = frame.parentFrame;
      return JS_EXCEPTION
    }
  }
  ctx.currentStackFrame = frame.parentFrame
  // console.log(v.slice(0, 4))
  return v[sp+1]
}
