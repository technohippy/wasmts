import { 
  ModuleNode, FuncTypeNode, CodeNode, InstrNode, NopInstrNode, 
  BlockInstrNode, LoopInstrNode, IfInstrNode, BrInstrNode, 
  BrIfInstrNode, CallInstrNode, I32ConstInstrNode, I32EqzInstrNode, 
  I32LtSInstrNode, I32GeSInstrNode, I32GeUInstrNode, I32AddInstrNode, 
  I32RemSInstrNode, LocalGetInstrNode, LocalSetInstrNode, ValType,
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
    const importSection = this.#module.importSection
    importSection?.imports.forEach(im => {
      if (im.importDesc?.tag === 0x00) { // TODO: funcidx
        const jsFunc = this.#importObject[im.moduleName!][im.objectName!] as Function
        const jsFuncType = typeSection!.funcTypes[im.importDesc.index!]
        const func = new WasmFunction(jsFuncType, new JsFuncInstruction(jsFuncType, jsFunc))
        this.#context.functions.push(func)
      } else {
        throw new Error(`not yet: ${im.importDesc?.index}`)
      }
    })

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
      } else {
        throw new Error(`not yet: ${exp.exportDesc?.index}`)
      }
    })
  }
}

class WasmFunction {
  #funcType:FuncTypeNode
  #code?:CodeNode
  #instructions:InstructionSeq | JsFuncInstruction

  constructor(funcType:FuncTypeNode, code:CodeNode | JsFuncInstruction) {
    this.#funcType = funcType
    if (code instanceof CodeNode) {
      this.#code = code
      this.#instructions = new InstructionSeq(this.#code.func?.expr?.instrs)
    } else {
      this.#instructions = code
    }
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
    const localses = this.#code?.func?.localses
    if (localses) {
      for (let i = 0; i < localses.length; i++) {
        const locals = localses[i]
        for (let j = 0; j < (locals.num || 0); j++) {
          context.locals.push(new LocalValue(locals.valType!, 0)) // initial value
        }
      }
    }

    // invoke
    this.#instructions.invoke(context)

    const resultTypes = this.#funcType.resultType.valTypes
    if (resultTypes.length === 0) {
      return null
    } else {
      return context.stack.readByValType(resultTypes[0])
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

class InstructionSeq extends Instruction {
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
    let instr = this.top
    while (instr) {
      instr = instr.invoke(context)
    }
    return undefined
  }
}

class NopInstruction extends Instruction {
  constructor(node:NopInstrNode, parent?:Instruction) {
    super(parent)
  }

  invoke(context:Context):Instruction | undefined {
    return this.next
  }
}

class BlockInstruction extends Instruction {
  #instructions: InstructionSeq

  constructor(node:BlockInstrNode, parent?:Instruction) {
    super(parent)
    this.#instructions = new InstructionSeq(node.instrs.instrs, this)
  }

  invoke(context:Context):Instruction | undefined {
    if (context.debug) console.warn("invoke block")
    return this.#instructions.top
  }

  branchIn(): Instruction | undefined {
    return this.next
  }
}

class LoopInstruction extends Instruction {
  #instructions: InstructionSeq

  constructor(node:LoopInstrNode, parent?:Instruction) {
    super(parent)
    this.#instructions = new InstructionSeq(node.instrs.instrs, this)
  }

  invoke(context:Context):Instruction | undefined {
    if (context.debug) console.warn("invoke loop")
    return this.#instructions.top
  }

  branchIn(): Instruction | undefined {
    return this.#instructions.top
  }
}

class IfInstruction extends Instruction {
  #thenInstructions: InstructionSeq
  #elseInstructions: InstructionSeq

  constructor(node:IfInstrNode, parent?:Instruction) {
    super(parent)
    this.#thenInstructions = new InstructionSeq(node.thenInstrs.instrs, this)
    this.#elseInstructions = new InstructionSeq(node.elseInstrs?.instrs, this)
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

  branchIn(): Instruction | undefined {
    return this.next
  }
}

class BrInstruction extends Instruction {
  #labelIdx: number

  constructor(node:BrInstrNode, parent?:Instruction) {
    super(parent)
    this.#labelIdx = node.labelIdx
  }

  invoke(context:Context):Instruction | undefined {
    if (context.debug) console.warn("invoke br")

    let label = 0
    let parent = this.parent
    while (parent) {
      if (parent instanceof IfInstruction || parent instanceof BlockInstruction || parent instanceof LoopInstruction) {
        if (label === this.#labelIdx) {
          return parent.branchIn()
        }
        label++
      }
      parent = parent.parent
    }
    throw new Error(`branch error: ${this.#labelIdx} ${label}`)
  }
}

class BrIfInstruction extends BrInstruction {
  constructor(node:BrIfInstrNode, parent?:Instruction) {
    super(node, parent)
  }

  invoke(context:Context):Instruction | undefined {
    if (context.debug) console.warn("invoke br_if")

    const cond = context.stack.readI32()
    if (cond === 0) {
      return this.next
    }

    return super.invoke(context)
  }
}

class CallInstruction extends Instruction {
  #funcIdx: number

  constructor(node:CallInstrNode, parent?:Instruction) {
    super(parent)
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
  #num: number

  constructor(node:I32ConstInstrNode, parent?:Instruction) {
    super(parent)
    this.#num = node.num
  }

  invoke(context:Context):Instruction | undefined {
    if (context.debug) console.warn("invoke i32.const")
    context.stack.writeI32(this.#num)
    return this.next
  }
}

class I32EqzInstruction extends Instruction {
  constructor(node:I32EqzInstrNode, parent?:Instruction) {
    super(parent)
  }

  invoke(context:Context):Instruction | undefined {
    if (context.debug) console.warn("invoke i32.eqz")
    const num = context.stack.readS32()
    context.stack.writeI32(num === 0 ? 1 : 0)
    return this.next
  }
}

class I32LtSInstruction extends Instruction {
  constructor(node:I32LtSInstrNode, parent?:Instruction) {
    super(parent)
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
  constructor(node:I32GeSInstrNode, parent?:Instruction) {
    super(parent)
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
  constructor(node:I32GeUInstrNode, parent?:Instruction) {
    super(parent)
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
  constructor(node:I32AddInstrNode, parent?:Instruction) {
    super(parent)
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
  constructor(node:I32RemSInstrNode, parent?:Instruction) {
    super(parent)
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
  #localIdx: number

  constructor(node:LocalGetInstrNode, parent?:Instruction) {
    super(parent)
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
  #localIdx: number

  constructor(node:LocalSetInstrNode, parent?:Instruction) {
    super(parent)
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
  #type:ValType
  #value:number

  get value():number {
    return this.#value
  }

  set value(val:number) {
    this.#value = val
  }

  constructor(type:ValType, value:number) {
    this.#type = type
    this.#value = value
  }

  store(buffer:Buffer) {
    buffer.writeByValType(this.#type, this.#value)
  }

  load(buffer:Buffer) {
    this.#value = buffer.readByValType(this.#type)
  }
}

class JsFuncInstruction extends Instruction {
  #funcType:FuncTypeNode
  #func:Function

  constructor(funcType:FuncTypeNode, func:Function) {
    super()
    this.#funcType = funcType
    this.#func = func
  }

  invoke(context:Context):undefined {
    if (context.debug) console.warn(`invoke js function: ${this.#func.name}`)

    // invoke
    const args = context.locals.map(lv => lv.value)
    const result = this.#func.apply(null, args)

    // write result
    const valType = this.#funcType.resultType?.valTypes[0]
    if (valType) {
      context.stack.writeByValType(valType, result)
    }

    return undefined
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