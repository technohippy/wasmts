// deno run --allow-read src/wasmloader.ts test/data/wasm/module.wasm

import { Buffer } from "./buffer.ts"
import { Instance, Context } from "./instance.ts"

export class ModuleNode {
  magic?: ArrayBuffer
  version?: ArrayBuffer
  sections: SectionNode[] = []

  get customSection():CustomSectionNode[] {
    const ret:CustomSectionNode[] = []
    for (const section of this.sections) {
      if (section instanceof CustomSectionNode) {
        ret.push(section)
      }
    }
    return ret
  }

  get typeSection():TypeSectionNode | null {
    return this.getSection<TypeSectionNode>(TypeSectionNode)
  }

  get importSection():ImportSectionNode | null {
    return this.getSection<ImportSectionNode>(ImportSectionNode)
  }

  get functionSection():FunctionSectionNode | null {
    return this.getSection<FunctionSectionNode>(FunctionSectionNode)
  }

  get tableSection():TableSectionNode | null {
    return this.getSection<TableSectionNode>(TableSectionNode)
  }

  get memorySection():MemorySectionNode | null {
    return this.getSection<MemorySectionNode>(MemorySectionNode)
  }

  get globalSection():GlobalSectionNode | null {
    return this.getSection<GlobalSectionNode>(GlobalSectionNode)
  }

  get exportSection():ExportSectionNode | null {
    return this.getSection<ExportSectionNode>(ExportSectionNode)
  }

  get startSection():StartSectionNode | null {
    return this.getSection<StartSectionNode>(StartSectionNode)
  }

  get elementSection():ElementSectionNode | null {
    return this.getSection<ElementSectionNode>(ElementSectionNode)
  }

  get codeSection():CodeSectionNode | null {
    return this.getSection<CodeSectionNode>(CodeSectionNode)
  }
  
  get dataSection():DataSectionNode | null {
    return this.getSection<DataSectionNode>(DataSectionNode)
  }

  get dataCountSection():DataCountSectionNode | null {
    return this.getSection<DataCountSectionNode>(DataCountSectionNode)
  }

  getSection<S extends SectionNode>(cls:Function):S | null {
    for (const section of this.sections) {
      if (section instanceof cls) {
        return section as S
      }
    }
    return null
  }

  load(buffer:Buffer) {
    this.magic = buffer.readBytes(4)
    this.version = buffer.readBytes(4)
    while (true) {
      if (buffer.eof) break

      const section = this.loadSection(buffer)
      this.sections.push(section)
    }
  }

  loadSection(buffer:Buffer): SectionNode {
    const sectionId = buffer.readByte()
    const sectionSize = buffer.readU32()
    const sectionsBuffer = buffer.readBuffer(sectionSize)

    const section = SectionNode.create(sectionId)
    if (!section) {
      throw new Error(`invalid section: ${sectionId}`)
    }
    section.load(sectionsBuffer)
    return section
  }

  store(buffer:Buffer) {
    if (this.magic) buffer.writeBytes(this.magic)
    if (this.version) buffer.writeBytes(this.version)
    for (const section of this.sections) {
      section.store(buffer)
    }
  }

  instantiate(importObject?:any):Instance {
    const inst = new Instance(this, importObject)
    inst.compile()
    return inst
  }
}

abstract class SectionNode {
  static create(sectionId:number): SectionNode | undefined {
    const klass = [
      CustomSectionNode,
      TypeSectionNode,
      ImportSectionNode,
      FunctionSectionNode,
      TableSectionNode,
      MemorySectionNode,
      GlobalSectionNode,
      ExportSectionNode,
      StartSectionNode,
      ElementSectionNode,
      CodeSectionNode,
      DataSectionNode,
      DataCountSectionNode
    ][sectionId]
    if (!klass) return undefined
    return new klass()
  }

  abstract load(buffer:Buffer): void
  abstract store(buffer:Buffer): void
}

class CustomSectionNode extends SectionNode {
  name?:string
  bytes?:Buffer

  load(buffer:Buffer) {
    this.name = buffer.readName()
    this.bytes = buffer.readBuffer()
  }

  store(buffer:Buffer) {
    throw new Error("not yet")
  }
}

class TypeSectionNode extends SectionNode {
  funcTypes:FuncTypeNode[] = []

  load(buffer:Buffer) {
    this.funcTypes = buffer.readVec<FuncTypeNode>(():FuncTypeNode => {
      const functype = new FuncTypeNode()
      functype.load(buffer)
      return functype
    })
  }

