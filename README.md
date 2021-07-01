# Wasmts

Wasm Runtime written in TypeScript.

This project is just for my learning purpose.

## How to Try

```javascript
$ deno
Deno 1.8.2
exit using ctrl+d or close()
> const Wasmts = await import("./bundle/wasm.js")
undefined
> const code = await Deno.readFile("./test/data/wasm/gcd.wasm")
undefined
> const instance = Wasmts.instantiate(code)
undefined
> instance.exports.gcd(42, 12)
6
> instance.exports.gcd(42, 28)
14
> close()
$
```

(See [test/data/wasm/gcd.wat](test/data/wasm/gcd.wat))

## How to Test

```
$ deno test --allow-read test/
```

## Instructions

### Control Instructions

| instruction         | status |
| ------------------- | ------ |
| nop                 | o      |
| unreachable         | o      |
| block               | o      |
| loop                | o      |
| if                  | o      |
| br                  | o      |
| br_if               | o      |
| br_table            | o      |
| return              | o      |
| call                | o      |
| call_indirect       | o      |

### Reference Instructions

| instruction         | status |
| ------------------- | ------ |
| ref.null            |        |
| ref.is_null         |        |
| ref.func            |        |

### Parametric Instructions

| instruction         | status |
| ------------------- | ------ |
| drop                |        |
| select              |        |

### Variable Instructions

| instruction         | status |
| ------------------- | ------ |
| local.get           | o      |
| local.set           | o      |
| local.tee           | o      |
| global.get          | o      |
| global.set          | o      |

### Table Instructions

| instruction         | status |
| ------------------- | ------ |
| table.get           |        |
| table.set           |        |
| table.size          |        |
| table.grow          |        |
| table.fill          |        |
| table.copy          |        |
| table.init          |        |
| elem.drop           |        |

### Memory Instructions

| instruction         | status |
| ------------------- | ------ |
| i32.load            | o      |
| f32.load            |        |
| i32.store           | o      |
| f32.store           |        |
| i32.load8_s         |        |
| i32.load8_u         |        |
| i32.load16_s        |        |
| i32.load16_u        |        |
| i64.load            |        |
| f64.load            |        |
| i64.store           |        |
| f64.store           |        |
| i64.load8_s         |        |
| i64.load8_u         |        |
| i64.load16_s        |        |
| i64.load16_u        |        |
| i64.load32_s        |        |
| i64.load32_u        |        |
| i32.store8          |        |
| i32.store16         |        |
| i64.store8          |        |
| i64.store16         |        |
| i64.store32         |        |
| memory.size         |        |
| memory.grow         |        |
| memory.fill         |        |
| memory.copy         |        |
| memory.init         |        |
| data.drop           |        |

### Numeric Instructions

| instruction         | status |
| ------------------- | ------ |
| i32.const           | o      |
| f32.const           |        |
| i64.const           |        |
| f64.const           |        |
| i32.clz             |        |
| i32.ctz             |        |
| i32.popcnt          |        |
| i32.add             | o      |
| i32.sub             |        |
| i32.mul             |        |
| i32.div_s           |        |
| i32.div_u           |        |
| i32.rem_s           | o      |
| i32.rem_u           |        |
| i32.and             |        |
| i32.or              |        |
| i32.xor             |        |
| i32.shl             |        |
| i32.shr_s           |        |
| i32.shr_u           |        |
| i32.rotl            |        |
| i32.rotr            |        |
| i64.clz             |        |
| i64.ctz             |        |
| i64.popcnt          |        |
| i64.add             |        |
| i64.sub             |        |
| i64.mul             |        |
| i64.div_s           |        |
| i64.div_u           |        |
| i64.rem_s           |        |
| i64.rem_u           |        |
| i64.and             |        |
| i64.or              |        |
| i64.xor             |        |
| i64.shl             |        |
| i64.shr_s           |        |
| i64.shr_u           |        |
| i64.rotl            |        |
| i64.rotr            |        |
| f32.abs             |        |
| f32.neg             |        |
| f32.sqrt            |        |
| f32.ceil            |        |
| f32.floor           |        |
| f32.trunc           |        |
| f32.nearest         |        |
| f64.abs             |        |
| f64.neg             |        |
| f64.sqrt            |        |
| f64.ceil            |        |
| f64.floor           |        |
| f64.trunc           |        |
| f64.nearest         |        |
| f32.add             |        |
| f32.sub             |        |
| f32.mul             |        |
| f32.div             |        |
| f32.min             |        |
| f32.max             |        |
| f32.copysign        |        |
| f64.add             |        |
| f64.sub             |        |
| f64.mul             |        |
| f64.div             |        |
| f64.min             |        |
| f64.max             |        |
| f64.copysign        |        |
| i32.eqz             | o      |
| i32.eq              |        |
| i32.ne              |        |
| i32.lt_s            | o      |
| i32.lt_u            |        |
| i32.gt_s            |        |
| i32.gt_u            |        |
| i32.le_s            |        |
| i32.le_u            |        |
| i32.ge_s            | o      |
| i32.ge_u            |        |
| f32.eq              |        |
| f32.ne              |        |
| f32.lt              |        |
| f32.gt              |        |
| f32.le              |        |
| f32.ge              |        |
| i64.eqz             |        |
| i64.eq              |        |
| i64.ne              |        |
| i64.lt_s            |        |
| i64.lt_u            |        |
| i64.gt_s            |        |
| i64.gt_u            |        |
| i64.le_s            |        |
| i64.le_u            |        |
| i64.ge_s            |        |
| i64.ge_u            |        |
| f64.eq              |        |
| f64.ne              |        |
| f64.lt              |        |
| f64.gt              |        |
| f64.le              |        |
| f64.ge              |        |
| i32.extend8_s       |        |
| i32.extend16_s      |        |
| i64.extend8_s       |        |
| i64.extend16_s      |        |
| i64.extend32_s      |        |
| i32.wrap_i64        |        |
| i64.extend_i32_s    |        |
| i64.extend_i32_u    |        |
| i32.trunc_f32_s     |        |
| i32.trunc_f32_u     |        |
| i32.trunc_sat_f32_s |        |
| i32.trunc_sat_f32_u |        |
| i64.trunc_f32_s     |        |
| i64.trunc_f32_u     |        |
| i64.trunc_sat_f32_s |        |
| i64.trunc_sat_f32_u |        |
| i32.trunc_f64_s     |        |
| i32.trunc_f64_u     |        |
| i32.trunc_sat_f64_s |        |
| i32.trunc_sat_f64_u |        |
| i64.trunc_f64_s     |        |
| i64.trunc_f64_u     |        |
| i64.trunc_sat_f64_s |        |
| i64.trunc_sat_f64_u |        |
| f32.demote_f64      |        |
| f64.promote_f32     |        |
| f32.convert_i32_s   |        |
| f32.convert_i32_u   |        |
| i32.reinterpret_f32 |        |
| f32.reinterpret_i32 |        |
| f64.convert_i32_s   |        |
| f64.convert_i32_u   |        |
| i64.reinterpret_f64 |        |
| f64.reinterpret_i64 |        |
| f32.convert_i64_s   |        |
| f32.convert_i64_u   |        |
| i32.reinterpret_f32 |        |
| f32.reinterpret_i32 |        |
| f64.convert_i64_s   |        |
| f64.convert_i64_u   |        |
| i64.reinterpret_f64 |        |
| f64.reinterpret_i64 |        |