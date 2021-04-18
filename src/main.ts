import { ModuleNode, Binary } from "./wasmloader.ts"

const {args: [filename]} = Deno;

if (!filename) {
    console.error("no filename");
    Deno.exit(1);
}

const code = await Deno.readFile(filename);
const inBinary = new Binary(code)

const mod = new ModuleNode()
mod.load(inBinary)
//console.log(JSON.stringify(mod))

const ab = new ArrayBuffer(1024)
const outBinary = new Binary({buffer:ab})
mod.store(outBinary)
console.log(outBinary.toString())