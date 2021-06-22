(module
  (global $a_val (mut i32) (i32.const 1))
  (global $b_val (mut i32) (i32.const 2))
  (global $c_val (mut i32) (i32.const 0))
  (func $main (export "main")
    (global.set $c_val
      (i32.add (global.get $a_val) (global.get $b_val))
    )
  ) 
) 