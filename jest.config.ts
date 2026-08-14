import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@database/(.*)$': '<rootDir>/src/database/$1',
    '^@drivers/(.*)$': '<rootDir>/src/modules/drivers/$1',
    '^@transactions/(.*)$': '<rootDir>/src/modules/transactions/$1',
    '^@finance/(.*)$': '<rootDir>/src/modules/finance/$1',
    '^@payables/(.*)$': '<rootDir>/src/modules/payables/$1',
    '^@driver-payments/(.*)$': '<rootDir>/src/modules/driver-payments/$1',
    '^@auth/(.*)$': '<rootDir>/src/modules/auth/$1',
    '^@applications/(.*)$': '<rootDir>/src/modules/$1',
  },
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
};

export default config;
