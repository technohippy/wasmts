// deno run --allow-read src/wasmloader.ts test/data/wasm/module.wasm

import { Binary } from "./binary.ts"

export class ModuleNode {
  magic?: ArrayBuffer
  version?: ArrayBuffer
  sections: SectionNode[] = []

  load(binary:Binary) {
    this.magic = binary.readBytes(4)
    this.version = binary.readBytes(4)
    while (true) {
      if (binary.eof) break

      const section = this.loadSection(binary)
      this.sections.push(section)
    }
  }

  loadSection(binary:Binary): SectionNode {
    const sectionId = binary.readByte()
    const sectionSize = binary.readU32()
    const sectionsBinary = binary.readBinary(sectionSize)

    const sectionClass = SectionNode.classById(sectionId)
    //@ts-ignore
    const section = new sectionClass()
    section.load(sectionsBinary)
    return section
  }

  store(binary:Binary) {
    if (this.magic) binary.writeBytes(this.magic)
    if (this.version) binary.writeBytes(this.version)
    for (const section of this.sections) {
      section.store(binary)
    }
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

  abstract load(binary:Binary): void
  abstract store(binary:Binary): void
}

class CustomSectionNode extends SectionNode {
  name?:string
  bytes?:Binary

  load(binary:Binary) {
    this.name = binary.readName()
    this.bytes = binary.readBinary()
  }

  store(binary:Binary) {
    throw new Error("not yet")
  }
}

class TypeSectionNode extends SectionNode {
  funcTypes:FuncTypeNode[] = []

  load(binary:Binary) {
    this.funcTypes = binary.readVec<FuncTypeNode>(():FuncTypeNode => {
      const functype = new FuncTypeNode()
      functype.load(binary)
      return functype
    })
  }

  store(binary:Binary) {
    binary.writeByte(1) // TODO: ID
    const sectionsBinary = new Binary({buffer:new ArrayBuffer(1024)}) // TODO: 1024 may not be enough.
    sectionsBinary.writeVec(this.funcTypes, (funcType:FuncTypeNode) => {
      funcType.store(sectionsBinary)
    })
    binary.append(sectionsBinary)
  }
}

class ImportSectionNode extends SectionNode {
  load(binary:Binary) {
  }

  store(binary:Binary) {
    throw new Error("not yet")
  }
}

class FunctionSectionNode extends SectionNode {
  typeIdxs:TypeIdx[] = []

  load(binary:Binary) {
    this.typeIdxs = binary.readVec<TypeIdx>(():TypeIdx => {
      return binary.readU32() as TypeIdx
    })
  }

  store(binary:Binary) {
    binary.writeByte(3) // TODO: ID
    const sectionsBinary = new Binary({buffer:new ArrayBuffer(1024)}) // TODO: 1024 may not be enough.
    sectionsBinary.writeVec<TypeIdx>(this.typeIdxs, (typeIdx:TypeIdx) => {
      sectionsBinary.writeU32(typeIdx)
    })
    binary.append(sectionsBinary)
  }
}

class TableSectionNode extends SectionNode {
  load(binary:Binary) {
  }

  store(binary:Binary) {
    throw new Error("not yet")
  }
}

class MemorySectionNode extends SectionNode {
  load(binary:Binary) {
  }

  store(binary:Binary) {
    throw new Error("not yet")
  }
}

class GlobalSectionNode extends SectionNode {
  load(binary:Binary) {
  }

  store(binary:Binary) {
    throw new Error("not yet")
  }
}

class ExportSectionNode extends SectionNode {
  exports: ExportNode[] = []

  load(binary:Binary) {
    this.exports = binary.readVec<ExportNode>(():ExportNode => {
      const ex = new ExportNode()
      ex.load(binary)
      return ex
    })
  }

  store(binary:Binary) {
    binary.writeByte(7) // TODO: ID
    const sectionsBinary = new Binary({buffer:new ArrayBuffer(1024)}) // TODO: 1024 may not be enough.
    sectionsBinary.writeVec<ExportNode>(this.exports, (ex:ExportNode) => {
      ex.store(sectionsBinary)
    })
    binary.append(sectionsBinary)
  }
}

class StartSectionNode extends SectionNode {
  load(binary:Binary) {
  }