  store(buffer:Buffer) {
    buffer.writeByte(1) // TODO: ID
    const sectionsBuffer = new Buffer({buffer:new ArrayBuffer(1024)}) // TODO: 1024 may not be enough.
    sectionsBuffer.writeVec(this.funcTypes, (funcType:FuncTypeNode) => {
      funcType.store(sectionsBuffer)
    })
    buffer.append(sectionsBuffer)
  }
}

class ImportSectionNode extends SectionNode {
  load(buffer:Buffer) {
  }

  store(buffer:Buffer) {
    throw new Error("not yet")
  }
}

class FunctionSectionNode extends SectionNode {
  typeIdxs:TypeIdx[] = []

  load(buffer:Buffer) {
    this.typeIdxs = buffer.readVec<TypeIdx>(():TypeIdx => {
      return buffer.readU32() as TypeIdx
    })
  }

  store(buffer:Buffer) {
    buffer.writeByte(3) // TODO: ID
    const sectionsBuffer = new Buffer({buffer:new ArrayBuffer(1024)}) // TODO: 1024 may not be enough.
    sectionsBuffer.writeVec<TypeIdx>(this.typeIdxs, (typeIdx:TypeIdx) => {
      sectionsBuffer.writeU32(typeIdx)
    })
    buffer.append(sectionsBuffer)
  }
}

class TableSectionNode extends SectionNode {
  load(buffer:Buffer) {
  }

  store(buffer:Buffer) {
    throw new Error("not yet")
  }
}

class MemorySectionNode extends SectionNode {
  load(buffer:Buffer) {
  }

  store(buffer:Buffer) {
    throw new Error("not yet")
  }
}

class GlobalSectionNode extends SectionNode {
  load(buffer:Buffer) {
  }

  store(buffer:Buffer) {
    throw new Error("not yet")
  }
}

class ExportSectionNode extends SectionNode {
  exports: ExportNode[] = []

  load(buffer:Buffer) {
    this.exports = buffer.readVec<ExportNode>(():ExportNode => {
      const ex = new ExportNode()
      ex.load(buffer)
      return ex
    })
  }

  store(buffer:Buffer) {
    buffer.writeByte(7) // TODO: ID
    const sectionsBuffer = new Buffer({buffer:new ArrayBuffer(1024)}) // TODO: 1024 may not be enough.
    sectionsBuffer.writeVec<ExportNode>(this.exports, (ex:ExportNode) => {
      ex.store(sectionsBuffer)
    })
    buffer.append(sectionsBuffer)
  }
}

class StartSectionNode extends SectionNode {
  load(buffer:Buffer) {
  }

  store(buffer:Buffer) {
    throw new Error("not yet")
  }
}

class ElementSectionNode extends SectionNode {
  load(buffer:Buffer) {
  }

  store(buffer:Buffer) {
    throw new Error("not yet")
  }
}

class CodeSectionNode extends SectionNode {
  codes: CodeNode[] = []

  load(buffer:Buffer) {
    this.codes = buffer.readVec<CodeNode>(():CodeNode => {
      const code = new CodeNode()
      code.load(buffer)
      return code
    })
  }

  store(buffer:Buffer) {
    buffer.writeByte(10) // TODO: ID
    const sectionsBuffer = new Buffer({buffer:new ArrayBuffer(1024)}) // TODO: 1024 may not be enough.
    sectionsBuffer.writeVec(this.codes, (code:CodeNode) => {
      code.store(sectionsBuffer)
    })
    buffer.append(sectionsBuffer)
  }
}

class DataSectionNode extends SectionNode {
  load(buffer:Buffer) {
  }

  store(buffer:Buffer) {
    throw new Error("not yet")
  }
}

class DataCountSectionNode extends SectionNode {
  load(buffer:Buffer) {
  }

  store(buffer:Buffer) {
    throw new Error("not yet")
  }
}

export class FuncTypeNode {
  static get TAG() { return 0x60 }

  paramType = new ResultTypeNode()
  resultType = new ResultTypeNode()

  load(buffer:Buffer) {
    if (buffer.readByte() !== FuncTypeNode.TAG) {
      throw new Error("invalid functype")
    }
    this.paramType = new ResultTypeNode()
    this.paramType.load(buffer)
    this.resultType = new ResultTypeNode()
    this.resultType.load(buffer)
  }

  store(buffer:Buffer) {
    buffer.writeByte(FuncTypeNode.TAG)
    this.paramType.store(buffer)
    this.resultType.store(buffer)
  }
}

class ResultTypeNode {
  valTypes: ValType[] = []

  load(buffer:Buffer) {
    this.valTypes = buffer.readVec<ValType>(():ValType => {
      return buffer.readByte() as ValType
    })
  }

