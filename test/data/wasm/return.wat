(module
  (func (export "switch") (param $param i32) (result i32)
    (block $case0
      (block $case1
        (block $case2
          (br_table $case0 $case1 $case2
            (local.get $param)
          )
        )
        (i32.const 12)
        (return)
      )
      (i32.const 11)
      (return)
    )
    (i32.const 10)
  )
)