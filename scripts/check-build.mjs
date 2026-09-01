import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

async function listFiles(directory) {
  const entries = await readdir(directory);
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(directory, entry);
    const metadata = await stat(absolute);
    if (metadata.isDirectory()) {
      files.push(...(await listFiles(absolute)));
    } else {
      files.push(absolute);
    }
  }

  return files;
}

const [html, sourceHeaders, builtHeaders, files] = await Promise.all([
  readFile(path.join(dist, "index.html"), "utf8"),
  readFile(path.join(root, "public", "_headers"), "utf8"),
  readFile(path.join(dist, "_headers"), "utf8"),
  listFiles(dist),
]);

assert.equal(builtHeaders, sourceHeaders, "the deployed header policy must match its source");
const cspLine = sourceHeaders
  .split("\n")
  .find((line) => line.includes("Content-Security-Policy:"));
assert.ok(cspLine, "a CSP response header is present");
assert.match(cspLine, /script-src 'self'/);
assert.match(cspLine, /style-src 'self'/);
assert.match(cspLine, /frame-ancestors 'none'/);
assert.doesNotMatch(cspLine, /unsafe-inline|unsafe-eval|https?:|\*/i);

assert.doesNotMatch(html, /<style(?:\s|>)/i, "built HTML must not contain inline CSS");
assert.doesNotMatch(html, /\sstyle\s*=/i, "built HTML must not contain style attributes");
assert.doesNotMatch(html, /\son[a-z]+\s*=/i, "built HTML must not contain inline handlers");

const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
assert.ok(scripts.length > 0, "built HTML contains an external module entry");
for (const [, attributes, body] of scripts) {
  assert.match(attributes, /\ssrc=(?:"[^"]+"|'[^']+')/i, "every script is external");
  assert.equal(body.trim(), "", "external script elements contain no inline body");
}

for (const match of html.matchAll(/\b(?:src|href)=(?:"([^"]+)"|'([^']+)')/gi)) {
  const value = match[1] ?? match[2];
  assert.doesNotMatch(value, /^(?:https?:|\/\/|data:|blob:)/i, `${value} is not same-origin`);
}

assert.ok(files.some((file) => file.endsWith(".js")), "build contains JavaScript");
assert.ok(files.some((file) => file.endsWith(".css")), "build contains CSS");
assert.ok(files.some((file) => file.endsWith("favicon.svg")), "build contains the favicon");
assert.ok(!files.some((file) => file.includes(`${path.sep}archive${path.sep}`)), "archive is excluded");

console.log(`CSP/static build check passed (${files.length} deployed files).`);
