export const enum Bytecode {
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
  // (argc: number)
  Call,
  Apply,
  Return,

  GetVar,
  SetVar,

  PushScope, // [scopeId: number]
  PopScope, // []
}

export type Bytecodes = unknown[]
