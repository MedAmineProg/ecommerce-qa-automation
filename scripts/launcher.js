#!/usr/bin/env node
/**
 * Interactive launcher for this repo's npm scripts. Wraps them, doesn't
 * duplicate their logic — every menu entry just shells out to the same
 * `npm run <script>` a human would type. Adds two things on top: colored,
 * readable console output, and a persistent timestamped log file per run
 * under logs/ (gitignored), so you have a record to go back to without
 * needing to have kept the terminal open.
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const ROOT = path.join(__dirname, "..");
const LOG_DIR = path.join(ROOT, "logs");

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

const MENU = [
  { key: "1", label: "Full suite — headless (all browsers)", npmArgs: ["run", "test"], logged: true },
  { key: "2", label: "Full suite — headed (watch it run)", npmArgs: ["run", "test:headed"], logged: true },
  { key: "3", label: "Chromium only", npmArgs: ["run", "test:chromium"], logged: true },
  { key: "4", label: "Chromium only — headed (watch it run)", npmArgs: ["run", "test:chromium:headed"], logged: true },
  { key: "5", label: "Firefox only", npmArgs: ["run", "test:firefox"], logged: true },
  { key: "6", label: "WebKit only", npmArgs: ["run", "test:webkit"], logged: true },
  { key: "7", label: "E2E specs only", npmArgs: ["run", "test:e2e"], logged: true },
  { key: "8", label: "API specs only", npmArgs: ["run", "test:api"], logged: true },
  { key: "9", label: "Unit tests (Jest — squashtm-exporter)", npmArgs: ["run", "test:unit"], logged: true },
  { key: "10", label: "Export to SquashTM (CSV only)", npmArgs: ["run", "export:squashtm"], logged: true },
  {
    key: "11",
    label: "Export + push to SquashTM live (needs SQUASHTM_* in .env)",
    npmArgs: ["run", "export:squashtm", "--", "--push"],
    logged: true,
  },
  { key: "12", label: "Interactive UI mode (Playwright)", npmArgs: ["run", "test:ui"], logged: false },
  { key: "13", label: "Codegen (record a new test against the live site)", npmArgs: ["run", "codegen"], logged: false },
  { key: "14", label: "Open last HTML report", npmArgs: ["run", "report"], logged: false },
  { key: "0", label: "Exit" },
];

function stripAnsi(str) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

function printBanner() {
  const line = "─".repeat(60);
  console.log(`${c.cyan}${c.bold}┌${line}┐${c.reset}`);
  console.log(`${c.cyan}${c.bold}│${c.reset}  E-commerce QA Automation — Launcher${" ".repeat(21)}${c.cyan}${c.bold}│${c.reset}`);
  console.log(`${c.cyan}${c.bold}└${line}┘${c.reset}`);
}

function printMenu() {
  console.log("");
  for (const item of MENU) {
    if (item.key === "0") {
      console.log(`  ${c.dim}0)${c.reset}  Exit`);
      continue;
    }
    const tag = item.logged ? `${c.dim} [logged]${c.reset}` : "";
    console.log(`  ${c.yellow}${item.key.padStart(2)})${c.reset}  ${item.label}${tag}`);
  }
  console.log("");
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function formatDuration(ms) {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

/** Runs a command with live colored output, tee'd to a plain-text log file. */
function runLogged(item) {
  return new Promise((resolve) => {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    // ":" is a reserved character on Windows (NTFS alternate data streams)
    // — "test:unit" in a filename silently truncates to "test" with the
    // rest swallowed as a stream name, not an error. Sanitize broadly
    // rather than special-casing colons alone.
    const slug = item.npmArgs
      .filter((a) => a !== "run" && a !== "--")
      .join("-")
      .replace(/[^a-zA-Z0-9._-]/g, "-");
    const logPath = path.join(LOG_DIR, `${timestamp()}_${slug}.log`);
    const logStream = fs.createWriteStream(logPath);

    console.log(`\n${c.blue}${c.bold}▶ npm ${item.npmArgs.join(" ")}${c.reset}`);
    console.log(`${c.dim}  log: ${path.relative(ROOT, logPath)}${c.reset}\n`);

    const start = Date.now();
    const child = spawn("npm", item.npmArgs, {
      cwd: ROOT,
      shell: true,
      // FORCE_COLOR keeps Playwright/Jest's own colored output alive even
      // though stdout is piped (not a TTY) for the tee below.
      env: { ...process.env, FORCE_COLOR: "1" },
      stdio: ["inherit", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
      logStream.write(stripAnsi(chunk.toString()));
    });
    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
      logStream.write(stripAnsi(chunk.toString()));
    });

    child.on("close", (code) => {
      logStream.end();
      const duration = formatDuration(Date.now() - start);
      const ok = code === 0;
      const badge = ok ? `${c.green}${c.bold}PASS${c.reset}` : `${c.red}${c.bold}FAIL (exit ${code})${c.reset}`;
      console.log(`\n${c.dim}${"─".repeat(60)}${c.reset}`);
      console.log(`${badge}  ${c.dim}in ${duration} — log saved to ${path.relative(ROOT, logPath)}${c.reset}\n`);
      resolve();
    });
  });
}

/** Runs an interactive/long-lived command (UI mode, codegen, report viewer) with no tee — piping would break their TTY-dependent behavior. */
function runInteractive(item) {
  return new Promise((resolve) => {
    console.log(`\n${c.blue}${c.bold}▶ npm ${item.npmArgs.join(" ")}${c.reset}\n`);
    const child = spawn("npm", item.npmArgs, { cwd: ROOT, shell: true, stdio: "inherit" });
    child.on("close", () => resolve());
  });
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  // stdin closing mid-prompt (Ctrl+D, or piped input running out) ends the
  // readline interface on its own; without this guard, the next .question()
  // call throws ERR_USE_AFTER_CLOSE instead of exiting cleanly.
  let closed = false;
  rl.on("close", () => {
    closed = true;
  });
  const ask = (q) =>
    new Promise((resolve) => {
      if (closed) return resolve(null);
      rl.question(q, resolve);
    });

  printBanner();

  while (!closed) {
    printMenu();
    const answer = await ask(`${c.magenta}Pick an option: ${c.reset}`);
    if (answer === null) break;
    const trimmed = answer.trim();
    const item = MENU.find((m) => m.key === trimmed);

    if (!item) {
      console.log(`${c.red}Not a valid option: "${trimmed}"${c.reset}`);
      continue;
    }
    if (item.key === "0") break;

    if (item.logged) {
      await runLogged(item);
    } else {
      await runInteractive(item);
    }
  }

  console.log(`${c.dim}Bye.${c.reset}`);
  if (!closed) rl.close();
}

main();
