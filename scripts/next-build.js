const { spawnSync } = require("node:child_process");

// Some environments (including certain sandboxes) set npm_config_devdir, which
// triggers: "npm warn Unknown env config \"devdir\"".
// Ensure a clean build output in CI/Vercel by unsetting it.
delete process.env.npm_config_devdir;
delete process.env.NPM_CONFIG_DEVDIR;

const nextBin = require.resolve("next/dist/bin/next");
const result = spawnSync(process.execPath, [nextBin, "build"], {
  stdio: "inherit",
  env: process.env,
});

process.exit(typeof result.status === "number" ? result.status : 1);

