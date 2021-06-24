(module
  (import "env" "print" (func $print (param i32)))

  (func $write100
    (call $print (i32.const 100))
  )

  (start $write100)
)