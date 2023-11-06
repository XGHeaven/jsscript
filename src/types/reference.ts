import { EnvironmentRecord } from "../environment";
import { JSValue } from "../value";

export interface Reference {
  __type: 'reference'
  base: EnvironmentRecord | JSValue | undefined
  name: string
}

export function isReference(ref: any): ref is Reference {
  return typeof ref === 'object' && ref.__type === 'reference'
}

export function createReference(base: EnvironmentRecord | JSValue | undefined, name: string): Reference {
  return {
    __type: 'reference',
    base,
    name
  }
}
