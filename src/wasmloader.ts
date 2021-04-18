// deno run --allow-read src/wasmloader.ts test/data/wasm/module.wasm
export class Binary {
  #cursor = 0
  #buffer: ArrayBuffer
  #view: DataView

  get cursor(): number {
    return this.#cursor
  }

  get eof(): boolean {
    return this.#buffer.byteLength <= this.#cursor
  }

  constructor({buffer}:{buffer:ArrayBuffer}) {
    this.#buffer = buffer
    this.#view = new DataView(buffer, 0)
  }

  // pos is relative position based on the cursor
  peek(pos:number=0): number {
    return this.#view.getUint32(this.#cursor+pos)
  }

  readByte(): number {
    const bytes = this.readBytes(1)
    if (bytes.length <= 0) {
      return -1
    }
    return bytes[0]
  }

  readBytes(size:number): Uint8Array {
    if (this.#buffer.byteLength < this.#cursor+size) {
      return new Uint8Array(0)
    }

    const slice = this.#buffer.slice(this.#cursor, this.#cursor+size)
    this.#cursor += size
    return new Uint8Array(slice)
  }

  readBinary(size:number=this.#buffer.byteLength-this.#cursor): Binary {
    return new Binary(this.readBytes(size))
  }

  readU32(): number{
    let num = 0
    let fig = 0
    while (true) {
      const b = this.readByte()
      num = num | ((b & 0b01111111) << (7*fig))
      if ((b & 0b10000000) === 0) break
      fig++
    }
    if (0xffffffff < num) {
      throw "too large"
    }
    return num
  }

  readS32(): number{
    let num = 0
    let rnum = 0
    let fig = 0
    let negative = false
    while (true) {
      const b = this.readByte()
      num = num | ((b & 0b01111111) << (7*fig))
      rnum = rnum | (((b ^ 0b11111111) & 0b01111111) << (7*fig))
      if ((b & 0b10000000) === 0) {
        negative = (b & 0b01000000) > 0
        break
      }
      fig++
    }
    if (negative) {
      if (0xffffffff < rnum) {
        throw "too large"
      }
      return -(rnum+1)
    } else {
      if (0xffffffff < num) {
        throw "too large"
      }
      return num
    }
  }

  readI32(): number {
    return this.readS32()
  }

  readName(): string {
    const size = this.readU32()
    const bytes = this.readBytes(size)
    return new TextDecoder("utf-8").decode(bytes.buffer)
  }

  readVec<T>(readT:()=>T): T[] {
    const vec = []
    const size = this.readU32()
    for (let i = 0; i < size; i++) {
      vec.push(readT())
    }
    return vec
  }
}

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
    const section = new sectionClass()
    section.load(sectionsBinary)
    return section
  }
}

class SectionNode {
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

  load(binary:Binary) {
    throw new Error("subclass responsibility")
  }
}

class CustomSectionNode extends SectionNode {
  name?:string
  bytes?:Binary

  load(binary:Binary) {
    this.name = binary.readName()
    this.bytes = binary.readBinary()
  }
}

class TypeSectionNode extends SectionNode {
  funcTypes?:FuncTypeNode[]

  load(binary:Binary) {
    this.funcTypes = binary.readVec<FuncTypeNode>(():FuncTypeNode => {
      const functype = new FuncTypeNode()
      functype.load(binary)
      return functype
    })
  }
}

class ImportSectionNode extends SectionNode {
  load(binary:Binary) {
  }
}

class FunctionSectionNode extends SectionNode {
  typeIdxs?:TypeIdx[]

  load(binary:Binary) {
    this.typeIdxs = binary.readVec<TypeIdx>(():TypeIdx => {
      return binary.readU32() as TypeIdx
    })
  }
}

class TableSectionNode extends SectionNode {
  load(binary:Binary) {
  }
}

class MemorySectionNode extends SectionNode {
  load(binary:Binary) {
  }
}

class GlobalSectionNode extends SectionNode {
  load(binary:Binary) {
  }
}

class ExportSectionNode extends SectionNode {
  load(binary:Binary) {
  }
}

class StartSectionNode extends SectionNode {
  load(binary:Binary) {
  }
}

class ElementSectionNode extends SectionNode {
  load(binary:Binary) {
  }
}

class CodeSectionNode extends SectionNode {
  codes?: CodeNode[]

  load(binary:Binary) {
    this.codes = binary.readVec<CodeNode>(():CodeNode => {
      const code = new CodeNode()
      code.load(binary)
      return code
    })
  }
}

class DataSectionNode extends SectionNode {
  load(binary:Binary) {
  }
}

class DataCountSectionNode extends SectionNode {
  load(binary:Binary) {
  }
}

class FuncTypeNode {
  static get TAG() { return 0x60 }

  paramType?: ResultTypeNode
  resultType?: ResultTypeNode

  load(binary:Binary) {
    if (binary.readByte() !== FuncTypeNode.TAG) {
      throw new Error("invalid functype")
    }
    this.paramType = new ResultTypeNode()
    this.paramType.load(binary)
    this.resultType = new ResultTypeNode()
    this.resultType.load(binary)
  }
}

class ResultTypeNode {
  valTypes?: ValType[]

  load(binary:Binary) {
    this.valTypes = binary.readVec<ValType>(():ValType => {
      return binary.readByte() as ValType
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
}

class FuncNode {
  localses?: LocalsNode[]
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
}

class LocalsNode {
  num?: number
  valType?: ValType

  load(binary:Binary) {
    this.num = binary.readU32()
    this.valType = binary.readByte() as ValType
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
}

class BlockInstrNode extends InstrNode {
  blockType?: BlockType
  instrs?: ExprNode

  load(binary:Binary) {
    this.blockType = binary.readByte()
    this.instrs = new ExprNode()
    this.instrs.load(binary)
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
}

class BrInstrNode extends InstrNode {
  labelIdx?: LabelIdx

  load(binary:Binary) {
    this.labelIdx = binary.readU32()
  }
}

class BrIfInstrNode extends InstrNode {
  labelIdx?: LabelIdx

  load(binary:Binary) {
    this.labelIdx = binary.readU32()
  }
}

class NopInstrNode extends InstrNode {

}

class LocalGetInstrNode extends InstrNode {
  localIdx?: number

  load(binary:Binary) {
    this.localIdx = binary.readU32()
  }
}

class LocalSetInstrNode extends InstrNode {
  localIdx?: number

  load(binary:Binary) {
    this.localIdx = binary.readU32()
  }
}

class I32ConstInstrNode extends InstrNode {
  num?: number

  load(binary:Binary) {
    this.num = binary.readI32()
  }
}

class I32GeUInstrNode extends InstrNode {
}

class I32AddInstrNode extends InstrNode {
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