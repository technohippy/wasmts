export class Binary {
  #cursor = 0
  #buffer: ArrayBuffer
  #view: DataView

  get cursor(): number {
    return this.#cursor
  }

  get buffer(): ArrayBuffer {
    return this.#buffer
  }

  get eof(): boolean {
    return this.#buffer.byteLength <= this.#cursor
  }

  constructor({buffer}:{buffer:ArrayBuffer}) {
    this.#buffer = buffer
    this.#view = new DataView(buffer)
  }

  protected getView(): DataView {
    return this.#view
  }

  protected setCursor(c:number) {
    this.#cursor = c
  }

  truncate():Binary {
    return new Binary({buffer:this.#buffer.slice(0, this.#cursor)})
  }

  peep(pos:number=0): number {
    return this.#view.getUint8(pos)
  }

  append(binary:Binary) {
    this.writeU32(binary.cursor)
    for (let i = 0; i < binary.cursor; i++) {
      this.writeByte(binary.peep(i))
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

  writeBytes(bytes:ArrayBuffer) {
    const u8s = new Uint8Array(bytes)
    for (let byte of u8s) {
      this.writeByte(byte)
    }
  }

  writeByte(byte:number) {
    this.#view.setUint8(this.#cursor++, byte)
  }

  writeU32(num:number) {
    if (num === 0) {
      this.writeByte(0)
      return
    }

    const bytes = []
    while (true) {
      let low = num & 0b01111111
      num = num >> 7
      //if (num === 0) {
      if (num === 0 && (low & 0b01000000) === 0) {
        bytes.push(low)
        break
      } else {
        low = low | 0b10000000
        bytes.push(low)
      }
    }
    const u8a = new Uint8Array(bytes)
    this.writeBytes(u8a.buffer)
  }

  writeS32(num:number) {
    if (0 <= num) {
      this.writeU32(num)
      return
    }

    // negative
    const bytes = []
    num = -(num+1)
    while (true) {
      let low = (num & 0b01111111) ^ 0b01111111
      num = num >> 7
      if (num === 0) {
        bytes.push(low)
        break
      } else {
        low = low | 0b10000000
        bytes.push(low)
      }
    }
    const u8a = new Uint8Array(bytes)
    this.writeBytes(u8a.buffer)
  }

  writeI32(num:number) {
    this.writeS32(num)
  }

  writeName(name:string) {
    const encoder = new TextEncoder()
    this.writeU32(name.length)
    this.writeBytes(encoder.encode(name))
  }

  writeVec<T>(ts:T[], writeT:(t:T)=>void) {
    this.writeU32(ts.length)
    for (const t of ts) {
      writeT(t)
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

export class StackBinary extends Binary {
  readBytes(size:number): Uint8Array {
    if (this.cursor-size < 0) {
      return new Uint8Array(0)
    }

    const slice = this.buffer.slice(this.cursor-size, this.cursor)
    this.setCursor(this.cursor-size)
    return new Uint8Array(slice).reverse()
  }

  writeBytes(bytes:ArrayBuffer) {
    const u8s = new Uint8Array(bytes).reverse()
    for (let byte of u8s) {
      this.writeByte(byte)
    }
  }
}