class Buffer {
    #cursor=0;
    #buffer;
    #view;
    get cursor() {
        return this.#cursor;
    }
    get buffer() {
        return this.#buffer;
    }
    get eof() {
        return this.#buffer.byteLength <= this.#cursor;
    }
    constructor({ buffer: buffer1  }){
        this.#buffer = buffer1;
        this.#view = new DataView(buffer1);
    }
    getView() {
        return this.#view;
    }
    setCursor(c) {
        this.#cursor = c;
    }
    truncate() {
        return new Buffer({
            buffer: this.#buffer.slice(0, this.#cursor)
        });
    }
    peek(pos = 0) {
        return this.#view.getUint8(pos);
    }
    append(buffer) {
        this.writeU32(buffer.cursor);
        for(let i = 0; i < buffer.cursor; i++){
            this.writeByte(buffer.peek(i));
        }
    }
    readByte() {
        const bytes = this.readBytes(1);
        if (bytes.length <= 0) {
            return -1;
        }
        return bytes[0];
    }
    readBytes(size) {
        if (this.#buffer.byteLength < this.#cursor + size) {
            return new Uint8Array(0);
        }
        const slice = this.#buffer.slice(this.#cursor, this.#cursor + size);
        this.#cursor += size;
        return new Uint8Array(slice);
    }
    readBuffer(size = this.#buffer.byteLength - this.#cursor) {
        return new Buffer(this.readBytes(size));
    }
    readU32() {
        let result = 0;
        let shift = 0;
        while(true){
            const __byte = this.readByte();
            result |= (__byte & 127) << shift;
            shift += 7;
            if ((128 & __byte) === 0) {
                return result;
            }
        }
    }
    readS32() {
        let result = 0;
        let shift = 0;
        while(true){
            const __byte = this.readByte();
            result |= (__byte & 127) << shift;
            shift += 7;
            if ((128 & __byte) === 0) {
                if (shift < 32 && (__byte & 64) !== 0) {
                    return result | ~0 << shift;
                }
                return result;
            }
        }
    }
    readI32() {
        return this.readS32();
    }
    readName() {
        const size = this.readU32();
        const bytes = this.readBytes(size);
        return new TextDecoder("utf-8").decode(bytes.buffer);
    }
    readVec(readT) {
        const vec = [];
        const size = this.readU32();
        for(let i = 0; i < size; i++){
            vec.push(readT());
        }
        return vec;
    }
    writeBytes(bytes) {
        const u8s = new Uint8Array(bytes);
        for (let __byte of u8s){
            this.writeByte(__byte);
        }
    }
    writeByte(__byte) {
        this.#view.setUint8(this.#cursor++, __byte);
    }
    writeU32(value) {
        value |= 0;
        const result = [];
        while(true){
            const __byte = value & 127;
            value >>= 7;
            if (value === 0 && (__byte & 64) === 0) {
                result.push(__byte);
                break;
            }
            result.push(__byte | 128);
        }
        const u8a = new Uint8Array(result);
        this.writeBytes(u8a.buffer);
    }
    writeS32(value) {
        value |= 0;
        const result = [];
        while(true){
            const __byte = value & 127;
            value >>= 7;
            if (value === 0 && (__byte & 64) === 0 || value === -1 && (__byte & 64) !== 0) {
                result.push(__byte);
                break;
            }
            result.push(__byte | 128);
        }
        const u8a = new Uint8Array(result);
        this.writeBytes(u8a.buffer);
    }
    writeI32(num) {
        this.writeS32(num);
    }
    writeName(name) {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(name);
        this.writeU32(bytes.length);
        this.writeBytes(bytes);
    }
    writeVec(ts, writeT) {
        this.writeU32(ts.length);
        for (const t of ts){
            writeT(t);
        }
    }
    toString() {
        let out = "";
        const u8s = new Uint8Array(this.#buffer);
        for(let i = 0; i < this.#cursor; i++){
            let h = u8s[i].toString(16);
            if (h.length === 1) h = `0${h}`;
            if (i % 16 === 15) h += "\n";
            else if (i % 8 === 7) h += "  ";
            else h += " ";
            out += h;
        }
        return out.replace(/\n$/, "");
    }
}
class StackBuffer extends Buffer {
    readBytes(size) {
        if (this.cursor - size < 0) {
            return new Uint8Array(0);
        }
        const slice = this.buffer.slice(this.cursor - size, this.cursor);
        this.setCursor(this.cursor - size);
        return new Uint8Array(slice).reverse();
    }
    writeBytes(bytes) {
        const u8s = new Uint8Array(bytes).reverse();
        for (let __byte of u8s){
            this.writeByte(__byte);
        }
    }
}
class Instance {
    #module;
    #importObject;
    #context;
    #exports;
    set debug(b) {
        this.#context.debug = b;
    }
    get debug() {
        return this.#context.debug;
    }
    get exports() {
        if (!Object.isFrozen(this.#exports)) {
            Object.freeze(this.#exports);
        }
        return this.#exports;
    }
    constructor(module, importObject1){
        this.#module = module;
        this.#importObject = importObject1;
        this.#context = new Context();
        this.#exports = {
        };
    }
    compile() {
        const typeSection = this.#module.typeSection;
        const functionSection = this.#module.functionSection;
        const codeSection = this.#module.codeSection;
        functionSection?.typeIdxs.forEach((typeIdx, i)=>{
            const func = new WasmFunction(typeSection.funcTypes[typeIdx], codeSection.codes[i]);
            this.#context.functions.push(func);
        });
        const exportSection = this.#module.exportSection;
        exportSection?.exports.forEach((exp)=>{
            if (exp.exportDesc?.tag === 0) {
                this.#exports[exp.name] = (...args)=>{
                    const result = this.#context.functions[exp.exportDesc.index].invoke(this.#context, ...args);
                    return result;
                };
            }
        });
    }
}
class ModuleNode {
    sections = [];
    get customSection() {
        const ret = [];
        for (const section of this.sections){
            if (section instanceof CustomSectionNode) {
                ret.push(section);
            }
        }
        return ret;
    }
    get typeSection() {
        return this.getSection(TypeSectionNode);
    }
    get importSection() {
        return this.getSection(ImportSectionNode);
    }
    get functionSection() {
        return this.getSection(FunctionSectionNode);
    }
    get tableSection() {
        return this.getSection(TableSectionNode);
    }
    get memorySection() {
        return this.getSection(MemorySectionNode);
    }
    get globalSection() {
        return this.getSection(GlobalSectionNode);
    }
    get exportSection() {
        return this.getSection(ExportSectionNode);
    }
    get startSection() {
        return this.getSection(StartSectionNode);
    }
    get elementSection() {
        return this.getSection(ElementSectionNode);
    }
    get codeSection() {
        return this.getSection(CodeSectionNode);
    }
    get dataSection() {
        return this.getSection(DataSectionNode);
    }
    get dataCountSection() {
        return this.getSection(DataCountSectionNode);
    }
    getSection(cls) {
        for (const section of this.sections){
            if (section instanceof cls) {
                return section;
            }
        }
        return null;
    }
    load(buffer) {
        this.magic = buffer.readBytes(4);
        this.version = buffer.readBytes(4);
        while(true){
            if (buffer.eof) break;
            const section = this.loadSection(buffer);
            this.sections.push(section);
        }
    }
    loadSection(buffer) {
        const sectionId = buffer.readByte();
        const sectionSize = buffer.readU32();
        const sectionsBuffer = buffer.readBuffer(sectionSize);
        const section = SectionNode.create(sectionId);
        if (!section) {
            throw new Error(`invalid section: ${sectionId}`);
        }
        section.load(sectionsBuffer);
        return section;
    }
    store(buffer) {
        if (this.magic) buffer.writeBytes(this.magic);
        if (this.version) buffer.writeBytes(this.version);
        for (const section of this.sections){
            section.store(buffer);
        }
    }
    instantiate(importObject) {
        const inst = new Instance(this, importObject);
        inst.compile();
        return inst;
    }
}
class SectionNode {
    static create(sectionId) {
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
        ][sectionId];
        if (!klass) return undefined;
        return new klass();
    }
}
class CustomSectionNode extends SectionNode {
    load(buffer) {
        this.name = buffer.readName();
        this.bytes = buffer.readBuffer();
    }
    store(buffer) {
        throw new Error("not yet");
    }
}
class TypeSectionNode extends SectionNode {
    funcTypes = [];
    load(buffer) {
        this.funcTypes = buffer.readVec(()=>{
            const functype = new FuncTypeNode();
            functype.load(buffer);
            return functype;
        });
    }
    store(buffer) {
        buffer.writeByte(1);
        const sectionsBuffer = new Buffer({
            buffer: new ArrayBuffer(1024)
        });
        sectionsBuffer.writeVec(this.funcTypes, (funcType)=>{
            funcType.store(sectionsBuffer);
        });
        buffer.append(sectionsBuffer);
    }
}
class ImportSectionNode extends SectionNode {
    load(buffer) {
    }
    store(buffer) {
        throw new Error("not yet");
    }
}
class FunctionSectionNode extends SectionNode {
    typeIdxs = [];
    load(buffer) {
        this.typeIdxs = buffer.readVec(()=>{
            return buffer.readU32();
        });
    }
    store(buffer) {
        buffer.writeByte(3);
        const sectionsBuffer = new Buffer({
            buffer: new ArrayBuffer(1024)
        });
        sectionsBuffer.writeVec(this.typeIdxs, (typeIdx)=>{
            sectionsBuffer.writeU32(typeIdx);
        });
        buffer.append(sectionsBuffer);
    }
}
class TableSectionNode extends SectionNode {
    load(buffer) {
    }
    store(buffer) {
        throw new Error("not yet");
    }
}
class MemorySectionNode extends SectionNode {
    load(buffer) {
    }
    store(buffer) {
        throw new Error("not yet");
    }
}
class GlobalSectionNode extends SectionNode {
    load(buffer) {
    }
    store(buffer) {
        throw new Error("not yet");
    }
}
class ExportSectionNode extends SectionNode {
    exports = [];
    load(buffer) {
        this.exports = buffer.readVec(()=>{
            const ex = new ExportNode();
            ex.load(buffer);
            return ex;
        });
    }
    store(buffer) {
        buffer.writeByte(7);
        const sectionsBuffer = new Buffer({
            buffer: new ArrayBuffer(1024)
        });
        sectionsBuffer.writeVec(this.exports, (ex)=>{
            ex.store(sectionsBuffer);
        });
        buffer.append(sectionsBuffer);
    }
}
class StartSectionNode extends SectionNode {
    load(buffer) {
    }
    store(buffer) {
        throw new Error("not yet");
    }
}
class ElementSectionNode extends SectionNode {
    load(buffer) {
    }
    store(buffer) {
        throw new Error("not yet");
    }
}
class CodeSectionNode extends SectionNode {
    codes = [];
    load(buffer) {
        this.codes = buffer.readVec(()=>{
            const code = new CodeNode();
            code.load(buffer);
            return code;
        });
    }
    store(buffer) {
        buffer.writeByte(10);
        const sectionsBuffer = new Buffer({
            buffer: new ArrayBuffer(1024)
        });
        sectionsBuffer.writeVec(this.codes, (code)=>{
            code.store(sectionsBuffer);
        });
        buffer.append(sectionsBuffer);
    }
}
class DataSectionNode extends SectionNode {
    load(buffer) {
    }
    store(buffer) {
        throw new Error("not yet");
    }
}
class DataCountSectionNode extends SectionNode {
    load(buffer) {
    }
    store(buffer) {
        throw new Error("not yet");
    }
}
class FuncTypeNode {
    static get TAG() {
        return 96;
    }
    paramType = new ResultTypeNode();
    resultType = new ResultTypeNode();
    load(buffer) {
        if (buffer.readByte() !== FuncTypeNode.TAG) {
            throw new Error("invalid functype");
        }
        this.paramType = new ResultTypeNode();
        this.paramType.load(buffer);
        this.resultType = new ResultTypeNode();
        this.resultType.load(buffer);
    }
    store(buffer) {
        buffer.writeByte(FuncTypeNode.TAG);
        this.paramType.store(buffer);
        this.resultType.store(buffer);
    }
}
class ResultTypeNode {
    valTypes = [];
    load(buffer) {
        this.valTypes = buffer.readVec(()=>{
            return buffer.readByte();
        });
    }
    store(buffer) {
        buffer.writeVec(this.valTypes, (valType)=>{
            buffer.writeByte(valType);
        });
    }
}
class CodeNode {
    load(buffer) {
        this.size = buffer.readU32();
        const funcBuffer = buffer.readBuffer(this.size);
        this.func = new FuncNode();
        this.func.load(funcBuffer);
    }
    store(buffer) {
        const funcBuffer = new Buffer({
            buffer: new ArrayBuffer(1024)
        });
        this.func?.store(funcBuffer);
        buffer.append(funcBuffer);
    }
}
class FuncNode {
    localses = [];
    load(buffer) {
        this.localses = buffer.readVec(()=>{
            const locals = new LocalsNode();
            locals.load(buffer);
            return locals;
        });
        this.expr = new ExprNode();
        this.expr.load(buffer);
    }
    store(buffer) {
        buffer.writeVec(this.localses, (locals)=>{
            locals.store(buffer);
        });
        this.expr?.store(buffer);
    }
}
class LocalsNode {
    load(buffer) {
        this.num = buffer.readU32();
        this.valType = buffer.readByte();
    }
    store(buffer) {
        if (this.num === undefined || this.valType === undefined) {
            throw new Error("invalid locals");
        }
        buffer.writeU32(this.num);
        buffer.writeByte(this.valType);
    }
}
class ExportNode {
    load(buffer) {
        this.name = buffer.readName();
        this.exportDesc = new ExportDescNode();
        this.exportDesc.load(buffer);
    }
    store(buffer) {
        if (this.name === undefined || this.exportDesc === undefined) {
            throw new Error("invalid export");
        }
        buffer.writeName(this.name);
        this.exportDesc.store(buffer);
    }
}
class ExportDescNode {
    load(buffer) {
        this.tag = buffer.readByte();
        this.index = buffer.readU32();
    }
    store(buffer) {
        if (this.tag === undefined || this.index === undefined) {
            throw new Error("invalid exportdesc");
        }
        buffer.writeByte(this.tag);
        buffer.writeU32(this.index);
    }
}
class ExprNode {
    instrs = [];
    load(buffer) {
        while(true){
            const opcode = buffer.readByte();
            if (opcode === Op.End || opcode === Op.Else) {
                this.endOp = opcode;
                break;
            }
            const instr = InstrNode.create(opcode);
            if (!instr) {
                throw new Error(`invalid opcode: 0x${opcode.toString(16)}`);
            }
            instr.load(buffer);
            this.instrs.push(instr);
            if (buffer.eof) break;
        }
    }
    store(buffer) {
        for (const instr of this.instrs){
            instr.store(buffer);
        }
        buffer.writeByte(this.endOp);
    }
}
class InstrNode {
    static create(opcode) {
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
            [Op.LocalSet]: LocalSetInstrNode
        }[opcode];
        if (!klass) return undefined;
        return new klass(opcode);
    }
    constructor(opcode){
        this.opcode = opcode;
    }
    load(buffer) {
    }
    store(buffer) {
        buffer.writeByte(this.opcode);
    }
}
class BlockInstrNode extends InstrNode {
    load(buffer) {
        this.blockType = buffer.readByte();
        this.instrs = new ExprNode();
        this.instrs.load(buffer);
    }
    store(buffer) {
        if (this.blockType === undefined || this.instrs === undefined) {
            throw new Error("invalid block");
        }
        super.store(buffer);
        buffer.writeByte(this.blockType);
        this.instrs.store(buffer);
    }
}
class LoopInstrNode extends InstrNode {
    load(buffer) {
        this.blockType = buffer.readByte();
        this.instrs = new ExprNode();
        this.instrs.load(buffer);
    }
    store(buffer) {
        if (this.blockType === undefined || this.instrs === undefined) {
            throw new Error("invalid loop");
        }
        super.store(buffer);
        buffer.writeByte(this.blockType);
        this.instrs.store(buffer);
    }
}
class IfInstrNode extends InstrNode {
    load(buffer) {
        this.blockType = buffer.readByte();
        this.thenInstrs = new ExprNode();
        this.thenInstrs.load(buffer);
        if (this.thenInstrs.endOp === Op.Else) {
            this.elseInstrs = new ExprNode();
            this.elseInstrs.load(buffer);
        }
    }
    store(buffer) {
        if (this.blockType === undefined || this.thenInstrs === undefined) {
            throw new Error("invalid if");
        }
        super.store(buffer);
        buffer.writeByte(this.blockType);
        this.thenInstrs.endOp = this.elseInstrs ? Op.Else : Op.End;
        this.thenInstrs.store(buffer);
        this.elseInstrs?.store(buffer);
    }
}
class BrInstrNode extends InstrNode {
    load(buffer) {
        this.labelIdx = buffer.readU32();
    }
    store(buffer) {
        if (this.labelIdx === undefined) {
            throw new Error("invalid br");
        }
        super.store(buffer);
        buffer.writeU32(this.labelIdx);
    }
}
class BrIfInstrNode extends InstrNode {
    load(buffer) {
        this.labelIdx = buffer.readU32();
    }
    store(buffer) {
        if (this.labelIdx === undefined) {
            throw new Error("invalid br_if");
        }
        super.store(buffer);
        buffer.writeU32(this.labelIdx);
    }
}
class CallInstrNode extends InstrNode {
    load(buffer) {
        this.funcIdx = buffer.readU32();
    }
    store(buffer) {
        if (this.funcIdx === undefined) {
            throw new Error("invalid call");
        }
        super.store(buffer);
        buffer.writeU32(this.funcIdx);
    }
}
class NopInstrNode extends InstrNode {
}
class LocalGetInstrNode extends InstrNode {
    load(buffer) {
        this.localIdx = buffer.readU32();
    }
    store(buffer) {
        if (this.localIdx === undefined) {
            throw new Error("invalid local.get");
        }
        super.store(buffer);
        buffer.writeU32(this.localIdx);
    }
}
class LocalSetInstrNode extends InstrNode {
    load(buffer) {
        this.localIdx = buffer.readU32();
    }
    store(buffer) {
        if (this.localIdx === undefined) {
            throw new Error("invalid local.set");
        }
        super.store(buffer);
        buffer.writeU32(this.localIdx);
    }
}
class I32ConstInstrNode extends InstrNode {
    load(buffer) {
        this.num = buffer.readI32();
    }
    store(buffer) {
        if (this.num === undefined) {
            throw new Error("invalid number");
        }
        super.store(buffer);
        buffer.writeI32(this.num);
    }
}
class I32EqzInstrNode extends InstrNode {
}
class I32LtSInstrNode extends InstrNode {
}
class I32GeSInstrNode extends InstrNode {
}
class I32GeUInstrNode extends InstrNode {
}
class I32AddInstrNode extends InstrNode {
}
class I32RemSInstrNode extends InstrNode {
}
const Op = {
    Block: 2,
    Loop: 3,
    If: 4,
    Else: 5,
    Br: 12,
    BrIf: 13,
    Call: 16,
    LocalGet: 32,
    LocalSet: 33,
    I32Const: 65,
    I32Eqz: 69,
    I32LtS: 72,
    I32GeS: 78,
    I32GeU: 79,
    I32Add: 106,
    I32RemS: 111,
    End: 11
};
class WasmFunction {
    #funcType;
    #code;
    #instructions;
    constructor(funcType, code){
        this.#funcType = funcType;
        this.#code = code;
        this.#instructions = new InstructionSeq(this.#code.func?.expr?.instrs);
    }
    invoke(context, ...args) {
        const params = [
            ...args
        ];
        const paramTypes = this.#funcType.paramType.valTypes;
        for(let i = 0; i < paramTypes.length - args.length; i++){
            const param = context.stack.readI32();
            params.push(param);
        }
        params.forEach((v, i1)=>{
            context.locals[i1] = new LocalValue(paramTypes[i1], v);
        });
        const localses = this.#code.func?.localses;
        if (localses) {
            for(let i1 = 0; i1 < localses.length; i1++){
                const locals = localses[i1];
                for(let j = 0; j < (locals.num || 0); j++){
                    context.locals.push(new LocalValue(locals.valType, 0));
                }
            }
        }
        let instr = this.#instructions.top;
        while(instr){
            instr = instr.invoke(context);
        }
        const resultTypes = this.#funcType.resultType.valTypes;
        if (resultTypes.length === 0) {
            return null;
        } else {
            switch(resultTypes[0]){
                case 127:
                    return context.stack.readI32();
                default:
                    throw new Error(`invalid result type: ${resultTypes[0]}`);
            }
        }
    }
}
class Instruction {
    #next;
    get next() {
        if (this.#next) {
            return this.#next;
        } else {
            return this.parent?.next;
        }
    }
    set next(instr) {
        this.#next = instr;
    }
    constructor(parent1){
        this.parent = parent1;
    }
    static create(node, parent) {
        if (node instanceof NopInstrNode) {
            return new NopInstruction(node, parent);
        } else if (node instanceof BlockInstrNode) {
            return new BlockInstruction(node, parent);
        } else if (node instanceof LoopInstrNode) {
            return new LoopInstruction(node, parent);
        } else if (node instanceof IfInstrNode) {
            return new IfInstruction(node, parent);
        } else if (node instanceof BrInstrNode) {
            return new BrInstruction(node, parent);
        } else if (node instanceof BrIfInstrNode) {
            return new BrIfInstruction(node, parent);
        } else if (node instanceof CallInstrNode) {
            return new CallInstruction(node, parent);
        } else if (node instanceof I32ConstInstrNode) {
            return new I32ConstInstruction(node, parent);
        } else if (node instanceof I32EqzInstrNode) {
            return new I32EqzInstruction(node, parent);
        } else if (node instanceof I32LtSInstrNode) {
            return new I32LtSInstruction(node, parent);
        } else if (node instanceof I32GeSInstrNode) {
            return new I32GeSInstruction(node, parent);
        } else if (node instanceof I32GeUInstrNode) {
            return new I32GeUInstruction(node, parent);
        } else if (node instanceof I32AddInstrNode) {
            return new I32AddInstruction(node, parent);
        } else if (node instanceof I32RemSInstrNode) {
            return new I32RemSInstruction(node, parent);
        } else if (node instanceof LocalGetInstrNode) {
            return new LocalGetInstruction(node, parent);
        } else if (node instanceof LocalSetInstrNode) {
            return new LocalSetInstruction(node, parent);
        } else {
            throw new Error(`invalid node: ${node.constructor.name}`);
        }
    }
    invoke(context) {
        throw new Error(`subclass responsibility; ${this.constructor.name}`);
    }
}
class InstructionSeq extends Instruction {
    #instructions=[];
    get top() {
        return this.#instructions[0];
    }
    constructor(nodes = [], parent2){
        super();
        if (nodes.length === 0) return;
        let prev = Instruction.create(nodes[0], parent2);
        this.#instructions.push(prev);
        for(let i = 1; i < nodes.length; i++){
            prev.next = Instruction.create(nodes[i], parent2);
            this.#instructions.push(prev);
            prev = prev.next;
        }
    }
    invoke(context) {
        return this.top;
    }
}
class NopInstruction extends Instruction {
    constructor(node, parent3){
        super(parent3);
    }
    invoke(context) {
        return this.next;
    }
}
class BlockInstruction extends Instruction {
    #instructions;
    constructor(node1, parent4){
        super(parent4);
        this.#instructions = new InstructionSeq(node1.instrs.instrs, this);
    }
    invoke(context) {
        if (context.debug) console.warn("invoke block");
        return this.#instructions.top;
    }
    branchIn() {
        return this.next;
    }
}
class LoopInstruction extends Instruction {
    #instructions;
    constructor(node2, parent5){
        super(parent5);
        this.#instructions = new InstructionSeq(node2.instrs.instrs, this);
    }
    invoke(context) {
        if (context.debug) console.warn("invoke loop");
        return this.#instructions.top;
    }
    branchIn() {
        return this.#instructions.top;
    }
}
class IfInstruction extends Instruction {
    #thenInstructions;
    #elseInstructions;
    constructor(node3, parent6){
        super(parent6);
        this.#thenInstructions = new InstructionSeq(node3.thenInstrs.instrs, this);
        this.#elseInstructions = new InstructionSeq(node3.elseInstrs?.instrs, this);
    }
    invoke(context) {
        if (context.debug) console.warn("invoke if");
        const cond = context.stack.readI32();
        if (cond !== 0) {
            return this.#thenInstructions;
        } else {
            return this.#elseInstructions;
        }
    }
    branchIn() {
        return this.next;
    }
}
class BrInstruction extends Instruction {
    #labelIdx;
    constructor(node4, parent7){
        super(parent7);
        this.#labelIdx = node4.labelIdx;
    }
    invoke(context) {
        if (context.debug) console.warn("invoke br");
        let label = 0;
        let parent8 = this.parent;
        while(parent8){
            if (parent8 instanceof IfInstruction || parent8 instanceof BlockInstruction || parent8 instanceof LoopInstruction) {
                if (label === this.#labelIdx) {
                    return parent8.branchIn();
                }
                label++;
            }
            parent8 = parent8.parent;
        }
        throw new Error(`branch error: ${this.#labelIdx} ${label}`);
    }
}
class BrIfInstruction extends BrInstruction {
    constructor(node5, parent8){
        super(node5, parent8);
    }
    invoke(context) {
        if (context.debug) console.warn("invoke br_if");
        const cond = context.stack.readI32();
        if (cond === 0) {
            return this.next;
        }
        return super.invoke(context);
    }
}
class CallInstruction extends Instruction {
    #funcIdx;
    constructor(node6, parent9){
        super(parent9);
        this.#funcIdx = node6.funcIdx;
    }
    invoke(context) {
        if (context.debug) console.warn("invoke call");
        const func = context.functions[this.#funcIdx];
        const result = func.invoke(context);
        if (result) {
            context.stack.writeI32(result);
        }
        return this.next;
    }
}
class I32ConstInstruction extends Instruction {
    #num;
    constructor(node7, parent10){
        super(parent10);
        this.#num = node7.num;
    }
    invoke(context) {
        if (context.debug) console.warn("invoke i32.const");
        context.stack.writeI32(this.#num);
        return this.next;
    }
}
class I32EqzInstruction extends Instruction {
    constructor(node8, parent11){
        super(parent11);
    }
    invoke(context) {
        if (context.debug) console.warn("invoke i32.eqz");
        const num = context.stack.readS32();
        context.stack.writeI32(num === 0 ? 1 : 0);
        return this.next;
    }
}
class I32LtSInstruction extends Instruction {
    constructor(node9, parent12){
        super(parent12);
    }
    invoke(context) {
        if (context.debug) console.warn("invoke i32.lt_s");
        const rhs = context.stack.readS32();
        const lhs = context.stack.readS32();
        context.stack.writeI32(lhs < rhs ? 1 : 0);
        return this.next;
    }
}
class I32GeSInstruction extends Instruction {
    constructor(node10, parent13){
        super(parent13);
    }
    invoke(context) {
        if (context.debug) console.warn("invoke i32.ge_s");
        const rhs = context.stack.readS32();
        const lhs = context.stack.readS32();
        context.stack.writeI32(lhs >= rhs ? 1 : 0);
        return this.next;
    }
}
class I32GeUInstruction extends Instruction {
    constructor(node11, parent14){
        super(parent14);
    }
    invoke(context) {
        if (context.debug) console.warn("invoke i32.ge_u");
        const rhs = context.stack.readU32();
        const lhs = context.stack.readU32();
        context.stack.writeI32(lhs >= rhs ? 1 : 0);
        return this.next;
    }
}
class I32AddInstruction extends Instruction {
    constructor(node12, parent15){
        super(parent15);
    }
    invoke(context) {
        if (context.debug) console.warn("invoke i32.add");
        const rhs = context.stack.readI32();
        const lhs = context.stack.readI32();
        context.stack.writeI32(lhs + rhs);
        return this.next;
    }
}
class I32RemSInstruction extends Instruction {
    constructor(node13, parent16){
        super(parent16);
    }
    invoke(context) {
        if (context.debug) console.warn("invoke i32.rem_s");
        const rhs = context.stack.readS32();
        const lhs = context.stack.readS32();
        context.stack.writeS32(lhs % rhs);
        return this.next;
    }
}
class LocalGetInstruction extends Instruction {
    #localIdx;
    constructor(node14, parent17){
        super(parent17);
        this.#localIdx = node14.localIdx;
    }
    invoke(context) {
        if (context.debug) console.warn("invoke local.get");
        const local = context.locals[this.#localIdx];
        local.store(context.stack);
        return this.next;
    }
}
class LocalSetInstruction extends Instruction {
    #localIdx;
    constructor(node15, parent18){
        super(parent18);
        this.#localIdx = node15.localIdx;
    }
    invoke(context) {
        if (context.debug) console.warn("invoke local.set");
        const local = context.locals[this.#localIdx];
        local.load(context.stack);
        return this.next;
    }
}
class LocalValue {
    #type;
    #value;
    get value() {
        return this.#value;
    }
    set value(val) {
        this.#value = val;
    }
    constructor(type, value){
        this.#type = type;
        this.#value = value;
    }
    store(buffer) {
        switch(this.#type){
            case 127:
                buffer.writeI32(this.#value);
                break;
            default:
                throw new Error(`invalid local type: ${this.#type}`);
        }
    }
    load(buffer) {
        switch(this.#type){
            case 127:
                this.#value = buffer.readI32();
                break;
            default:
                throw new Error(`invalid local type: ${this.#type}`);
        }
    }
}
class Context {
    debug = false;
    constructor(){
        this.stack = new StackBuffer({
            buffer: new ArrayBuffer(1024)
        });
        this.functions = [];
        this.locals = [];
    }
    clearStack() {
        throw new Error("not yet");
    }
}
export { ModuleNode as WasmModule };
export { Buffer as WasmBuffer };

