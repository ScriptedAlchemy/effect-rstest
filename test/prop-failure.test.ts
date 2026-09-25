import { expect, it } from "effect-rstest"
import { runFixture } from "./fixtures/run-fixture"

it("falsified properties fail, shrink, and release resources on timeout", async () => {
  const { status, stdout, stderr, report } = await runFixture("prop-failure", 1_000)
  expect(status, `${stdout}\n${stderr}`).toBe(1)
  expect(report.summary).toEqual({ failedTests: 4, passedTests: 0, skippedTests: 0, tests: 4 })
  expect(report.unhandledErrors).toEqual([])
  expect(report.files.flatMap((file) => file.errors)).toEqual([])
  const message = (name: string) => report.tests.find((test) => test.name === name)?.errors?.[0]?.message ?? ""
  expect(message("returns false")).toContain("Failure: returned false")
  for (const name of ["shrinks synchronous defects", "shrinks Effect defects"]) {
    expect(message(name)).toContain("Property falsified after 1 run(s) and 1 shrink(s)\nShrunk input: [1]")
  }
  expect(message("interrupts property checking on timeout")).toContain("test timed out in 10ms")
}, 30_000)
