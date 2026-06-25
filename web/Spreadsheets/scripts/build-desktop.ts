import { spawnSync } from "node:child_process";

const bunCommand = process.platform === "win32" ? "bun.cmd" : "bun";
const result = spawnSync(bunCommand, ["run", "build:web"], {
  env: {
    ...process.env,
    ESSENCE_EXCEL_RUNTIME: "desktop",
  },
  stdio: "inherit",
});

process.exit(result.status ?? 1);
