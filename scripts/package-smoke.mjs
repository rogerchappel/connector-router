#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const tempDir = await mkdtemp(join(tmpdir(), `${packageJson.name} pack smoke-`));

try {
  const output = execFileSync(
    "npm",
    ["pack", "--pack-destination", tempDir, "--json"],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    },
  );

  const [packument] = JSON.parse(output);
  const packedFiles = new Set(packument.files.map((file) => file.path));
  const requiredFiles = new Set([
    "README.md",
    "LICENSE",
    "SECURITY.md",
    "CONTRIBUTING.md",
    "CODE_OF_CONDUCT.md",
    "CHANGELOG.md",
    "SKILL.md",
    "docs/API.md",
    "docs/RELEASE_CANDIDATE.md",
    "fixtures/connectors/crm.json",
    "fixtures/fields/crm-task.json",
    "scripts/smoke.sh",
  ]);

  if (packageJson.main) {
    requiredFiles.add(packageJson.main.replace(/^\.\//, ""));
  }

  const binEntries =
    typeof packageJson.bin === "string"
      ? [packageJson.bin]
      : Object.values(packageJson.bin ?? {});

  for (const binEntry of binEntries) {
    requiredFiles.add(binEntry.replace(/^\.\//, ""));
  }

  const missing = [...requiredFiles].filter((file) => !packedFiles.has(file));

  if (missing.length > 0) {
    console.error(`${packageJson.name} package smoke failed; missing packed file(s):`);
    for (const file of missing) {
      console.error(`- ${file}`);
    }
    process.exit(1);
  }

  const installDir = join(tempDir, "installed package");
  execFileSync("npm", ["install", "--prefix", installDir, join(tempDir, packument.filename)], {
    stdio: ["ignore", "ignore", "inherit"],
  });

  const librarySmoke = `
    import { planIntent, validatePlan } from ${JSON.stringify(packageJson.name)};

    const catalog = [{
      id: "crm",
      actions: [{
        id: "create-task",
        risk: "internal_write",
        keywords: ["task"],
        requiredFields: ["title"],
      }],
    }];
    const planned = planIntent({
      intent: "create a task",
      catalog,
      fields: { title: "Follow up" },
      maxRisk: "internal_write",
    });
    if (!planned.ok || planned.plan.action.operation !== "create-task") {
      throw new Error("installed planIntent did not return the expected plan");
    }
    const validated = validatePlan(planned.plan, catalog);
    if (!validated.ok) {
      throw new Error(\`installed validatePlan rejected its generated plan: \${validated.errors.join(", ")}\`);
    }
  `;
  execFileSync(process.execPath, ["--input-type=module", "--eval", librarySmoke], {
    cwd: installDir,
    stdio: ["ignore", "inherit", "inherit"],
  });

  const binPath = join(installDir, "node_modules", ".bin", packageJson.name);
  const help = execFileSync(binPath, ["--help"], { encoding: "utf8" });
  if (!help.includes(`Usage: ${packageJson.name}`)) {
    throw new Error(`installed CLI help did not include expected usage text`);
  }

  const version = execFileSync(binPath, ["--version"], { encoding: "utf8" }).trim();
  if (version !== packageJson.version) {
    throw new Error(`installed CLI version ${version} did not match package ${packageJson.version}`);
  }

  const invalid = spawnSync(binPath, ["validate", "plan.json", "--catalog"], { encoding: "utf8" });
  if (invalid.status !== 1 || !invalid.stderr.includes("missing value for --catalog") || !invalid.stderr.includes(`Usage: ${packageJson.name}`)) {
    throw new Error(`installed CLI did not reject an invalid invocation with usage status 1`);
  }

  console.log(
    `${packageJson.name} package smoke passed with ${packument.files.length} packed file(s), an installed library import, and installed CLI checks.`,
  );
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
