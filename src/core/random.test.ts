import { describe, it, expect } from 'vitest';
import { randomInt, randomRange } from '../core/random';

describe('random', () => {
  // 创建可控的随机数生成器
  function createSeededRandom(seed: number) {
    let current = seed;
    return () => {
      current = (current * 9301 + 49297) % 233280;
      return current / 233280;
    };
  }

  describe('randomInt', () => {
    it('should generate 1-digit numbers (1-9)', () => {
      const rng = createSeededRandom(12345);

      for (let i = 0; i < 100; i++) {
        const num = randomInt(1, rng);
        expect(num).toBeGreaterThanOrEqual(1);
        expect(num).toBeLessThanOrEqual(9);
      }
    });

    it('should generate 2-digit numbers (10-99)', () => {
      const rng = createSeededRandom(12345);

      for (let i = 0; i < 100; i++) {
        const num = randomInt(2, rng);
        expect(num).toBeGreaterThanOrEqual(10);
        expect(num).toBeLessThanOrEqual(99);
      }
    });

    it('should generate 3-digit numbers (100-999)', () => {
      const rng = createSeededRandom(12345);

      for (let i = 0; i < 100; i++) {
        const num = randomInt(3, rng);
        expect(num).toBeGreaterThanOrEqual(100);
        expect(num).toBeLessThanOrEqual(999);
      }
    });

    it('should generate 4-digit numbers (1000-9999)', () => {
      const rng = createSeededRandom(12345);

      for (let i = 0; i < 100; i++) {
        const num = randomInt(4, rng);
        expect(num).toBeGreaterThanOrEqual(1000);
        expect(num).toBeLessThanOrEqual(9999);
      }
    });

    it('should throw error for invalid digits', () => {
      const rng = createSeededRandom(12345);

      expect(() => randomInt(0, rng)).toThrow();
      expect(() => randomInt(5, rng)).toThrow();
      expect(() => randomInt(-1, rng)).toThrow();
    });
  });

  describe('randomRange', () => {
    it('should generate numbers in specified range', () => {
      const rng = createSeededRandom(12345);

      for (let i = 0; i < 100; i++) {
        const num = randomRange(10, 20, rng);
        expect(num).toBeGreaterThanOrEqual(10);
        expect(num).toBeLessThanOrEqual(20);
      }
    });

    it('should handle single value range', () => {
      const rng = createSeededRandom(12345);
      const num = randomRange(5, 5, rng);
      expect(num).toBe(5);
    });
  });
});
