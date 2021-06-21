(module
  (import "env" "mul" (func $mul (param i32) (param i32) (result i32)))
  (func (export "mul") (param $n i32) (param $m i32) (result i32)
    (call $mul (local.get $n) (local.get $m))
  )
)