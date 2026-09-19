import { describe, expect, it } from 'vitest';
import {
  generateHypothesisAllocationQuestion,
  generateHypothesisAllocationSet,
  HYPOTHESIS_ALLOCATION_MAX_ATTEMPTS,
  isFeatureFractionRate,
} from './hypothesisAllocation';

function createSeededRandom(seed: number) {
  let current = seed >>> 0;
  return () => {
    current = (current * 1664525 + 1013904223) >>> 0;
    return current / 0x100000000;
  };
}

function nearestOption(question: ReturnType<typeof generateHypothesisAllocationQuestion>, value: number) {
  return [...question.options]
    .sort((left, right) => Math.abs(left.value - value) - Math.abs(right.value - value))[0];
}

function nearestWrongGapRatio(question: ReturnType<typeof generateHypothesisAllocationQuestion>) {
  const correct = question.options.find(option => option.id === question.answer)!;
  return Math.min(
    ...question.options
      .filter(option => option.id !== question.answer)
      .map(option => Math.abs(option.value - correct.value))
  ) / question.exactValue;
}

function quickThreeDigitEstimate(question: ReturnType<typeof generateHypothesisAllocationQuestion>) {
  const magnitude = 10 ** Math.max(0, Math.floor(Math.log10(question.presentValue)) - 2);
  const truncatedPresent = Math.floor(question.presentValue / magnitude) * magnitude;
  const rate = question.ratePercent / 100;
  return question.target === 'base'
    ? truncatedPresent / (1 + rate)
    : (truncatedPresent * rate) / (1 + rate);
}

