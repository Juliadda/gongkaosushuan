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
});
