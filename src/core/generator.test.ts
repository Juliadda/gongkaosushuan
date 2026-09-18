import { describe, it, expect, afterEach } from 'vitest';
import { generatePresetQuestion, generateCustomQuestion } from '../core/generator';
import { resetRandomGenerator } from '../core/random';

describe('generator', () => {
  // 创建可控的随机数生成器用于测试
  function createSeededRandom(seed: number) {
    let current = seed;
    return () => {
      current = (current * 9301 + 49297) % 233280;
      return current / 233280;
    };
  }

  afterEach(() => {
    resetRandomGenerator();
  });

  describe('generatePresetQuestion', () => {
    it('should generate two-digit addition or subtraction', () => {
      const rng = createSeededRandom(12345);
      const question = generatePresetQuestion('two-digit-add-subtract', rng);

      expect(question.operands).toHaveLength(2);
      expect(question.operands[0]).toBeGreaterThanOrEqual(10);
      expect(question.operands[0]).toBeLessThanOrEqual(99);
      expect(question.operands[1]).toBeGreaterThanOrEqual(10);
      expect(question.operands[1]).toBeLessThanOrEqual(99);
      expect(['add', 'subtract']).toContain(question.type);
    });

    it('should generate three-digit addition', () => {
      const rng = createSeededRandom(12345);
      const question = generatePresetQuestion('three-digit-add', rng);

      expect(question.type).toBe('add');
      expect(question.operands).toHaveLength(2);
      expect(question.operands[0]).toBeGreaterThanOrEqual(100);
      expect(question.operands[0]).toBeLessThanOrEqual(999);
      expect(question.operands[1]).toBeGreaterThanOrEqual(100);
      expect(question.operands[1]).toBeLessThanOrEqual(999);
    });

    it('should generate three-digit subtraction without negative results', () => {
      const rng = createSeededRandom(12345);
      const question = generatePresetQuestion('three-digit-subtract', rng);

      expect(question.type).toBe('subtract');
      expect(question.operands).toHaveLength(2);
      // First operand should be >= second to avoid negative result
      expect(question.operands[0]).toBeGreaterThanOrEqual(question.operands[1]);
    });

    it('should generate two-digit multiply one-digit', () => {
      const rng = createSeededRandom(12345);
      const question = generatePresetQuestion('two-digit-multiply-one-digit', rng);

      expect(question.type).toBe('multiply');
      expect(question.operands).toHaveLength(2);
      expect(question.operands[0]).toBeGreaterThanOrEqual(10);
      expect(question.operands[0]).toBeLessThanOrEqual(99);
      expect(question.operands[1]).toBeGreaterThanOrEqual(1);
      expect(question.operands[1]).toBeLessThanOrEqual(9);
    });

    it('should generate two-digit multiply 11', () => {
      const rng = createSeededRandom(12345);
      const question = generatePresetQuestion('two-digit-multiply-11', rng);

      expect(question.type).toBe('multiply');
      expect(question.operands).toHaveLength(2);
      expect(question.operands[0]).toBeGreaterThanOrEqual(10);
      expect(question.operands[0]).toBeLessThanOrEqual(99);
      expect(question.operands[1]).toBe(11);
    });

    it('should generate two-digit multiply 15', () => {
      const rng = createSeededRandom(12345);
      const question = generatePresetQuestion('two-digit-multiply-15', rng);

      expect(question.type).toBe('multiply');
      expect(question.operands).toHaveLength(2);
      expect(question.operands[0]).toBeGreaterThanOrEqual(10);
      expect(question.operands[0]).toBeLessThanOrEqual(99);
      expect(question.operands[1]).toBe(15);
    });

    it('should generate multiply-estimate', () => {
      const rng = createSeededRandom(12345);
      const question = generatePresetQuestion('multiply-estimate', rng);

      expect(question.type).toBe('multiply');
      expect(question.operands).toHaveLength(2);
      expect(question.operands[0]).toBeGreaterThanOrEqual(10);
      expect(question.operands[0]).toBeLessThanOrEqual(99);
      expect(question.operands[1]).toBeGreaterThanOrEqual(10);
      expect(question.operands[1]).toBeLessThanOrEqual(99);
      // Should use first three digits
      expect(question.answer.length).toBeLessThanOrEqual(3);
    });

    it('should generate three-digit divide one-digit', () => {
      const rng = createSeededRandom(12345);
      const question = generatePresetQuestion('three-digit-divide-one-digit', rng);

      expect(question.type).toBe('divide');
      expect(question.operands).toHaveLength(2);
      expect(question.operands[0]).toBeGreaterThanOrEqual(100);
      expect(question.operands[0]).toBeLessThanOrEqual(999);
      expect(question.operands[1]).toBeGreaterThanOrEqual(1);
      expect(question.operands[1]).toBeLessThanOrEqual(9);
    });

    it('should generate three-digit divide two-digit', () => {
      const rng = createSeededRandom(12345);
      const question = generatePresetQuestion('three-digit-divide-two-digit', rng);

      expect(question.type).toBe('divide');
      expect(question.operands).toHaveLength(2);
      expect(question.operands[0]).toBeGreaterThanOrEqual(100);
      expect(question.operands[0]).toBeLessThanOrEqual(999);
      expect(question.operands[1]).toBeGreaterThanOrEqual(10);
      expect(question.operands[1]).toBeLessThanOrEqual(99);
    });

    it('should generate three-digit divide four-digit', () => {
      const rng = createSeededRandom(12345);
      const question = generatePresetQuestion('three-digit-divide-four-digit', rng);

      expect(question.type).toBe('divide');
      expect(question.operands).toHaveLength(2);
      expect(question.operands[0]).toBeGreaterThanOrEqual(100);
      expect(question.operands[0]).toBeLessThanOrEqual(999);
      expect(question.operands[1]).toBeGreaterThanOrEqual(1000);
      expect(question.operands[1]).toBeLessThanOrEqual(9999);
    });

    it('should never generate division by zero', () => {
      const rng = createSeededRandom(12345);

      for (let i = 0; i < 100; i++) {
        const question = generatePresetQuestion('three-digit-divide-one-digit', rng);
        expect(question.operands[1]).not.toBe(0);
      }
    });

    it('should generate multi-add with 3-5 operands', () => {
      const rng = createSeededRandom(12345);
      const question = generatePresetQuestion('multi-add', rng);

      expect(question.type).toBe('add');
      expect(question.operands.length).toBeGreaterThanOrEqual(3);
      expect(question.operands.length).toBeLessThanOrEqual(5);

      // All operands should be 2-digit
      question.operands.forEach(op => {
        expect(op).toBeGreaterThanOrEqual(10);
        expect(op).toBeLessThanOrEqual(99);
      });
    });

    it('should generate round-hundred questions', () => {
      const rng = createSeededRandom(12345);
      const question = generatePresetQuestion('round-hundred', rng);

      expect(question.type).toBe('add');
      expect(question.operands).toHaveLength(2);

      const [num, diff] = question.operands;
      const sum = num + diff;

      // Sum should be a multiple of 100
      expect(sum % 100).toBe(0);
      // First number should not be a multiple of 100
      expect(num % 100).not.toBe(0);
    });
  });

  describe('generateCustomQuestion', () => {
    it('should generate question with custom left and right digits', () => {
      const rng = createSeededRandom(12345);
      const config = {
        trainingType: 'single' as const,
        operations: ['add' as const],
        leftDigits: 2,
        rightDigits: 3,
      };

      const question = generateCustomQuestion(config, rng);

      expect(question.type).toBe('add');
      expect(question.operands).toHaveLength(2);
      expect(question.operands[0]).toBeGreaterThanOrEqual(10);
      expect(question.operands[0]).toBeLessThanOrEqual(99);
      expect(question.operands[1]).toBeGreaterThanOrEqual(100);
      expect(question.operands[1]).toBeLessThanOrEqual(999);
    });

    it('should generate 2-digit divide 3-digit', () => {
      const rng = createSeededRandom(12345);
      const config = {
        trainingType: 'single' as const,
        operations: ['divide' as const],
        leftDigits: 2,
        rightDigits: 3,
      };

      const question = generateCustomQuestion(config, rng);

      expect(question.type).toBe('divide');
      expect(question.operands[0]).toBeGreaterThanOrEqual(10);
      expect(question.operands[0]).toBeLessThanOrEqual(99);
      expect(question.operands[1]).toBeGreaterThanOrEqual(100);
      expect(question.operands[1]).toBeLessThanOrEqual(999);
    });

    it('should generate mixed operations', () => {
      const rng = createSeededRandom(12345);
      const config = {
        trainingType: 'mixed' as const,
        operations: ['add' as const, 'subtract' as const, 'multiply' as const],
        leftDigits: 2,
        rightDigits: 2,
      };

      const operations = new Set<string>();

      // Generate multiple questions to see variety
      for (let i = 0; i < 50; i++) {
        const question = generateCustomQuestion(config, rng);
        operations.add(question.type);

        expect(question.operands[0]).toBeGreaterThanOrEqual(10);
        expect(question.operands[0]).toBeLessThanOrEqual(99);
        expect(question.operands[1]).toBeGreaterThanOrEqual(10);
        expect(question.operands[1]).toBeLessThanOrEqual(99);
      }

      // Should have generated at least 2 different operation types
      expect(operations.size).toBeGreaterThanOrEqual(2);
    });

    it('should reject impossible non-negative subtraction digit order', () => {
      const rng = createSeededRandom(12345);
      const config = {
        trainingType: 'single' as const,
        operations: ['subtract' as const],
        leftDigits: 2,
        rightDigits: 3,
      };

      expect(() => generateCustomQuestion(config, rng)).toThrow(
        'Non-negative subtraction requires leftDigits >= rightDigits'
      );
    });
  });

  it('should generate real mixed add/subtract expressions', () => {
    const rng = createSeededRandom(24680);
    const question = generatePresetQuestion('mixed-add-subtract', rng);

    expect(question.operands.length).toBeGreaterThanOrEqual(3);
    expect(question.operators).toHaveLength(question.operands.length - 1);
    expect(question.operators).toContain('add');
    expect(question.operators).toContain('subtract');
    expect(Number(question.answer)).toBeGreaterThanOrEqual(0);
  });
});
