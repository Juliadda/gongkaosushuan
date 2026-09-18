import { describe, it, expect } from 'vitest';
import {
  checkAnswer,
  usesFirstThreeDigits,
  getCorrectAnswer,
  isDivisionEstimateWithinTolerance,
} from '../core/checker';

describe('checker', () => {
  describe('usesFirstThreeDigits', () => {
    it('should return true for all division operations', () => {
      expect(usesFirstThreeDigits('divide')).toBe(true);
    });

    it('should return true for multiply-estimate mode', () => {
      expect(usesFirstThreeDigits('multiply', 'multiply-estimate')).toBe(true);
    });

    it('should return false for other multiply modes', () => {
      expect(usesFirstThreeDigits('multiply', 'two-digit-multiply-two-digit')).toBe(false);
      expect(usesFirstThreeDigits('multiply')).toBe(false);
    });

    it('should return false for add and subtract', () => {
      expect(usesFirstThreeDigits('add')).toBe(false);
      expect(usesFirstThreeDigits('subtract')).toBe(false);
    });
  });

  describe('checkAnswer for complete answers', () => {
    it('should check addition with complete answer', () => {
      expect(checkAnswer('68', 'add', [23, 45])).toBe(true);
      expect(checkAnswer('67', 'add', [23, 45])).toBe(false);
      expect(checkAnswer('69', 'add', [23, 45])).toBe(false);
    });

    it('should check subtraction with complete answer', () => {
      expect(checkAnswer('68', 'subtract', [96, 28])).toBe(true);
      expect(checkAnswer('67', 'subtract', [96, 28])).toBe(false);
    });

    it('should check multiplication with complete answer', () => {
      expect(checkAnswer('360', 'multiply', [24, 15])).toBe(true);
      expect(checkAnswer('361', 'multiply', [24, 15])).toBe(false);
    });

    it('should trim whitespace', () => {
      expect(checkAnswer(' 68 ', 'add', [23, 45])).toBe(true);
      expect(checkAnswer('  360  ', 'multiply', [24, 15])).toBe(true);
    });

    it('should reject empty answers', () => {
      expect(checkAnswer('', 'add', [23, 45])).toBe(false);
      expect(checkAnswer('   ', 'add', [23, 45])).toBe(false);
    });

    it('should reject non-numeric answers', () => {
      expect(checkAnswer('abc', 'add', [23, 45])).toBe(false);
      expect(checkAnswer('12.5', 'add', [10, 2])).toBe(false);
      expect(checkAnswer('1-2', 'subtract', [5, 3])).toBe(false);
    });
  });

  describe('checkAnswer for first three digits', () => {
    it('should check division with first three digits', () => {
      // 1 / 2 = 0.5 -> "5"
      expect(checkAnswer('5', 'divide', [1, 2])).toBe(true);
      expect(checkAnswer('50', 'divide', [1, 2])).toBe(false);
      expect(checkAnswer('500', 'divide', [1, 2])).toBe(false);
    });

    it('should check division 12 / 5 = 2.4 -> "24"', () => {
      expect(checkAnswer('24', 'divide', [12, 5])).toBe(true);
      expect(checkAnswer('240', 'divide', [12, 5])).toBe(false);
    });

    it('should check division with three full digits', () => {
      // 2456 / 1000 = 2.456 -> "245"
      expect(checkAnswer('245', 'divide', [2456, 1000])).toBe(true);
      expect(checkAnswer('246', 'divide', [2456, 1000])).toBe(true); // 估算误差小于 1%
    });

    it('should check division with leading zeros in decimal', () => {
      // 3456 / 10000 = 0.3456 -> "345"
      expect(checkAnswer('345', 'divide', [3456, 10000])).toBe(true);
    });

    it('should check division with zero in the middle', () => {
      // 24059 / 10000 = 2.4059 -> "240"
      expect(checkAnswer('240', 'divide', [24059, 10000])).toBe(true);
    });

    it('should check multiply-estimate with first three digits', () => {
      // 23 * 45 = 1035 -> "103"
      expect(checkAnswer('103', 'multiply', [23, 45], 'multiply-estimate')).toBe(true);
      expect(checkAnswer('1035', 'multiply', [23, 45], 'multiply-estimate')).toBe(false);
    });

    it('should accept nearby division estimates but keep multiply-estimate exact', () => {
      expect(checkAnswer('245', 'divide', [2459, 1000])).toBe(true);
      expect(checkAnswer('246', 'divide', [2459, 1000])).toBe(true);
      expect(checkAnswer('103', 'multiply', [23, 45], 'multiply-estimate')).toBe(true);
      expect(checkAnswer('104', 'multiply', [23, 45], 'multiply-estimate')).toBe(true);
    });

    it('should allow ±1% relative error for division estimates', () => {
      expect(checkAnswer('790', 'divide', [388, 4894])).toBe(true);
      expect(checkAnswer('792', 'divide', [388, 4894])).toBe(true);
      expect(checkAnswer('800', 'divide', [388, 4894])).toBe(true);
      expect(checkAnswer('784', 'divide', [388, 4894])).toBe(false);
      expect(checkAnswer('801', 'divide', [388, 4894])).toBe(false);
      expect(isDivisionEstimateWithinTolerance('198', [200, 1])).toBe(true);
      expect(isDivisionEstimateWithinTolerance('197', [200, 1])).toBe(false);
    });

    it('should preserve short-code rules for terminating decimals', () => {
      expect(checkAnswer('5', 'divide', [1, 2])).toBe(true);
      expect(checkAnswer('50', 'divide', [1, 2])).toBe(false);
      expect(checkAnswer('24', 'divide', [12, 5])).toBe(true);
      expect(checkAnswer('240', 'divide', [12, 5])).toBe(false);
    });

    it('should check mixed add/subtract using its operator sequence', () => {
      expect(checkAnswer('460', 'add', [500, 120, 80], undefined, ['subtract', 'add'])).toBe(true);
      expect(checkAnswer('700', 'add', [500, 120, 80], undefined, ['subtract', 'add'])).toBe(false);
    });
  });

  describe('getCorrectAnswer', () => {
    it('should return complete answer for addition', () => {
      expect(getCorrectAnswer('add', [23, 45])).toBe('68');
    });

    it('should return complete answer for multiplication', () => {
      expect(getCorrectAnswer('multiply', [24, 15])).toBe('360');
    });

    it('should return first three digits for division', () => {
      expect(getCorrectAnswer('divide', [1, 2])).toBe('5');
      expect(getCorrectAnswer('divide', [12, 5])).toBe('24');
    });

    it('should return first three digits for multiply-estimate', () => {
      expect(getCorrectAnswer('multiply', [23, 45], 'multiply-estimate')).toBe('103');
    });
  });
});
