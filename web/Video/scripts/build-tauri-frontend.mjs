import { spawnSync } from "node:child_process";

const command = process.platform === "win32" ? "bun.cmd" : "bun";
const result = spawnSync(command, ["run", "build"], {
  env: {
    ...process.env,
    TAURI_STATIC_EXPORT: "1",
  },
  stdio: "inherit",
});

process.exit(result.status ?? 1);
