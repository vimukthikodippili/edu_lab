import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          // ts-jest needs 'node' module resolution (bundler is Next.js/build-tool only)
          moduleResolution: 'node',
          strict: true,
        },
      },
    ],
  },
}

export default config
