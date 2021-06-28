(module
  (func $f1 (result i32)
    (i32.const 1)
  )
  (func $f2 (result i32)
    (i32.const 2)
  )
  (func $f3 (result i32)
    (i32.const 3)
  )
  (table $tbl 3 anyfunc)
  (elem (i32.const 0) $f1 $f2 $f3)

  (type $return_i32 (func (result i32)))

  (func (export "call_f") (param $p1 i32) (result i32)
    (call_indirect (type $return_i32) (local.get $p1))
  )
)