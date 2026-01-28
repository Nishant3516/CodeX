#!/usr/bin/env node

const http = require("http");
const { spawn } = require("child_process");

const host = process.env.TEST_RUNNER_HOST || "127.0.0.1";
const port = Number(process.env.TEST_RUNNER_PORT || "9901");

function run({ checkpoint, language }) {
  return new Promise((resolve) => {
    const child = spawn("/usr/local/bin/devsarena-test-runner", [
      `--checkpoint=${checkpoint}`,
      `--language=${language}`
    ], {
      env: {
        ...process.env,
        CI: "1",
        NODE_ENV: "test",
        DEVSARENA_LANGUAGE: language,
        NODE_PATH: "/opt/devsarena/test-engine/node_modules:/workspace/node_modules"
      }
    });

    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));

    child.on("close", () => resolve(out.trim() || err.trim()));
  });
}

http
  .createServer(async (req, res) => {
    if (req.method !== "POST" || req.url?.split("?")[0] !== "/run") {
      res.writeHead(404);
      return res.end();
    }

    console.log("RECEIVED REQUEST " + req.url + " METHOD " + req.method)
    const url = new URL(req.url, "http://localhost");
    const checkpoint = Number(url.searchParams.get("checkpoint") || "-1");
    const language = url.searchParams.get("language") || undefined;
    console.log("CHECKPOINT: " + checkpoint + ", LANGUAGE: " + language);
    const payload = await run({ checkpoint, language });
    console.log("PAYLOAD: " + payload);
    res.writeHead(200, { "content-type": "application/json" });
    res.end(payload);
  })
  .listen(port, host, () => {
    // Intentionally minimal: pod-local service.
    process.stderr.write(`test-runner-service listening on http://${host}:${port}\n`);
  });
