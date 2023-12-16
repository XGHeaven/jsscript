export enum Bytecode {
  Start,
  Stop,

  // Binary
  Plus,
  // () [a b] => [c]
  Sub,
  // () [a b] => [c]
  Div,
  EqEqEq,
  EqEq,
  Lt,
  Gt,
  Le,
  Ge,

  // Unary
  // () [v] => [bool]
  Not, // !
  // () [v] => [v]
  Neg, // -
  // () [v] => [number]
  ToNumber, // +
  // () [v] => [string]
  TypeOf,

  // Logical
  // () [a b] => [v]
  AndAnd,
  // () [a b] => [v]
  OrOr,

  PlusConst,
  // (constId: number)
  PlusConstId,
  // (constValue: any)
  PushConst,
  // () [] => [undefined]
  PushVoid,
  // (constId: number)
  PushConstId,
  // () [] => [this]
  PushThis,
  // (pc: number)
  Goto,
  // (pc: number) (v) => ()
  IfTrue,
  // (pc: numebr) (v) => ()
  IfFalse,
  // (argc: number) (fnObject ...args) => (ret)
  Call,
  // (argc: number) (thisObject fnObject ...args) => (ret)
  CallMethod,
  Apply,
  Return,
  // Drop value
  Drop,
  // () [v] => [v v]
  Dup,

  // () [error] => []
  Throw,
  // (pos) [] => [throwContext]
  TryContext,

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

  // () [obj name] => [bool]
  Delete,

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

  // (msg: string) [] => []
  Warning,
}

export type Bytecodes = unknown[]

export interface BytecodeConfig<T extends unknown[] = []> {
  args: T
  size: T['length']
}

function OP<Args extends unknown[], O extends Bytecode>(op: O): O & BytecodeConfig<Args> {
  return op as any
}

export const OP_START = OP<[], Bytecode.Start>(Bytecode.Start)

export function getOpArg<T extends BytecodeConfig, I extends number>(
  bc: Bytecodes,
  pos: number,
  op: T,
  i: I
): T['args'][I] {
  return bc[pos + i] as any
}
