import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const roots = process.argv.slice(2);

function collectTestFiles(rootPath) {
  const entries = readdirSync(rootPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(rootPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".test.mjs")) {
      files.push(fullPath);
    }
  }

  return files;
}

const testFiles = roots
  .filter((rootPath) => {
    try {
      return statSync(rootPath).isDirectory();
    } catch {
      return false;
    }
  })
  .flatMap((rootPath) => collectTestFiles(rootPath))
  .sort((left, right) => left.localeCompare(right))
  .map((filePath) => relative(process.cwd(), filePath));

if (testFiles.length === 0) {
  process.exit(0);
}

const result = spawnSync(process.execPath, ["--test", ...testFiles], {
  stdio: "inherit"
});

process.exit(result.status ?? 1);
