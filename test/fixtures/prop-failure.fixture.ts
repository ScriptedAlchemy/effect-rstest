import { afterAll, assert, it } from "effect-rstest"
import { Effect, Schema } from "effect"

// Run only in the child runner: every property here is falsified on purpose.
const Input = Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 1_000 }))
const pureDefectValues: Array<number> = []
const effectDefectValues: Array<number> = []
let timeoutPropertyStarted = false
let timeoutPropertyReleased = false

afterAll(() => {
  assert.deepStrictEqual(pureDefectValues, [8, 1])
  assert.deepStrictEqual(effectDefectValues, [8, 1])
  assert.isTrue(timeoutPropertyStarted)
  assert.isTrue(timeoutPropertyReleased)
})

it.prop("returns false", [Input], () => false, { arbitrary: { runs: 1, seed: "assertion-shrink" } })

it.prop(
  "shrinks synchronous defects",
  [Input],
  ([value]) => {
    pureDefectValues.push(value)
    throw new Error("property defect")
  },
  { arbitrary: { runs: 1, seed: "assertion-shrink" } }
)

it.effect.prop(
  "shrinks Effect defects",
  [Input],
  ([value]) =>
    Effect.sync(() => {
      effectDefectValues.push(value)
      assert.strictEqual(value, 0)
    }),
  { arbitrary: { runs: 1, seed: "assertion-shrink" } }
)

it.effect.prop(
  "interrupts property checking on timeout",
  [Schema.Literal("value")],
  () =>
    Effect.acquireUseRelease(
      Effect.sync(() => {
        timeoutPropertyStarted = true
      }),
      () => Effect.never,
      () =>
        Effect.sync(() => {
          timeoutPropertyReleased = true
        })
    ),
  { timeout: 10, arbitrary: { runs: 1, maxDiscards: 0, seed: "property-timeout" } }
)
