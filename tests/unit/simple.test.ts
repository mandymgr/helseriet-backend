import { describe, it, expect } from '@jest/globals';

describe('Simple Test', () => {
  it('should pass', () => {
    expect(1 + 1).toBe(2);
  });

  it('should work with async', async () => {
    const result = await Promise.resolve('hello');
    expect(result).toBe('hello');
  });
});