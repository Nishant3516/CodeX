class DevsArenaReporter {
  onRunComplete(_, results) {
    try {
      // 1. Failed assertions / runtime inside tests
      if (results.numFailedTests > 0) {
        for (const file of results.testResults) {
          for (const test of file.testResults) {
            if (test.status !== "failed") continue;
            const msg = test.failureMessages.join("\n");
            const marker = "__DEVSARENA_ASSERTION__:";

            // Structured failure
            if (msg.includes(marker)) {
              const payload = JSON.parse(msg.split(marker)[1].split("\n")[0]);
              console.log(
                JSON.stringify({
                  status: "FAILED_ASSERTION",
                  error: payload,
                })
              );
              return;
            }

            // Unstructured failure (bad test / runtime error)
            console.log(
              JSON.stringify({
                status: "FAILED_RUNTIME",
                error: {
                  message: msg,
                  hint: "Internal test error",
                },
              })
            );
            return;
          }
        }
      }

      // 2. Suite-level crash (syntax error, transform error, import error)
      if (results.numFailedTestSuites > 0) {
        console.log(
          JSON.stringify({
            status: "FAILED_RUNTIME",
            error: {
              message: simplify(
                results.testResults[0]?.failureMessage ||
                  "Test suite failed to run"
              ),
              hint: "Your code or test has a syntax/runtime error",
            },
          })
        );
        return;
      }

      // 3. No failures
      console.log(JSON.stringify({ status: "PASSED" }));
    } catch (err) {
      // 4. Reporter itself failed (never let this be silent)
      console.log(
        JSON.stringify({
          status: "FAILED_RUNTIME",
          error: {
            message: "Reporter crashed",
            hint: err?.message || "Unknown error",
          },
        })
      );
    }
  }
}

function simplify(msg) {
  return stripAnsi(String(msg || ""))
    .split("\n")
    .filter(
      (l) =>
        !l.includes("node_modules") &&
        !l.includes("jest-circus") &&
        !l.includes("at Object.")
    )
    .slice(0, 6)
    .join("\n");
}

function stripAnsi(s) {
  return s.replace(/\u001b\[[0-9;]*m/g, "");
}

module.exports = DevsArenaReporter;
