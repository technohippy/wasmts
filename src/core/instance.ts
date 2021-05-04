import { 
  ModuleNode, FuncTypeNode, CodeNode, InstrNode, NopInstrNode, 
  BlockInstrNode, LoopInstrNode, IfInstrNode, BrInstrNode, 
  BrIfInstrNode, CallInstrNode, I32ConstInstrNode, I32EqzInstrNode, 
  I32LtSInstrNode, I32GeSInstrNode, I32GeUInstrNode, I32AddInstrNode, 
  I32RemSInstrNode, LocalGetInstrNode, LocalSetInstrNode,
} from "./node.ts"
import { Buffer, StackBuffer } from "./buffer.ts"

export class Instance {
  #module: ModuleNode
  #importObject: any
  #context: Context
  #exports: {[key:string]:any}

  set debug(b:boolean) {
    this.#context.debug = b
  }

  get debug():boolean {
    return this.#context.debug
  }

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
  #instructions:Instructions

  constructor(funcType:FuncTypeNode, code:CodeNode) {
    this.#funcType = funcType
    this.#code = code
    this.#instructions = new Instructions(this.#code.func?.expr?.instrs)
  }

  invoke(context:Context, ...args:number[]) {
    // args check
    const params = [...args]
    const paramTypes = this.#funcType.paramType.valTypes
    for (let i = 0; i < paramTypes.length - args.length; i++) {
      const param = context.stack.readI32() // TODO: valtype
      params.push(param)
    }

    // set args
    params.forEach((v, i) => {
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
    let instr = this.#instructions.top
    while (instr) {
      instr = instr.invoke(context)
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
class Instruction {
  parent?: Instruction
  #next?: Instruction

  get next():Instruction | undefined {
    if (this.#next) {
      return this.#next
    } else {
      return this.parent?.next
    }
  }

  set next(instr:Instruction | undefined) {
    this.#next = instr
  }

  constructor(parent?:Instruction) {
    this.parent = parent
  }

  static create(node:InstrNode, parent?:Instruction):Instruction {
    if (node instanceof NopInstrNode) {
      return new NopInstruction(node, parent)
    } else if (node instanceof BlockInstrNode) {
      return new BlockInstruction(node, parent)
    } else if (node instanceof LoopInstrNode) {
      return new LoopInstruction(node, parent)
    } else if (node instanceof IfInstrNode) {
      return new IfInstruction(node, parent)
    } else if (node instanceof BrInstrNode) {
      return new BrInstruction(node, parent)
    } else if (node instanceof BrIfInstrNode) {
      return new BrIfInstruction(node, parent)
    } else if (node instanceof CallInstrNode) {
      return new CallInstruction(node, parent)
    } else if (node instanceof I32ConstInstrNode) {
      return new I32ConstInstruction(node, parent)
    } else if (node instanceof I32EqzInstrNode) {
      return new I32EqzInstruction(node, parent)
    } else if (node instanceof I32LtSInstrNode) {
      return new I32LtSInstruction(node, parent)
    } else if (node instanceof I32GeSInstrNode) {
      return new I32GeSInstruction(node, parent)
    } else if (node instanceof I32GeUInstrNode) {
      return new I32GeUInstruction(node, parent)
    } else if (node instanceof I32AddInstrNode) {
      return new I32AddInstruction(node, parent)
    } else if (node instanceof I32RemSInstrNode) {
      return new I32RemSInstruction(node, parent)
    } else if (node instanceof LocalGetInstrNode) {
      return new LocalGetInstruction(node, parent)
    } else if (node instanceof LocalSetInstrNode) {
      return new LocalSetInstruction(node, parent)
    } else {
      throw new Error(`invalid node: ${node.constructor.name}`)
    }
  }

  invoke(context:Context):Instruction | undefined {
    throw new Error(`subclass responsibility; ${this.constructor.name}`)
  }
}

class Instructions extends Instruction {
  #instructions:Instruction[] = []

  get top():Instruction | undefined {
    return this.#instructions[0]
  }

  constructor(nodes:InstrNode[]=[], parent?:Instruction) {
    super()

    if (nodes.length === 0) return

    let prev = Instruction.create(nodes[0], parent)
    this.#instructions.push(prev)
    for (let i = 1; i < nodes.length; i++) {
      prev.next = Instruction.create(nodes[i], parent)
      this.#instructions.push(prev)
      prev = prev.next
    }
  }

  invoke(context:Context): Instruction | undefined {
    return this.top
  }
}

class NopInstruction extends Instruction {
  #node: NopInstrNode

  constructor(node:NopInstrNode, parent?:Instruction) {
    super(parent)
    this.#node = node
  }

  invoke(context:Context):Instruction | undefined {
    return this.next
  }
}

class BlockInstruction extends Instruction {
  #node: BlockInstrNode
  #instructions: Instructions

  constructor(node:BlockInstrNode, parent?:Instruction) {
    super(parent)
    this.#node = node
    this.#instructions = new Instructions(node.instrs.instrs, this)
  }

  invoke(context:Context):Instruction | undefined {
    if (context.debug) console.warn("invoke block")
    return this.#instructions.top
  }

  jumpIn(): Instruction | undefined {
    return this.next
  }
}

class LoopInstruction extends Instruction {
  #node: LoopInstrNode
  #instructions: Instructions

  constructor(node:LoopInstrNode, parent?:Instruction) {
    super(parent)
    this.#node = node
    this.#instructions = new Instructions(node.instrs.instrs, this)
  }

  invoke(context:Context):Instruction | undefined {
    if (context.debug) console.warn("invoke loop")
    return this.#instructions.top
  }

  jumpIn(): Instruction | undefined {
    return this.#instructions.top
  }
}

class IfInstruction extends Instruction {
  #node: IfInstrNode
  #thenInstructions: Instructions
  #elseInstructions: Instructions

  constructor(node:IfInstrNode, parent?:Instruction) {
    super(parent)
    this.#node = node
    this.#thenInstructions = new Instructions(node.thenInstrs.instrs)
    this.#elseInstructions = new Instructions(node.elseInstrs?.instrs)
  }

  invoke(context:Context):Instruction | undefined {
    if (context.debug) console.warn("invoke if")

    const cond = context.stack.readI32()
    if (cond !== 0) {
      return this.#thenInstructions
    } else {
      return this.#elseInstructions
    }
  }
}

class BrInstruction extends Instruction {
  #node: BrInstrNode
  #labelIdx: number

  constructor(node:BrInstrNode, parent?:Instruction) {
    super(parent)
    this.#node = node
    this.#labelIdx = node.labelIdx
  }

  invoke(context:Context):Instruction | undefined {
    if (context.debug) console.warn("invoke br")

    let label = 0
    let parent = this.parent
    while (parent) {
      if (parent instanceof BlockInstruction || parent instanceof LoopInstruction) {
        if (label === this.#labelIdx) {
          return parent.jumpIn()
        }
        label++
      }
      parent = parent.parent
    }
    throw new Error(`branch error: ${this.#labelIdx} ${label}`)
  }
}

class BrIfInstruction extends Instruction {
  #node: BrIfInstrNode
  #labelIdx: number

  constructor(node:BrIfInstrNode, parent?:Instruction) {
    super(parent)
    this.#node = node
    this.#labelIdx = node.labelIdx
  }

  invoke(context:Context):Instruction | undefined {
    if (context.debug) console.warn("invoke br_if")

    const cond = context.stack.readI32()
    if (cond === 0) {
      return this.next
    }

    let label = 0
    let parent = this.parent
    while (parent) {
      if (parent instanceof BlockInstruction || parent instanceof LoopInstruction) {
        if (label === this.#labelIdx) {
          return parent.jumpIn()
        }
        label++
      }
      parent = parent.parent
    }
    throw new Error(`conditional branch error: ${this.#labelIdx} ${label}`)
  }
}

class CallInstruction extends Instruction {
  #node: CallInstrNode
  #funcIdx: number

  constructor(node:CallInstrNode, parent?:Instruction) {
    super(parent)
    this.#node = node
    this.#funcIdx = node.funcIdx
  }

  invoke(context:Context):Instruction | undefined {
    if (context.debug) console.warn("invoke call")
    const func = context.functions[this.#funcIdx]
    const result = func.invoke(context)
    if (result) {
      context.stack.writeI32(result) // TODO: type
    }
    return this.next
  }
}

class I32ConstInstruction extends Instruction {
  #node: I32ConstInstrNode
  #num: number

  constructor(node:I32ConstInstrNode, parent?:Instruction) {
    super(parent)
    this.#node = node
    this.#num = node.num
  }

  invoke(context:Context):Instruction | undefined {
    if (context.debug) console.warn("invoke i32.const")
    context.stack.writeI32(this.#num)
    return this.next
  }
}

class I32EqzInstruction extends Instruction {
  #node: I32EqzInstrNode

  constructor(node:I32EqzInstrNode, parent?:Instruction) {
    super(parent)
    this.#node = node
  }

  invoke(context:Context):Instruction | undefined {
    if (context.debug) console.warn("invoke i32.eqz")
    const num = context.stack.readS32()
    context.stack.writeI32(num === 0 ? 1 : 0)
    return this.next
  }
}

class I32LtSInstruction extends Instruction {
  #node: I32LtSInstrNode

  constructor(node:I32LtSInstrNode, parent?:Instruction) {
    super(parent)
    this.#node = node
  }

  invoke(context:Context):Instruction | undefined {
    if (context.debug) console.warn("invoke i32.lt_s")
    const rhs = context.stack.readS32()
    const lhs = context.stack.readS32()
    context.stack.writeI32(lhs < rhs ? 1 : 0)
    return this.next
  }
}

class I32GeSInstruction extends Instruction {
  #node: I32GeSInstrNode

  constructor(node:I32GeSInstrNode, parent?:Instruction) {
    super(parent)
    this.#node = node
  }

  invoke(context:Context):Instruction | undefined {
    if (context.debug) console.warn("invoke i32.ge_s")
    const rhs = context.stack.readS32()
    const lhs = context.stack.readS32()
    context.stack.writeI32(lhs >= rhs ? 1 : 0)
    return this.next
  }
}

class I32GeUInstruction extends Instruction {
  #node: I32GeUInstrNode

  constructor(node:I32GeUInstrNode, parent?:Instruction) {
    super(parent)
    this.#node = node
  }

  invoke(context:Context):Instruction | undefined {
    if (context.debug) console.warn("invoke i32.ge_u")
    const rhs = context.stack.readU32()
    const lhs = context.stack.readU32()
    context.stack.writeI32(lhs >= rhs ? 1 : 0)
    return this.next
  }
}

class I32AddInstruction extends Instruction {
  #node: I32AddInstrNode

  constructor(node:I32AddInstrNode, parent?:Instruction) {
    super(parent)
    this.#node = node
  }

  invoke(context:Context):Instruction | undefined {
    if (context.debug) console.warn("invoke i32.add")
    const rhs = context.stack.readI32()
    const lhs = context.stack.readI32()
    context.stack.writeI32(lhs+rhs)
    return this.next
  }
}

class I32RemSInstruction extends Instruction {
  #node: I32RemSInstrNode

  constructor(node:I32RemSInstrNode, parent?:Instruction) {
    super(parent)
    this.#node = node
  }

  invoke(context:Context):Instruction | undefined {
    if (context.debug) console.warn("invoke i32.rem_s")
    const rhs = context.stack.readS32()
    const lhs = context.stack.readS32()
    context.stack.writeS32(lhs%rhs)
    return this.next
  }
}

class LocalGetInstruction extends Instruction {
  #node: LocalGetInstrNode
  #localIdx: number

  constructor(node:LocalGetInstrNode, parent?:Instruction) {
    super(parent)
    this.#node = node
    this.#localIdx = node.localIdx
  }

  invoke(context:Context):Instruction | undefined {
    if (context.debug) console.warn("invoke local.get")
    const local = context.locals[this.#localIdx]
    local.store(context.stack)
    return this.next
  }
}

class LocalSetInstruction extends Instruction {
  #node: LocalSetInstrNode
  #localIdx: number

  constructor(node:LocalSetInstrNode, parent?:Instruction) {
    super(parent)
    this.#node = node
    this.#localIdx = node.localIdx
  }

  invoke(context:Context):Instruction | undefined {
    if (context.debug) console.warn("invoke local.set")
    const local = context.locals[this.#localIdx]
    local.load(context.stack)
    return this.next
  }
}


// TODO: データはBufferで保持して、get/setで型を意識したほうがいいかも
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

  store(buffer:Buffer) {
    switch(this.#type) {
      case 0x7f: // TODO: i32
        buffer.writeI32(this.#value)
        break
/*
      case 0x7e: // TODO: i64
        buffer.writeI64(this.#value)
        break
      case 0x7d: // TODO: f32
        buffer.writeF32(this.#value)
        break
      case 0x7c: // TODO: f64
        buffer.writeF64(this.#value)
        break
*/
      default:
        throw new Error(`invalid local type: ${this.#type}`)
    }
  }

  load(buffer:Buffer) {
    switch(this.#type) {
      case 0x7f: // TODO: i32
        this.#value = buffer.readI32()
        break
/*
      case 0x7e: // TODO: i64
        this.#value = buffer.readI64()
        break
      case 0x7d: // TODO: f32
        this.#value = buffer.readF32()
        buffer.writeF32(this.#value)
        break
      case 0x7c: // TODO: f64
        this.#value = buffer.readF64()
        break
*/
      default:
        throw new Error(`invalid local type: ${this.#type}`)
    }
  }
}

export class Context {
  stack:Buffer
  functions:WasmFunction[]
  locals:LocalValue[]

  debug:boolean = false

  constructor() {
    this.stack = new StackBuffer({buffer:new ArrayBuffer(1024)}) // TODO
    this.functions = []
    /*
    this.memories = []
    this.tables = []
    this.globals = []
    */
    this.locals = []
  }

  clearStack() {
    throw new Error("not yet")
  }
}