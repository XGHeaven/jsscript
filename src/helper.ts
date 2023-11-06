import { Context, PointerCount, StackFrame2 } from "./context";
import { EnvironmentRecord, isEnvironment, LexcialEnvironmentRecord } from "./environment";
import { CompletionRecord, isCompletion } from "./types/completion";
import { createReference, isReference, Reference } from "./types/reference";
import { JSFunctionValue, JSObjectValue, JSValue, JSValueType, undefinedValue } from "./value";

export function getValue(value: Reference | JSValue): JSValue {
  if (!isReference(value)) {
    return value
  }

  const base = value.base
  // TODO: throw a reference error
  // TODO assert base is Environment

  if (isEnvironment(base)) {
    return base.getBindingValue(value.name)
  }

  throw new Error('Unsupport property')
}

export function initializeIdentifierBinding(env: EnvironmentRecord, name: string, kind: 'const' | 'let' | 'var', value: JSValue) {
  if (kind === 'const') {
    // TODO: 这个操作应该提前
    env.createImmutableBinding(name, true)
    env.initializeBinding(name, value)
  } else if (kind === 'let') {
    env.createMutableBinding(name, false)
    env.initializeBinding(name, value)
  } else {
    throw new Error('Cannot support var')
  }
}

export function getIdentifierReference(env: EnvironmentRecord, name: string): Reference {
  if (env.hasBinding(name)) {
    return createReference(env, name)
  }

  while(env.parent) {
    env = env.parent
    if (env.hasBinding(name)) {
      return createReference(env, name)
    }
  }

  // Unresolved
  return createReference(undefined, name)
}

export function callFunction(context: Context, fn: JSFunctionValue, thisValue: JSValue | undefined, args: JSValue[]) {
  const { params, body, env } = fn
  const newEnv = new LexcialEnvironmentRecord(context, env)
  if (thisValue !== undefined) {
    newEnv.createImmutableBinding('this', true)
    newEnv.initializeBinding('this', thisValue)
  }

  for (let i = 0; i < params.length; i++) {
    const param = params[i]
    if (param.type === 'Identifier') {
      newEnv.createMutableBinding(param.name, false)
      newEnv.initializeBinding(param.name, args[i] ?? undefinedValue)
    }
  }

  context.pushEnv(newEnv)
  context.pushFrame(new StackFrame2(context))
  context.pushPC(new PointerCount(body, 0))
}

export function getV(o: JSValue, name: string | number): JSValue {
  const objectValue = toObject(o)
  if (name in objectValue.value) {
    return objectValue.value[name]
  }
  return undefinedValue
}

export function toObject(o: JSValue): JSObjectValue {
  if (o.type === JSValueType.Object) {
    return o
  }
  throw new Error(`TypeError: Cannot convert ${o.type} to Object`)
}
