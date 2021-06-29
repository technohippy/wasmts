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
  imports: ImportNode[] = []

  load(buffer:Buffer) {
    this.imports = buffer.readVec<ImportNode>(():ImportNode => {
      const im = new ImportNode()
      im.load(buffer)
      return im
    })
  }

  store(buffer:Buffer) {
    buffer.writeByte(2) // TODO: ID
    const sectionsBuffer = new Buffer({buffer:new ArrayBuffer(1024)}) // TODO: 1024 may not be enough.
    sectionsBuffer.writeVec<ImportNode>(this.imports, (im:ImportNode) => {
      im.store(sectionsBuffer)
    })
    buffer.append(sectionsBuffer)
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
  tables:TableNode[] = []

  load(buffer:Buffer) {
    this.tables = buffer.readVec<TableNode>(():TableNode => {
      const tab = new TableNode()
      tab.load(buffer)
      return tab
    })
  }

  store(buffer:Buffer) {
    buffer.writeByte(4) // TODO: ID
    const sectionsBuffer = new Buffer({buffer:new ArrayBuffer(1024)}) // TODO: 1024 may not be enough.
    sectionsBuffer.writeVec<MemoryNode>(this.tables, (tab:TableNode) => {
      tab.store(sectionsBuffer)
    })
    buffer.append(sectionsBuffer)
  }
}

class MemorySectionNode extends SectionNode {
  memories:MemoryNode[] = []

  load(buffer:Buffer) {
    this.memories = buffer.readVec<MemoryNode>(():MemoryNode => {
      const mem = new MemoryNode()
      mem.load(buffer)
      return mem
    })
  }

  store(buffer:Buffer) {
    buffer.writeByte(5) // TODO: ID
    const sectionsBuffer = new Buffer({buffer:new ArrayBuffer(1024)}) // TODO: 1024 may not be enough.
    sectionsBuffer.writeVec<MemoryNode>(this.memories, (mem:MemoryNode) => {
      mem.store(sectionsBuffer)
    })
    buffer.append(sectionsBuffer)
  }
}

class GlobalSectionNode extends SectionNode {
  globals: GlobalNode[] = []

  load(buffer:Buffer) {
    this.globals = buffer.readVec<GlobalNode>(():GlobalNode => {
      const g = new GlobalNode()
      g.load(buffer)
      return g
    })
  }

  store(buffer:Buffer) {
    buffer.writeByte(6) // TODO: ID
    const sectionsBuffer = new Buffer({buffer:new ArrayBuffer(1024)}) // TODO: 1024 may not be enough.
    sectionsBuffer.writeVec<GlobalNode>(this.globals, (g:GlobalNode) => {
      g.store(sectionsBuffer)
    })
    buffer.append(sectionsBuffer)
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
  start?:StartNode

  load(buffer:Buffer) {
    this.start = new StartNode()
    this.start.load(buffer)
  }

  store(buffer:Buffer) {
    if (this.start === undefined) return 

    buffer.writeByte(8) // TODO: ID
    const sectionBuffer = new Buffer({buffer:new ArrayBuffer(1024)}) // TODO: 1024 may not be enough.
    this.start.store(sectionBuffer)
    buffer.append(sectionBuffer)
  }
}

class ElementSectionNode extends SectionNode {
  elements:ElementNode[] = []

  load(buffer:Buffer) {
    this.elements = buffer.readVec<ElementNode>(():ElementNode => {
      const elem = new ElementNode()
      elem.load(buffer)
      return elem
    })
  }

  store(buffer:Buffer) {
    buffer.writeByte(9) // TODO: ID
    const sectionsBuffer = new Buffer({buffer:new ArrayBuffer(1024)}) // TODO: 1024 may not be enough.
    sectionsBuffer.writeVec(this.elements, (elem:ElementNode) => {
      elem.store(sectionsBuffer)
    })
    buffer.append(sectionsBuffer)
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
  datas: DataNode[] = []

  load(buffer:Buffer) {
    this.datas = buffer.readVec<DataNode>(():DataNode => {
      const data = new DataNode()
      data.load(buffer)
      return data
    })
  }

  store(buffer:Buffer) {
    buffer.writeByte(11) // TODO: ID
    const sectionsBuffer = new Buffer({buffer:new ArrayBuffer(1024)}) // TODO: 1024 may not be enough.
    sectionsBuffer.writeVec(this.datas, (data:DataNode) => {
      data.store(sectionsBuffer)
    })
    buffer.append(sectionsBuffer)
  }
}

class DataCountSectionNode extends SectionNode {
  load(buffer:Buffer) {
    console.warn("ignore datacount section")
  }

