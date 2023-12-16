import { Context } from './context'
import { JSValue } from './value'

enum BindingType {
  Mutable,
  Immutable,
}

interface BindingRecord {
  type: BindingType
  value: JSValue | null
}

export abstract class EnvironmentRecord {
  protected store = new Map<string, BindingRecord>()
  constructor(
    public context: Context,
    public parent: EnvironmentRecord | null
  ) {}

  // abstract hasBinding(name: string): boolean
  // abstract createMutableBinding(name: string, isDelete: boolean): void
  // abstract createImmutableBinding(name: string, safe: boolean): void
  // abstract initializeBinding(name: string, value: JSValue): void
  // abstract setMutableBinding(name: string, value: JSValue, throwError?: boolean): void
  // abstract getBindingValue(name: string, strict?: boolean): JSValue
  // abstract deleteBinding(name: string): boolean
  // abstract hasThisBinding(): boolean
  // abstract hasSuperBinding(): boolean
  // abstract withBaseObject(): JSValue | undefined

  hasBinding(name: string): boolean {
    return this.store.has(name)
  }
  createMutableBinding(name: string, isDelete: boolean): void {
    const record: BindingRecord = {
      type: BindingType.Mutable,
      value: null,
    }
    this.store.set(name, record)
  }
  createImmutableBinding(name: string, safe: boolean): void {
    this.store.set(name, {
      type: BindingType.Immutable,
      value: null,
    })
  }
  initializeBinding(name: string, value: JSValue): void {
    this.store.get(name)!.value = value
  }
  setMutableBinding(name: string, value: JSValue, throwError?: boolean): void {
    this.store.get(name)!.value = value
    // const record = this.store.get(name)
    // if (record) {
    //   record.value = value
    // } else if (this.parent) {
    //   this.parent.setMutableBinding(name, value)
    // }
  }
  getBindingValue(name: string, strict?: boolean): JSValue {
    // TODO: 检查是否初始化
    return this.store.get(name)!.value!
  }
  deleteBinding(name: string): boolean {
    throw new Error('Method not implemented.')
  }
  hasThisBinding(): boolean {
    throw new Error('Method not implemented.')
  }
  hasSuperBinding(): boolean {
    throw new Error('Method not implemented.')
  }
  withBaseObject(): JSValue | undefined {
    throw new Error('Method not implemented.')
  }
}

export class LexcialEnvironmentRecord extends EnvironmentRecord {
  // private store = new Map<string, BindingRecord>()
  // hasBinding(name: string): boolean {
  //   return this.store.has(name)
  // }
  // createMutableBinding(name: string, isDelete: boolean): void {
  //   const record: BindingRecord = {
  //     type: BindingType.Mutable,
  //     value: null
  //   }
  //   this.store.set(name, record)
  // }
  // createImmutableBinding(name: string, safe: boolean): void {
  //   throw new Error("Method not implemented.");
  // }
  // initializeBinding(name: string, value: JSValue): void {
  //   throw new Error("Method not implemented.");
  // }
  // setMutableBinding(name: string, value: JSValue, throwError?: boolean): void {
  //   const record = this.store.get(name)
  //   if (record) {
  //     record.value = value
  //   } else if (this.parent) {
  //     this.parent.setMutableBinding(name, value)
  //   }
  // }
  // getBindingValue(name: string, strict?: boolean): JSValue {
  //   throw new Error("Method not implemented.");
  // }
  // deleteBinding(name: string): boolean {
  //   throw new Error("Method not implemented.");
  // }
  // hasThisBinding(): boolean {
  //   throw new Error("Method not implemented.");
  // }
  // hasSuperBinding(): boolean {
  //   throw new Error("Method not implemented.");
  // }
  // withBaseObject(): JSValue | undefined {
  //   throw new Error("Method not implemented.");
  // }
}

export class GlobalEnvironmentRecord extends EnvironmentRecord {}

export function isEnvironment(env: any): env is EnvironmentRecord {
  return env instanceof EnvironmentRecord
}
