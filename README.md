# effect-rstest

Helpers for testing [Effect](https://effect.website) (v4) code with [Rstest](https://rstest.rs). Provides an enhanced `it` function with support for scoped tests, test services such as `TestClock`, shared layers, and property testing.

This is a community port of [`@effect/vitest`](https://github.com/Effect-TS/effect/tree/main/packages/vitest) to the Rstest runner. The public API mirrors `@effect/vitest`; the differences forced by Rstest are documented in [Differences from `@effect/vitest`](#differences-from-effectvitest).

## Installation

```sh
npm install -D @rstest/core effect-rstest
npm install effect@rc
```

`effect-rstest` declares `effect` (v4, currently the `4.0.0-rc` line) and `@rstest/core` as peer dependencies.

### Preview / canary builds

Every pull request and every push to `main` publishes a canary tarball via [pkg.pr.new](https://github.com/stackblitz-labs/pkg.pr.new). Install one with the PR number or a commit SHA:

```sh
pnpm add https://pkg.pr.new/ScriptedAlchemy/effect-rstest@<pr-number-or-sha>
```

The publish workflow (and the shorter compact URLs like `https://pkg.pr.new/effect-rstest@<sha>`) require the [pkg.pr.new GitHub App](https://github.com/apps/pkg-pr-new) to be installed on the repository.

Add a test script and an `rstest.config.ts`:

```json
{
  "scripts": {
    "test": "rstest"
  }
}
```

```ts
// rstest.config.ts
import { defineConfig } from "@rstest/core"

export default defineConfig({
  include: ["test/**/*.test.ts"]
})
```

Note: `rstest` has no `--run` flag — running `rstest` already executes tests once and exits. Use `rstest --watch` for watch mode.

## Documentation

- [Effect website](https://effect.website)
- [`@effect/vitest` API reference](https://effect.website/docs/v4/api/vitest) (the API of this package mirrors it)
- [Rstest documentation](https://rstest.rs)

## Overview

The main entry point is the following import:

```ts
import { it } from "effect-rstest"
```

This import enhances the standard `it` function from `@rstest/core` with several powerful features, including:

| Feature        | Description                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------- |
| `it.effect`    | Runs a scoped test with test services such as `TestClock` and `TestConsole`.                        |
| `it.live`      | Runs a scoped test with the live Effect environment.                                                |
| `it.layer`     | Shares a `Layer` between multiple tests.                                                            |
| `it.prop`      | Runs property tests using Effect `Schema` values or `Arbitrary` inputs.                             |
| `it.flakyTest` | Retries an Effect that might occasionally fail until it succeeds or reaches the configured timeout. |

The package also re-exports everything from `@rstest/core` (`describe`, `expect`, `assert`, hooks, `rs`, ...), so a single import usually suffices, and provides the same assertion helpers as `@effect/vitest/utils` under `effect-rstest/utils`.

## Writing Tests with `it.effect`

Here's how to use `it.effect` to write your tests:

**Syntax**

```ts
import { it } from "effect-rstest"

it.effect("test name", () => EffectContainingAssertions, timeout: number | TestOptions = 5_000)
```

`it.effect` automatically provides the Effect test services, including [`TestClock`](#using-the-testclock), and a fresh `Scope` for each test. The scope is closed when the test finishes.

### Testing Successful Operations

To write a test, place your assertions directly within the main effect. This ensures that your assertions are evaluated as part of the test's execution.

**Example** (Testing a Successful Operation)

In the following example, we test a function that divides two numbers, but fails if the divisor is zero. The goal is to check that the function returns the correct result when given valid input.

```ts
import { expect, it } from "effect-rstest"
import { Effect } from "effect"

// A simple divide function that returns an Effect, failing when dividing by zero
function divide(a: number, b: number) {
  if (b === 0) return Effect.fail("Cannot divide by zero")
  return Effect.succeed(a / b)
}

// Testing a successful division
it.effect("test success", () =>
  Effect.gen(function*() {
    const result = yield* divide(4, 2) // Expect 4 divided by 2 to succeed
    expect(result).toBe(2) // Assert that the result is 2
  }))
```

### Testing Successes and Failures as `Exit`

When you need to handle both success and failure cases in a test, you can use `Effect.exit` to capture the outcome as an `Exit` object. This allows you to verify both successful and failed results within the same test structure.

**Example** (Testing Success and Failure with `Exit`)

```ts
import { expect, it } from "effect-rstest"
import { Effect, Exit } from "effect"

// A function that divides two numbers and returns an Effect.
// It fails if the divisor is zero.
function divide(a: number, b: number) {
  if (b === 0) return Effect.fail("Cannot divide by zero")
  return Effect.succeed(a / b)
}

// Test case for a successful division, using `Effect.exit` to capture the result
it.effect("test success as Exit", () =>
  Effect.gen(function*() {
    const result = yield* Effect.exit(divide(4, 2)) // Capture the result as an Exit
    expect(result).toStrictEqual(Exit.succeed(2)) // Expect success with the value 2
  }))

// Test case for a failure (division by zero), using `Effect.exit`
it.effect("test failure as Exit", () =>
  Effect.gen(function*() {
    const result = yield* Effect.exit(divide(4, 0)) // Capture the result as an Exit
    expect(result).toStrictEqual(Exit.fail("Cannot divide by zero")) // Expect failure with the correct message
  }))
```

### Using the TestClock

When writing tests with `it.effect`, Effect test services are automatically provided. These include the [`TestClock`](https://effect.website/docs/guides/testing/testclock), which allows you to simulate the passage of time in your tests.

**Note**: If you want to use the real-time clock (instead of the simulated one), you can switch to `it.live`.

**Example** (Using `TestClock` and `it.live`)

Here are examples that demonstrate how you can work with time in your tests using `it.effect` and `TestClock`:

1. **Using `it.live` to show the current time**: This will display the actual system time, since it runs in the live environment.

2. **Using `it.effect` without adjustments**: By default, the `TestClock` starts at `0`, simulating the beginning of time for your test without any time passing.

3. **Using `it.effect` and adjusting time**: In this test, we simulate the passage of time by advancing the clock by 1000 milliseconds (1 second).

```ts
import { it } from "effect-rstest"
import { Clock, Effect } from "effect"
import { TestClock } from "effect/testing"

// Effect to log the current time
const logNow = Effect.gen(function*() {
  const now = yield* Clock.currentTimeMillis // Fetch the current time from the clock
  console.log(now) // Log the current time
})

// Example of using the real system clock with `it.live`
it.live("runs the test with the live Effect environment", () =>
  Effect.gen(function*() {
    yield* logNow // Prints the actual current time
  }))

// Example of using `it.effect` with the default test environment
it.effect("run the test with the test environment", () =>
  Effect.gen(function*() {
    yield* logNow // Prints 0, as the test clock starts at 0
  }))

// Example of advancing the test clock by 1000 milliseconds
it.effect("run the test with the test environment and the time adjusted", () =>
  Effect.gen(function*() {
    yield* TestClock.adjust("1000 millis") // Move the clock forward by 1000 milliseconds
    yield* logNow // Prints 1000, reflecting the adjusted time
  }))
```

### Skipping Tests

If you need to temporarily disable a test but don't want to delete or comment out the code, you can use `it.effect.skip`. This is helpful when you're working on other parts of your test suite but want to keep the test for future execution.

**Example** (Skipping a Test)

```ts
import { it } from "effect-rstest"
import { expect } from "effect-rstest"
import { Effect, Exit } from "effect"

function divide(a: number, b: number) {
  if (b === 0) return Effect.fail("Cannot divide by zero")
  return Effect.succeed(a / b)
}

// Temporarily skip the test for dividing numbers
it.effect.skip("test failure as Exit", () =>
  Effect.gen(function*() {
    const result = yield* Effect.exit(divide(4, 0))
    expect(result).toStrictEqual(Exit.fail("Cannot divide by zero"))
  }))
```

### Running a Single Test

When you're developing or debugging, it's often useful to run a specific test without executing the entire test suite. You can achieve this by using `it.effect.only`, which will run just the selected test and ignore the others.

**Example** (Running a Single Test)

```ts
import { it } from "effect-rstest"
import { expect } from "effect-rstest"
import { Effect, Exit } from "effect"

function divide(a: number, b: number) {
  if (b === 0) return Effect.fail("Cannot divide by zero")
  return Effect.succeed(a / b)
}

// Run only this test, skipping all others
it.effect.only("test failure as Exit", () =>
  Effect.gen(function*() {
    const result = yield* Effect.exit(divide(4, 0))
    expect(result).toStrictEqual(Exit.fail("Cannot divide by zero"))
  }))
```

### Expecting Tests to Fail

When adding new failing tests, you might not be able to fix them right away. Instead of skipping them, you may want to assert it fails, so that when you fix them, you'll know and can re-enable them before it regresses.

**Example** (Asserting one test fails)

```ts
import { it } from "effect-rstest"
import { Effect, Exit } from "effect"

function divide(a: number, b: number) {
  if (b === 0) return Effect.fail("Cannot divide by zero")
  return Effect.succeed(a / b)
}

// Temporarily assert that the test for dividing by zero fails.
it.effect.fails("dividing by zero special cases", ({ expect }) =>
  Effect.gen(function*() {
    const result = yield* Effect.exit(divide(4, 0))
    expect(result).toStrictEqual(0)
  }))
```

### Logging

By default, `it.effect` suppresses log output, which can be useful for keeping test results clean. However, if you want to enable logging during tests, you can use `it.live` or provide a custom logger to control the output.

**Example** (Controlling Logging in Tests)

```ts
import { it } from "effect-rstest"
import { Effect, Logger } from "effect"

// This test won't display the log message, as logging is suppressed by default in `it.effect`
it.effect("does not display a log", () =>
  Effect.gen(function*() {
    yield* Effect.log("it.effect") // Log won't be shown
  }))

// This test will display the log because a custom logger is provided
it.effect("providing a logger displays a log", () =>
  Effect.gen(function*() {
    yield* Effect.log("it.effect with custom logger") // Log will be displayed
  }).pipe(
    Effect.provide(Logger.layer([Logger.consolePretty()])) // Providing a pretty logger for log output
  ))

// This test runs using `it.live`, which enables logging by default
it.live("it.live displays a log", () =>
  Effect.gen(function*() {
    yield* Effect.log("it.live") // Log will be displayed
  }))
```

## Resource Safety and Scope

Both `it.effect` and `it.live` provide a fresh `Scope` and close it after each test. Test bodies can therefore use scoped resources directly. Do not wrap the test body in `Effect.scoped`, because the test runner already manages its scope.

The test fiber receives Rstest's abort signal. If a test times out, the runner still reports the timeout, but an `onTestFinished` barrier waits for fiber settlement and scoped finalizers before later sequential tests and suite-layer release. The barrier does not impose a second cleanup timeout: a finalizer that never completes can prevent the suite from progressing. Successful non-void Effect values are discarded; ordinary failures and `.fails` outcomes retain their runner semantics.

**Native hook boundary:** Rstest runs native `afterEach` hooks before `onTestFinished`. On timeout, those hooks can run before Effect cleanup finishes; the settlement guarantee does not cover them. It also does not serialize tests explicitly scheduled concurrently.

**Example** (Managing a Resource Lifecycle)

```ts
import { it } from "effect-rstest"
import { Console, Effect } from "effect"

// Simulating the acquisition and release of a resource with console logging
const acquire = Console.log("acquire resource")
const release = Console.log("release resource")

// Defining a resource that requires proper management
const resource = Effect.acquireRelease(acquire, () => release)

it.effect("run with scope", () =>
  Effect.gen(function*() {
    yield* resource
  }))
```

## Sharing Layers with `layer`

Share a `Layer` between multiple tests, optionally wrapping the tests in a `describe` block if a name is provided.

Rstest's suite hook context has no abort signal. When setup exceeds an explicit layer `timeout`, or the inherited `hookTimeout` when omitted, suite teardown interrupts and awaits the setup fiber before closing its scope. This also releases resources acquired before an early setup failure. The teardown hook retains the same timeout: cleanup that exceeds it can outlive the hook and is not a bounded-cleanup guarantee. Hook failures remain runner failures. Named and unnamed layer blocks use the same lifecycle boundary.

```ts
import { assert, layer } from "effect-rstest"
import { Context, Effect, Layer } from "effect"

class Foo extends Context.Service<Foo, "foo">()("Foo") {
  static layer = Layer.succeed(Foo)("foo")
}

class Bar extends Context.Service<Bar, "bar">()("Bar") {
  static layer = Layer.effect(Bar)(Effect.map(Foo, () => "bar" as const))
}

layer(Foo.layer)("layer", (it) => {
  it.effect("adds context", () =>
    Effect.gen(function*() {
      const foo = yield* Foo
      assert.strictEqual(foo, "foo")
    }))

  it.layer(Bar.layer)("nested", (it) => {
    it.effect("adds context", () =>
      Effect.gen(function*() {
        const foo = yield* Foo
        const bar = yield* Bar
        assert.strictEqual(foo, "foo")
        assert.strictEqual(bar, "bar")
      }))
  })
})
```

## Writing Tests with `it.flakyTest`

`it.flakyTest` is a utility designed to manage tests that may not succeed consistently on the first attempt. These tests, often referred to as "flaky," can fail due to factors like timing issues, external dependencies, or randomness. `it.flakyTest` allows for retrying these tests until they pass or a specified timeout is reached.

**Example** (Handling Flaky Tests with Retries)

Let's start by setting up a basic test scenario that has the potential to fail randomly:

```ts
import { it } from "effect-rstest"
import { Effect, Random } from "effect"

// Simulating a flaky effect
const flaky = Effect.gen(function*() {
  const random = yield* Random.nextBoolean
  if (random) {
    return yield* Effect.fail("Failed due to randomness")
  }
})

// Standard test that may fail intermittently
it.effect("possibly failing test", () => flaky)
```

In this test, the outcome is random, so the test might fail depending on the result of `Random.nextBoolean`.

To handle this flakiness, we use `it.flakyTest` to retry the test until it passes, or until a defined timeout expires:

```ts
// Retrying the flaky test with a 5-second timeout
it.effect("retrying until success or timeout", () => it.flakyTest(flaky, "5 seconds"))
```

## Property Testing with `it.prop`

`it.prop`, `it.effect.prop` and `it.live.prop` run property tests using Effect `Schema` values or arbitraries from `effect/unstable/arbitrary`:

```ts
import { assert, it } from "effect-rstest"
import { Effect, Schema } from "effect"
import { Arbitrary } from "effect/unstable/arbitrary"

const realNumber = Schema.Finite
const letter = Arbitrary.schema(Schema.Literals(["a", "b"]))

// synchronous properties
it.prop("symmetry", [realNumber, Schema.Int], ([a, b]) => a + b === b + a)

// named inputs, mixing schemas and arbitraries
it.prop(
  "letters",
  { count: Schema.Int, text: letter },
  ({ count, text }) => Number.isInteger(count) && ["a", "b"].includes(text)
)

// effectful properties
it.effect.prop("schema with object", { value: Schema.Int }, ({ value }) =>
  Effect.sync(() => assert.isTrue(Number.isInteger(value))))
```

All three helpers accept tuple and record inputs. Schemas are converted with `Arbitrary.schema(schema)`; `Arbitrary` values are used directly. A schema must support arbitrary generation.

Returning `false`, throwing, or failing the Effect (including failed assertions) falsifies the property and shrinks the input; interruption still interrupts the test. The test timeout interrupts generation, evaluation, and shrinking, and Effect finalizers run. A timeout cannot preempt a synchronous callback that never returns.

Check options are passed as `arbitrary` in the options argument: `{ arbitrary: { runs: 200, seed: "repro" } }` (see `Arbitrary.CheckOptions`).

Requires `effect` `4.0.0-rc.113` or later. Earlier releases of `effect-rstest` used `effect/testing/FastCheck`, which Effect removed in rc.113; migrate `FastCheck.*` inputs to schemas or `Arbitrary`, and `{ fastCheck: { numRuns } }` to `{ arbitrary: { runs } }`.

## Differences from `@effect/vitest`

Rstest is intentionally Vitest-compatible, so most of the port is mechanical (`vitest` → `@rstest/core`). The behavioral differences are:

- **Runner re-exports**: the package re-exports `@rstest/core` instead of `vitest`, so `describe`, `expect`, `assert`, hooks and the `rs` utilities all come from Rstest.
- **Type namespaces**: the Effect helper namespace remains `Vitest` (`Vitest.Methods`, `Vitest.Tester`, ...) for source compatibility with `@effect/vitest`. The `Rstest` utility type from `@rstest/core` is therefore re-exported without being shadowed.
- **`describeWrapped` returns `void`**: Rstest's `describe` does not return a `SuiteCollector`, and its suite callback receives no arguments, so `describeWrapped(name, f)` passes the global `it` (wrapped with the Effect methods) to `f` and returns `void`.
- **Unnamed `layer(...)((it) => ...)` blocks**: Rstest has no `getCurrentSuite()` API, so the block's tests cannot be enumerated. The port uses an empty nested `describe` as the lifecycle boundary instead. Rstest omits the empty suite name from test paths, while its `beforeAll`/`afterAll` hooks ensure the layer is built before the block and released before a later test in the enclosing suite runs. Named blocks use the same hook lifecycle with their provided suite name.
- **`skipIf` / `runIf` coercion**: Rstest types the condition as `boolean` (Vitest accepts `unknown`), so the condition is coerced with `Boolean(...)`. The public signature still accepts `unknown`.
- **Test return values**: Rstest test callbacks must return `void`/`Promise<void>`, so the value produced by the test effect is not returned to the runner (it is discarded, as in `@effect/vitest` this value was ignored by Vitest anyway).
- **`addEqualityTesters`**: opt in by calling `addEqualityTesters()` in your test setup. When both compared values implement Effect's `Equal` protocol, the tester delegates to `Equal.equals`, including semantic inequality and nested comparisons. For other values it returns `undefined`, leaving plain-object equality and asymmetric matchers to Rstest. It does not replace Rstest's equality behavior globally.

## License

MIT — this package is a derivative work of [`@effect/vitest`](https://github.com/Effect-TS/effect/tree/main/packages/vitest), Copyright (c) 2023 Effectful Technologies Inc, also licensed under MIT.
