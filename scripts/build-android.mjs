#!/usr/bin/env node
/**
 * Build the static SPA for the Capacitor Android shell and sync it into android/.
 *
 *   node scripts/build-android.mjs          # web bundle + cap sync
 *   node scripts/build-android.mjs --apk    # …then gradlew assembleDebug → Cifra.apk
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { createBuilder } from "vite";

const root = join(import.meta.dirname, "..");

// Start clean so files from a previous web (Nitro) build never end up in the APK.
rmSync(join(root, "dist"), { recursive: true, force: true });

// buildApp (not build) runs every environment plus the SPA-shell prerender, like `vite build`.
const builder = await createBuilder({ root, configFile: join(root, "vite.android.config.ts") });
await builder.buildApp();

function run(command, cwd, env = process.env) {
  // shell: true lets Windows resolve .cmd/.bat shims (npx, gradlew.bat).
  const result = spawnSync(command, { cwd, stdio: "inherit", shell: true, env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Capacitor 8 compiles with Java 21. When JAVA_HOME is older, use a JDK 21+
// installed next to it (e.g. D:\java\jdk-21…) for Gradle only.
function javaMajor(home) {
  const release = join(home, "release");
  if (!existsSync(release)) return 0;
  const match = readFileSync(release, "utf8").match(/JAVA_VERSION="(\d+)/);
  return match ? Number(match[1]) : 0;
}

function gradleEnv() {
  const home = process.env.JAVA_HOME;
  if (!home || javaMajor(home) >= 21) return process.env;
  const newer = readdirSync(dirname(home))
    .map((name) => join(dirname(home), name))
    .find((candidate) => javaMajor(candidate) >= 21);
  if (!newer) throw new Error(`Capacitor needs JDK 21+, but JAVA_HOME is ${home}`);
  console.log(`Using ${newer} for Gradle`);
  return { ...process.env, JAVA_HOME: newer };
}

run("npx cap sync android", root);

if (process.argv.includes("--apk")) {
  // Absolute path: cmd.exe may be configured not to search the current directory.
  const gradlew = join(root, "android", process.platform === "win32" ? "gradlew.bat" : "gradlew");
  run(`"${gradlew}" assembleDebug`, join(root, "android"), gradleEnv());
  copyFileSync(join(root, "android/app/build/outputs/apk/debug/app-debug.apk"), join(root, "Cifra.apk"));
  console.log("\nAPK: Cifra.apk");
}
