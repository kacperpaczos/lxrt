/** @type {import('ts-jest').JestConfigWithTsJest} */
const baseConfig = require('./jest.node.config.js');

module.exports = {
    ...baseConfig,
    collectCoverage: true,
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/**/*.test.ts',
        '!src/**/__tests__/**',
        '!src/ui/**',
        '!src/types/**',
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
};
