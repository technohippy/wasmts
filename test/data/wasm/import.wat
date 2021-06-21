(module
  (import "env" "print" (func $print (param i32)))
  (func (export "main")
    (call $print (i32.const 42))
  )
)