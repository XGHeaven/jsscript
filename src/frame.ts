import { Context } from './context'
import { JSFunctionObject, getObjectData } from './object'
import { Scope } from './scope'
import { JSValue, JS_UNDEFINED } from './value'

export interface StackFrame {
  context: Context
  values: JSValue[]
  parentFrame: StackFrame | null
  scope: Scope
}

export function createStackFrame(context: Context, fn: JSFunctionObject): StackFrame {
  const data = getObjectData(fn)
  const scope = Scope.newChild(data.scope)
  const { body } = data
  for (let i = 0; i < body.argNames.length; i++) {
    scope.bind(body.argNames[i], { isArgument: true, isConst: false })
  }
  return {
    context,
    values: new Array(body.maxValueStackSize + 1).fill(JS_UNDEFINED),
    parentFrame: null,
    scope,
  }
}
