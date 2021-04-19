import { WasmModule, WasmBinary } from "../wasm.ts"

const {args: [jwe, filename, outfilename]} = Deno;

if (!filename) {
    console.error("no filename");
    Deno.exit(1);
}

const code = await Deno.readFile(filename);
const inBinary = new WasmBinary(code)

const mod = new WasmModule()
mod.load(inBinary)
if (jwe === "-j") {
  console.log(JSON.stringify(mod))
} else if (jwe === "-w") {
  const ab = new ArrayBuffer(1024)
  const outBinary = new WasmBinary({buffer:ab})
  mod.store(outBinary)

  console.log(outBinary.toString())
  if (outfilename) {
    Deno.writeFile(outfilename, new Uint8Array(outBinary.truncate().buffer))
  }
} else if (jwe === "-e") {
  // execute
} else {
  throw new Error(`invalid option: ${jwe}`)
}