describe('hypothesis allocation generator', () => {
  it('generates 1,000 mathematically safe candidates within the attempt cap', () => {
    const rng = createSeededRandom(20260918);

    for (let index = 0; index < 1000; index++) {
      const question = generateHypothesisAllocationQuestion(rng, {
        fallbackSeed: index,
      });
      const optionValues = question.options.map(option => option.value);
      const correctOption = question.options.find(option => option.id === question.answer);
      const wrongGaps = question.options
        .filter(option => option.id !== question.answer)
        .map(option => Math.abs(option.value - (correctOption?.value ?? 0)));

      expect(new Set(optionValues).size).toBe(4);
      expect(correctOption).toBeDefined();
      expect(nearestOption(question, question.exactValue).id).toBe(question.answer);
      expect(nearestOption(question, question.methodEstimate).id).toBe(question.answer);
      expect(Math.abs(question.methodEstimate - correctOption!.value)).toBeLessThanOrEqual(
        Math.min(...wrongGaps) * 0.25
      );
      expect(question.tail).toBeGreaterThan(0);
      expect(question.tail / question.presentValue).toBeGreaterThanOrEqual(0.025);
      expect(question.tail / question.presentValue).toBeLessThanOrEqual(0.3);
      expect(isFeatureFractionRate(question.ratePercent)).toBe(false);
      expect(question.generationAttempts).toBeLessThanOrEqual(HYPOTHESIS_ALLOCATION_MAX_ATTEMPTS);
    }
  });

  it.each([10, 20, 30, 50])('builds a balanced, non-duplicated %i-question set', count => {
    const questions = generateHypothesisAllocationSet(count, createSeededRandom(1000 + count));
    const numericKeys = questions.map(question => (
      `${question.presentValue}|${question.ratePercent}|${question.target}`
    ));
    const baseCount = questions.filter(question => question.target === 'base').length;
    const choiceCounts = ['A', 'B', 'C', 'D'].map(choice => (
      questions.filter(question => question.answer === choice).length
    ));
    const closeCount = questions.filter(question => question.difficulty === 'hard').length;
    const wideQuestions = questions.filter(question => question.difficulty !== 'hard');

    expect(questions).toHaveLength(count);
    expect(new Set(numericKeys).size).toBe(count);
    expect(Math.abs(baseCount - (count - baseCount))).toBeLessThanOrEqual(1);
    expect(Math.max(...choiceCounts) - Math.min(...choiceCounts)).toBeLessThanOrEqual(1);
    expect(closeCount).toBe(count * 0.2);
    expect(wideQuestions).toHaveLength(count * 0.8);
    expect(wideQuestions.every(question => nearestWrongGapRatio(question) >= 0.059)).toBe(true);
    expect(wideQuestions.every(question => (
      nearestOption(question, quickThreeDigitEstimate(question)).id === question.answer
    ))).toBe(true);
    expect(questions
      .filter(question => question.difficulty === 'hard')
      .every(question => nearestWrongGapRatio(question) <= 0.04)
    ).toBe(true);
  });

  it('uses the rotating fallback without an unbounded retry loop', () => {
    const question = generateHypothesisAllocationQuestion(createSeededRandom(1), {
      maxAttempts: 0,
      fallbackSeed: 4,
      target: 'growth',
      difficulty: 'hard',
      correctIndex: 3,
    });

    expect(question.usedFallback).toBe(true);
    expect(question.generationAttempts).toBe(0);
    expect(question.answer).toBe('D');
    expect(question.options).toHaveLength(4);
  });

  it('produces varied structures rather than number-reskinned duplicates', () => {
    const questions = generateHypothesisAllocationSet(50, createSeededRandom(7788));
    const fingerprints = new Set(questions.map(question => question.fingerprint));
    const rates = new Set(questions.map(question => question.ratePercent));
    const magnitudes = new Set(questions.map(question => question.presentValue < 10000 ? 4 : 5));

    expect(fingerprints.size).toBeGreaterThanOrEqual(12);
    expect(rates.size).toBeGreaterThanOrEqual(12);
    expect(magnitudes.size).toBe(2);
  });

  describe('rate distribution', () => {
    it('common pool generates only 1%–15% rates', () => {
      const rng = createSeededRandom(5000);
      for (let index = 0; index < 100; index++) {
        const question = generateHypothesisAllocationQuestion(rng, {
          rateFrequency: 'common',
          fallbackSeed: index,
        });
        expect(question.ratePercent).toBeGreaterThanOrEqual(1);
        expect(question.ratePercent).toBeLessThanOrEqual(15);
        expect(isFeatureFractionRate(question.ratePercent)).toBe(false);
      }
    });

    it('high pool generates only >15%–25% rates', () => {
      const rng = createSeededRandom(6000);
      for (let index = 0; index < 100; index++) {
        const question = generateHypothesisAllocationQuestion(rng, {
          rateFrequency: 'high',
          fallbackSeed: index,
        });
        expect(question.ratePercent).toBeGreaterThan(15);
        expect(question.ratePercent).toBeLessThanOrEqual(25);
        expect(isFeatureFractionRate(question.ratePercent)).toBe(false);
      }
    });

    it('10-question set has 1 or 2 high-rate questions', () => {
      for (let seed = 1000; seed < 1050; seed++) {
        const questions = generateHypothesisAllocationSet(10, createSeededRandom(seed));
        const highCount = questions.filter(q => q.ratePercent > 15).length;
        expect(highCount).toBeGreaterThanOrEqual(1);
        expect(highCount).toBeLessThanOrEqual(2);
      }
    });

    it('20-question set has exactly 3 high-rate questions', () => {
      for (let seed = 2000; seed < 2050; seed++) {
        const questions = generateHypothesisAllocationSet(20, createSeededRandom(seed));
        const highCount = questions.filter(q => q.ratePercent > 15).length;
        expect(highCount).toBe(3);
      }
    });

    it('30-question set has 4 or 5 high-rate questions', () => {
      for (let seed = 3000; seed < 3050; seed++) {
        const questions = generateHypothesisAllocationSet(30, createSeededRandom(seed));
        const highCount = questions.filter(q => q.ratePercent > 15).length;
        expect(highCount).toBeGreaterThanOrEqual(4);
        expect(highCount).toBeLessThanOrEqual(5);
      }
    });

    it('50-question set has 7 or 8 high-rate questions', () => {
      for (let seed = 5000; seed < 5050; seed++) {
        const questions = generateHypothesisAllocationSet(50, createSeededRandom(seed));
        const highCount = questions.filter(q => q.ratePercent > 15).length;
        expect(highCount).toBeGreaterThanOrEqual(7);
        expect(highCount).toBeLessThanOrEqual(8);
      }
    });

    it('bulk generation converges to 85%/15% distribution', () => {
      const rng = createSeededRandom(9999);
      const allQuestions: ReturnType<typeof generateHypothesisAllocationQuestion>[] = [];

      for (let batch = 0; batch < 100; batch++) {
        const batchQuestions = generateHypothesisAllocationSet(10, rng);
        allQuestions.push(...batchQuestions);
      }

      const commonCount = allQuestions.filter(q => q.ratePercent <= 15).length;
      const highCount = allQuestions.filter(q => q.ratePercent > 15).length;
      const commonRatio = commonCount / allQuestions.length;

      expect(allQuestions.length).toBe(1000);
      expect(commonRatio).toBeGreaterThan(0.82);
      expect(commonRatio).toBeLessThan(0.88);
      expect(commonCount + highCount).toBe(1000);
    });

    it('single-question mode long-term distribution approaches 85%/15%', () => {
      const rng = createSeededRandom(8888);
      const questions: ReturnType<typeof generateHypothesisAllocationQuestion>[] = [];

      for (let index = 0; index < 1000; index++) {
        const question = generateHypothesisAllocationQuestion(rng, {
          fallbackSeed: index,
        });
        questions.push(question);
      }

      const commonCount = questions.filter(q => q.ratePercent <= 15).length;
      const commonRatio = commonCount / questions.length;

      expect(commonRatio).toBeGreaterThan(0.82);
      expect(commonRatio).toBeLessThan(0.88);
    });

    it('common-frequency fallback stays in 1%–15% range', () => {
      const question = generateHypothesisAllocationQuestion(createSeededRandom(100), {
        maxAttempts: 0,
        rateFrequency: 'common',
        fallbackSeed: 0,
        target: 'base',
        difficulty: 'easy',
        correctIndex: 0,
      });

      expect(question.usedFallback).toBe(true);
      expect(question.ratePercent).toBeGreaterThanOrEqual(1);
      expect(question.ratePercent).toBeLessThanOrEqual(15);
    });

    it('high-frequency fallback stays in >15%–25% range', () => {
      const question = generateHypothesisAllocationQuestion(createSeededRandom(200), {
        maxAttempts: 0,
        rateFrequency: 'high',
        fallbackSeed: 1,
        target: 'growth',
        difficulty: 'medium',
        correctIndex: 2,
      });

      expect(question.usedFallback).toBe(true);
      expect(question.ratePercent).toBeGreaterThan(15);
      expect(question.ratePercent).toBeLessThanOrEqual(25);
    });

    it('high-rate questions are not clustered at the end', () => {
      const questions = generateHypothesisAllocationSet(10, createSeededRandom(7777));
      const highIndices = questions
        .map((q, index) => (q.ratePercent > 15 ? index : -1))
        .filter(index => index >= 0);

      // 不应该所有较高增长率都在后半段
      const allInSecondHalf = highIndices.every(index => index >= 5);
      expect(allInSecondHalf).toBe(false);
    });
  });
});
