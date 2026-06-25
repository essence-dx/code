import {
  serializeSmokeFixtureLifecyclePlan,
  serializeSmokeFixtureLifecyclePlanJson,
  smokeFixtureLifecyclePlanFromEnv,
  type SmokeFixtureLifecycleCommandId,
} from "../src/features/presentation/smoke-fixture-lifecycle"

const args = new Set(process.argv.slice(2))
const outputJson =
  args.has("--json") || process.env.PRODUCTION_FIXTURES_FORMAT === "json"
const strict =
  args.has("--strict") || process.env.PRODUCTION_FIXTURES_STRICT === "true"

function selectedCommandId(): SmokeFixtureLifecycleCommandId | undefined {
  if (args.has("--seed-session")) return "seed-session"
  if (args.has("--reset-deck")) return "reset-deck"
  if (args.has("--verify-readiness")) return "verify-readiness"
  if (args.has("--browser-handoff")) return "browser-handoff"
  if (args.has("--plan")) return "review-plan"

  return undefined
}

const report = smokeFixtureLifecyclePlanFromEnv(process.env)
const commandId = selectedCommandId()
const selectedCommand = commandId
  ? report.commands.find((command) => command.id === commandId)
  : undefined

if (outputJson) {
  console.log(serializeSmokeFixtureLifecyclePlanJson(report))
} else {
  console.log(serializeSmokeFixtureLifecyclePlan(report))

  if (selectedCommand) {
    console.log("")
    console.log(
      `Selected command: ${selectedCommand.status.toUpperCase()} ${selectedCommand.command}`,
    )
    console.log(selectedCommand.detail)
  }
}

if (
  strict &&
  (report.status === "blocked" || selectedCommand?.status === "blocked")
) {
  process.exitCode = 1
}
