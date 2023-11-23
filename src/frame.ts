import { Context } from "./context";
import { JSFunctionObject } from "./object";
import { Scope } from "./scope";
import { FunctionBytecode, JSValue, JS_UNDEFINED } from "./value";

export interface StackFrame {
  context: Context
  values: JSValue[]
  parentFrame: StackFrame | null
  scope: Scope
}

export function createStackFrame(context: Context, fn: JSFunctionObject): StackFrame {
  const scope = Scope.newChild(fn.scope)
  const { body } = fn
  for (let i = 0; i < body.argNames.length; i++) {
    scope.bind(body.argNames[i], { isArgument: true, isConst: false })
  }
  return {
    context,
    values: new Array(fn.body.maxValueStackSize + 1).fill(JS_UNDEFINED),
    parentFrame: null,
    scope,
  }
}
