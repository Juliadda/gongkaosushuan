import { describe, it, expect } from 'vitest';
import {
  calculateAnswer,
  calculateMixedAddSubtract,
  extractFirstThreeDigits,
  formatDivisionResult,
} from '../core/calculator';

describe('calculator', () => {
  describe('calculateAnswer', () => {
    it('should calculate addition correctly', () => {
      expect(calculateAnswer('add', [23, 45])).toBe(68);
      expect(calculateAnswer('add', [100, 200, 300])).toBe(600);
    });

    it('should calculate subtraction correctly', () => {
      expect(calculateAnswer('subtract', [96, 28])).toBe(68);
      expect(calculateAnswer('subtract', [500, 200, 100])).toBe(200);
    });

    it('should calculate multiplication correctly', () => {
      expect(calculateAnswer('multiply', [24, 15])).toBe(360);
      expect(calculateAnswer('multiply', [12, 11])).toBe(132);
    });

    it('should calculate division correctly', () => {
      expect(calculateAnswer('divide', [10, 2])).toBe(5);
      expect(calculateAnswer('divide', [1, 2])).toBe(0.5);
    });
  });

  describe('calculateMixedAddSubtract', () => {
    it('should follow the stored operator sequence', () => {
      expect(calculateMixedAddSubtract([500, 120, 80], ['subtract', 'add'])).toBe(460);
      expect(calculateMixedAddSubtract([300, 40, 20, 10], ['add', 'subtract', 'add'])).toBe(330);
    });
  });

  describe('extractFirstThreeDigits', () => {
    it('should extract first three digits for 2.4564', () => {
      // 245 / 100 = 2.45, but we want 2.4564
      // Let's use actual division
      const result = extractFirstThreeDigits('divide', [2456, 1000]);
      expect(result).toBe('245');
    });

    it('should extract first three digits for 0.3456', () => {
      // 3456 / 10000 = 0.3456
      const result = extractFirstThreeDigits('divide', [3456, 10000]);
      expect(result).toBe('345');
    });

    it('should extract first three digits for 0.003048', () => {
      // 3048 / 1000000 = 0.003048
      const result = extractFirstThreeDigits('divide', [3048, 1000000]);
      expect(result).toBe('304');
    });

    it('should extract first three digits for 2.4059', () => {
      // 24059 / 10000 = 2.4059
      const result = extractFirstThreeDigits('divide', [24059, 10000]);
      expect(result).toBe('240');
    });

    it('should extract first three digits for 128.97', () => {
      // 12897 / 100 = 128.97
      const result = extractFirstThreeDigits('divide', [12897, 100]);
      expect(result).toBe('128');
    });

    it('should extract first three digits for 0.5', () => {
      const result = extractFirstThreeDigits('divide', [1, 2]);
      expect(result).toBe('5');
    });

    it('should extract first three digits for 2.4', () => {
      const result = extractFirstThreeDigits('divide', [12, 5]);
      expect(result).toBe('24');
    });

    it('should handle integer division', () => {
      const result = extractFirstThreeDigits('divide', [100, 4]);
      expect(result).toBe('25');
    });

    it('should handle division with result > 100', () => {
      const result = extractFirstThreeDigits('divide', [456, 2]);
      expect(result).toBe('228');
    });

    it('should extract from multiply', () => {
      const result = extractFirstThreeDigits('multiply', [23, 45]);
      expect(result).toBe('103');
    });

    it('should extract from multiply with 4-digit result', () => {
      const result = extractFirstThreeDigits('multiply', [99, 99]);
      expect(result).toBe('980');
    });
  });

  describe('formatDivisionResult', () => {
    it('should format integer results', () => {
      expect(formatDivisionResult(100, 4)).toBe('25');
    });

    it('should format decimal results', () => {
      const result = formatDivisionResult(1, 2);
      expect(result).toBe('0.5');
    });

    it('should format with max decimals', () => {
      const result = formatDivisionResult(1, 3, 6);
      expect(result).toMatch(/^0\.333/);
    });
  });
});
