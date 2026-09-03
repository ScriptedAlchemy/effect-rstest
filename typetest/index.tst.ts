import { it, layer, type Rstest, type Vitest } from "effect-rstest"
import type { Rstest as CoreRstest } from "@rstest/core"
import { Context, Layer } from "effect"
import { describe, expect, test } from "tstyche"

class Foo extends Context.Service<Foo, "foo">()("Foo") {}
class Bar extends Context.Service<Bar, "bar">()("Bar") {}

type CoreRstestReexport = Rstest extends CoreRstest ? true : false
type EffectMethodsNamespace = Vitest.Methods

const coreRstestReexport: CoreRstestReexport = true
const effectMethodsNamespace: EffectMethodsNamespace = it

describe("layer", () => {
  test("re-exports the core Rstest type without shadowing it", () => {
    expect(coreRstestReexport).type.toBe<true>()
    expect(effectMethodsNamespace).type.toBe<EffectMethodsNamespace>()
  })

  test("top-level export accepts full options", () => {
    expect(layer).type.toBeCallableWith(Layer.succeed(Foo, "foo"), {
      timeout: "5 seconds",
      excludeTestServices: true,
      memoMap: undefined as any
    })
  })

  test("top-level export accepts no options", () => {
    expect(layer).type.toBeCallableWith(Layer.succeed(Foo, "foo"))
  })

  test("it.layer accepts full options", () => {
    expect(it.layer).type.toBeCallableWith(Layer.succeed(Foo, "foo"), {
      timeout: "5 seconds",
      excludeTestServices: true,
      memoMap: undefined as any
    })
  })

  test("it.layer accepts no options", () => {
    expect(it.layer).type.toBeCallableWith(Layer.succeed(Foo, "foo"))
  })

  test("nested it.layer accepts timeout", () => {
    layer(Layer.succeed(Foo, "foo"))((it) => {
      expect(it.layer).type.toBeCallableWith(Layer.succeed(Bar, "bar"), {
        timeout: "3 seconds"
      })
    })
  })

  test("nested it.layer rejects excludeTestServices", () => {
    layer(Layer.succeed(Foo, "foo"))((it) => {
      expect(it.layer).type.not.toBeCallableWith(Layer.succeed(Bar, "bar"), {
        excludeTestServices: true
      })
    })
  })

  test("nested it.layer rejects memoMap", () => {
    layer(Layer.succeed(Foo, "foo"))((it) => {
      expect(it.layer).type.not.toBeCallableWith(Layer.succeed(Bar, "bar"), {
        memoMap: undefined as any
      })
    })
  })
})
