/**
 * Tests for prompt utilities
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as readline from 'node:readline';

// Mock readline before importing the module
vi.mock('node:readline', () => ({
  createInterface: vi.fn().mockReturnValue({
    question: vi.fn((q, cb) => cb('test answer')),
    close: vi.fn()
  })
}));

describe('Prompt Utilities', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Reset mock implementation
    vi.mocked(readline.createInterface).mockReturnValue({
      question: vi.fn((q, cb) => cb('test answer')),
      close: vi.fn()
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('prompt', () => {
    it('should return user input', async () => {
      const { prompt } = await import('../src/utils/prompt.js');

      const result = await prompt('Enter something: ');

      expect(result).toBe('test answer');
    });

    it('should support yellow color option', async () => {
      vi.resetModules();
      const { prompt } = await import('../src/utils/prompt.js');

      const result = await prompt('Enter: ', { color: 'yellow' });

      expect(result).toBe('test answer');
    });

    it('should support cyan color option', async () => {
      vi.resetModules();
      const { prompt } = await import('../src/utils/prompt.js');

      const result = await prompt('Enter: ', { color: 'cyan' });

      expect(result).toBe('test answer');
    });

    it('should support gray color option', async () => {
      vi.resetModules();
      const { prompt } = await import('../src/utils/prompt.js');

      const result = await prompt('Enter: ', { color: 'gray' });

      expect(result).toBe('test answer');
    });

    it('should trim input', async () => {
      vi.mocked(readline.createInterface).mockReturnValue({
        question: vi.fn((q, cb) => cb('  spaced  ')),
        close: vi.fn()
      } as any);

      vi.resetModules();
      const { prompt } = await import('../src/utils/prompt.js');

      const result = await prompt('Enter: ');

      expect(result).toBe('spaced');
    });
  });

  describe('confirm', () => {
    it('should return true for "y" response', async () => {
      vi.mocked(readline.createInterface).mockReturnValue({
        question: vi.fn((q, cb) => cb('y')),
        close: vi.fn()
      } as any);

      vi.resetModules();
      const { confirm } = await import('../src/utils/prompt.js');

      const result = await confirm('Continue?');

      expect(result).toBe(true);
    });

    it('should return true for "yes" response', async () => {
      vi.mocked(readline.createInterface).mockReturnValue({
        question: vi.fn((q, cb) => cb('yes')),
        close: vi.fn()
      } as any);

      vi.resetModules();
      const { confirm } = await import('../src/utils/prompt.js');

      const result = await confirm('Continue?');

      expect(result).toBe(true);
    });

    it('should return false for "n" response', async () => {
      vi.mocked(readline.createInterface).mockReturnValue({
        question: vi.fn((q, cb) => cb('n')),
        close: vi.fn()
      } as any);

      vi.resetModules();
      const { confirm } = await import('../src/utils/prompt.js');

      const result = await confirm('Continue?');

      expect(result).toBe(false);
    });

    it('should return default true for empty response', async () => {
      vi.mocked(readline.createInterface).mockReturnValue({
        question: vi.fn((q, cb) => cb('')),
        close: vi.fn()
      } as any);

      vi.resetModules();
      const { confirm } = await import('../src/utils/prompt.js');

      const result = await confirm('Continue?', true);

      expect(result).toBe(true);
    });

    it('should return default false for empty response when defaultYes is false', async () => {
      vi.mocked(readline.createInterface).mockReturnValue({
        question: vi.fn((q, cb) => cb('')),
        close: vi.fn()
      } as any);

      vi.resetModules();
      const { confirm } = await import('../src/utils/prompt.js');

      const result = await confirm('Continue?', false);

      expect(result).toBe(false);
    });
  });
});
