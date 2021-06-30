class Buffer {
    cursor = 0;
    #buffer;
    #view;
    get buffer() {
        return this.#buffer;
    }
    get eof() {
        return this.#buffer.byteLength <= this.cursor;
    }
    constructor({ buffer: buffer1  }){
        this.#buffer = buffer1;
        this.#view = new DataView(buffer1);
    }
    getView() {
        return this.#view;
    }
    truncate() {
        return new Buffer({
            buffer: this.#buffer.slice(0, this.cursor)
        });
    }
    rest() {
        return new Buffer({
            buffer: this.#buffer.slice(this.cursor)
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
        if (this.#buffer.byteLength < this.cursor + size) {
            return new Uint8Array(0);
        }
        const slice = this.#buffer.slice(this.cursor, this.cursor + size);
        this.cursor += size;
        return new Uint8Array(slice);
    }
    readBuffer(size = this.#buffer.byteLength - this.cursor) {
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
    readIndex() {
        return this.readU32();
    }
    readS32() {
        let result = 0;
        let shift = 0;
        while(true){
            const __byte = this.readByte();
            if (__byte < 0) throw new Error("fail to read buffer");
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
    readI64() {
        throw new Error("not yet readI64");
    }
    readF32() {
        throw new Error("not yet readF32");
    }
    readF64() {
        throw new Error("not yet readF64");
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
    readByValType(valType) {
        switch(valType){
            case 127:
                return this.readI32();
            case 126:
                return this.readI64();
            case 125:
                return this.readF32();
            case 124:
                return this.readF64();
            default:
                throw new Error(`invalid result type: ${valType}`);
        }
    }
    writeBytes(bytes) {
        const u8s = new Uint8Array(bytes);
        for (let __byte of u8s){
            this.writeByte(__byte);
        }
    }
    writeByte(__byte) {
        this.#view.setUint8(this.cursor++, __byte);
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
    writeIndex(value) {
        this.writeU32(value);
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
    writeI64(num) {
        throw new Error("not yet: writeI64");
    }
    writeF32(num) {
        throw new Error("not yet: writeF32");
    }
    writeF64(num) {
        throw new Error("not yet: writeF64");
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
    writeByValType(valType, val) {
        switch(valType){
            case 127:
                this.writeI32(val);
                break;
            case 126:
                this.writeI64(val);
                break;
            case 125:
                this.writeF32(val);
                break;
            case 124:
                this.writeF64(val);
                break;
            default:
                throw new Error(`invalid local type: ${valType}`);
        }
    }
    toString() {
        let out = "";
        const u8s = new Uint8Array(this.#buffer);
        for(let i = 0; i < this.cursor; i++){
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
        this.cursor -= size;
        return new Uint8Array(slice).reverse();
    }
    writeBytes(bytes) {
        const u8s = new Uint8Array(bytes).reverse();
        for (let __byte of u8s){
            this.writeByte(__byte);
        }
    }
}
class Memory {
    #buffer;
    static build(size) {
        return new Memory({
            min: size
        });
    }
    constructor(limits){
        const { min  } = limits;
        this.#buffer = new Buffer(new Uint8Array(min * 64 * 1024));
    }
    readBytes(offset, size) {
        this.#buffer.cursor = offset;
        return this.#buffer.readBytes(size);
    }
    readI32(offset) {
        this.#buffer.cursor = offset;
        return this.#buffer.readI32();
    }
    writeByte(offset, __byte) {
        this.#buffer.cursor = offset;
        this.#buffer.writeByte(__byte);
    }
    writeI32(offset, value) {
        this.#buffer.cursor = offset;
        this.#buffer.writeI32(value);
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
        if (typeSection?.funcTypes !== undefined) {
            this.#context.types = typeSection.funcTypes;
        }
        const importSection = this.#module.importSection;
        importSection?.imports.forEach((im)=>{
            if (im.importDesc?.tag === 0) {
                const jsFunc = this.#importObject[im.moduleName][im.objectName];
                const jsFuncType = typeSection.funcTypes[im.importDesc.index];
                const func = new WasmFunction(jsFuncType, new JsFuncInstruction(jsFuncType, jsFunc));
                this.#context.functions.push(func);
            } else if (im.importDesc?.tag === 1) {
                const tab = this.#importObject[im.moduleName][im.objectName];
                this.#context.tables.push(tab);
            } else if (im.importDesc?.tag === 2) {
                const mem = this.#importObject[im.moduleName][im.objectName];
                this.#context.memories.push(mem);
            } else if (im.importDesc?.tag === 3) {
                const globalValue = this.#importObject[im.moduleName][im.objectName];
                this.#context.globals.push(globalValue);
            } else {
                throw new Error(`not yet import desc: ${im.importDesc?.index}`);
            }
        });
        const functionSection = this.#module.functionSection;
        const codeSection = this.#module.codeSection;
        functionSection?.typeIdxs.forEach((typeIdx, i)=>{
            const func = new WasmFunction(typeSection.funcTypes[typeIdx], codeSection.codes[i]);
            this.#context.functions.push(func);
        });
        const tableSection = this.#module.tableSection;
        tableSection?.tables.forEach((tab, i)=>{
            if (tab.type === undefined) {
                throw new Error("invalid table");
            }
            this.#context.tables.push(new Table(tab.type.refType, tab.type.limits));
        });
        const memorySection = this.#module.memorySection;
        memorySection?.memories.forEach((mem)=>{
            if (mem.type?.limits === undefined) {
                throw new Error("invalid memory");
            }
            this.#context.memories.push(new Memory(mem.type.limits));
        });
        const globalSection = this.#module.globalSection;
        globalSection?.globals.forEach((g, i)=>{
            const globalValue = new GlobalValue(g.globalType, g.expr);
            globalValue.init(this.#context);
            this.#context.globals.push(globalValue);
        });
        const exportSection = this.#module.exportSection;
        exportSection?.exports.forEach((exp)=>{
            if (exp.exportDesc?.tag === 0) {
                this.#exports[exp.name] = (...args)=>{
                    const result = this.#context.functions[exp.exportDesc.index].invoke(this.#context, ...args);
                    return result;
                };
            } else {
                throw new Error(`not yet: ${exp.exportDesc?.index}`);
            }
        });
        const startSection = this.#module.startSection;
        if (startSection) {
            this.#context.functions[startSection.start.funcId].invoke(this.#context);
        }
        const elementSection = this.#module.elementSection;
        elementSection?.elements.forEach((elem, i)=>{
            if (elem.tag !== 0) {
                throw new Error("not yet");
            }
            const table = this.#context.tables[elem.tableIdx || 0];
            const instrs = new InstructionSeq(elem.expr.instrs);
            instrs.invoke(this.#context);
            const offset = this.#context.stack.readU32();
            elem.funcIdxs.forEach((funcIdx, i1)=>{
                const element = table.elementAt(offset + i1);
                element.func = this.#context.functions[funcIdx];
            });
        });
        const dataSection = this.#module.dataSection;
        dataSection?.datas.forEach((data)=>{
            const memory = this.#context.memories[data.memidx || 0];
            const instrs = new InstructionSeq(data.expr.instrs);
            instrs.invoke(this.#context);
            let offset = this.#context.stack.readU32();
            data.bytes?.forEach((b)=>{
                memory.writeByte(offset++, b);
            });
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
    imports = [];
    load(buffer) {
        this.imports = buffer.readVec(()=>{
            const im = new ImportNode();
            im.load(buffer);
            return im;
        });
    }
    store(buffer) {
        buffer.writeByte(2);
        const sectionsBuffer = new Buffer({
            buffer: new ArrayBuffer(1024)
        });
        sectionsBuffer.writeVec(this.imports, (im)=>{
            im.store(sectionsBuffer);
        });
        buffer.append(sectionsBuffer);
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
    tables = [];
    load(buffer) {
        this.tables = buffer.readVec(()=>{
            const tab = new TableNode();
            tab.load(buffer);
            return tab;
        });
    }
    store(buffer) {
        buffer.writeByte(4);
        const sectionsBuffer = new Buffer({
            buffer: new ArrayBuffer(1024)
        });
        sectionsBuffer.writeVec(this.tables, (tab)=>{
            tab.store(sectionsBuffer);
        });
        buffer.append(sectionsBuffer);
    }
}
class MemorySectionNode extends SectionNode {
    memories = [];
    load(buffer) {
        this.memories = buffer.readVec(()=>{
            const mem = new MemoryNode();
            mem.load(buffer);
            return mem;
        });
    }
    store(buffer) {
        buffer.writeByte(5);
        const sectionsBuffer = new Buffer({
            buffer: new ArrayBuffer(1024)
        });
        sectionsBuffer.writeVec(this.memories, (mem)=>{
            mem.store(sectionsBuffer);
        });
        buffer.append(sectionsBuffer);
    }
}
class GlobalSectionNode extends SectionNode {
    globals = [];
    load(buffer) {
        this.globals = buffer.readVec(()=>{
            const g = new GlobalNode();
            g.load(buffer);
            return g;
        });
    }
    store(buffer) {
        buffer.writeByte(6);
        const sectionsBuffer = new Buffer({
            buffer: new ArrayBuffer(1024)
        });
        sectionsBuffer.writeVec(this.globals, (g)=>{
            g.store(sectionsBuffer);
        });
        buffer.append(sectionsBuffer);
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
        this.start = new StartNode();
        this.start.load(buffer);
    }
    store(buffer) {
        if (this.start === undefined) return;
        buffer.writeByte(8);
        const sectionBuffer = new Buffer({
            buffer: new ArrayBuffer(1024)
        });
        this.start.store(sectionBuffer);
        buffer.append(sectionBuffer);
    }
}
class ElementSectionNode extends SectionNode {
    elements = [];
    load(buffer) {
        this.elements = buffer.readVec(()=>{
            const elem = new ElementNode();
            elem.load(buffer);
            return elem;
        });
    }
    store(buffer) {
        buffer.writeByte(9);
        const sectionsBuffer = new Buffer({
            buffer: new ArrayBuffer(1024)
        });
        sectionsBuffer.writeVec(this.elements, (elem)=>{
            elem.store(sectionsBuffer);
        });
        buffer.append(sectionsBuffer);
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
    datas = [];
    load(buffer) {
        this.datas = buffer.readVec(()=>{
            const data = new DataNode();
            data.load(buffer);
            return data;
        });
    }
    store(buffer) {
        buffer.writeByte(11);
        const sectionsBuffer = new Buffer({
            buffer: new ArrayBuffer(1024)
        });
        sectionsBuffer.writeVec(this.datas, (data)=>{
            data.store(sectionsBuffer);
        });
        buffer.append(sectionsBuffer);
    }
}
class DataCountSectionNode extends SectionNode {
    load(buffer) {
        console.warn("ignore datacount section");
    }
    store(buffer) {
        console.warn("ignore datacount section");
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
class StartNode {
    load(buffer) {
        this.funcId = buffer.readByte();
    }
    store(buffer) {
        if (this.funcId === undefined) {
            throw new Error("invalid funcId");
        }
        buffer.writeByte(this.funcId);
    }
}
class ElementNode {
    load(buffer) {
        this.tag = buffer.readByte();
        if (this.tag === 0) {
            this.expr = new ExprNode();
            this.expr.load(buffer);
            this.funcIdxs = buffer.readVec(()=>{
                return buffer.readIndex();
            });
        } else if (this.tag === 1) {
            this.kind = buffer.readByte();
            this.funcIdxs = buffer.readVec(()=>{
                return buffer.readIndex();
            });
        } else if (this.tag === 2) {
            this.tableIdx = buffer.readIndex();
            this.expr = new ExprNode();
            this.expr.load(buffer);
            this.kind = buffer.readByte();
            this.funcIdxs = buffer.readVec(()=>{
                return buffer.readIndex();
            });
        } else if (this.tag === 3) {
            this.kind = buffer.readByte();
            this.funcIdxs = buffer.readVec(()=>{
                return buffer.readIndex();
            });
        } else if (this.tag === 4) {
            this.expr = new ExprNode();
            this.expr.load(buffer);
            this.exprs = buffer.readVec(()=>{
                const expr = new ExprNode();
                expr.load(buffer);
                return expr;
            });
        } else if (this.tag === 5) {
            this.refType = buffer.readByte();
            this.exprs = buffer.readVec(()=>{
                const expr = new ExprNode();
                expr.load(buffer);
                return expr;
            });
        } else if (this.tag === 6) {
            this.tableIdx = buffer.readIndex();
            this.expr = new ExprNode();
            this.expr.load(buffer);
            this.refType = buffer.readByte();
            this.exprs = buffer.readVec(()=>{
                const expr = new ExprNode();
                expr.load(buffer);
                return expr;
            });
        } else if (this.tag === 7) {
            this.refType = buffer.readByte();
            this.exprs = buffer.readVec(()=>{
                const expr = new ExprNode();
                expr.load(buffer);
                return expr;
            });
        }
    }
    store(buffer) {
        buffer.writeByte(this.tag);
        if (this.tag === 0) {
            this.expr.store(buffer);
            buffer.writeVec(this.funcIdxs, (funcIdx)=>{
                buffer.writeIndex(funcIdx);
            });
        } else if (this.tag === 1) {
            buffer.writeByte(this.kind);
            buffer.writeVec(this.funcIdxs, (funcIdx)=>{
                buffer.writeIndex(funcIdx);
            });
        } else if (this.tag === 2) {
            buffer.writeIndex(this.tableIdx);
            this.expr.store(buffer);
            buffer.writeByte(this.kind);
            buffer.writeVec(this.funcIdxs, (funcIdx)=>{
                buffer.writeIndex(funcIdx);
            });
        } else if (this.tag === 3) {
            buffer.writeByte(this.kind);
            buffer.writeVec(this.funcIdxs, (funcIdx)=>{
                buffer.writeIndex(funcIdx);
            });
        } else if (this.tag === 4) {
            this.expr.store(buffer);
            buffer.writeVec(this.exprs, (expr)=>{
                expr.store(buffer);
            });
        } else if (this.tag === 5) {
            buffer.writeByte(this.refType);
            buffer.writeVec(this.exprs, (expr)=>{
                expr.store(buffer);
            });
        } else if (this.tag === 6) {
            buffer.writeIndex(this.tableIdx);
            this.expr.store(buffer);
            buffer.writeByte(this.refType);
            buffer.writeVec(this.exprs, (expr)=>{
                expr.store(buffer);
            });
        } else if (this.tag === 7) {
            buffer.writeByte(this.refType);
            buffer.writeVec(this.exprs, (expr)=>{
                expr.store(buffer);
            });
        }
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
class ImportNode {
    load(buffer) {
        this.moduleName = buffer.readName();
        this.objectName = buffer.readName();
        this.importDesc = new ImportDescNode();
        this.importDesc.load(buffer);
    }
    store(buffer) {
        if (this.moduleName === undefined || this.objectName === undefined || this.importDesc === undefined) {
            throw new Error("invalid export");
        }
        buffer.writeName(this.moduleName);
        buffer.writeName(this.objectName);
        this.importDesc.store(buffer);
    }
}
class ImportDescNode {
    load(buffer) {
        this.tag = buffer.readByte();
        if (this.tag === 0) {
            this.index = buffer.readU32();
        } else if (this.tag === 1) {
            this.tableType = new TableTypeNode();
            this.tableType.load(buffer);
        } else if (this.tag === 2) {
            this.memType = new MemoryTypeNode();
            this.memType.load(buffer);
        } else if (this.tag === 3) {
            this.globalType = new GlobalTypeNode();
            this.globalType.load(buffer);
        } else {
            throw new Error(`invalid import desc:${this.tag}`);
        }
    }
    store(buffer) {
        if (this.tag === undefined) {
            throw new Error("invalid importdesc");
        }
        buffer.writeByte(this.tag);
        if (this.tag === 0) {
            buffer.writeU32(this.index);
        } else if (this.tag === 1) {
            throw new Error("not yet");
        } else if (this.tag === 2) {
            this.memType.store(buffer);
        } else if (this.tag === 3) {
            this.globalType.store(buffer);
        } else {
            throw new Error(`invalid import desc:${this.tag}`);
        }
    }
}
class TableNode {
    load(buffer) {
        this.type = new TableTypeNode();
        this.type.load(buffer);
    }
    store(buffer) {
        if (this.type === undefined) {
            throw new Error("invalid table");
        }
        this.type.store(buffer);
    }
}
class TableTypeNode {
    load(buffer) {
        this.limits = new LimitsNode();
        this.refType = buffer.readByte();
        this.limits.load(buffer);
    }
    store(buffer) {
        if (this.refType === undefined || this.limits === undefined) {
            throw new Error("invalid tableType");
        }
        buffer.writeByte(this.refType);
        this.limits.store(buffer);
    }
}
class MemoryNode {
    load(buffer) {
        this.type = new MemoryTypeNode();
        this.type.load(buffer);
    }
    store(buffer) {
        if (this.type === undefined) {
            throw new Error("invalid memory");
        }
        this.type.store(buffer);
    }
}
class MemoryTypeNode {
    load(buffer) {
        this.limits = new LimitsNode();
        this.limits.load(buffer);
    }
    store(buffer) {
        if (this.limits === undefined) {
            throw new Error("invalid limits");
        }
        this.limits.store(buffer);
    }
}
class LimitsNode {
    load(buffer) {
        const tag = buffer.readByte();
        if (tag === 0) {
            this.min = buffer.readU32();
        } else if (tag === 1) {
            this.min = buffer.readU32();
            this.max = buffer.readU32();
        } else {
            throw new Error(`invalid limits: ${tag}`);
        }
    }
    store(buffer) {
        if (this.min === undefined) {
            throw new Error("invalid limits");
        }
        if (this.max === undefined) {
            buffer.writeByte(0);
            buffer.writeU32(this.min);
        } else {
            buffer.writeByte(1);
            buffer.writeU32(this.min);
            buffer.writeU32(this.max);
        }
    }
}
class GlobalNode {
    load(buffer) {
        this.globalType = new GlobalTypeNode();
        this.globalType.load(buffer);
        this.expr = new ExprNode();
        this.expr.load(buffer);
    }
    store(buffer) {
        if (this.globalType === undefined || this.expr === undefined) {
            throw new Error("invalid export");
        }
        this.globalType.store(buffer);
        this.expr.store(buffer);
    }
}
class GlobalTypeNode {
    load(buffer) {
        this.valType = buffer.readByte();
        this.mut = buffer.readByte();
    }
    store(buffer) {
        if (this.valType === undefined || this.mut === undefined) {
            throw new Error("invalid globaltype");
        }
        buffer.writeByte(this.valType);
        buffer.writeByte(this.mut);
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
            [Op.LocalTee]: LocalTeeInstrNode
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
        this.labelIdx = buffer.readIndex();
    }
    store(buffer) {
        if (this.labelIdx === undefined) {
            throw new Error("invalid br_if");
        }
        super.store(buffer);
        buffer.writeIndex(this.labelIdx);
    }
}
class BrTableInstrNode extends InstrNode {
    labelIdxs = [];
    load(buffer) {
        this.labelIdxs = buffer.readVec(()=>{
            return buffer.readIndex();
        });
        this.labelIdx = buffer.readIndex();
    }
    store(buffer) {
        if (this.labelIdx === undefined) {
            throw new Error("invalid br_table");
        }
        super.store(buffer);
        buffer.writeVec(this.labelIdxs, (l)=>{
            buffer.writeIndex(l);
        });
        buffer.writeIndex(this.labelIdx);
    }
}
class CallInstrNode extends InstrNode {
    load(buffer) {
        this.funcIdx = buffer.readIndex();
    }
    store(buffer) {
        if (this.funcIdx === undefined) {
            throw new Error("invalid call");
        }
        super.store(buffer);
        buffer.writeIndex(this.funcIdx);
    }
}
class CallIndirectInstrNode extends InstrNode {
    load(buffer) {
        this.typeIdx = buffer.readIndex();
        this.tableIdx = buffer.readIndex();
    }
    store(buffer) {
        if (this.typeIdx === undefined || this.tableIdx === undefined) {
            throw new Error("invalid call_indirect");
        }
        super.store(buffer);
        buffer.writeIndex(this.typeIdx);
        buffer.writeIndex(this.tableIdx);
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
class LocalTeeInstrNode extends InstrNode {
    load(buffer) {
        this.localIdx = buffer.readU32();
    }
    store(buffer) {
        if (this.localIdx === undefined) {
            throw new Error("invalid local.tee");
        }
        super.store(buffer);
        buffer.writeU32(this.localIdx);
    }
}
class GlobalGetInstrNode extends InstrNode {
    load(buffer) {
        this.globalIdx = buffer.readU32();
    }
    store(buffer) {
        if (this.globalIdx === undefined) {
            throw new Error("invalid global.get");
        }
        super.store(buffer);
        buffer.writeU32(this.globalIdx);
    }
}
class GlobalSetInstrNode extends InstrNode {
    load(buffer) {
        this.globalIdx = buffer.readU32();
    }
    store(buffer) {
        if (this.globalIdx === undefined) {
            throw new Error("invalid global.set");
        }
        super.store(buffer);
        buffer.writeU32(this.globalIdx);
    }
}
class I32LoadInstrNode extends InstrNode {
    load(buffer) {
        this.memarg = new MemArgNode();
        this.memarg.load(buffer);
    }
    store(buffer) {
        if (this.memarg === undefined) {
            throw new Error("invalid i32.load");
        }
        super.store(buffer);
        this.memarg.store(buffer);
    }
}
class I32StoreInstrNode extends InstrNode {
    load(buffer) {
        this.memarg = new MemArgNode();
        this.memarg.load(buffer);
    }
    store(buffer) {
        if (this.memarg === undefined) {
            throw new Error("invalid i32.store");
        }
        super.store(buffer);
        this.memarg.store(buffer);
    }
}
class MemArgNode {
    load(buffer) {
        this.align = buffer.readU32();
        this.offset = buffer.readU32();
    }
    store(buffer) {
        if (this.align === undefined || this.offset === undefined) {
            throw new Error("invalid memarg");
        }
        buffer.writeU32(this.align);
        buffer.writeU32(this.offset);
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
class DataNode {
    #active=false;
    load(buffer) {
        this.tag = buffer.readByte();
        if (this.tag === 0) {
            this.#active = true;
            this.expr = new ExprNode();
            this.expr.load(buffer);
            this.bytes = buffer.readVec(()=>{
                return buffer.readByte();
            });
        } else if (this.tag === 1) {
            this.#active = false;
            this.bytes = buffer.readVec(()=>{
                return buffer.readByte();
            });
        } else if (this.tag === 2) {
            this.#active = true;
            this.memidx = buffer.readIndex();
            this.expr = new ExprNode();
            this.expr.load(buffer);
            this.bytes = buffer.readVec(()=>{
                return buffer.readByte();
            });
        } else {
            throw new Error(`invalid data: ${this.tag}`);
        }
    }
    store(buffer) {
        if (this.bytes === undefined) {
            throw new Error("invalid data");
        }
        buffer.writeByte(this.tag);
        if (this.tag === 0) {
            this.expr.store(buffer);
            buffer.writeVec(this.bytes, (__byte)=>{
                buffer.writeByte(__byte);
            });
        } else if (this.tag === 1) {
            buffer.writeVec(this.bytes, (__byte)=>{
                buffer.writeByte(__byte);
            });
        } else if (this.tag === 2) {
            buffer.writeIndex(this.memidx);
            this.expr.store(buffer);
            buffer.writeVec(this.bytes, (__byte)=>{
                buffer.writeByte(__byte);
            });
        } else {
            throw new Error(`invalid data: ${this.tag}`);
        }
    }
}
const Op = {
    Block: 2,
    Loop: 3,
    If: 4,
    Else: 5,
    Br: 12,
    BrIf: 13,
    BrTable: 14,
    Call: 16,
    CallIndirect: 17,
    LocalGet: 32,
    LocalSet: 33,
    LocalTee: 34,
    GlobalGet: 35,
    GlobalSet: 36,
    I32Load: 40,
    I32Store: 54,
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
    set funcType(type) {
        this.#funcType = type;
        if (this.#instructions instanceof JsFuncInstruction) {
            const func = this.#instructions;
            func.funcType = type;
        }
    }
    constructor(funcType, code){
        this.#funcType = funcType;
        if (code instanceof CodeNode) {
            this.#code = code;
            this.#instructions = new InstructionSeq(this.#code.func?.expr?.instrs);
        } else {
            this.#instructions = code;
        }
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
        const localses = this.#code?.func?.localses;
        if (localses) {
            for(let i1 = 0; i1 < localses.length; i1++){
                const locals = localses[i1];
                for(let j = 0; j < (locals.num || 0); j++){
                    context.locals.push(new LocalValue(locals.valType, 0));
                }
            }
        }
        this.#instructions.invoke(context);
        const resultTypes = this.#funcType.resultType.valTypes;
        if (resultTypes.length === 0) {
            return null;
        } else {
            return context.stack.readByValType(resultTypes[0]);
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
        } else if (node instanceof BrTableInstrNode) {
            return new BrTableInstruction(node, parent);
        } else if (node instanceof CallInstrNode) {
            return new CallInstruction(node, parent);
        } else if (node instanceof CallIndirectInstrNode) {
            return new CallIndirectInstruction(node, parent);
        } else if (node instanceof GlobalGetInstrNode) {
            return new GlobalGetInstruction(node, parent);
        } else if (node instanceof GlobalSetInstrNode) {
            return new GlobalSetInstruction(node, parent);
        } else if (node instanceof I32LoadInstrNode) {
            return new I32LoadInstruction(node, parent);
        } else if (node instanceof I32StoreInstrNode) {
            return new I32StoreInstruction(node, parent);
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
        } else if (node instanceof LocalTeeInstrNode) {
            return new LocalTeeInstruction(node, parent);
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
        let instr = this.top;
        while(instr){
            instr = instr.invoke(context);
        }
        return undefined;
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
class BrTableInstruction extends Instruction {
    #labelIdxs=[];
    constructor(node6, parent9){
        super(parent9);
        this.#labelIdxs = [
            ...node6.labelIdxs
        ];
        this.#labelIdxs.push(node6.labelIdx);
    }
    invoke(context) {
        if (context.debug) console.warn("invoke br_table");
        const cond = context.stack.readI32();
        const labelIdx = this.#labelIdxs[cond];
        let label = 0;
        let parent10 = this.parent;
        while(parent10){
            if (parent10 instanceof IfInstruction || parent10 instanceof BlockInstruction || parent10 instanceof LoopInstruction) {
                if (label === labelIdx) {
                    return parent10.branchIn();
                }
                label++;
            }
            parent10 = parent10.parent;
        }
        throw new Error(`branch error: ${labelIdx} ${label}`);
    }
}
class CallInstruction extends Instruction {
    #funcIdx;
    constructor(node7, parent10){
        super(parent10);
        this.#funcIdx = node7.funcIdx;
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
class CallIndirectInstruction extends Instruction {
    #typeIdx;
    #tableIdx;
    constructor(node8, parent11){
        super(parent11);
        this.#typeIdx = node8.typeIdx;
        this.#tableIdx = node8.tableIdx;
    }
    invoke(context) {
        if (context.debug) console.warn("invoke call_indirect");
        const elemIdx = context.stack.readI32();
        const table = context.tables[this.#tableIdx];
        const elem = table.elementAt(elemIdx);
        if (elem.func === undefined) {
            throw new Error("not yet");
        }
        elem.func.funcType = context.types[this.#typeIdx];
        const result = elem.func.invoke(context);
        if (result) {
            context.stack.writeI32(result);
        }
        return this.next;
    }
}
class I32LoadInstruction extends Instruction {
    #offset;
    #align;
    constructor(node9, parent12){
        super(parent12);
        this.#offset = node9.memarg.offset;
        this.#align = node9.memarg.align;
    }
    invoke(context) {
        if (context.debug) console.warn("invoke i32.load");
        const memory = context.memories[0];
        context.stack.writeI32(memory.readI32(this.#offset));
        return this.next;
    }
}
class I32StoreInstruction extends Instruction {
    #offset;
    #align;
    constructor(node10, parent13){
        super(parent13);
        this.#offset = node10.memarg.offset;
        this.#align = node10.memarg.align;
    }
    invoke(context) {
        if (context.debug) console.warn("invoke i32.load");
        const memory = context.memories[0];
        memory.writeI32(this.#offset, context.stack.readI32());
        return this.next;
    }
}
class I32ConstInstruction extends Instruction {
    #num;
    constructor(node11, parent14){
        super(parent14);
        this.#num = node11.num;
    }
    invoke(context) {
        if (context.debug) console.warn("invoke i32.const");
        context.stack.writeI32(this.#num);
        return this.next;
    }
}
class I32EqzInstruction extends Instruction {
    constructor(node12, parent15){
        super(parent15);
    }
    invoke(context) {
        if (context.debug) console.warn("invoke i32.eqz");
        const num = context.stack.readS32();
        context.stack.writeI32(num === 0 ? 1 : 0);
        return this.next;
    }
}
class I32LtSInstruction extends Instruction {
    constructor(node13, parent16){
        super(parent16);
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
    constructor(node14, parent17){
        super(parent17);
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
    constructor(node15, parent18){
        super(parent18);
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
    constructor(node16, parent19){
        super(parent19);
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
    constructor(node17, parent20){
        super(parent20);
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
    constructor(node18, parent21){
        super(parent21);
        this.#localIdx = node18.localIdx;
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
    constructor(node19, parent22){
        super(parent22);
        this.#localIdx = node19.localIdx;
    }
    invoke(context) {
        if (context.debug) console.warn("invoke local.set");
        const local = context.locals[this.#localIdx];
        local.load(context.stack);
        return this.next;
    }
}
class LocalTeeInstruction extends Instruction {
    #localIdx;
    constructor(node20, parent23){
        super(parent23);
        this.#localIdx = node20.localIdx;
    }
    invoke(context) {
        if (context.debug) console.warn("invoke local.tee");
        const val = context.stack.readI32();
        context.stack.writeI32(val);
        context.stack.writeI32(val);
        const local = context.locals[this.#localIdx];
        local.load(context.stack);
        return this.next;
    }
}
class GlobalGetInstruction extends Instruction {
    #globalIdx;
    constructor(node21, parent24){
        super(parent24);
        this.#globalIdx = node21.globalIdx;
    }
    invoke(context) {
        if (context.debug) console.warn("invoke global.get");
        const global = context.globals[this.#globalIdx];
        global.store(context.stack);
        return this.next;
    }
}
class GlobalSetInstruction extends Instruction {
    #globalIdx;
    constructor(node22, parent25){
        super(parent25);
        this.#globalIdx = node22.globalIdx;
    }
    invoke(context) {
        if (context.debug) console.warn("invoke global.set");
        const global = context.globals[this.#globalIdx];
        if (!global.mutable) {
            throw new Error('this value is immutable.');
        }
        global.load(context.stack);
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
    constructor(type, value1){
        this.#type = type;
        this.#value = value1;
    }
    store(buffer) {
        buffer.writeByValType(this.#type, this.#value);
    }
    load(buffer) {
        this.#value = buffer.readByValType(this.#type);
    }
}
class GlobalValue {
    #type;
    #value;
    #expr;
    get value() {
        return this.#value;
    }
    set value(val) {
        this.#value = val;
    }
    get mutable() {
        return this.#type.mut === 1;
    }
    static build(value, opt) {
        opt = Object.assign({
            type: "i32",
            mut: true
        }, opt);
        const globalType = new GlobalTypeNode();
        globalType.valType = ({
            i32: 127,
            i64: 126,
            f32: 125,
            f64: 124
        })[opt["type"]];
        globalType.mut = opt["mut"] ? 1 : 0;
        const globalValue = new GlobalValue(globalType);
        globalValue.value = value;
        return globalValue;
    }
    constructor(type1, expr){
        this.#type = type1;
        this.#expr = expr;
    }
    init(context) {
        if (this.#value !== undefined) {
            throw new Error("global's been already initialized.");
        }
        if (this.#expr === undefined) return;
        const instrs = new InstructionSeq(this.#expr.instrs);
        instrs.invoke(context);
        this.load(context.stack);
    }
    store(buffer) {
        buffer.writeByValType(this.#type.valType, this.#value);
    }
    load(buffer) {
        this.#value = buffer.readByValType(this.#type.valType);
    }
}
class JsFuncInstruction extends Instruction {
    #func;
    constructor(funcType1, func){
        super();
        this.funcType = funcType1;
        this.#func = func;
    }
    invoke(context) {
        if (context.debug) console.warn(`invoke js function: ${this.#func.name}`);
        const args = context.locals.map((lv)=>lv.value
        );
        const result = this.#func.apply(null, args);
        const valType = this.funcType.resultType?.valTypes[0];
        if (valType) {
            context.stack.writeByValType(valType, result);
        }
        return undefined;
    }
}
class Table {
    #refType;
    #elements=[];
    static build(funcs) {
        const tab = new Table(111, {
            min: funcs.length
        });
        for(let i1 = 0; i1 < funcs.length; i1++){
            const elem = tab.elementAt(i1);
            const jsFunc = funcs[i1];
            const dummyType = new FuncTypeNode();
            elem.func = new WasmFunction(dummyType, new JsFuncInstruction(dummyType, jsFunc));
        }
        return tab;
    }
    constructor(refType, limits1){
        this.#refType = refType;
        for(let i1 = 0; i1 < limits1.min; i1++){
            this.#elements.push(new TableElement());
        }
    }
    elementAt(index) {
        if (this.#elements.length <= index) {
            throw new Error("invalid index");
        }
        return this.#elements[index];
    }
}
class TableElement {
}
class Context {
    functions = [];
    memories = [];
    tables = [];
    globals = [];
    locals = [];
    types = [];
    debug = false;
    constructor(){
        this.stack = new StackBuffer({
            buffer: new ArrayBuffer(1024)
        });
    }
    clearStack() {
        throw new Error("not yet");
    }
}
export { ModuleNode as WasmModule };
export { Buffer as WasmBuffer };
function instantiate1(file, importObject2) {
    const buffer2 = new Buffer(file);
    const mod = new ModuleNode();
    mod.load(buffer2);
    return mod.instantiate(importObject2);
}
export { instantiate1 as instantiate };

