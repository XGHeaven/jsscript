import { JSValue } from "../value";

export enum CompletionType {
  Normal,
  Throw,
  AwaitFulfilled,
  AwaitRejected
}

export interface CoreCompletion {
  __type: 'completion'
  value: JSValue
  target: unknown
}

export interface NormalCompletion extends CoreCompletion {
  type: CompletionType.Normal
}

export interface ThrowCompletion extends CoreCompletion {
  type: CompletionType.Throw
}

export type CompletionRecord = NormalCompletion | ThrowCompletion

export function normalCompletion(value: JSValue): NormalCompletion {
  return {
    __type: 'completion',
    type: CompletionType.Normal,
    value,
    target: null
  }
}

export function throwCompletion(value: JSValue): ThrowCompletion {
  return {
    __type: 'completion',
    type: CompletionType.Throw,
    value,
    target: null
  }
}

export function isCompletion(node: any) : node is CompletionRecord {
  return node.__type === 'completion'
}
