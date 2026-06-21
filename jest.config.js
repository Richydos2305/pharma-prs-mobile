module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./src/__tests__/setup.ts'],
  testMatch: ['**/src/__tests__/**/*.test.{ts,tsx}'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
  resolver: 'react-native-worklets/jest/resolver.js'
};
