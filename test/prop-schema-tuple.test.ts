import { expect, it } from "effect-rstest"
import { Schema } from "effect"
import { Arbitrary } from "effect/unstable/arbitrary"

it.prop(
  "plain tuple properties mix schemas and arbitraries",
  [Schema.Literal("schema"), Arbitrary.schema(Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 10 })))],
  ([label, count]) => {
    expect(label).toBe("schema")
    expect(Number.isInteger(count)).toBe(true)
    expect(count).toBeGreaterThanOrEqual(1)
    expect(count).toBeLessThanOrEqual(10)
  },
  { arbitrary: { runs: 20 } }
)

it.prop(
  "plain tuple properties accept Arbitrary-only inputs",
  [Arbitrary.Constant(7)],
  ([value]) => {
    expect(value).toBe(7)
  }
)
