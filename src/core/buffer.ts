import { ValType } from "./node.ts"

export class Buffer {
  cursor = 0
  #buffer: ArrayBuffer
  #view: DataView

  get buffer(): ArrayBuffer {
    return this.#buffer
  }

  get eof(): boolean {
    return this.#buffer.byteLength <= this.cursor
  }

  constructor({buffer}:{buffer:ArrayBuffer}) {
    this.#buffer = buffer
    this.#view = new DataView(buffer)
  }

  protected getView(): DataView {
    return this.#view
  }

  truncate():Buffer {
    return new Buffer({buffer:this.#buffer.slice(0, this.cursor)})
  }

  peek(pos:number=0): number {
    return this.#view.getUint8(pos)
  }

  append(buffer:Buffer) {
    this.writeU32(buffer.cursor)
    for (let i = 0; i < buffer.cursor; i++) {
      this.writeByte(buffer.peek(i))
    }
  }

  readByte(): number {
    const bytes = this.readBytes(1)
    if (bytes.length <= 0) {
      return -1
    }
    return bytes[0]
  }

  readBytes(size:number): Uint8Array {
    if (this.#buffer.byteLength < this.cursor+size) {
      return new Uint8Array(0)
    }

    const slice = this.#buffer.slice(this.cursor, this.cursor+size)
    this.cursor += size
    return new Uint8Array(slice)
  }

  readBuffer(size:number=this.#buffer.byteLength-this.cursor): Buffer {
    return new Buffer(this.readBytes(size))
  }

  readU32(): number{
    let result = 0;
    let shift = 0;
    while (true) {
      const byte = this.readByte()
      result |= (byte & 0b01111111) << shift;
      shift += 7;
      if ((0b10000000 & byte) === 0) {
        return result;
      }
    }
  }

  readS32(): number {
    // https://en.wikipedia.org/wiki/LEB128#Decode_signed_32-bit_integer
    let result = 0;
    let shift = 0;
    while (true) {
      const byte = this.readByte()
      if (byte < 0) throw new Error("fail to read buffer")

      result |= (byte & 0b01111111) << shift;
      shift += 7;
      if ((0b10000000 & byte) === 0) {
        if (shift < 32 && (byte & 0b01000000) !== 0) {
          return result | (~0 << shift);
        }
        return result;
      }
    }
  }

  readI32(): number {
    return this.readS32()
  }

  readI64(): number {
    throw new Error("not yet readI64")
  }

  readF32(): number {
    throw new Error("not yet readF32")
  }

  readF64(): number {
    throw new Error("not yet readF64")
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

  readByValType(valType:ValType): number {
    switch (valType) {
      case 0x7f:
        return this.readI32()
      case 0x7e:
        return this.readI64()
      case 0x7d:
        return this.readF32()
      case 0x7c:
        return this.readF64()
      default:
        throw new Error(`invalid result type: ${valType}`)
    }
  }

  writeBytes(bytes:ArrayBuffer) {
    const u8s = new Uint8Array(bytes)
    for (let byte of u8s) {
      this.writeByte(byte)
    }
  }

  writeByte(byte:number) {
    this.#view.setUint8(this.cursor++, byte)
  }

  writeU32(value:number) {
    value |= 0
    const result = []
    while (true) {
      const byte = value & 0b01111111;
      value >>= 7
      if (value === 0 && (byte & 0b01000000) === 0) {
        result.push(byte)
        break
      }
      result.push(byte | 0b10000000)
    }
    const u8a = new Uint8Array(result)
    this.writeBytes(u8a.buffer)
  }

  writeS32(value:number) {
    // https://en.wikipedia.org/wiki/LEB128#Encode_signed_32-bit_integer
    value |= 0
    const result = []
    while (true) {
      const byte = value & 0b01111111;
      value >>= 7
      if (
        (value === 0 && (byte & 0b01000000) === 0) ||
        (value === -1 && (byte & 0b01000000) !== 0)
      ) {
        result.push(byte)
        break
      }
      result.push(byte | 0b10000000)
    }
    const u8a = new Uint8Array(result)
    this.writeBytes(u8a.buffer)
  }

  writeI32(num:number) {
    this.writeS32(num)
  }

  writeI64(num:number) {
    throw new Error("not yet: writeI64")
  }

  writeF32(num:number) {
    throw new Error("not yet: writeF32")
  }

  writeF64(num:number) {
    throw new Error("not yet: writeF64")
  }

  writeName(name:string) {
    const encoder = new TextEncoder()
    const bytes = encoder.encode(name)
    this.writeU32(bytes.length)
    this.writeBytes(bytes)
  }

  writeVec<T>(ts:T[], writeT:(t:T)=>void) {
    this.writeU32(ts.length)
    for (const t of ts) {
      writeT(t)
    }
  }

  writeByValType(valType:ValType, val:number) {
    switch(valType) {
      case 0x7f:
        this.writeI32(val)
        break
      case 0x7e:
        this.writeI64(val)
        break
      case 0x7d:
        this.writeF32(val)
        break
      case 0x7c:
        this.writeF64(val)
        break
      default:
        throw new Error(`invalid local type: ${valType}`)
    }

  }

  toString(): string {
    let out = ""
    const u8s = new Uint8Array(this.#buffer)
    for (let i = 0; i < this.cursor; i++) {
      let h = u8s[i].toString(16)
      if (h.length === 1) h = `0${h}`
      if (i % 16 === 15) h += "\n"
      else if (i % 8 === 7) h += "  "
      else h += " "
      out += h
    }
    return out.replace(/\n$/, "")
  }
}

export class StackBuffer extends Buffer {
  readBytes(size:number): Uint8Array {
    if (this.cursor-size < 0) {
      return new Uint8Array(0)
    }

    const slice = this.buffer.slice(this.cursor-size, this.cursor)
    this.cursor -= size
    return new Uint8Array(slice).reverse()
  }

  writeBytes(bytes:ArrayBuffer) {
    const u8s = new Uint8Array(bytes).reverse()
    for (let byte of u8s) {
      this.writeByte(byte)
    }
  }
}

export class Memory {
  #buffer: Buffer

  static build(size:number): Memory {
    return new Memory({min:size})
  }

  constructor(limits:{min?:number, max?:number}) {
    const {min} = limits
    this.#buffer = new Buffer(new Uint8Array(min! * 64 * 1024))
  }

  readI32(offset:number):number {
    this.#buffer.cursor = offset
    return this.#buffer.readI32()
  }

  writeI32(offset:number, value:number) {
    this.#buffer.cursor = offset
    this.#buffer.writeI32(value)
  }
}