  store(binary:Binary) {
    throw new Error("not yet")
  }
}

class ElementSectionNode extends SectionNode {
  load(binary:Binary) {
  }

  store(binary:Binary) {
    throw new Error("not yet")
  }
}

class CodeSectionNode extends SectionNode {
  codes: CodeNode[] = []

  load(binary:Binary) {
    this.codes = binary.readVec<CodeNode>(():CodeNode => {
      const code = new CodeNode()
      code.load(binary)
      return code
    })
  }

  store(binary:Binary) {
    binary.writeByte(10) // TODO: ID
    const sectionsBinary = new Binary({buffer:new ArrayBuffer(1024)}) // TODO: 1024 may not be enough.
    sectionsBinary.writeVec(this.codes, (code:CodeNode) => {
      code.store(sectionsBinary)
    })
    binary.append(sectionsBinary)
  }
}

class DataSectionNode extends SectionNode {
  load(binary:Binary) {
  }

  store(binary:Binary) {
    throw new Error("not yet")
  }
}

class DataCountSectionNode extends SectionNode {
  load(binary:Binary) {
  }

  store(binary:Binary) {
    throw new Error("not yet")
  }
}

class FuncTypeNode {
  static get TAG() { return 0x60 }

  paramType = new ResultTypeNode()
  resultType = new ResultTypeNode()

  load(binary:Binary) {
    if (binary.readByte() !== FuncTypeNode.TAG) {
      throw new Error("invalid functype")
    }
    this.paramType = new ResultTypeNode()
    this.paramType.load(binary)
    this.resultType = new ResultTypeNode()
    this.resultType.load(binary)
  }

  store(binary:Binary) {
    binary.writeByte(0x60)
    this.paramType.store(binary)
    this.resultType.store(binary)
  }
}

class ResultTypeNode {
  valTypes: ValType[] = []

  load(binary:Binary) {
    this.valTypes = binary.readVec<ValType>(():ValType => {
      return binary.readByte() as ValType
    })
  }

  store(binary:Binary) {
    binary.writeVec<ValType>(this.valTypes, (valType:ValType) => {
      binary.writeByte(valType)
    })
  }
}

class CodeNode {
  size?: number
  func?: FuncNode

  load(binary:Binary) {
    this.size = binary.readU32()
    this.func = new FuncNode()
    this.func.load(binary)
  }

  store(binary:Binary) {
    const funcBinary = new Binary({buffer:new ArrayBuffer(1024)}) // TODO
    this.func?.store(funcBinary)
    binary.append(funcBinary)
  }
}

class FuncNode {
  localses: LocalsNode[] = []
  expr?: ExprNode

  load(binary:Binary) {
    this.localses = binary.readVec<LocalsNode>(():LocalsNode => {
      const locals = new LocalsNode()
      locals.load(binary)
      return locals
    })
    this.expr = new ExprNode()
    this.expr.load(binary)
  }

  store(binary:Binary) {
    binary.writeVec<LocalsNode>(this.localses, (locals:LocalsNode) => {
      locals.store(binary)
    })
    this.expr?.store(binary)
  }
}

class LocalsNode {
  num?: number
  valType?: ValType

  load(binary:Binary) {
    this.num = binary.readU32()
    this.valType = binary.readByte() as ValType
  }

  store(binary:Binary) {
    if (this.num === undefined || this.valType === undefined) {
      throw new Error("invalid locals")
    }

    binary.writeU32(this.num)
    binary.writeByte(this.valType)
  }
}

class ExportNode {
  name?:string
  exportDesc?:ExportDescNode

  load(binary:Binary) {
    this.name = binary.readName()
    this.exportDesc = new ExportDescNode()
    this.exportDesc.load(binary)
  }

  store(binary:Binary) {
    if (this.name === undefined || this.exportDesc === undefined) {
      throw new Error("invalid export")
    }

    binary.writeName(this.name)
    this.exportDesc.store(binary)
  }
}

class ExportDescNode {
  tag?:number
  index?:number

  load(binary:Binary) {
    this.tag = binary.readByte()
    this.index = binary.readU32()
  }

  store(binary:Binary) {
    if (this.tag === undefined || this.index === undefined) {
      throw new Error("invalid exportdesc")
    }

    binary.writeByte(this.tag)
    binary.writeU32(this.index)
  }
}

class ExprNode {
  instrs: InstrNode[] = []

