import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Script, createContext } from "node:vm";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = await readFile(join(root, "site.js"), "utf8");
const command = "brew tap mean-weasel/foil\nbrew install --cask foil";
const failures = [];

async function checkCopySuccess() {
  const button = new FakeButton(command);
  let copiedText = "";
  const context = createHarness(button, {
    async writeText(value) {
      copiedText = value;
    },
  });

  run(context);
  await button.click();
  assert(
    copiedText === command,
    "copy button must write both Homebrew commands",
  );
  assert(
    button.textContent === "Copy commands",
    "copy button must restore its label",
  );
  assert(
    !button.classList.has("copied"),
    "copy button must clear its success state",
  );
}

async function checkCopyFailure() {
  const button = new FakeButton(command);
  const context = createHarness(button, {
    async writeText() {
      throw new Error("clipboard denied");
    },
  });

  run(context);
  await button.click();
  assert(
    !button.classList.has("copied"),
    "copy failure must not leave a false success state",
  );
}

function createHarness(button, clipboard) {
  return createContext({
    document: { querySelectorAll: () => [button] },
    navigator: { clipboard },
    window: { setTimeout: (callback) => callback() },
  });
}

function run(context) {
  new Script(source, { filename: "site.js" }).runInContext(context);
}

class FakeButton {
  constructor(copy) {
    this.dataset = { copy };
    const values = new Set();
    this.classList = {
      add: (value) => values.add(value),
      remove: (value) => values.delete(value),
      has: (value) => values.has(value),
    };
    this.textContent = "Copy commands";
  }

  addEventListener(_type, listener) {
    this.listener = listener;
  }

  async click() {
    await this.listener();
  }
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

await checkCopySuccess();
await checkCopyFailure();

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(
  "Site interaction check passed for Homebrew copy success and failure paths.",
);
