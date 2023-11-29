import {parse as _parse, parseExpression as _parseExpression} from '@babel/parser'
import { BlockStatement, Expression, LVal, VariableDeclarator } from '@babel/types'
import * as t from '@babel/types'
import { Context } from './context'
import { FunctionBytecode, JSValue, JSValueType } from './value'
import { Bytecode, Bytecodes } from './bytecode'
import { JSFunctionObject, JSObjectType } from './object'
import { Scope } from './scope'

function unsupported(message: string = '') {
  throw new Error(`Unsupported: ${message}`)
}

const enum LValMode {
  Let,
  Const,
  Assignment,
}

const LVAL_ASSIGNMENT = 1 << 0;
const LVAL_DECLARE = 1 << 1;
const LVAL_DECLARE_CONST = 1 << 2;

interface ScopeVarBinding {
  name: string
  isConst: boolean
  isArg: boolean
}

interface ParserScope {
  vars: ScopeVarBinding[]
  parent: number
}

interface LabelSlot {
  // index in bytecodes
  // -1 is unassigned
  pos: number
  // ref index
  refs: number[]
}

class Parser {
  bc: Bytecodes = []
  scopes: ParserScope[] = []
  scopeIndex = 0;
  children: Parser[] = []
  labels: LabelSlot[] = []

  get currentScope() {
    return this.scopes[this.scopeIndex]
  }

  constructor(public ctx: Context) {
    this.scopes.push({
      vars: [],
      parent: 0
    })
    this.scopeIndex = 0;
  }

  newLabel() {
    this.labels.push({pos: -1, refs: []})
    return this.labels.length - 1
  }

  emitGoto(opcode: number, label?: number) {
    const label2 = label ?? this.newLabel()
    this.bc.push(opcode, label2)
    this.labels[label2].refs.push(this.bc.length - 2)
    return label2
  }

  emitLabel(label: number) {
    this.bc.push(Bytecode.Label, label)
    const ls = this.labels[label]
    if (ls.pos !== -1) {
      throw new Error('-1')
    }
    ls.pos = this.bc.length - 2
  }

  pushScope() {
    this.scopes.push({
      vars: [],
      parent: this.scopeIndex
    })
    this.scopeIndex = this.scopes.length - 1;
    this.bc.push(Bytecode.PushScope, this.scopeIndex)
  }

  popScope() {
    if (this.scopeIndex === 0) {
      throw new Error('Cannot pop scope of 0')
    }
    this.scopeIndex = this.scopes[this.scopeIndex].parent
    this.bc.push(Bytecode.PopScope)
  }

  visitFile(file: t.File) {
    file.program.body.forEach((v, i) => this.visitStatement(v))
  }

  visitStatement(node: t.Statement) {
    let hasValue = true
    switch (node.type) {
      case 'BlockStatement': {
        hasValue = false
        this.pushScope()
        node.body.forEach(stat => this.visitStatement(stat))
        this.popScope()
        break
      }
      case 'EmptyStatement': {
        hasValue = false;
        break;
      }
      case 'VariableDeclaration': {
        if (node.kind === 'var') {
          // return unsupported('var')
        }
        node.declarations.forEach(v => this.visitDeclarator(v, node.kind === 'const'))
        break
      }

      case 'IfStatement': {
        const end = this.newLabel()
        const alter = this.newLabel()
        this.visitExpression(node.test)
        if (node.alternate) {
          this.emitGoto(Bytecode.IfFalse, alter)
        } else {
          this.emitGoto(Bytecode.Goto, end)
        }
        this.visitStatement(node.consequent)

        if (node.alternate) {
          this.emitGoto(Bytecode.Goto, end)
          this.emitLabel(alter)
          this.visitStatement(node.alternate)
        }
        this.emitLabel(end)
        break
      }

      case 'ExpressionStatement': {
        this.visitExpression(node.expression);
        break;
      }

      case 'ForInStatement': {
        this.visitForInOrOfStatement(node, true)
        hasValue = false;
        break;
      }

      case 'ForOfStatement': {
        this.visitForInOrOfStatement(node, false)
        hasValue = false;
        break;
      }

      case 'ReturnStatement': {
        // TODO
        break;
      }

      case 'FunctionDeclaration': {
        break;
      }

      case 'TryStatement': {
        break;
      }

      case 'ThrowStatement': {
        break;
      }

      default: {
        unsupported(node.type)
      }
    }

    hasValue && this.bc.push(Bytecode.Drop)
  }

