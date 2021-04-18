import { ModuleNode, Binary } from "./wasmloader.ts"

const {args: [filename]} = Deno;

if (!filename) {
    console.error("no filename");
    Deno.exit(1);
}

const code = await Deno.readFile(filename);

const mod = new ModuleNode()
mod.load(new Binary(code))
console.log(JSON.stringify(mod))