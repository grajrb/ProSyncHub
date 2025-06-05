// Root-level Jest test setup file for ProSyncHub
import { jest } from '@jest/globals';

// Provide common testing utilities and setup for all tests
jest.setTimeout(30000); // Increase timeout for all tests

// Set environment variables for testing
process.env.NODE_ENV = 'test';