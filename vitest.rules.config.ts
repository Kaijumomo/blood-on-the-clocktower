// Vitest config for the Firebase RTDB rules tests. Runs only the rules
// suite; requires the Firebase RTDB emulator on port 9000:
//   npm run emulator
// then in another terminal:
//   npm run test:rules

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/firebase/rules.spec.ts"],
    globals: false,
    environment: "node",
    testTimeout: 20000,
  },
});
