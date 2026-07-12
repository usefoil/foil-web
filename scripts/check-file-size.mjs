import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const maxLines = Number.parseInt(process.env.MAX_SOURCE_LINES || "300", 10);
const checkedExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".mjs",
  ".yaml",
  ".yml",
]);
const ignoredDirectories = new Set([
  ".git",
  ".worktrees",
  "dist",
  "docs",
  "marketing",
  "node_modules",
]);
const ignoredFiles = new Set(["package-lock.json"]);
const failures = [];
let checkedFiles = 0;

if (!Number.isInteger(maxLines) || maxLines < 1) {
  throw new Error("MAX_SOURCE_LINES must be a positive integer");
}

await visit(root);

if (failures.length) {
  console.error(
    failures
      .map(({ file, lines }) => `- ${file}: ${lines} lines (max ${maxLines})`)
      .join("\n"),
  );
  process.exit(1);
}

console.log(
  `File-size check passed for ${checkedFiles} source files (max ${maxLines} lines).`,
);

async function visit(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;

    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(path);
      continue;
    }

    if (
      ignoredFiles.has(entry.name) ||
      !checkedExtensions.has(extname(entry.name))
    )
      continue;

    const lines = (await readFile(path, "utf8")).split("\n").length;
    checkedFiles += 1;
    if (lines > maxLines) failures.push({ file: relative(root, path), lines });
  }
}
