import { Program, Statement, Expression, Node } from "@babel/types";
import { EnvironmentRecord, GlobalEnvironmentRecord, LexcialEnvironmentRecord } from "./environment";
import { callInternal, evalInterval, executor } from "./executor";
import { StackFrame } from "./frame";
import { getIdentifierReference } from "./helper";
import { Runtime } from "./runtime";
import { Scope } from "./scope";
import { CompletionRecord } from "./types/completion";
import { createReference, Reference } from "./types/reference";
import { getRealValue, JSValue, undefinedValue } from "./value";

export class StackFrame2 {
  private completion: CompletionRecord | null = null
  constructor(public context: Context) {
  }

  setCompletion(com: CompletionRecord) {
    this.completion = com
  }

  getCompletion() {
    return this.completion
  }

  resetCompletion() {
    this.completion = null
  }
}

export interface ExprStack {

}

export class PointerCount {
  constructor(public node: Node, public step: number) {}
}

export class Context {
  global = new GlobalEnvironmentRecord(this, null)
  envs: EnvironmentRecord[] = []

  stacks: StackFrame2[] = []

  pcs: PointerCount[] = []

  valueStacks: (JSValue | Reference)[] = []

  walkStacks: (Program | Statement | Expression)[] = []

  currentStackFrame!: StackFrame

  pc = 0

  private lastValue: JSValue = undefinedValue

  constructor(public isolate: Runtime) {}

  get environment() {
    return this.envs[this.envs.length - 1]
  }


  run(fn: JSValue) {
    callInternal(this, fn, undefinedValue, undefinedValue, [])
  }

  execute(node: any) {
    // 脚本运行模式
    this.stacks.push(new StackFrame2(this))
    this.envs.push(this.global)
    this.pushPC(new PointerCount(node, 0))

    while(this.pcs.length) {
      executor(this)
    }

    console.log(this.valueStacks.length)
    if (this.valueStacks.length === 1) {
      return this.valueStacks[0]
    }

    return undefinedValue;
  }

  getValue(value: any) {
    return getRealValue(value)
  }

  popValue() {
    return this.valueStacks.pop()!
  }

  pushValue(value: JSValue | Reference) {
    this.valueStacks.push(value)
  }

  popPointor() {
    return this.walkStacks.pop()!
  }

  pushPointor(node: any) {
    this.walkStacks.push(node)
  }

  getFrame() {
    return this.stacks[this.stacks.length - 1]
  }

  setCompletionAndExitFrame(com: CompletionRecord) {
    const frame = this.popFrame()
    this.getFrame().setCompletion(com)
    return frame
  }

  pushFrame(frame: StackFrame2) {
    this.stacks.push(frame)
  }

  popFrame() {
    return this.stacks.pop()
  }

  popPC() {
    return this.pcs.pop()!
  }

  pushPC(pc: PointerCount): void {
    this.pcs.push(pc)
  }

  createFunctionValue() {

  }

  pushEnv(env: EnvironmentRecord) {
    this.envs.push(env)
  }

  popEnv(): EnvironmentRecord {
    return this.envs.pop()!
  }

  resolveBinding(name: string, env?: EnvironmentRecord): Reference {
    if (!env) {
      env = this.environment
    }

    return getIdentifierReference(env, name)
  }

  updateLastStatementValue(value: JSValue) {
    this.lastValue = value
  }

  getLastStatementValue() {
    return this.lastValue
  }
}
