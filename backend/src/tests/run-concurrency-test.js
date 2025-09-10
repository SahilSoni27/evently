#!/usr/bin/env node

/**
 * Simple test runner for concurrency tests
 */

const { spawn } = require("child_process");
const path = require("path");

console.log("🧪 Running Concurrency Tests...\n");

// Compile and run the TypeScript test
const testFile = path.join(__dirname, "concurrency-test.ts");
const tsNode = spawn("npx", ["tsx", testFile], {
  stdio: "inherit",
  cwd: __dirname,
});

tsNode.on("close", (code) => {
  if (code === 0) {
    console.log("\n✅ Concurrency tests completed successfully!");
  } else {
    console.log("\n❌ Concurrency tests failed!");
    process.exit(code);
  }
});

tsNode.on("error", (error) => {
  console.error("❌ Failed to run tests:", error.message);
  process.exit(1);
});
