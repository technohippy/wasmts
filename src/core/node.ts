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
      if (section.constructor === cls) {
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

    const sectionClass = SectionNode.classById(sectionId)
    //@ts-ignore
    const section = new sectionClass()
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
  static classById(sectionId:number): typeof SectionNode {
    return [
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
    buffer.writeByte(0x60)
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

      const instrClass = InstrNode.classByOpcode(opcode)
      if (!instrClass) {
        throw new Error(`invalid opcode: 0x${opcode.toString(16)}`)
      }

      const instr = new instrClass(opcode)
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
}

class InstrNode {
  opcode: Op

  static classByOpcode(opcode:Op): typeof InstrNode | undefined {
    return {
      [Op.End]: NopInstrNode,
      [Op.Else]: NopInstrNode,
      [Op.Block]: BlockInstrNode,
      [Op.Loop]: LoopInstrNode,
      [Op.If]: IfInstrNode,
      [Op.Br]: BrInstrNode,
      [Op.BrIf]: BrIfInstrNode,
      [Op.I32Const]: I32ConstInstrNode,
      [Op.I32GeU]: I32GeUInstrNode,
      [Op.I32Add]: I32AddInstrNode,
      [Op.LocalGet]: LocalGetInstrNode,
      [Op.LocalSet]: LocalSetInstrNode,
    }[opcode]
  }

  constructor(opcode:Op) {
    this.opcode = opcode
  }

  load(buffer:Buffer) {
    // nop
  }

  store(buffer:Buffer) {
    throw new Error(`subclass responsibility: ${this.constructor.name}`)
  }

  invoke(context:Context) {
    throw new Error(`subclass responsibility: ${this.constructor.name}`)
  }
}

class BlockInstrNode extends InstrNode {
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

    buffer.writeByte(0x02)
    buffer.writeByte(this.blockType)
    this.instrs.store(buffer)
  }

  invoke(context:Context) {
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

class LoopInstrNode extends InstrNode {
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

    buffer.writeByte(0x03)
    buffer.writeByte(this.blockType)
    this.instrs.store(buffer)
  }

  invoke(context:Context) {
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

class IfInstrNode extends InstrNode {
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

    buffer.writeByte(0x04) // TODO
    buffer.writeByte(this.blockType)
    this.thenInstrs.store(buffer)
    this.elseInstrs?.store(buffer)
  }

  invoke(context:Context) {
    const cond = context.stack.readI32()
    if (cond !== 0) {
      // TODO: brとかreturnとか
      for (const instr of this.thenInstrs.instrs) {
        instr.invoke(context)
      }
    } else if (this.elseInstrs !== undefined) {
      // TODO: brとかreturnとか
      for (const instr of this.elseInstrs.instrs) {
        instr.invoke(context)
      }
    }
  }
}

class BrInstrNode extends InstrNode {
  labelIdx!: LabelIdx

  load(buffer:Buffer) {
    this.labelIdx = buffer.readU32()
  }

  store(buffer:Buffer) {
    if (this.labelIdx === undefined) {
      throw new Error("invalid br")
    }

    buffer.writeByte(0x0c)
    buffer.writeU32(this.labelIdx)
  }
  
  invoke(context:Context) {
    context.branch = this.labelIdx
  }
}

class BrIfInstrNode extends InstrNode {
  labelIdx!: LabelIdx

  load(buffer:Buffer) {
    this.labelIdx = buffer.readU32()
  }

  store(buffer:Buffer) {
    if (this.labelIdx === undefined) {
      throw new Error("invalid br_if")
    }

    buffer.writeByte(0x0d)
    buffer.writeU32(this.labelIdx)
  }
  
  invoke(context:Context) {
    const cond = context.stack.readI32()
    if (cond !== 0) {
      context.branch = this.labelIdx
    }
  }
}

class NopInstrNode extends InstrNode {

}

class LocalGetInstrNode extends InstrNode {
  localIdx!: number

  load(buffer:Buffer) {
    this.localIdx = buffer.readU32()
  }

  store(buffer:Buffer) {
    if (this.localIdx === undefined) {
      throw new Error("invalid local.get")
    }

    buffer.writeByte(Op.LocalGet)
    buffer.writeU32(this.localIdx)
  }

  invoke(context:Context) {
    const local = context.locals[this.localIdx]
    local.store(context.stack)
  }
}

class LocalSetInstrNode extends InstrNode {
  localIdx!: number

  load(buffer:Buffer) {
    this.localIdx = buffer.readU32()
  }

  store(buffer:Buffer) {
    if (this.localIdx === undefined) {
      throw new Error("invalid local.set")
    }

    buffer.writeByte(Op.LocalSet)
    buffer.writeU32(this.localIdx)
  }

  invoke(context:Context) {
    const local = context.locals[this.localIdx]
    local.load(context.stack)
  }
}

class I32ConstInstrNode extends InstrNode {
  num!: number

  load(buffer:Buffer) {
    this.num = buffer.readI32()
  }

  store(buffer:Buffer) {
    if (this.num === undefined) {
      throw new Error("invalid number")
    }
    buffer.writeByte(Op.I32Const)
    buffer.writeI32(this.num)
  }

  invoke(context:Context) {
    context.stack.writeI32(this.num)
  }
}

class I32GeUInstrNode extends InstrNode {
  store(buffer:Buffer) {
    buffer.writeByte(Op.I32GeU)
  }

  invoke(context:Context) {
    const rhs = context.stack.readI32()
    const lhs = context.stack.readI32()
    context.stack.writeI32(lhs >= rhs ? 1 : 0)
  }
}

class I32AddInstrNode extends InstrNode {
  store(buffer:Buffer) {
    buffer.writeByte(Op.I32Add)
  }

  invoke(context:Context) {
    const rhs = context.stack.readI32()
    const lhs = context.stack.readI32()
    context.stack.writeI32(lhs+rhs)
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
  LocalGet: 0x20,
  LocalSet: 0x21,
  I32Const: 0x41,
  I32GeU: 0x4f,
  I32Add: 0x6a,
  End: 0x0b,
} as const
type Op = typeof Op[keyof typeof Op]; 