  store(buffer:Buffer) {
    buffer.writeVec<ValType>(this.valTypes, (valType:ValType) => {
      buffer.writeByte(valType)
    })
  }
}

export class CodeNode {
  size?: number
  func?: FuncNode

  load(buffer:Buffer) {
    this.size = buffer.readU32()
    this.func = new FuncNode()
    this.func.load(buffer) // TODO: ここでsizeを使うべき？
  }

  store(buffer:Buffer) {
    const funcBuffer = new Buffer({buffer:new ArrayBuffer(1024)}) // TODO
    this.func?.store(funcBuffer)
    buffer.append(funcBuffer)
  }
}

class FuncNode {
  localses: LocalsNode[] = []
  expr?: ExprNode

  load(buffer:Buffer) {
    this.localses = buffer.readVec<LocalsNode>(():LocalsNode => {
      const locals = new LocalsNode()
      locals.load(buffer)
      return locals
    })
    this.expr = new ExprNode()
    this.expr.load(buffer)
  }

  store(buffer:Buffer) {
    buffer.writeVec<LocalsNode>(this.localses, (locals:LocalsNode) => {
      locals.store(buffer)
    })
    this.expr?.store(buffer)
  }
}

class LocalsNode {
  num?: number
  valType?: ValType

  load(buffer:Buffer) {
    this.num = buffer.readU32()
    this.valType = buffer.readByte() as ValType
  }

  store(buffer:Buffer) {
    if (this.num === undefined || this.valType === undefined) {
      throw new Error("invalid locals")
    }

    buffer.writeU32(this.num)
    buffer.writeByte(this.valType)
  }
}

class ExportNode {
  name?:string
  exportDesc?:ExportDescNode

  load(buffer:Buffer) {
    this.name = buffer.readName()
    this.exportDesc = new ExportDescNode()
    this.exportDesc.load(buffer)
  }

  store(buffer:Buffer) {
    if (this.name === undefined || this.exportDesc === undefined) {
      throw new Error("invalid export")
    }

    buffer.writeName(this.name)
    this.exportDesc.store(buffer)
  }
}

class ExportDescNode {
  tag?:number
  index?:number

  load(buffer:Buffer) {
    this.tag = buffer.readByte()
    this.index = buffer.readU32()
  }

  store(buffer:Buffer) {
    if (this.tag === undefined || this.index === undefined) {
      throw new Error("invalid exportdesc")
    }

    buffer.writeByte(this.tag)
    buffer.writeU32(this.index)
  }
}

class ExprNode {
  instrs: InstrNode[] = []
  endOp!: Op

  load(buffer:Buffer) {
    while (true) {
      const opcode = buffer.readByte() as Op
      if (opcode === Op.End || opcode === Op.Else) {
        this.endOp = opcode
        break
      }

      const instr = InstrNode.create(opcode)
      if (!instr) {
        throw new Error(`invalid opcode: 0x${opcode.toString(16)}`)
      }
      instr.load(buffer)
      this.instrs.push(instr)

      if (buffer.eof) break
    }
  }

  store(buffer:Buffer) {
    for (const instr of this.instrs) {
      instr.store(buffer)
    }
    buffer.writeByte(this.endOp)
  }

  invoke(context:Context) {
    for (const instr of this.instrs) {
      instr.invoke(context)
    }
  }
}

export class InstrNode {
  opcode: Op

  static create(opcode:Op): InstrNode | undefined {
    const klass = {
      [Op.End]: NopInstrNode,
      [Op.Else]: NopInstrNode,
      [Op.Block]: BlockInstrNode,
      [Op.Loop]: LoopInstrNode,
      [Op.If]: IfInstrNode,
      [Op.Br]: BrInstrNode,
      [Op.BrIf]: BrIfInstrNode,
      [Op.Call]: CallInstrNode,
      [Op.I32Const]: I32ConstInstrNode,
      [Op.I32Eqz]: I32EqzInstrNode,
      [Op.I32LtS]: I32LtSInstrNode,
      [Op.I32GeS]: I32GeSInstrNode,
      [Op.I32GeU]: I32GeUInstrNode,
      [Op.I32Add]: I32AddInstrNode,
      [Op.I32RemS]: I32RemSInstrNode,
      [Op.LocalGet]: LocalGetInstrNode,
      [Op.LocalSet]: LocalSetInstrNode,
    }[opcode]
    if (!klass) return undefined
    return new klass(opcode)
  }

  constructor(opcode:Op) {
    this.opcode = opcode
  }

  load(buffer:Buffer) {
    // nop
  }

  store(buffer:Buffer) {
    buffer.writeByte(this.opcode)
  }

