import type { Config } from "jest";

const config: Config = {
  projects: [
    {
      displayName: "unit",
      testEnvironment: "node",
      testMatch: ["**/__tests__/unit/**/*.test.ts"],
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react" } }],
      },
      moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
    },
    {
      displayName: "integration",
      testEnvironment: "node",
      testMatch: ["**/__tests__/integration/**/*.test.ts"],
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react" } }],
      },
      moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
    },
    {
      displayName: "components",
      testEnvironment: "jsdom",
      testMatch: ["**/__tests__/components/**/*.test.tsx"],
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }],
      },
      moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
      setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
    },
  ],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/app/**/page.tsx",
    "!src/app/**/layout.tsx",
  ],
};

export default config;
