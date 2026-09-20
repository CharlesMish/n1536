import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
const host = process.env.SAME_N_HOST ?? "0.0.0.0";
const port = Number(process.env.SAME_N_PORT ?? 4173);

const headerSource = await readFile(path.join(root, "_headers"), "utf8");
const responseHeaders = Object.fromEntries(
  headerSource
    .split("\n")
    .filter((line) => /^\s+[^:]+:/.test(line))
    .map((line) => {
      const separator = line.indexOf(":");
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    }),
);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function safePathname(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname);
  const requested = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const absolute = path.resolve(root, requested);
  return absolute === root || absolute.startsWith(`${root}${path.sep}`) ? absolute : null;
}

const redirects = (await readFile(path.join(root, "_redirects"), "utf8"))
  .trim().split("\n").map(line => line.trim().split(/\s+/));

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", "http://localhost");
    const redirect = redirects.find(([from]) => from === url.pathname);
    if (redirect) {
      response.writeHead(Number(redirect[2]), { ...responseHeaders, Location: redirect[1] + url.search }).end();
      return;
    }
    let absolute = safePathname(request.url ?? "/");
    if (!absolute) {
      response.writeHead(400, responseHeaders).end("Bad request");
      return;
    }

    try {
      const metadata = await stat(absolute);
      if (metadata.isDirectory()) {
        if (!url.pathname.endsWith("/")) {
          response.writeHead(307, { ...responseHeaders, Location: url.pathname + "/" + url.search }).end();
          return;
        }
        absolute = path.join(absolute, "index.html");
      }
    } catch {
      response.writeHead(404, responseHeaders).end("Not found");
      return;
    }

    const body = await readFile(absolute);
    response.writeHead(200, {
      ...responseHeaders,
      "Content-Type": mimeTypes[path.extname(absolute)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(body);
  } catch (error) {
    response.writeHead(500, responseHeaders);
    response.end(error instanceof Error ? error.message : "Server error");
  }
});

server.listen(port, host, () => {
  console.log(`SAME review server listening on http://${host}:${port}`);
});
