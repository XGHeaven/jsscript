import { Context } from "./context";

export class Runtime {
  newContext() {
    return new Context(this)
  }
}
