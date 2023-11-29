export enum Bytecode {
  Start,
  Stop,
  Plus,
  EqEqEq,
  Not,
  PlusConst,
  // (constId: number)
  PlusConstId,
  // (constValue: any)
  PushConst,
  // () [] => [undefined]
  PushVoid,
  // (constId: number)
  PushConstId,
  // (pc: number)
  Goto,
  // (pc: number)
  IfTrue,
  // (pc: numebr)
  IfFalse,
  // (argc: number)
  Call,
  // (argc: number)
  CallMethod,
  Apply,
  Return,
  // Drop value
  Drop,
  
  NewFn,

  GetVar,
  // (name: string)
  SetVar,
  // (), using stack
  GetVarFromArg,

  // (fieldName: string) (obj v) => (obj)
  DefineField,
  DefineArrayElement,
  // (fieldName: string) (obj) => (obj v)
  GetField,
  // (fieldName: string) (obj) => (v)
  GetFieldReplace,
  // (fieldName: string) (v obj) => (v)
  SetField,
  // () (obj name) => (obj value)
  GetAarryElement,
  // () (obj name) => (value)
  GetArrayElementReplace,


  PushScope, // [scopeId: number]
  PopScope, // []

  Object, // create empty object

  // (argc: number) (...args) => (array)
  ArrayFrom, // create empty array
  ArrayPush,

  // () (v) => (iter)
  ForInStart,
  ForOfStart,
  ForIterNextOrGoto,

  // internal
  Label,

  // () (v1 v2) => (v2 v1)
  Swap,
}

export type Bytecodes = unknown[]

export interface BytecodeConfig<T extends unknown[] = []> {
  args: T,
  size: T['length'],
}

function OP<Args extends unknown[], O extends Bytecode>(op: O): O & BytecodeConfig<Args> {
  return op as any
}

export const OP_START = OP<[], Bytecode.Start>(Bytecode.Start)


export function getOpArg<T extends BytecodeConfig, I extends number>(bc: Bytecodes, pos: number,  op: T, i: I): T['args'][I] {
  return bc[pos + i] as any
}
