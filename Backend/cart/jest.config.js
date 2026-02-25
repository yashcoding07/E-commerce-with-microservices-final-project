/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.js'],
    setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
    verbose: true,
};