  private visitDeclarator(node: VariableDeclarator, isConst: boolean) {
    if (node.init) {
      this.visitExpression(node.init)
    }
    this.visitLVal(node.id, LVAL_DECLARE | (isConst ? LVAL_DECLARE_CONST : 0) | (node.init ? LVAL_ASSIGNMENT : 0))
  }

  private visitFunctionBody(node: BlockStatement | Expression) {
    switch(node.type) {
      case 'BlockStatement': {
        node.body.forEach((v, i) => this.visitStatement(v))
        break;
      }
      default: {
        this.visitExpression(node)
      }
    }
  }

  private visitExpression(node: Expression) {
    switch (node.type) {
      case 'NullLiteral': {
        break;
      }
      case 'BooleanLiteral':
      case 'StringLiteral':
      case 'NumericLiteral': {
        this.bc.push(Bytecode.PushConst, node.value)
        break;
      }

      case 'BinaryExpression': {
        if (node.left.type === 'PrivateName') {
          return unsupported(`${node.type} left ${node.left.type}`)
        }
        this.visitExpression(node.left)
        this.visitExpression(node.right)
        switch (node.operator) {
          case '+': {
            this.bc.push(Bytecode.Plus)
            break;
          }
          case '===': {
            this.bc.push(Bytecode.EqEqEq)
            break;
          }
          case '!==': {
            this.bc.push(Bytecode.EqEqEq, Bytecode.Not)
            break;
          }
          default: {
            return unsupported(`operator ${node.operator}`)
          }
        }
        break;
      }

      case 'AssignmentExpression': {
        this.visitExpression(node.right)
        this.visitLVal(node.left, LVAL_ASSIGNMENT)
        break;
      }

      case 'Identifier': {
        this.bc.push(Bytecode.GetVar, node.name)
        break;
      }

      case 'FunctionExpression':
      case 'ArrowFunctionExpression': {
        const parser = new Parser(this.ctx)

        this.children.push(parser)
        const index = this.children.length - 1
        this.bc.push(Bytecode.NewFn, index)

        node.params.forEach((param, i) => {
          switch(param.type) {
            case 'Identifier': {
              parser.currentScope.vars.push({
                name: param.name,
                isConst: false,
                isArg: true
              })
              parser.bc.push(Bytecode.GetVarFromArg, i)
              parser.bc.push(Bytecode.SetVar, param.name)
              break;
            }
          }
        })
        parser.visitFunctionBody(node.body)
        break;
      }

      case 'CallExpression': {
        const { callee, arguments: args } = node
        let opcode: Bytecode = Bytecode.Call
        switch (callee.type) {
          
          case 'MemberExpression': {
            opcode = Bytecode.CallMethod
            // TODO: push name
            break;
          }
          case 'V8IntrinsicIdentifier': {
            // none
            break;
          }
          default: {
            this.visitExpression(callee)
          }
        }

        args.forEach(v => this.visitExpression(v as Expression))

        this.bc.push(opcode, arguments.length)
        break;
      }
      case 'ConditionalExpression': {
        const end = this.newLabel()
        const alter = this.newLabel()
        this.visitExpression(node.test);
        this.emitGoto(Bytecode.IfFalse, alter)

        this.visitExpression(node.consequent)
        this.emitGoto(Bytecode.Goto, end)

        this.emitLabel(alter)
        this.visitExpression(node.alternate)

        this.emitLabel(end)
        break;
      }

      case 'ObjectExpression': {
        this.bc.push(Bytecode.Object)
        node.properties.forEach(prop => {
          switch(prop.type) {
            case 'ObjectProperty': {
              this.visitExpression(prop.value as Expression)
              if (prop.computed) {
                this.visitExpression(prop.key)
                this.bc.push(Bytecode.DefineArrayElement)
              } else {
                this.bc.push(Bytecode.DefineField, this.getIdentify(prop.key as LVal))
              }
              break;
            }
          }
        })
        break;
      }

      case 'ArrayExpression': {
        node.elements.forEach(expr => {
          if (expr === null) {
            this.bc.push(Bytecode.PushVoid)
          } else if (expr.type === 'SpreadElement') {
            // TODO
          } else {
            this.visitExpression(expr)
          }
        })
        this.bc.push(Bytecode.ArrayFrom, node.elements.length)
        break;
      }

      case 'MemberExpression': {
        this.visitExpression(node.object);
        if (node.computed) {
          // TODO: as
          this.visitExpression(node.property as t.Expression)
          this.bc.push(Bytecode.GetArrayElementReplace)
        } else {
          switch (node.property.type) {
            case 'Identifier': {
              this.bc.push(Bytecode.GetFieldReplace, node.property.name)
              break
            }
            default: {
              return unsupported(`MemberExpression with property ${node.property.type}`)
            }
          }
        }
        break;
      }
    }
  }

