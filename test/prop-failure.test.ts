import { expect, it } from "effect-rstest"
import { runFixture } from "./fixtures/run-fixture"

it("falsified properties fail, shrink, and release resources on timeout", async () => {
  const { status, stdout, stderr, report } = await runFixture("prop-failure", 1_000)
  expect(status, `${stdout}\n${stderr}`).toBe(1)
  expect(report.summary).toEqual({ failedTests: 4, passedTests: 0, skippedTests: 0, tests: 4 })
  expect(report.unhandledErrors).toEqual([])
  expect(report.files.flatMap((file) => file.errors)).toEqual([])
}, 30_000)
