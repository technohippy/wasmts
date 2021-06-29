export { ModuleNode as WasmModule } from "./core/node.ts"
export { Buffer as WasmBuffer } from "./core/buffer.ts"

import { ModuleNode  } from "./core/node.ts"
import { Buffer  } from "./core/buffer.ts"
import { Instance } from "./core/instance.ts"
export function instantiate(file:{buffer:ArrayBuffer}, importObject?:any):Instance {
  const buffer = new Buffer(file)
  const mod = new ModuleNode()
  mod.load(buffer)
  return mod.instantiate(importObject)
}