  load(binary:Binary) {
    while (true) {
      const opcode = binary.readByte() as Op
      if (opcode === Op.End) break

      const instrClass = InstrNode.classByOpcode(opcode)
      if (!instrClass) {
        throw new Error(`invalid opcode: 0x${opcode.toString(16)}`)
      }

      const instr = new instrClass(opcode)
      instr.load(binary)
      this.instrs.push(instr)

      if (binary.eof) break
    }
  }

  store(binary:Binary) {
    for (const instr of this.instrs) {
      instr.store(binary)
    }
    binary.writeByte(Op.End)
  }
}

class InstrNode {
  opcode: Op

  static classByOpcode(opcode:Op): typeof InstrNode | undefined {
    return {
      [Op.End]: NopInstrNode,
      [Op.Block]: BlockInstrNode,
      [Op.Loop]: LoopInstrNode,
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

  load(binary:Binary) {
    // nop
  }

  store(binary:Binary) {
    throw new Error(`subclass responsibility: ${this.constructor.name}`)
  }
}

class BlockInstrNode extends InstrNode {
  blockType?: BlockType
  instrs?: ExprNode

  load(binary:Binary) {
    this.blockType = binary.readByte()
    this.instrs = new ExprNode()
    this.instrs.load(binary)
  }

  store(binary:Binary) {
    if (this.blockType === undefined || this.instrs === undefined) {
      throw new Error("invalid block")
    }

    binary.writeByte(0x02)
    binary.writeByte(this.blockType)
    this.instrs.store(binary)
  }
}

class LoopInstrNode extends InstrNode {
  blockType?: BlockType
  instrs?: ExprNode

  load(binary:Binary) {
    this.blockType = binary.readByte()
    this.instrs = new ExprNode()
    this.instrs.load(binary)
  }

  store(binary:Binary) {
    if (this.blockType === undefined || this.instrs === undefined) {
      throw new Error("invalid loop")
    }

    binary.writeByte(0x03)
    binary.writeByte(this.blockType)
    this.instrs.store(binary)
  }
}

class BrInstrNode extends InstrNode {
  labelIdx?: LabelIdx

  load(binary:Binary) {
    this.labelIdx = binary.readU32()
  }

  store(binary:Binary) {
    if (this.labelIdx === undefined) {
      throw new Error("invalid br")
    }

    binary.writeByte(0x0c)
    binary.writeU32(this.labelIdx)
  }
}

class BrIfInstrNode extends InstrNode {
  labelIdx?: LabelIdx

  load(binary:Binary) {
    this.labelIdx = binary.readU32()
  }

  store(binary:Binary) {
    if (this.labelIdx === undefined) {
      throw new Error("invalid br_if")
    }

    binary.writeByte(0x0d)
    binary.writeU32(this.labelIdx)
  }
}

class NopInstrNode extends InstrNode {

}

class LocalGetInstrNode extends InstrNode {
  localIdx?: number

  load(binary:Binary) {
    this.localIdx = binary.readU32()
  }

  store(binary:Binary) {
    if (this.localIdx === undefined) {
      throw new Error("invalid local.get")
    }

    binary.writeByte(Op.LocalGet)
    binary.writeU32(this.localIdx)
  }
}

class LocalSetInstrNode extends InstrNode {
  localIdx?: number

  load(binary:Binary) {
    this.localIdx = binary.readU32()
  }

  store(binary:Binary) {
    if (this.localIdx === undefined) {
      throw new Error("invalid local.set")
    }

    binary.writeByte(Op.LocalGet)
    binary.writeU32(this.localIdx)
  }
}

class I32ConstInstrNode extends InstrNode {
  num?: number

  load(binary:Binary) {
    this.num = binary.readI32()
  }

  store(binary:Binary) {
    if (this.num === undefined) {
      throw new Error("invalid number")
    }
    binary.writeByte(Op.I32Const)
    binary.writeI32(this.num)
  }
}

class I32GeUInstrNode extends InstrNode {
  store(binary:Binary) {
    binary.writeByte(Op.I32GeU)
  }
}

class I32AddInstrNode extends InstrNode {
  store(binary:Binary) {
    binary.writeByte(Op.I32Add)
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