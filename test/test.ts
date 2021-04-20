// deno test --allow-read 
import { assert, assertEquals } from "https://deno.land/std@0.93.0/testing/asserts.ts"
import { Binary } from "../src/core/binary.ts"
import { ModuleNode } from "../src/core/node.ts"

async function loadModule(filepath:string):Promise<[ModuleNode, Binary]> {
  const code = await Deno.readFile(filepath)
  const binary = new Binary(code)
  const mod = new ModuleNode()
  mod.load(binary)
  return [mod, binary]
}

// load

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

// store

Deno.test("store module.wasm", async () => {
  const [mod, inBinary] = await loadModule("./test/data/wasm/module.wasm")
  const outBinary = new Binary({buffer:new ArrayBuffer(1024)})
  mod.store(outBinary)
  assertEquals(inBinary.toString(), outBinary.toString())
})

Deno.test("store simple.wasm", async () => {
  const [mod, inBinary] = await loadModule("./test/data/wasm/simple.wasm")
  const outBinary = new Binary({buffer:new ArrayBuffer(1024)})
  mod.store(outBinary)
  assertEquals(inBinary.toString(), outBinary.toString())
})

Deno.test("store add.wasm", async () => {
  const [mod, inBinary] = await loadModule("./test/data/wasm/add.wasm")
  const outBinary = new Binary({buffer:new ArrayBuffer(1024)})
  mod.store(outBinary)
  assertEquals(inBinary.toString(), outBinary.toString())
})

Deno.test("store loop.wasm", async () => {
  const [mod, inBinary] = await loadModule("./test/data/wasm/loop.wasm")
  const outBinary = new Binary({buffer:new ArrayBuffer(1024)})
  mod.store(outBinary)
  assertEquals(inBinary.toString(), outBinary.toString())
})

// invoke

Deno.test("invoke add.wasm", async () => {
  const [mod] = await loadModule("./test/data/wasm/add.wasm")
  const inst = mod.instantiate()
  assertEquals(3, inst.exports.add(1, 2))
  assertEquals(0, inst.exports.add(42, -42))
  assertEquals(1000, inst.exports.add(999, 1))
  assertEquals(10000, inst.exports.add(9999, 1))
})