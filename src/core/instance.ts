import { ModuleNode, FuncTypeNode, CodeNode } from "./node.ts"
import { Binary, StackBinary } from "./binary.ts"

export class Instance {
  #module: ModuleNode
  #importObject: any
  #context: Context
  #exports: {[key:string]:any}

  get exports(): {[key:string]:any} {
    if (!Object.isFrozen(this.#exports)) {
      Object.freeze(this.#exports)
    }
    return this.#exports
  }

  constructor(module:ModuleNode, importObject?:any) {
    this.#module = module
    this.#importObject = importObject
    this.#context = new Context()
    this.#exports = {}
  }

  compile() {
    const typeSection = this.#module.typeSection

    // import

    // function
    const functionSection = this.#module.functionSection
    const codeSection = this.#module.codeSection
    functionSection?.typeIdxs.forEach((typeIdx, i) => {
      const func = new WasmFunction(typeSection!.funcTypes[typeIdx], codeSection!.codes[i])
      this.#context.functions.push(func)
    })

    // global

    // export
    const exportSection = this.#module.exportSection
    exportSection?.exports.forEach(exp => {
      if (exp.exportDesc?.tag === 0x00) { // TODO: funcidx
        this.#exports[exp.name!] = (...args:number[]) => {
          const result = this.#context.functions[exp.exportDesc!.index!].invoke(this.#context, ...args)
          //this.#context.clearStack()
          return result
        }
      }
    })
  }
}

class WasmFunction {
  #funcType:FuncTypeNode
  #code:CodeNode

  constructor(funcType:FuncTypeNode, code:CodeNode) {
    this.#funcType = funcType
    this.#code = code
  }

  invoke(context:Context, ...args:number[]) {
    // args check
    const paramTypes = this.#funcType.paramType.valTypes
    if (args.length !== paramTypes.length) {
      throw new Error("invalid params")
    }

    // set args
    args.forEach((v, i) => {
      context.locals[i] = new LocalValue(paramTypes[i], v)
    })

    // set local vars
    const localses = this.#code.func?.localses
    if (localses) {
      for (let i = 0; i < localses.length; i++) {
        const locals = localses[i]
        for (let j = 0; j < (locals.num || 0); j++) {
          context.locals.push(new LocalValue(locals.valType!, 0)) // initial value
        }
      }
    }

    // invoke
    const instrs = this.#code.func?.expr?.instrs || []
    for (const instr of instrs) {
      instr.invoke(context)
      if (0 <= context.branch) {
        break
      }
    }

    const resultTypes = this.#funcType.resultType.valTypes
    if (resultTypes.length === 0) {
      return null
    } else {
      switch (resultTypes[0]) {
        case 0x7f: // TODO: i32
          return context.stack.readI32()
        /*
        case 0x7e: // TODO: i64
          return context.stack.readI64()
        case 0x7d: // TODO: f32
          return context.stack.readF32()
        case 0x7c: // TODO: f64
          return context.stack.readF64()
        */
        default:
          throw new Error(`invalid result type: ${resultTypes[0]}`)
      }
    }
  }
}

// TODO: データはBinaryで保持して、get/setで型を意識したほうがいいかも
class LocalValue {
  #type:number
  #value:number

  get value():number {
    return this.#value
  }

  set value(val:number) {
    this.#value = val
  }

  constructor(type:number, value:number) {
    this.#type = type
    this.#value = value
  }

  store(binary:Binary) {
    switch(this.#type) {
      case 0x7f: // TODO: i32
        binary.writeI32(this.#value)
        break
/*
      case 0x7e: // TODO: i64
        binary.writeI64(this.#value)
        break
      case 0x7d: // TODO: f32
        binary.writeF32(this.#value)
        break
      case 0x7c: // TODO: f64
        binary.writeF64(this.#value)
        break
*/
      default:
        throw new Error(`invalid local type: ${this.#type}`)
    }
  }
}

export class Context {
  stack:Binary
  functions:WasmFunction[]
  locals:LocalValue[]
  branch:number
  depth:number

  constructor() {
    this.stack = new StackBinary({buffer:new ArrayBuffer(1024)}) // TODO
    this.functions = []
    /*
    this.memories = []
    this.tables = []
    this.globals = []
    */
    this.locals = []
    this.branch = -1
    this.depth = 0
  }

  clearStack() {
    throw new Error("not yet")
  }
}