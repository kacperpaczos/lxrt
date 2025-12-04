/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-node-single-context',
  setupFilesAfterEnv: ['<rootDir>/tests/node/setup.ts'],
  testMatch: ['**/tests/node/**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: [
    '/node_modules/'
  ],
  roots: ['<rootDir>/tests/node', '<rootDir>/src'],
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@infra/(.*)$': '<rootDir>/src/infra/$1',
    '^@adapters/(.*)$': '<rootDir>/src/adapters/$1',
    '^@ui/(.*)$': '<rootDir>/src/ui/$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: false,
      skipLibCheck: true,
      noEmit: true,
      allowJs: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strict: false,
      forceConsistentCasingInFileNames: true,
      moduleResolution: 'node',
      resolveJsonModule: true,
      noEmitOnError: false
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|onnxruntime-node|@xenova))'
  ],
  // Stabilizacja wyjścia procesów testowych
  forceExit: true
};


