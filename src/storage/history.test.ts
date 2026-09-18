import { beforeEach, describe, expect, it } from 'vitest';
import type { TrainingResult } from '../domain/types';
import { loadTrainingHistory, saveTrainingResult } from './history';

const STORAGE_KEY = 'gongkaosushuan_history';

function createResult(): TrainingResult {
  return {
    id: 'result_1',
    timestamp: 1,
    config: {
      modeType: 'preset',
      presetMode: 'three-digit-add',
      questionCount: 10,
      enableTimer: true,
    },
    totalQuestions: 1,
    correctCount: 1,
    wrongCount: 0,
    accuracy: 100,
    totalTime: 2,
    averageTime: 2,
    answers: [],
    wrongAnswers: [],
    version: 2,
  };
}

describe('training history storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and loads v2 records with per-question answers', () => {
    const result = createResult();
    saveTrainingResult(result);
    expect(loadTrainingHistory()).toEqual([result]);
  });

  it('rejects malformed records that could crash the history view', () => {
    const valid = createResult();
    const invalidAnswers = { ...valid, id: 'bad_answers', answers: 'not-an-array' };
    const missingWrongAnswers = { ...valid, id: 'bad_wrong_answers' } as Record<string, unknown>;
    delete missingWrongAnswers.wrongAnswers;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([invalidAnswers, missingWrongAnswers, valid])
    );

    expect(loadTrainingHistory()).toEqual([valid]);
  });

  it('returns an empty list for invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{invalid-json');
    expect(loadTrainingHistory()).toEqual([]);
  });
});
