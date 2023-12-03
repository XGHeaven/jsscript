import { JSClassDefine, initClasses } from "./class";
import { Context } from "./context";
import { JSValue, JS_UNDEFINED } from "./value";

export class Runtime {
  currentException: JSValue | null = null

  classes: JSClassDefine[] = []

  constructor() {
    initClasses(this)
  }

  newContext() {
    return new Context(this)
  }
}
