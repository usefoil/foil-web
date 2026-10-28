import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
export async function scanOutput(directory, sentinels = []) {
  const failures = [];
  const files = [];
  async function visit(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const file = join(path, entry.name);
      if (entry.isDirectory()) await visit(file);
      else files.push(file);
    }
  }
  await visit(directory);
  const paths = files.map((file) => relative(directory, file));
  for (const path of paths) {
    if (
      /^(?:api|lib|vendor|test|node_modules)\//.test(path) ||
      /\.(?:ts|tgz)$/.test(path) ||
      /PROVENANCE/.test(path)
    )
      failures.push(`Server/source asset: ${path}`);
  }
  for (const file of files.filter((file) =>
    /\.(?:js|html|map|json)$/.test(file),
  )) {
    const text = await readFile(file, "utf8");
    if (
      /bd_api_v1\.|bd_auth_v1\.|BUGDROP_API_KEY|SUPABASE_SERVICE_ROLE|DATABASE_URL|BUGDROP_INTERNAL_APPLICATION_ID/.test(
        text,
      ) ||
      sentinels.some((sentinel) => sentinel && text.includes(sentinel))
    )
      failures.push(`Private material: ${relative(directory, file)}`);
    if (file.endsWith(".html")) {
      const launcher = /src=["']\/feedback\.js["']/.test(text);
      if (launcher !== (relative(directory, file) === "index.html"))
        failures.push(`Homepage-only entry: ${relative(directory, file)}`);
    }
  }
  for (const expected of ["feedback.js", "feedback-config.js", "index.html"])
    if (!paths.includes(expected)) failures.push(`Missing ${expected}`);
  const configText = await readFile(
    join(directory, "feedback-config.js"),
    "utf8",
  );
  const config = JSON.parse(
    configText.match(
      /^window\.FOIL_FEEDBACK_CONFIG = Object\.freeze\((.*)\);\n$/,
    )?.[1] || "null",
  );
  if (
    !config ||
    Object.keys(config).sort().join() !== "applicationId,enabled,widgetUrl" ||
    typeof config.enabled !== "boolean" ||
    typeof config.applicationId !== "string" ||
    typeof config.widgetUrl !== "string"
  )
    failures.push("Public config allowlist mismatch");
  const browser = await readFile(join(directory, "feedback.js"), "utf8");
  // This proves contract-literal presence, not arbitrary code safety or runtime authorization.
  const source = ts.createSourceFile(
    "/feedback.js",
    browser,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  // JS-specific syntactic diagnostics also reject TS-only syntax that the parser can recover.
  // Keep the program in memory: do not resolve imports, load libraries or execute output.
  const program = ts.createProgram(
    [source.fileName],
    { allowJs: true, noLib: true, noResolve: true, noEmit: true },
    {
      getSourceFile: (name) => (name === source.fileName ? source : undefined),
      getDefaultLibFileName: () => "/lib.d.ts",
      writeFile: () => {},
      getCurrentDirectory: () => "/",
      getCanonicalFileName: (name) => name,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => "\n",
      fileExists: (name) => name === source.fileName,
      readFile: (name) => (name === source.fileName ? browser : undefined),
    },
  );
  if (program.getSyntacticDiagnostics(source).length) {
    failures.push("Malformed browser integration JavaScript");
  } else {
    const literals = new Set();
    const visitLiteral = (node) => {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
        literals.add(node.text);
      ts.forEachChild(node, visitLiteral);
    };
    visitLiteral(source);
    if (
      !literals.has("https://foil.neonwatty.com") ||
      !literals.has("/api/bugdrop-capability/v1")
    )
      failures.push("Missing browser integration");
  }
  if (failures.length) throw new Error(failures.join("\n"));
  return { files: paths.length, publicConfig: config };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await scanOutput(
    join(root, "dist"),
    [
      process.env.BUGDROP_API_KEY,
      process.env.FOIL_PRIVATE_SCAN_SENTINEL,
      process.env.DATABASE_URL,
      process.env.BUGDROP_INTERNAL_APPLICATION_ID,
    ].filter(Boolean),
  );
  console.log("BugDrop output boundary check passed.");
}
