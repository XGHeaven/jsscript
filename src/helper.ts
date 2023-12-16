import { EnvironmentRecord, isEnvironment } from './environment'
import { createReference, isReference, Reference } from './types/reference'
import { JSObjectValue, JSValue, JSValueType } from './value'

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

export function initializeIdentifierBinding(
  env: EnvironmentRecord,
  name: string,
  kind: 'const' | 'let' | 'var',
  value: JSValue
) {
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

  while (env.parent) {
    env = env.parent
    if (env.hasBinding(name)) {
      return createReference(env, name)
    }
  }

  // Unresolved
  return createReference(undefined, name)
}

export function toObject(o: JSValue): JSObjectValue {
  if (o.type === JSValueType.Object) {
    return o
  }
  throw new Error(`TypeError: Cannot convert ${o.type} to Object`)
}
