// deno test --allow-read 
import { assert, assertEquals } from "https://deno.land/std@0.93.0/testing/asserts.ts"
import { Buffer, Memory } from "../src/core/buffer.ts"
import { ModuleNode } from "../src/core/node.ts"
import { GlobalValue, Table } from "../src/core/instance.ts"

async function loadModule(filepath:string):Promise<[ModuleNode, Buffer]> {
  const code = await Deno.readFile(filepath)
  const buffer = new Buffer(code)
  const mod = new ModuleNode()
  mod.load(buffer)
  return [mod, buffer]
}

// load

/*
Deno.test("load module.wasm", async () => {
  const [mod] = await loadModule("./test/data/wasm/module.wasm")
  assert(true, "no error")
  assertEquals(0, mod.sections.length)
})

Deno.test("load simple.wasm", async () => {
  const [mod] = await loadModule("./test/data/wasm/simple.wasm")
  assert(true, "no error")
  assertEquals(3, mod.sections.length)
})

Deno.test("load add.wasm", async () => {
  const [mod] = await loadModule("./test/data/wasm/add.wasm")
  assert(true, "no error")
  assertEquals(4, mod.sections.length)
})

Deno.test("load loop.wasm", async () => {
  const [mod] = await loadModule("./test/data/wasm/loop.wasm")
  assert(true, "no error")
  assertEquals(4, mod.sections.length)
})

Deno.test("load if.wasm", async () => {
  const [mod] = await loadModule("./test/data/wasm/if.wasm")
  assert(true, "no error")
  assertEquals(4, mod.sections.length)
})

Deno.test("load local.wasm", async () => {
  const [mod] = await loadModule("./test/data/wasm/local.wasm")
  assert(true, "no error")
  assertEquals(3, mod.sections.length)
})

Deno.test("load import.wasm", async () => {
  const [mod] = await loadModule("./test/data/wasm/import.wasm")
  assert(true, "no error")
  assertEquals(5, mod.sections.length)
})

Deno.test("load global.wasm", async () => {
  const [mod] = await loadModule("./test/data/wasm/global.wasm")
  assert(true, "no error")
  assertEquals(5, mod.sections.length)
})

Deno.test("load start.wasm", async () => {
  const [mod] = await loadModule("./test/data/wasm/start.wasm")
  assert(true, "no error")
  assertEquals(5, mod.sections.length)
})

Deno.test("load memory.wasm", async () => {
  const [mod] = await loadModule("./test/data/wasm/memory.wasm")
  assert(true, "no error")
  assertEquals(7, mod.sections.length)
})

Deno.test("load data.wasm", async () => {
  const [mod] = await loadModule("./test/data/wasm/data.wasm")
  assert(true, "no error")
  assertEquals(2, mod.sections.length)
})

Deno.test("load table.wasm", async () => {
  const [mod] = await loadModule("./test/data/wasm/table.wasm")
  assert(true, "no error")
  assertEquals(6, mod.sections.length)
})

// store

Deno.test("store module.wasm", async () => {
  const [mod, inBuffer] = await loadModule("./test/data/wasm/module.wasm")
  const outBuffer = new Buffer({buffer:new ArrayBuffer(1024)})
  mod.store(outBuffer)
  assertEquals(inBuffer.toString(), outBuffer.toString())
})

Deno.test("store simple.wasm", async () => {
  const [mod, inBuffer] = await loadModule("./test/data/wasm/simple.wasm")
  const outBuffer = new Buffer({buffer:new ArrayBuffer(1024)})
  mod.store(outBuffer)
  assertEquals(inBuffer.toString(), outBuffer.toString())
})

Deno.test("store add.wasm", async () => {
  const [mod, inBuffer] = await loadModule("./test/data/wasm/add.wasm")
  const outBuffer = new Buffer({buffer:new ArrayBuffer(1024)})
  mod.store(outBuffer)
  assertEquals(inBuffer.toString(), outBuffer.toString())
})

Deno.test("store loop.wasm", async () => {
  const [mod, inBuffer] = await loadModule("./test/data/wasm/loop.wasm")
  const outBuffer = new Buffer({buffer:new ArrayBuffer(1024)})
  mod.store(outBuffer)
  assertEquals(inBuffer.toString(), outBuffer.toString())
})

Deno.test("store if.wasm", async () => {
  const [mod, inBuffer] = await loadModule("./test/data/wasm/if.wasm")
  const outBuffer = new Buffer({buffer:new ArrayBuffer(1024)})
  mod.store(outBuffer)
  assertEquals(inBuffer.toString(), outBuffer.toString())
})

Deno.test("store local.wasm", async () => {
  const [mod, inBuffer] = await loadModule("./test/data/wasm/local.wasm")
  const outBuffer = new Buffer({buffer:new ArrayBuffer(1024)})
  mod.store(outBuffer)
  assertEquals(inBuffer.toString(), outBuffer.toString())
})

Deno.test("store import.wasm", async () => {
  const [mod, inBuffer] = await loadModule("./test/data/wasm/import.wasm")
  const outBuffer = new Buffer({buffer:new ArrayBuffer(1024)})
  mod.store(outBuffer)
  assertEquals(inBuffer.toString(), outBuffer.toString())
})

Deno.test("store global.wasm", async () => {
  const [mod, inBuffer] = await loadModule("./test/data/wasm/global.wasm")
  const outBuffer = new Buffer({buffer:new ArrayBuffer(1024)})
  mod.store(outBuffer)
  assertEquals(inBuffer.toString(), outBuffer.toString())
})

Deno.test("store start.wasm", async () => {
  const [mod, inBuffer] = await loadModule("./test/data/wasm/start.wasm")
  const outBuffer = new Buffer({buffer:new ArrayBuffer(1024)})
  mod.store(outBuffer)
  assertEquals(inBuffer.toString(), outBuffer.toString())
})

Deno.test("store memory.wasm", async () => {
  const [mod, inBuffer] = await loadModule("./test/data/wasm/memory.wasm")
  const outBuffer = new Buffer({buffer:new ArrayBuffer(1024)})
  mod.store(outBuffer)
  assertEquals(inBuffer.toString(), outBuffer.toString())
})

Deno.test("store data.wasm", async () => {
  const [mod, inBuffer] = await loadModule("./test/data/wasm/data.wasm")
  const outBuffer = new Buffer({buffer:new ArrayBuffer(1024)})
  mod.store(outBuffer)
  assertEquals(inBuffer.toString(), outBuffer.toString())
})

Deno.test("store table.wasm", async () => {
  const [mod, inBuffer] = await loadModule("./test/data/wasm/table.wasm")
  const outBuffer = new Buffer({buffer:new ArrayBuffer(1024)})
  mod.store(outBuffer)
  assertEquals(inBuffer.toString(), outBuffer.toString())
})

// invoke

Deno.test("invoke add.wasm", async () => {
  const [mod] = await loadModule("./test/data/wasm/add.wasm")
  const inst = mod.instantiate()
  assertEquals(3, inst.exports.add(1, 2))
  assertEquals(0, inst.exports.add(42, -42))
  assertEquals(-100, inst.exports.add(0, -100))
  assertEquals(1000, inst.exports.add(999, 1))
  assertEquals(10000, inst.exports.add(9999, 1))
})

Deno.test("invoke loop.wasm", async () => {
  const [mod] = await loadModule("./test/data/wasm/loop.wasm")
  const inst = mod.instantiate()
  assertEquals(300, inst.exports.loop())
})

Deno.test("invoke doubleloop.wasm", async () => {
  const [mod] = await loadModule("./test/data/wasm/doubleloop.wasm")
  const inst = mod.instantiate()
  assertEquals(45, inst.exports.loop())
})

Deno.test("invoke if.wasm", async () => {
  const [mod] = await loadModule("./test/data/wasm/if.wasm")
  const inst = mod.instantiate()
  assertEquals(0, inst.exports.ge10(5))
  assertEquals(0, inst.exports.ge10(9))
  assertEquals(1, inst.exports.ge10(10))
  assertEquals(1, inst.exports.ge10(15))
})

Deno.test("invoke call.wasm", async () => {
  const [mod] = await loadModule("./test/data/wasm/call.wasm")
  const inst = mod.instantiate()
  assertEquals(47, inst.exports.add42(5))
})

Deno.test("invoke br.wasm", async () => {
  const [mod] = await loadModule("./test/data/wasm/br.wasm")
  const inst = mod.instantiate()
  assertEquals(7, inst.exports.block_br())
  assertEquals(100, inst.exports.loop_br())
})

Deno.test("invoke gcd.wasm", async () => {
  const [mod] = await loadModule("./test/data/wasm/gcd.wasm")
  const inst = mod.instantiate()
  assertEquals(6, inst.exports.gcd(42, 12))
  assertEquals(14, inst.exports.gcd(42, 28))
})

Deno.test("invoke import.wasm", async () => {
  const logs:number[] = []
  const [mod] = await loadModule("./test/data/wasm/import.wasm")
  const inst = mod.instantiate({
    env: {
      print:(msg:number) => {
        //console.log(msg)
        logs.push(msg)
      }
    }
  })
  inst.exports.main()
  assertEquals(42, logs[0])
})

Deno.test("invoke import2.wasm", async () => {
  const [mod] = await loadModule("./test/data/wasm/import2.wasm")
  const inst = mod.instantiate({
    env: {
      mul:(n:number, m:number) => n * m
    }
  })
  assertEquals(42, inst.exports.mul(6, 7))
})

Deno.test("invoke global.wasm", async () => {
  const [mod] = await loadModule("./test/data/wasm/global.wasm")
  const inst = mod.instantiate()
  assertEquals(3, inst.exports.main())
})

Deno.test("invoke importglobal.wasm", async () => {
  const [mod] = await loadModule("./test/data/wasm/importglobal.wasm")
  const importObject = {
    env: {
      g: GlobalValue.build(42, {type:"i32", mut:true})
    }
  }
  const inst = mod.instantiate(importObject)
  inst.exports.add100()
  assertEquals(142, importObject.env.g.value)
  inst.exports.add100()
  assertEquals(242, importObject.env.g.value)
})

Deno.test("invoke start.wasm", async () => {
  const logs:number[] = []
  const [mod] = await loadModule("./test/data/wasm/start.wasm")
  const inst = mod.instantiate({
    env: {
      print:(msg:number) => {
        //console.log(msg)
        logs.push(msg)
      }
    }
  })
  assertEquals(100, logs[0])
})

Deno.test("invoke memory.wasm", async () => {
  const [mod] = await loadModule("./test/data/wasm/memory.wasm")
  const inst = mod.instantiate()
  assertEquals(99, inst.exports.get_ptr())
})

Deno.test("invoke importmemory.wasm", async () => {
  const [mod] = await loadModule("./test/data/wasm/importmemory.wasm")
  const importObject = {
    env: {
      mem: Memory.build(1)
    }
  }
  const inst = mod.instantiate(importObject)
  assertEquals(42, importObject.env.mem.readI32(0))
})

Deno.test("invoke data.wasm", async () => {
  const [mod] = await loadModule("./test/data/wasm/data.wasm")
  const importObject = {
    env: {
      mem: Memory.build(1)
    }
  }
  const inst = mod.instantiate(importObject)
  const hw = "hello world!"
  const bytes = importObject.env.mem.readBytes(0, hw.length)
  const s = new TextDecoder("utf-8").decode(bytes)
  assertEquals(hw, s)
})

Deno.test("invoke table.wasm", async () => {
  const [mod] = await loadModule("./test/data/wasm/table.wasm")
  const inst = mod.instantiate()
  assertEquals(1, inst.exports.call_f(0))
  assertEquals(2, inst.exports.call_f(1))
  assertEquals(3, inst.exports.call_f(2))
})
*/

Deno.test("invoke importtable.wasm", async () => {
  const [mod] = await loadModule("./test/data/wasm/importtable.wasm")
  const importObject = {
    env: {
      tab: Table.build([
        (n:number) => n + 1,
        (n:number) => n + 2,
      ])
    }
  }
  const inst = mod.instantiate(importObject)
  assertEquals(11, inst.exports.call(0, 10))
  assertEquals(22, inst.exports.call(1, 20))
})