const ENGINE_ROOT = "/opt/devsarena/test-engine";

module.exports = {
  rootDir: "/",
  roots: ["/internal-test"],
  testMatch: ["**/*.test.js"],
  testEnvironment: process.env.DEVSARENA_LANGUAGE === "react" ? "jsdom" : "node",
  setupFilesAfterEnv: [ENGINE_ROOT + "/jest.setup.cjs"],
  reporters: [ENGINE_ROOT + "/jest.reporter.cjs"],
  transform: {
    "^.+\\.[jt]sx?$": [
      "babel-jest",
      {
        presets: [
          ["@babel/preset-env", { targets: { node: "current" }, modules: "commonjs" }],
          ["@babel/preset-react", { runtime: "automatic" }],
        ],
      },
    ],
  },
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": ENGINE_ROOT + "/jest.empty-module.cjs",
    "\\.(gif|png|jpe?g|webp|svg|eot|otf|ttf|woff2?)$": ENGINE_ROOT + "/jest.empty-module.cjs",
  },
  moduleDirectories: [
    ENGINE_ROOT + "/node_modules",
    "/workspace/node_modules",
    "node_modules",
  ],
};
