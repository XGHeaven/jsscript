import {parse as _parse, parseExpression as _parseExpression} from '@babel/parser'
import { Expression, File, LVal, Node, Statement, VariableDeclarator } from '@babel/types'
import { Context } from './context'
import { JSValue } from './value'
import { Bytecode } from './bytecode'

function unsupported(message: string = '') {
  throw new Error(`Unsupported: ${message}`)
}

interface ScopeVarBinding {
  name: string
  isConst: boolean
}

interface ParserScope {
  vars: ScopeVarBinding[]
  parent: number
}

class Parser {
  bc: unknown[] = []
  scopes: ParserScope[] = []

  get scopeIndex() {
    return this.scopes.length - 1
  }

  get currentScope() {
    return this.scopes[this.scopeIndex]
  }

  constructor(public ctx: Context) {
    this.scopes.push({
      vars: [],
      parent: 0
    })
    this.bc.push(Bytecode.PushScope, this.scopeIndex)
  }

  visitFile(file: File) {
    file.program.body.forEach(v => this.visitStatement(v))
  }

  visitStatement(node: Statement) {
    switch (node.type) {
      case 'VariableDeclaration': {
        if (node.kind === 'var') {
          return unsupported()
        }
        node.declarations.forEach(v => this.visitDeclarator(v, node.kind === 'const'))
        break
      }

      default: {
        unsupported(node.type)
      }
    }
  }

  private visitDeclarator(node: VariableDeclarator, isConst: boolean) {
    const vname = this.getIdentify(node.id);
    this.currentScope.vars.push({
      name: vname,
      isConst
    })
    if (node.init) {
      this.visitExpression(node.init)
    }
  }

  private visitExpression(node: Expression) {
    switch (node.type) {
      case 'NullLiteral': {
        break;
      }
      case 'NumericLiteral': {
        this.bc.push()
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
}
