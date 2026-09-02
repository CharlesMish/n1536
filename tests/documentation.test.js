import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [readme, limitations, html, headers, wrangler, main] = await Promise.all([
  readFile(new URL("../README.md", import.meta.url), "utf8"),
  readFile(new URL("../docs/CLAIMS_AND_LIMITATIONS.md", import.meta.url), "utf8"),
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/_headers", import.meta.url), "utf8"),
  readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
  readFile(new URL("../src/main.js", import.meta.url), "utf8"),
]);

test("publication claims remain bounded in source and documentation", () => {
  const combined = `${readme}\n${limitations}\n${html}\n${main}`;

  assert.match(combined, /Same count\. Different claims\./);
  assert.match(combined, /local spacing statistic, not a universal quality ranking/i);
  assert.match(combined, /presentation correspondence/i);
  assert.match(combined, /not mathematical point transport/i);
  assert.match(combined, /canonical zero point/i);
  assert.match(combined, /128[^\n]*512/i);
  assert.match(combined, /initial random seed is `?4217`?/i);
  assert.match(main, /Square origin \(0,0\) sits on a pole/);
});

test("strict hosted policy allows only same-origin scripts and styles", () => {
  assert.match(headers, /script-src 'self'/);
  assert.match(headers, /style-src 'self'/);
  assert.doesNotMatch(headers, /unsafe-inline|unsafe-eval/i);
  assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)[^>]*>/i);
  assert.doesNotMatch(html, /<style(?:\s|>)/i);
});

test("review configuration has previews but no production route", () => {
  const config = JSON.parse(wrangler);
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, true);
  assert.equal(config.routes, undefined);
  assert.equal(config.route, undefined);
});
