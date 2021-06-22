(module
  (import "env" "g" (global $g (mut i32)))
  (func (export "add100")
    (global.set $g (i32.add (global.get $g) (i32.const 100)))
  )
)