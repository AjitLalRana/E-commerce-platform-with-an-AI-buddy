/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/test/**/*.test.js'],
    setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
    verbose: true,
};