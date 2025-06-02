import { jest, describe, test, expect } from '@jest/globals';

describe('Basic Jest Tests', () => {
  test('simple addition works', () => {
    expect(1 + 1).toBe(2);
  });
  
  test('simple mocking works', () => {
    const mockFn = jest.fn().mockReturnValue(42);
    expect(mockFn()).toBe(42);
    expect(mockFn).toHaveBeenCalled();
  });
});
