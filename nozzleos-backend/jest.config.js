const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  // Add your database connection options here
});

module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.js'],
  globalTeardown: './jest.teardown.js',
  testTimeout: 30000,
};