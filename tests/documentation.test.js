import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [readme, limitations, html, headers, wrangler, main, shell, shellStyles, studyStyles] =
  await Promise.all([
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/CLAIMS_AND_LIMITATIONS.md", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/_headers", import.meta.url), "utf8"),
    readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
    readFile(new URL("../src/main.js", import.meta.url), "utf8"),
    readFile(new URL("../src/shell.js", import.meta.url), "utf8"),
    readFile(new URL("../src/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../src/study-n.css", import.meta.url), "utf8"),
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

test("the shared shell remains separate from SAME N study behavior", () => {
  assert.match(html, /class="same-study same-n theme-uv"/);
  assert.match(html, /href="\/src\/styles\.css"/);
  assert.match(html, /href="\/src\/study-n\.css"/);
  assert.match(main, /from "\.\/shell\.js"/);
  assert.doesNotMatch(shell, /sampling|nearest|sobol|fibonacci|webgl/i);
  assert.doesNotMatch(shellStyles, /#spacingBtn|#walkBtn|\.same-n\b/);
  assert.match(studyStyles, /#spacingBtn/);
  assert.match(studyStyles, /#walkBtn/);
});

test("the shell exposes bounded compact and keyboard access", () => {
  assert.equal((html.match(/aria-live="polite"/g) ?? []).length, 1);
  assert.match(html, /id="field"[\s\S]*?tabindex="0"/);
  assert.match(html, /aria-describedby="field-instructions method-limitations"/);
  assert.match(html, /id="inspectBtn"/);
  assert.match(html, /aria-controls="usePlate"/);
  assert.match(shellStyles, /touch-action:\s*pinch-zoom/);
  assert.match(shellStyles, /safe-area-inset-bottom/);
  assert.match(shellStyles, /\.use-plate\.is-mobile-open/);
  assert.match(shell, /event\.repeat/);
});

test("review configuration has previews but no production route", () => {
  const config = JSON.parse(wrangler);
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, true);
  assert.equal(config.routes, undefined);
  assert.equal(config.route, undefined);
});
