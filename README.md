# Wasmts

Wasm Runtime written in TypeScript.

This project is just for my learning purpose.

## How to Try

```
$ deno
Deno 1.8.2
exit using ctrl+d or close()
> const Wasmts = await import("./bundle/wasm.js")
undefined
> const code = await Deno.readFile("./test/data/wasm/gcd.wasm")
undefined
> const instance = Wasmts.instantiate(code)
undefined
> instance.exports.gcd(42, 12)
6
> instance.exports.gcd(42, 28)
14
> close()
$
```

## How to Test

```
$ deno test --allow-read test/
```