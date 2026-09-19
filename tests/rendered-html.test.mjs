import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);
const previewRoot = new URL("../app/_sites-preview/", import.meta.url);
let workerPromise;

async function render() {
  const worker = await loadWorker();

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

async function loadWorker() {
  if (workerPromise) return workerPromise;
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  workerPromise = import(workerUrl.href).then(({ default: worker }) => worker);
  return workerPromise;
}

test("server-renders the weather dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>isobar\. · 天气预报<\/title>/i);
  assert.match(html, /天气数据图表/);
  assert.match(html, /未来 7 天/);
  assert.match(html, /空气质量/);
  assert.match(html, /登录 \/ 注册/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/);
});

test("keeps the loading skeleton scoped and disposable", async () => {
  const [preview, css, page, layout, packageJson, files] = await Promise.all([
    readFile(new URL("SkeletonPreview.tsx", previewRoot), "utf8"),
    readFile(new URL("preview.css", previewRoot), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readdir(previewRoot),
  ]);

  assert.deepEqual(files.sort(), ["SkeletonPreview.tsx", "preview.css"]);
  assert.match(preview, /from "react-loading-skeleton"/);
  assert.match(preview, /baseColor="#eceae7"/);
  assert.match(preview, /highlightColor="#f9f8f6"/);
  assert.match(preview, /duration=\{2\.8\}/);
  assert.match(preview, /sites-skeleton-search-placeholder/);
  assert.match(packageJson, /"react-loading-skeleton": "3\.5\.0"/);

  const shellIndex = preview.indexOf('className="sites-skeleton-shell"');
  const statusIndex = preview.indexOf('className="sites-skeleton-status"');
  assert.ok(shellIndex >= 0 && statusIndex > shellIndex);
  assert.match(css, /position:\s*fixed/);
  assert.match(css, /inset:\s*0/);
  assert.match(css, /opacity:\s*0\.52/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(css, /#020617|canvas|pets|progress/i);
  assert.doesNotMatch(
    preview,
    /loading-spinner|status-mark|status-progress|canvas|cookie|random/i,
  );

  assert.match(page, /WeatherDashboard/);
  assert.match(page, /chatGPTSignInPath/);
  assert.match(layout, /title:\s*"isobar\. · 天气预报"/);
  assert.doesNotMatch(layout, /codex-preview|_sites-preview|themeColor|\bViewport\b/);
  assert.doesNotMatch(css, /(^|\s)(html|body)\s*\{/m);

  await assert.rejects(
    access(new URL("public/_sites-preview", templateRoot)),
  );
});

test("protects favorite writes and validates favorite payloads", async () => {
  const worker = await loadWorker();
  const env = {
    ASSETS: {
      fetch: async () => new Response("Not found", { status: 404 }),
    },
  };
  const context = {
    waitUntil() {},
    passThroughOnException() {},
  };

  const anonymous = await worker.fetch(
    new Request("http://localhost/api/favorites"),
    env,
    context,
  );
  assert.equal(anonymous.status, 401);

  const authHeaders = {
    "oai-authenticated-user-id": "test-user",
    "oai-authenticated-user-email": "test@example.com",
    "content-type": "application/json",
  };
  const invalid = await worker.fetch(
    new Request("http://localhost/api/favorites", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ city: { name: "香港" } }),
    }),
    env,
    context,
  );
  assert.equal(invalid.status, 400);

  const invalidDelete = await worker.fetch(
    new Request("http://localhost/api/favorites?cityId=", {
      method: "DELETE",
      headers: authHeaders,
    }),
    env,
    context,
  );
  assert.equal(invalidDelete.status, 400);
});
