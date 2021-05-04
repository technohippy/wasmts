(;
const wasmCode = await Deno.readFile("test/data/wasm/br.wasm")
const wasmModule = new WebAssembly.Module(wasmCode)
const wasmInstance = new WebAssembly.Instance(wasmModule)
wasmInstance.exports.br()
;)

(module
  (func (export "block_br") (result i32)
    (local $ret i32)
    (local.set $ret (i32.const 0))

    (block $b1 
      (local.set $ret (i32.add (local.get $ret) (i32.const 1)))
      (block $b2
        (local.set $ret (i32.add (local.get $ret) (i32.const 2)))
        (block $b3
          (local.set $ret (i32.add (local.get $ret) (i32.const 4)))
          (br $b1)
          (local.set $ret (i32.add (local.get $ret) (i32.const 8)))
        )
        (local.set $ret (i32.add (local.get $ret) (i32.const 16)))
      )
      (local.set $ret (i32.add (local.get $ret) (i32.const 32)))
    )
    (local.get $ret)
  )

  (func (export "loop_br") (result i32)
    (local $i i32)
    (local $sum i32)

    (local.set $sum (i32.const 0))
    (local.set $i (i32.const 0))
    (block $block 
      (loop $loop
        (br_if $block (i32.ge_u (local.get $i) (i32.const 3)))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (local.set $sum (i32.add (local.get $sum) (i32.const 100)))
      )
    )
    (local.get $sum)
  ) 
)