  store(buffer:Buffer) {
    console.warn("ignore datacount section")
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

class StartNode {
  funcId?:FuncIdx

  load(buffer:Buffer) {
    this.funcId = buffer.readByte() as FuncIdx
  }

  store(buffer:Buffer) {
    if (this.funcId === undefined) {
      throw new Error("invalid funcId")
    }
    buffer.writeByte(this.funcId)
  }
}

class ElementNode {
  mode?:number // TODO:仕様書が読めない
  tag?:number
  tableIdx?:TableIdx
  expr?:ExprNode
  exprs?:ExprNode[]
  refType?:RefType
  kind?:ElementKind
  funcIdxs?:FuncIdx[]

  load(buffer:Buffer) {
    this.tag = buffer.readByte()
    if (this.tag === 0x00) {
      this.expr = new ExprNode()
      this.expr.load(buffer)
      this.funcIdxs = buffer.readVec<number>(():number => {
        return buffer.readIndex()
      })
    } else if (this.tag === 0x01) {
      this.kind = buffer.readByte() as ElementKind
      this.funcIdxs = buffer.readVec<number>(():number => {
        return buffer.readIndex()
      })
    } else if (this.tag === 0x02) {
      this.tableIdx = buffer.readIndex()
      this.expr = new ExprNode()
      this.expr.load(buffer)
      this.kind = buffer.readByte() as ElementKind
      this.funcIdxs = buffer.readVec<number>(():number => {
        return buffer.readIndex()
      })
    } else if (this.tag === 0x03) {
      this.kind = buffer.readByte() as ElementKind
      this.funcIdxs = buffer.readVec<number>(():number => {
        return buffer.readIndex()
      })
    } else if (this.tag === 0x04) {
      this.expr = new ExprNode()
      this.expr.load(buffer)
      this.exprs = buffer.readVec<ExprNode>(():ExprNode => {
        const expr = new ExprNode()
        expr.load(buffer)
        return expr
      })
    } else if (this.tag === 0x05) {
      this.refType = buffer.readByte() as RefType
      this.exprs = buffer.readVec<ExprNode>(():ExprNode => {
        const expr = new ExprNode()
        expr.load(buffer)
        return expr
      })
    } else if (this.tag === 0x06) {
      this.tableIdx = buffer.readIndex()
      this.expr = new ExprNode()
      this.expr.load(buffer)
      this.refType = buffer.readByte() as RefType
      this.exprs = buffer.readVec<ExprNode>(():ExprNode => {
        const expr = new ExprNode()
        expr.load(buffer)
        return expr
      })
    } else if (this.tag === 0x07) {
      this.refType = buffer.readByte() as RefType
      this.exprs = buffer.readVec<ExprNode>(():ExprNode => {
        const expr = new ExprNode()
        expr.load(buffer)
        return expr
      })
    }
  }

  store(buffer:Buffer) {
    buffer.writeByte(this.tag!)
    if (this.tag === 0x00) {
      this.expr!.store(buffer)
      buffer.writeVec(this.funcIdxs!, (funcIdx:number) => {
        buffer.writeIndex(funcIdx)
      })
    } else if (this.tag === 0x01) {
      buffer.writeByte(this.kind!)
      buffer.writeVec(this.funcIdxs!, (funcIdx:number) => {
        buffer.writeIndex(funcIdx)
      })
    } else if (this.tag === 0x02) {
      buffer.writeIndex(this.tableIdx!)
      this.expr!.store(buffer)
      buffer.writeByte(this.kind!)
      buffer.writeVec(this.funcIdxs!, (funcIdx:number) => {
        buffer.writeIndex(funcIdx)
      })
    } else if (this.tag === 0x03) {
      buffer.writeByte(this.kind!)
      buffer.writeVec(this.funcIdxs!, (funcIdx:number) => {
        buffer.writeIndex(funcIdx)
      })
    } else if (this.tag === 0x04) {
      this.expr!.store(buffer)
      buffer.writeVec(this.exprs!, (expr:ExprNode) => {
        expr.store(buffer)
      })
    } else if (this.tag === 0x05) {
      buffer.writeByte(this.refType!)
      buffer.writeVec(this.exprs!, (expr:ExprNode) => {
        expr.store(buffer)
      })
    } else if (this.tag === 0x06) {
      buffer.writeIndex(this.tableIdx!)
      this.expr!.store(buffer)
      buffer.writeByte(this.refType!)
      buffer.writeVec(this.exprs!, (expr:ExprNode) => {
        expr.store(buffer)
      })
    } else if (this.tag === 0x07) {
      buffer.writeByte(this.refType!)
      buffer.writeVec(this.exprs!, (expr:ExprNode) => {
        expr.store(buffer)
      })
    }
  }
}

export class CodeNode {
  size?: number
  func?: FuncNode

  load(buffer:Buffer) {
    this.size = buffer.readU32()
    const funcBuffer = buffer.readBuffer(this.size)
    this.func = new FuncNode()
    this.func.load(funcBuffer)
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

class ImportNode {
  moduleName?:string
  objectName?:string
  importDesc?:ImportDescNode

  load(buffer:Buffer) {
    this.moduleName = buffer.readName()
    this.objectName = buffer.readName()
    this.importDesc = new ImportDescNode()
    this.importDesc.load(buffer)
  }

  store(buffer:Buffer) {
    if (this.moduleName === undefined || 
        this.objectName === undefined || 
        this.importDesc === undefined) {
      throw new Error("invalid export")
    }

    buffer.writeName(this.moduleName)
    buffer.writeName(this.objectName)
    this.importDesc.store(buffer)
  }
}

class ImportDescNode {
  tag?:number
  index?:number
  tableType?:TableTypeNode
  memType?:MemoryTypeNode
  globalType?:GlobalTypeNode

  load(buffer:Buffer) {
    this.tag = buffer.readByte()
    if (this.tag === 0x00) {
      this.index = buffer.readU32()
    } else if (this.tag === 0x01) {
      this.tableType = new TableTypeNode()
      this.tableType.load(buffer)
    } else if (this.tag === 0x02) {
      this.memType = new MemoryTypeNode()
      this.memType.load(buffer)
    } else if (this.tag === 0x03) {
      this.globalType = new GlobalTypeNode()
      this.globalType.load(buffer)
    } else {
      throw new Error(`invalid import desc:${this.tag}`)
    }
  }

  store(buffer:Buffer) {
    if (this.tag === undefined) {
      throw new Error("invalid importdesc")
    }

    buffer.writeByte(this.tag)
    if (this.tag === 0x00) {
      buffer.writeU32(this.index!)
    } else if (this.tag === 0x01) {
      throw new Error("not yet")
    } else if (this.tag === 0x02) {
      this.memType!.store(buffer)
    } else if (this.tag === 0x03) {
      this.globalType!.store(buffer)
    } else {
      throw new Error(`invalid import desc:${this.tag}`)
    }
  }
}

class TableNode {
  type?:TableTypeNode

  load(buffer:Buffer) {
    this.type = new TableTypeNode()
    this.type.load(buffer)
  }

  store(buffer:Buffer) {
    if (this.type === undefined) {
      throw new Error("invalid table")
    }

    this.type.store(buffer)
  }
}

class TableTypeNode {
  refType?:number
  limits?:LimitsNode

  load(buffer:Buffer) {
    this.limits = new LimitsNode()
    this.refType = buffer.readByte()
    this.limits.load(buffer)
  }

  store(buffer:Buffer) {
    if (this.refType === undefined || this.limits === undefined) {
      throw new Error("invalid tableType")
    }

    buffer.writeByte(this.refType)
    this.limits.store(buffer)
  }
}

class MemoryNode {
  type?:MemoryTypeNode

  load(buffer:Buffer) {
    this.type = new MemoryTypeNode()
    this.type.load(buffer)
  }

  store(buffer:Buffer) {
    if (this.type === undefined) {
      throw new Error("invalid memory")
    }

    this.type.store(buffer)
  }
}

class MemoryTypeNode {
  limits?:LimitsNode

  load(buffer:Buffer) {
    this.limits = new LimitsNode()
    this.limits.load(buffer)
  }

  store(buffer:Buffer) {
    if (this.limits === undefined) {
      throw new Error("invalid limits")
    }

    this.limits.store(buffer)
  }
}

class LimitsNode {
  min?:number
  max?:number

  load(buffer:Buffer) {
    const tag = buffer.readByte()
    if (tag === 0x00) {
      this.min = buffer.readU32()
    } else if (tag === 0x01) {
      this.min = buffer.readU32()
      this.max = buffer.readU32()
    } else {
      throw new Error(`invalid limits: ${tag}`)
    }
  }

  store(buffer:Buffer) {
    if (this.min === undefined) {
      throw new Error("invalid limits")
    }

    if (this.max === undefined) {
      buffer.writeByte(0x00)
      buffer.writeU32(this.min)
    } else {
      buffer.writeByte(0x01)
      buffer.writeU32(this.min)
      buffer.writeU32(this.max)
    }
  }
}

class GlobalNode {
  globalType?:GlobalTypeNode
  expr?:ExprNode

  load(buffer:Buffer) {
    this.globalType = new GlobalTypeNode()
    this.globalType.load(buffer)
    this.expr = new ExprNode()
    this.expr.load(buffer)
  }

  store(buffer:Buffer) {
    if (this.globalType === undefined || 
        this.expr === undefined) {
      throw new Error("invalid export")
    }

    this.globalType.store(buffer)
    this.expr.store(buffer)
  }
}

export class GlobalTypeNode {
  valType?:ValType
  mut?:number // 0x00:const, 0x01:var

  load(buffer:Buffer) {
    this.valType = buffer.readByte() as ValType
    this.mut = buffer.readByte()
  }

  store(buffer:Buffer) {
    if (this.valType === undefined || this.mut === undefined) {
      throw new Error("invalid globaltype")
    }

    buffer.writeByte(this.valType)
    buffer.writeByte(this.mut)
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

export class ExprNode {
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
      [Op.BrTable]: BrTableInstrNode,
      [Op.Call]: CallInstrNode,
      [Op.CallIndirect]: CallIndirectInstrNode,
      [Op.GlobalGet]: GlobalGetInstrNode,
      [Op.GlobalSet]: GlobalSetInstrNode,
      [Op.I32Load]: I32LoadInstrNode,
      [Op.I32Store]: I32StoreInstrNode,
      [Op.I32Const]: I32ConstInstrNode,
      [Op.I32Eqz]: I32EqzInstrNode,
      [Op.I32LtS]: I32LtSInstrNode,
      [Op.I32GeS]: I32GeSInstrNode,
      [Op.I32GeU]: I32GeUInstrNode,
      [Op.I32Add]: I32AddInstrNode,
      [Op.I32RemS]: I32RemSInstrNode,
      [Op.LocalGet]: LocalGetInstrNode,
      [Op.LocalSet]: LocalSetInstrNode,
      [Op.LocalTee]: LocalTeeInstrNode,
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
    this.thenInstrs.endOp = this.elseInstrs ? Op.Else : Op.End
    this.thenInstrs.store(buffer)
    this.elseInstrs?.store(buffer)
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
}

export class BrIfInstrNode extends InstrNode {
  labelIdx!: LabelIdx

  load(buffer:Buffer) {
    this.labelIdx = buffer.readIndex()
  }

  store(buffer:Buffer) {
    if (this.labelIdx === undefined) {
      throw new Error("invalid br_if")
    }

    super.store(buffer)
    buffer.writeIndex(this.labelIdx)
  }
}

export class BrTableInstrNode extends InstrNode {
  labelIdxs: LabelIdx[] = []
  labelIdx!: LabelIdx

  load(buffer:Buffer) {
    this.labelIdxs = buffer.readVec<LabelIdx>(():LabelIdx => {
      return buffer.readIndex()
    })
    this.labelIdx = buffer.readIndex()
  }

  store(buffer:Buffer) {
    if (this.labelIdx === undefined) {
      throw new Error("invalid br_table")
    }

    super.store(buffer)
    buffer.writeVec<LabelIdx>(this.labelIdxs, (l:LabelIdx) => {
      buffer.writeIndex(l)
    })
    buffer.writeIndex(this.labelIdx)
  }
}

export class CallInstrNode extends InstrNode {
  funcIdx!: FuncIdx

  load(buffer:Buffer) {
    this.funcIdx = buffer.readIndex()
  }

  store(buffer:Buffer) {
    if (this.funcIdx === undefined) {
      throw new Error("invalid call")
    }

    super.store(buffer)
    buffer.writeIndex(this.funcIdx)
  }
}

export class CallIndirectInstrNode extends InstrNode {
  typeIdx!: TypeIdx
  tableIdx!: TableIdx

  load(buffer:Buffer) {
    this.typeIdx = buffer.readIndex()
    this.tableIdx = buffer.readIndex()
  }

  store(buffer:Buffer) {
    if (this.typeIdx === undefined || this.tableIdx === undefined) {
      throw new Error("invalid call_indirect")
    }

    super.store(buffer)
    buffer.writeIndex(this.typeIdx)
    buffer.writeIndex(this.tableIdx)
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
}

export class LocalTeeInstrNode extends InstrNode {
  localIdx!: number

  load(buffer:Buffer) {
    this.localIdx = buffer.readU32()
  }

  store(buffer:Buffer) {
    if (this.localIdx === undefined) {
      throw new Error("invalid local.tee")
    }

    super.store(buffer)
    buffer.writeU32(this.localIdx)
  }
}

export class GlobalGetInstrNode extends InstrNode {
  globalIdx!: number

  load(buffer:Buffer) {
    this.globalIdx = buffer.readU32()
  }

  store(buffer:Buffer) {
    if (this.globalIdx === undefined) {
      throw new Error("invalid global.get")
    }

    super.store(buffer)
    buffer.writeU32(this.globalIdx)
  }
}

export class GlobalSetInstrNode extends InstrNode {
  globalIdx!: number

  load(buffer:Buffer) {
    this.globalIdx = buffer.readU32()
  }

  store(buffer:Buffer) {
    if (this.globalIdx === undefined) {
      throw new Error("invalid global.set")
    }

    super.store(buffer)
    buffer.writeU32(this.globalIdx)
  }
}

export class I32LoadInstrNode extends InstrNode {
  memarg!:MemArgNode

  load(buffer:Buffer) {
    this.memarg = new MemArgNode()
    this.memarg.load(buffer)
  }

  store(buffer:Buffer) {
    if (this.memarg === undefined) {
      throw new Error("invalid i32.load")
    }

    super.store(buffer)
    this.memarg.store(buffer)
  }
}

export class I32StoreInstrNode extends InstrNode {
  memarg!:MemArgNode

  load(buffer:Buffer) {
    this.memarg = new MemArgNode()
    this.memarg.load(buffer)
  }

  store(buffer:Buffer) {
    if (this.memarg === undefined) {
      throw new Error("invalid i32.store")
    }

    super.store(buffer)
    this.memarg.store(buffer)
  }
}

class MemArgNode {
  align?:number
  offset?:number

  load(buffer:Buffer) {
    this.align = buffer.readU32()
    this.offset = buffer.readU32()
  }

  store(buffer:Buffer) {
    if (this.align === undefined || this.offset === undefined) {
      throw new Error("invalid memarg")
    }

    buffer.writeU32(this.align)
    buffer.writeU32(this.offset)
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
}

export class I32EqzInstrNode extends InstrNode {
}

export class I32LtSInstrNode extends InstrNode {
}

export class I32GeSInstrNode extends InstrNode {
}

export class I32GeUInstrNode extends InstrNode {
}

export class I32AddInstrNode extends InstrNode {
}

export class I32RemSInstrNode extends InstrNode {
}

class DataNode {
  #active = false
  tag?: number
  memidx?: MemIdx
  expr?: ExprNode
  bytes?: number[]

  load(buffer:Buffer) {
    this.tag = buffer.readByte()
    if (this.tag === 0x00) {
      this.#active = true
      this.expr = new ExprNode()
      this.expr.load(buffer)
      this.bytes = buffer.readVec<number>(():number => {
        return buffer.readByte()
      })
    } else if (this.tag === 0x01) {
      this.#active = false
      this.bytes = buffer.readVec<number>(():number => {
        return buffer.readByte()
      })
    } else if (this.tag === 0x02) {
      this.#active = true
      this.memidx = buffer.readIndex()
      this.expr = new ExprNode()
      this.expr.load(buffer)
      this.bytes = buffer.readVec<number>(():number => {
        return buffer.readByte()
      })
    } else {
      throw new Error(`invalid data: ${this.tag}`)
    }
  }

  store(buffer:Buffer) {
    if (this.bytes === undefined) {
      throw new Error("invalid data")
    }

    buffer.writeByte(this.tag!)
    if (this.tag === 0x00) {
      this.expr!.store(buffer)
      buffer.writeVec(this.bytes, (byte:number) => {
        buffer.writeByte(byte)
      })
    } else if (this.tag === 0x01) {
      buffer.writeVec(this.bytes, (byte:number) => {
        buffer.writeByte(byte)
      })
    } else if (this.tag === 0x02) {
      buffer.writeIndex(this.memidx!)
      this.expr!.store(buffer)
      buffer.writeVec(this.bytes, (byte:number) => {
        buffer.writeByte(byte)
      })
    } else {
      throw new Error(`invalid data: ${this.tag}`)
    }
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
export type ValType = NumType | RefType
type S33 = number
type BlockType = 0x40 | ValType | S33
type ElementKind = 0x00

const Op = {
  Block: 0x02,
  Loop: 0x03,
  If: 0x04,
  Else: 0x05,
  Br: 0x0c,
  BrIf: 0x0d,
  BrTable: 0x0e,
  Call: 0x10,
  CallIndirect: 0x11,
  LocalGet: 0x20,
  LocalSet: 0x21,
  LocalTee: 0x22,
  GlobalGet: 0x23,
  GlobalSet: 0x24,
  I32Load: 0x28,
  I32Store: 0x36,
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