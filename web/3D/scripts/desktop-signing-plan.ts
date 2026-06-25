import { createDesktopSigningPlan, desktopSigningPlatforms, type DesktopSigningPlatform } from "../src/features/projects/desktop-signing-workflow";

const args = process.argv.slice(2);

function readOption(name: string) {
  const inlinePrefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(inlinePrefix));

  if (inline) {
    return inline.slice(inlinePrefix.length);
  }

  const optionIndex = args.indexOf(`--${name}`);

  return optionIndex >= 0 ? args[optionIndex + 1] : undefined;
}

function hasFlag(name: string) {
  return args.includes(`--${name}`);
}

function parsePlatforms() {
  const requested = readOption("platform");

  if (!requested) {
    return desktopSigningPlatforms;
  }

  return requested
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is DesktopSigningPlatform => desktopSigningPlatforms.includes(value as DesktopSigningPlatform));
}

const platforms = parsePlatforms();
const plan = createDesktopSigningPlan(process.env, platforms);

if (hasFlag("json")) {
  console.log(JSON.stringify(plan, null, 2));
} else {
  console.log(`Desktop signing readiness: ${plan.summary}`);

  for (const platform of plan.platforms) {
    console.log("");
    console.log(`${platform.ready ? "ready" : "missing"}  ${platform.label}`);

    if (platform.missingRequiredSecrets.length > 0) {
      console.log(`Missing required secrets: ${platform.missingRequiredSecrets.join(", ")}`);
    }

    console.log("Commands:");

    for (const command of platform.commands) {
      console.log(`- ${command.label}: ${command.command}`);
    }

    console.log("Checks:");

    for (const check of platform.checks) {
      console.log(`- ${check.label}: ${check.command}`);
    }
  }
}

if (hasFlag("fail-on-missing") && !plan.ready) {
  process.exitCode = 1;
}
