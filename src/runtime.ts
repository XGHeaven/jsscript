import { JSClassDefine, initClasses } from "./class";
import { Context } from "./context";
import { JSValue, JS_UNDEFINED } from "./value";

export class Runtime {
  // TODO: use JS_NULL
  // why this is need in runtime
  currentException: JSValue | null = null

  classes: JSClassDefine[] = []

  constructor() {
    initClasses(this)
  }

  newContext() {
    return new Context(this)
  }
}
