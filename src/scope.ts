import { JSValue } from "./value"

export interface ValueBindOption {
  isConst?: boolean
  isArgument?: boolean
}

interface ValueState {
  option: ValueBindOption
  name: string
  value: JSValue | undefined
}

export class Scope {
  static newChild(parent: Scope | undefined) {
    return new Scope(parent)
  }
  protected store = new Map<string, JSValue>()
  protected values = new Map<string, ValueState>()

  constructor(public parent: Scope | undefined) {
  }

  getOwn(key: string): JSValue | undefined {
    return this.values.get(key)?.value
  }

  get(key: string): JSValue | undefined {
    return this.getOwn(key) ?? this.parent?.get(key)
  }

  set(key: string, value: JSValue): boolean {
    const state = this.values.get(key)
    if (state) {
      // TODO: check const
      state.value = value
      return true
    }

    return this.parent?.set(key, value) ?? false
  }

  child() {
    return new Scope(this)
  }

  bind(key: string, option: ValueBindOption) {
    this.values.set(key, {
      option,
      name: key,
      value: undefined
    })
  }

  init(name: string, value: JSValue) {
    // TODO: check
    this.values.get(name)!.value = value
  }
}