  private getIdentify(node: LVal): string {
    switch(node.type) {
      case 'Identifier': {
        return node.name
      }

      default: {
        unsupported(node.type)
        return ''
      }
    }
  }

  private visitLVal(node: LVal, lvalMode: number) {
    const isAssignment = (lvalMode & LVAL_ASSIGNMENT) === LVAL_ASSIGNMENT
    switch (node.type) {
      case 'Identifier': {
        if (lvalMode & LVAL_DECLARE) {
          this.currentScope.vars.push({
            name: node.name,
            isConst: (lvalMode & LVAL_DECLARE_CONST) === LVAL_DECLARE_CONST,
            isArg: false,
          })
        }
        if (isAssignment) {
          this.bc.push(Bytecode.SetVar, node.name)
        }
        break;
      }
      case 'AssignmentPattern': {
        return unsupported('LVal AssignmengPattern')
        break;
      }
      case 'ObjectPattern': {
        const usedKeys: string[] = []
        node.properties.forEach(prop => {
          switch (prop.type) {
            case 'ObjectProperty': {
              const { key, value } = prop
              if (prop.computed) {
                switch (key.type) {
                  case 'Identifier': {}
                }
              } else {
                t.assertIdentifier(key)
                usedKeys.push(key.name)
                if (isAssignment) {
                  this.bc.push(Bytecode.GetField, key.name);
                }
              }

              t.assertPatternLike(value)

              this.visitLVal(value, lvalMode)

              if (isAssignment) {
                this.bc.push(Bytecode.Drop)
              }
              break;
            }
            case 'RestElement': {
              return unsupported('Pattern RestElement')
              break;
            }
          }
        })
        break;
      }

      case 'MemberExpression': {
        this.visitExpression(node.object)
        if (node.computed) {
          // TODO: as
          this.visitExpression(node.property as Expression)
        } else {
          // TODO: as
          this.bc.push(Bytecode.SetField, this.getIdentify(node.property as LVal))
        }
        break;
      }
    }
  }

  private visitForInOrOfStatement(node: t.ForOfStatement | t.ForInStatement, isIn: boolean) {
    const labelStart = this.newLabel()
    // const labelBody = this.newLabel()
    const labelEnd = this.newLabel()

    this.visitExpression(node.right)
    this.bc.push(isIn ? Bytecode.ForInStart : Bytecode.ForOfStart)

    this.emitLabel(labelStart)
    this.pushScope()
    this.emitGoto(Bytecode.ForIterNextOrGoto, labelEnd)

    switch (node.left.type) {
      case 'VariableDeclaration': {
        const isConst = node.left.kind === 'const'
        node.left.declarations.forEach(v => {
          this.visitLVal(v.id, LVAL_ASSIGNMENT)
        })
        break;
      }
      default: {
        this.visitLVal(node.left, LVAL_ASSIGNMENT)
      }
    }

    // Drop assignment value
    this.bc.push(Bytecode.Drop)

    this.visitStatement(node.body)

    this.popScope()

    this.emitGoto(Bytecode.Goto, labelStart)

    this.emitLabel(labelEnd)
    // drop iter object
    this.bc.push(Bytecode.Drop)
  }

  toFunctionBytecode(): FunctionBytecode {
    for (let i = 0; i < this.labels.length; i++) {
      const ls = this.labels[i];
      for (let pos of ls.refs) {
        this.bc[pos + 1] = ls.pos
      }
    }

    return {
      codes: this.bc,
      maxValueStackSize: 100,
      argNames: [],
      scopeNames: this.scopes.map(scope => [scope.vars.filter(v => !v.isConst).map(v => v.name), scope.vars.filter(v => v.isConst).map(v => v.name)]),
      children: this.children.map(child => child.toFunctionBytecode())
    }
  }
}

export function parseFile(sourceCode: string) {
  return _parse(sourceCode)
}

export function parseExpression(sourceCode: string) {
  return _parseExpression(sourceCode)
}

export function parseScript(ctx: Context, code: string): JSValue {
  const parsedFile = _parse(code);
  const parser = new Parser(ctx);
  parser.visitFile(parsedFile)

  const fn: JSFunctionObject = {
    type: JSObjectType.Function,
    body: parser.toFunctionBytecode(),
    scope: new Scope(undefined)
  }

  return {
    type: JSValueType.Object,
    value: fn
  }
}
