export enum Bytecode {
  Start,
  Stop,
  Plus,
  PlusConst,
  // (constId: number)
  PlusConstId,
  // (constValue: any)
  PushConst,
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

  // (fieldName: string)
  DefineField,
  DefineArrayElement,
  GetField,

  PushScope, // [scopeId: number]
  PopScope, // []

  Object, // create empty object

  Array, // create empty array
  ArrayPush,

  // internal
  Label,
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
