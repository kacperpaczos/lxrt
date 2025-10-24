/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  ...require('./jest.config.js'),
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/node/setup.ts'],
  testMatch: ['**/tests/node/**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: [
    'tests_old/',
    '/node_modules/'
  ],
  roots: ['<rootDir>/tests/node', '<rootDir>/src'],
};


