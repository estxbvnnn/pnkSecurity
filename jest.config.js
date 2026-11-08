/** Pruebas funcionales de QA (ver tests/README.md). Corren en serie (--runInBand) contra una
 * base de datos Postgres de pruebas aislada, nunca contra la base real. */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  setupFiles: ["<rootDir>/tests/env.setup.ts"],
  globalSetup: "<rootDir>/tests/globalSetup.ts",
  testTimeout: 15000,
  verbose: true,
};
