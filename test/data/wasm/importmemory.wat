(module
  (import "env" "mem" (memory 1))
  (func $set42
    (i32.store (i32.const 0) (i32.const 42))
  )
  (start $set42)
)