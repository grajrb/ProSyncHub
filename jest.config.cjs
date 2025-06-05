// Updated Jest configuration for ProSyncHub
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: [
    '<rootDir>/server/tests/testSetup.ts',
    '<rootDir>/server/tests/jest.setup.redis-mock.new.ts',
    '<rootDir>/server/tests/jest.setup.mongodb-mock.new.ts'
  ],
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@/(.*)$': '<rootDir>/client/src/$1',
  },
  // Mock specific modules
  modulePathIgnorePatterns: ['<rootDir>/build/'],
  moduleDirectories: ['node_modules'],
  modulePaths: ['<rootDir>'],
  // Add mock path for our test mocks
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
