;; the art of webassembly: list2-7
(module
  (import "env" "mem" (memory 1))
  (data (i32.const 0) "hello world!")
)