  invoke(context:Context) {
    throw new Error(`subclass responsibility: ${this.constructor.name}`)
  }
}

export class BlockInstrNode extends InstrNode {
  blockType!: BlockType
  instrs!: ExprNode

  load(buffer:Buffer) {
    this.blockType = buffer.readByte()
    this.instrs = new ExprNode()
    this.instrs.load(buffer)
  }

  store(buffer:Buffer) {
    if (this.blockType === undefined || this.instrs === undefined) {
      throw new Error("invalid block")
    }

    super.store(buffer)
    buffer.writeByte(this.blockType)
    this.instrs.store(buffer)
  }

  invoke(context:Context) {
    if (context.debug) console.warn("invoke block")

    let br = false
    while (true) {
      context.depth += 1
      context.branch -= 1
      for (const instr of this.instrs.instrs) {
        instr.invoke(context)
        if (0 <= context.branch) {
          context.branch -= 1
          br = true
          break
        }
      }
      context.depth -= 1
      if (br) break
    }
  }
}

export class LoopInstrNode extends InstrNode {
  blockType!: BlockType
  instrs!: ExprNode

  load(buffer:Buffer) {
    this.blockType = buffer.readByte()
    this.instrs = new ExprNode()
    this.instrs.load(buffer)
  }

  store(buffer:Buffer) {
    if (this.blockType === undefined || this.instrs === undefined) {
      throw new Error("invalid loop")
    }

    super.store(buffer)
    buffer.writeByte(this.blockType)
    this.instrs.store(buffer)
  }

  invoke(context:Context) {
    if (context.debug) console.warn("invoke loop")

    let br = false
    while (true) {
      context.depth += 1
      context.branch -= 1
      for (const instr of this.instrs.instrs) {
        instr.invoke(context)
        if (0 <= context.branch) {
          context.branch -= 1
          br = true
          break
        }
      }
      context.depth -= 1
      if (br) break
    }
  }
}

export class IfInstrNode extends InstrNode {
  blockType!: BlockType
  thenInstrs!: ExprNode
  elseInstrs?: ExprNode

  load(buffer:Buffer) {
    this.blockType = buffer.readByte()
    this.thenInstrs = new ExprNode()
    this.thenInstrs.load(buffer)
    if (this.thenInstrs.endOp === Op.Else) {
      this.elseInstrs = new ExprNode()
      this.elseInstrs.load(buffer)
    }
  }

  store(buffer:Buffer) {
    if (this.blockType === undefined || this.thenInstrs === undefined) {
      throw new Error("invalid if")
    }

    super.store(buffer)
    buffer.writeByte(this.blockType)
    this.thenInstrs.store(buffer)
    this.elseInstrs?.store(buffer)
  }

  invoke(context:Context) {
    if (context.debug) console.warn("invoke if")

    const cond = context.stack.readI32()
    if (cond !== 0) {
      // TODO: brとかreturnとか
      this.thenInstrs.invoke(context)
    } else {
      // TODO: brとかreturnとか
      this.elseInstrs?.invoke(context)
    }
  }
}

export class BrInstrNode extends InstrNode {
  labelIdx!: LabelIdx

  load(buffer:Buffer) {
    this.labelIdx = buffer.readU32()
  }

  store(buffer:Buffer) {
    if (this.labelIdx === undefined) {
      throw new Error("invalid br")
    }

    super.store(buffer)
    buffer.writeU32(this.labelIdx)
  }
  
  invoke(context:Context) {
    if (context.debug) console.warn("invoke br")
    context.branch = this.labelIdx
  }
}

export class BrIfInstrNode extends InstrNode {
  labelIdx!: LabelIdx

  load(buffer:Buffer) {
    this.labelIdx = buffer.readU32()
  }

  store(buffer:Buffer) {
    if (this.labelIdx === undefined) {
      throw new Error("invalid br_if")
    }

    super.store(buffer)
    buffer.writeU32(this.labelIdx)
  }
  
  invoke(context:Context) {
    if (context.debug) console.warn("invoke br_if")
    const cond = context.stack.readI32()
    if (cond !== 0) {
      context.branch = this.labelIdx
    }
  }
}

export class CallInstrNode extends InstrNode {
  funcIdx!: FuncIdx

  load(buffer:Buffer) {
    this.funcIdx = buffer.readU32()
  }

  store(buffer:Buffer) {
    if (this.funcIdx === undefined) {
      throw new Error("invalid call")
    }

    super.store(buffer)
    buffer.writeU32(this.funcIdx)
  }

