import { WasmModule, WasmBuffer } from "../wasm.ts"

const {args: [jwe, filename, outfilename]} = Deno;

if (!filename) {
    console.error("no filename");
    Deno.exit(1);
}

const code = await Deno.readFile(filename);
const inBuffer = new WasmBuffer(code)

const mod = new WasmModule()
mod.load(inBuffer)
if (jwe === "-j") {
  console.log(JSON.stringify(mod))
} else if (jwe === "-w") {
  const ab = new ArrayBuffer(1024)
  const outBuffer = new WasmBuffer({buffer:ab})
  mod.store(outBuffer)

  console.log(outBuffer.toString())
  if (outfilename) {
    Deno.writeFile(outfilename, new Uint8Array(outBuffer.truncate().buffer))
  }
} else if (jwe === "-e") {
  // execute
} else {
  throw new Error(`invalid option: ${jwe}`)
}
