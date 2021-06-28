(module
  (import "env" "tab" (table 2 funcref))
  (type $return_i32 (func (param i32) (result i32)))

  (func (export "call") (param $fidx i32) (param $arg1 i32) (result i32)
    (call_indirect (type $return_i32) (local.get $arg1) (local.get $fidx))
  )
)