  invoke(context:Context) {
    if (context.debug) console.warn("invoke call")
    const func = context.functions[this.funcIdx]
    const result = func.invoke(context)
    if (result) {
      context.stack.writeI32(result) // TODO: type
    }
  }
}

export class NopInstrNode extends InstrNode {

}

export class LocalGetInstrNode extends InstrNode {
  localIdx!: number

  load(buffer:Buffer) {
    this.localIdx = buffer.readU32()
  }

  store(buffer:Buffer) {
    if (this.localIdx === undefined) {
      throw new Error("invalid local.get")
    }

    super.store(buffer)
    buffer.writeU32(this.localIdx)
  }

  invoke(context:Context) {
    if (context.debug) console.warn("invoke local.get")
    const local = context.locals[this.localIdx]
    local.store(context.stack)
  }
}

export class LocalSetInstrNode extends InstrNode {
  localIdx!: number

  load(buffer:Buffer) {
    this.localIdx = buffer.readU32()
  }

  store(buffer:Buffer) {
    if (this.localIdx === undefined) {
      throw new Error("invalid local.set")
    }

    super.store(buffer)
    buffer.writeU32(this.localIdx)
  }

  invoke(context:Context) {
    if (context.debug) console.warn("invoke local.set")
    const local = context.locals[this.localIdx]
    local.load(context.stack)
  }
}

export class I32ConstInstrNode extends InstrNode {
  num!: number

  load(buffer:Buffer) {
    this.num = buffer.readI32()
  }

  store(buffer:Buffer) {
    if (this.num === undefined) {
      throw new Error("invalid number")
    }
    super.store(buffer)
    buffer.writeI32(this.num)
  }

  invoke(context:Context) {
    if (context.debug) console.warn("invoke i32.const")
    context.stack.writeI32(this.num)
  }
}

export class I32EqzInstrNode extends InstrNode {
  invoke(context:Context) {
    if (context.debug) console.warn("invoke i32.eqz")
    const num = context.stack.readS32()
    context.stack.writeI32(num === 0 ? 1 : 0)
  }
}

export class I32LtSInstrNode extends InstrNode {
  invoke(context:Context) {
    if (context.debug) console.warn("invoke i32.lt_s")
    const rhs = context.stack.readS32()
    const lhs = context.stack.readS32()
    context.stack.writeI32(lhs < rhs ? 1 : 0)
  }
}

export class I32GeSInstrNode extends InstrNode {
  invoke(context:Context) {
    if (context.debug) console.warn("invoke i32.ge_s")
    const rhs = context.stack.readS32()
    const lhs = context.stack.readS32()
    context.stack.writeI32(lhs >= rhs ? 1 : 0)
  }
}

export class I32GeUInstrNode extends InstrNode {
  invoke(context:Context) {
    if (context.debug) console.warn("invoke i32.ge_u")
    const rhs = context.stack.readU32()
    const lhs = context.stack.readU32()
    context.stack.writeI32(lhs >= rhs ? 1 : 0)
  }
}

export class I32AddInstrNode extends InstrNode {
  invoke(context:Context) {
    if (context.debug) console.warn("invoke i32.add")
    const rhs = context.stack.readI32()
    const lhs = context.stack.readI32()
    context.stack.writeI32(lhs+rhs)
  }
}

export class I32RemSInstrNode extends InstrNode {
  invoke(context:Context) {
    if (context.debug) console.warn("invoke i32.rem_s")
    const rhs = context.stack.readS32()
    const lhs = context.stack.readS32()
    context.stack.writeS32(lhs%rhs)
  }
}

type TypeIdx = number
type FuncIdx = number
type TableIdx = number
type MemIdx = number
type GlobalIdx = number
type ElemIdx = number
type DataIdx = number
type LocalIdx = number
type LabelIdx = number
type I32 = 0x7f
type I64 = 0x7e
type F32 = 0x7d
type F64 = 0x7c
type NumType = I32 | I64 | F32 | F64
type FuncRef = 0x70
type ExternRef = 0x6f
type RefType = FuncRef | ExternRef
type ValType = NumType | RefType
type S33 = number
type BlockType = 0x40 | ValType | S33

const Op = {
  Block: 0x02,
  Loop: 0x03,
  If: 0x04,
  Else: 0x05,
  Br: 0x0c,
  BrIf: 0x0d,
  Call: 0x10,
  LocalGet: 0x20,
  LocalSet: 0x21,
  I32Const: 0x41,
  I32Eqz: 0x45,
  I32LtS: 0x48,
  I32GeS: 0x4e,
  I32GeU: 0x4f,
  I32Add: 0x6a,
  I32RemS: 0x6f,
  End: 0x0b,
} as const
type Op = typeof Op[keyof typeof Op]; 