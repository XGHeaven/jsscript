import { File, Statement, Expression, Program, BinaryExpression, ObjectPattern } from '@babel/types'
import * as t from '@babel/types'
import { Context, PointerCount } from './context';
import { callFunction, getV, getValue, initializeIdentifierBinding } from './helper';
import { normalCompletion } from './types/completion';
import { isReference } from './types/reference';
import { JSValue, createNumberValue, JSValueType, createStringValue, createFunctionValue, undefinedValue, JSFunctionValue, FunctionBytecode, isUseHostValue, createHostValue } from './value';
import { Bytecode } from './bytecode';
import { createStackFrame } from './frame';
import { JSObjectType } from './object';
import { Scope } from './scope';

export function executor(context: Context): void {
  const frame = context.getFrame()
  const pc = context.popPC()
  const { environment } = context
  const { node, step } = pc
  switch (node.type) {
    case 'File': {
      return context.pushPC(new PointerCount(node.program, 0))
    }

    case 'BlockStatement':
    case 'Program': {
      for (let i = node.body.length - 1; i >= 0; i--) {
        context.pushPC(new PointerCount(node.body[i], 0))
      }
      return;
    }

    case 'ExpressionStatement': {
      switch (step) {
        case 0: {
          context.pushPC(new PointerCount(node, 1))
          context.pushPC(new PointerCount(node.expression, 0))
          break
        }
        case 1: {
          // 忽略返回值
          context.updateLastStatementValue(getValue(context.popValue()))
        }
      }
      return;
    }

    case 'VariableDeclaration': {
      const { declarations, kind } = node
      const declaractor = declarations[Math.floor(step / 2)]
      const subStep = step % 2
      const {id, init} = declaractor
      if (subStep === 0) {
        context.pushPC(new PointerCount(node, step + 1))
        if (init) {
          // TODO:函数检查
          context.pushPC(new PointerCount(init, 0))
        } else {
          context.pushValue(undefinedValue)

        }
      } else {
        const value = getValue(context.popValue())
        switch(id.type) {
          case 'Identifier': {
            initializeIdentifierBinding(environment, id.name, kind, value)
            break
          }
          case 'ObjectPattern': {
            const props = id.properties
            const pairs = destructObjectPattern(id, value)
            for (const [key, value] of pairs) {
              initializeIdentifierBinding(environment, key, kind, value)
            }
            break
          }
          default: {
            throw new Error('Unsupport binding of ' + id.type)
          }
        }

        if (step + 1 >= declarations.length * 2) {
          return
        }

        context.pushPC(new PointerCount(node, step + 1))
      }
      return;
    }

    case 'BinaryExpression': {
      switch (step) {
        case 0:
          context.pushPC(pc)
          context.pushPC(new PointerCount(node.right, 0))
          context.pushPC(new PointerCount(node.left, 0))
          pc.step = 1
          break
        case 1: {
          const leftValue = context.popValue()
          const rightValue = context.popValue()
          context.pushValue(calcBinaryExpression(context, getValue(leftValue), node.operator, getValue(rightValue)))
          break
        }
      }
      return
    }

    case 'ReturnStatement': {
      const { argument } = node
      if (step === 0) {
        context.pushPC(new PointerCount(node, 1))
        if (argument) {
          context.pushPC(new PointerCount(argument, 0))
        } else {
          context.pushValue(undefinedValue)
        }
      } else {
        context.setCompletionAndExitFrame(normalCompletion(getValue(context.popValue())))
      }
      return
    }

    case 'NumericLiteral': {
      return context.pushValue(createNumberValue(node.value))
    }

    case 'StringLiteral': {
      return context.pushValue(createStringValue(node.value))
    }

    case 'FunctionExpression': {
      return context.pushValue(createFunctionValue(environment, node.params, node.body))
    }

    case 'CallExpression': {
      const { callee, arguments } = node
      if (step === -1) {
        const com = frame.getCompletion()
        const value = com === null ? undefinedValue : com.value
        context.pushValue(getValue(value))
      } else if (step === 0) {
        context.pushPC(new PointerCount(node, 1))
        context.pushPC(new PointerCount(callee, 0))
      } else if (step <= arguments.length) {
        context.pushPC(new PointerCount(node, step + 1))
        context.pushPC(new PointerCount(arguments[step - 1], 0))
      } else {
        const value = []
        for (let i = 0; i < arguments.length; i++) {
          value.unshift(getValue(context.popValue()))
        }

        const calleeValue = context.popValue()
        const thisValue = isReference(calleeValue) ? calleeValue.base : undefined
        const fnValue = isReference(calleeValue) ? getValue(calleeValue) : calleeValue

        context.pushPC(new PointerCount(node, -1))
        frame.resetCompletion()
        callFunction(context, fnValue as JSFunctionValue, thisValue as any, value)
        return;
      }
      return;
    }

    case 'Identifier': {
      context.pushValue(context.resolveBinding(node.name))
      return;
    }
    case 'VariableDeclarator': {
      throw new Error('Unreachable')
    }

    default: {
      console.log(node)
      throw new Error(`unknown type ${node.type}`)
    }
  }
}

function calcBinaryExpression(context: Context, left: JSValue, op: BinaryExpression['operator'], right: JSValue): JSValue {
  switch (op) {
    case '+': {
      if (left.type === JSValueType.Number && right.type === JSValueType.Number) {
        return createNumberValue(left.value + right.value)
      }
      throw new Error('unknow left&right' +left.type + right.type)
    }
    default: {
      throw new Error(`unknown operator: ${op}`)
    }
  }
}

function destructObjectPattern(pattern: ObjectPattern, value: JSValue) {
  const props = pattern.properties

  const pairs: [string, JSValue][] = []

  for (const prop of props) {
    if (prop.type === 'ObjectProperty') {
      if (prop.key.type !== 'Identifier') {
        throw new Error('TypeError: Only support identifier as ObjectPattern key')
      }
      if (prop.value.type === 'Identifier') {
        pairs.push([prop.value.name, getV(value, prop.key.name)])
      } else {
        pairs.push(...destructObjectPattern(prop.value, value))
      }
    }
  }

  return pairs
}

export function callInternal(ctx: Context, fnValue: JSValue, thisValue: JSValue, newTarget: JSValue, args: JSValue[]): JSValue {
  // TODO: create args binding
  if (fnValue.type !== JSValueType.Object) {
    return {type: JSValueType.Exception}
  }
  const obj = fnValue.value
  if (obj.type !== JSObjectType.Function) {
    return { type: JSValueType.Exception }
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
  for (;pc < ops.length;) {
    const op = ops[pc++]
    switch(op) {
      case Bytecode.PushConst:
        v[++sp] = createHostValue(ops[pc++] as any)
        break
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
        break
      }
      case Bytecode.Call: {
        const argc = ops[pc++] as number
        const args = v.slice(sp - argc + 1, sp + 1)
        const value = callInternal(ctx, v[sp - argc], undefinedValue, undefinedValue, args)
        v[++sp] = value
        break
      }
      case Bytecode.Return: {
        return v[sp]
      }
      case Bytecode.GetVar: {
        const name = ops[pc++] as string
        const value = scope.get(name);
        if (value) {
          v[++sp] = value;
        } else {
          // TODO
        }
        break
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
        scope.set(name, v[sp--])
        break
      }
    }
  }
  ctx.currentStackFrame = frame.parentFrame!
  return undefinedValue
}
