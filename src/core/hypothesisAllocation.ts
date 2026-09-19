import type {
  ChoiceId,
  HypothesisAllocationDifficulty,
  HypothesisAllocationOption,
  HypothesisAllocationQuestion,
  HypothesisAllocationTarget,
} from '../domain/types';
import type { RandomGenerator } from './random';

const MAX_CANDIDATE_ATTEMPTS = 20;
const CHOICE_IDS: ChoiceId[] = ['A', 'B', 'C', 'D'];

// 刻意避开常见分数对应的特征百分数，防止专项退化成 415 份数题。
const FEATURE_FRACTION_RATES = [
  5, 5.3, 5.6, 5.9, 6.3, 6.7, 7.1, 7.7, 8.3, 9.1,
  10, 11.1, 12.5, 14.3, 16.7, 20, 25,
];

// 常见增长率池：1%–15%，训练频率约 85%
const COMMON_RATE_POOL = [
  1.2, 1.8, 2.3, 2.9, 3.4, 3.8, 4.3, 4.7,
  6.0, 6.9, 7.4, 8.7, 9.6,
  10.6, 11.7, 12.0, 13.2, 13.7, 14.8, 15.0,
];

// 较高增长率池：>15%–25%，训练频率约 15%
const HIGH_RATE_POOL = [
  15.4, 16.1, 17.3, 18.1, 18.8, 19.3,
  20.8, 21.6, 22.4, 23.1, 24.2,
];

const COMMON_FALLBACK_RECIPES = [
  { presentValue: 6384, ratePercent: 8.7 },
  { presentValue: 9276, ratePercent: 13.2 },
  { presentValue: 24860, ratePercent: 6.9 },
  { presentValue: 41850, ratePercent: 11.7 },
];

const HIGH_FALLBACK_RECIPES = [
  { presentValue: 57320, ratePercent: 18.1 },
  { presentValue: 84600, ratePercent: 22.4 },
  { presentValue: 63900, ratePercent: 19.3 },
];

type RateFrequency = 'common' | 'high';

interface GenerateOptions {
  target?: HypothesisAllocationTarget;
  difficulty?: HypothesisAllocationDifficulty;
  correctIndex?: number;
  recentFingerprints?: readonly string[];
  usedNumericKeys?: ReadonlySet<string>;
  maxAttempts?: number;
  fallbackSeed?: number;
  rateFrequency?: RateFrequency;
}

interface CandidateParams {
  presentValue: number;
  ratePercent: number;
  target: HypothesisAllocationTarget;
  difficulty: HypothesisAllocationDifficulty;
  correctIndex: number;
}

let hypothesisQuestionCounter = 0;

function generateId(): string {
  return `ha_${Date.now()}_${hypothesisQuestionCounter++}`;
}

function randomIndex(length: number, rng: RandomGenerator): number {
  return Math.min(length - 1, Math.floor(rng() * length));
}

function roundTo(value: number, unit: number): number {
  return Math.round(value / unit) * unit;
}

function cleanNumber(value: number): number {
  return Math.abs(value - Math.round(value)) < 1e-9
    ? Math.round(value)
    : Number(value.toFixed(1));
}

function formatNumber(value: number): string {
  return cleanNumber(value).toLocaleString('zh-CN', {
    maximumFractionDigits: 1,
  });
}

function chooseAnswerUnit(exactValue: number): number {
  if (exactValue < 100) return 1;
  return 10 ** Math.max(0, Math.floor(Math.log10(exactValue)) - 2);
}

function chooseInitialScale(exactBase: number, difficulty: HypothesisAllocationDifficulty): number {
  const baseUnit = 10 ** Math.max(1, Math.floor(Math.log10(exactBase)) - 1);
  const multiplier = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 2 : 1;
  return baseUnit * multiplier;
}

function rateBucket(ratePercent: number): string {
  if (ratePercent < 10) return 'low';
  if (ratePercent < 18) return 'medium';
  return 'high';
}

function tailBucket(tailRatio: number): string {
  if (tailRatio < 0.08) return 'small';
  if (tailRatio < 0.16) return 'medium';
  return 'large';
}

export function isFeatureFractionRate(ratePercent: number): boolean {
  return FEATURE_FRACTION_RATES.some(rate => Math.abs(ratePercent - rate) <= 0.15);
}

function nearestOptionId(value: number, options: HypothesisAllocationOption[]): ChoiceId | null {
  const distances = options
    .map(option => ({ id: option.id, distance: Math.abs(option.value - value) }))
    .sort((a, b) => a.distance - b.distance);

  if (distances.length < 2 || Math.abs(distances[0].distance - distances[1].distance) < 1e-9) {
    return null;
  }
  return distances[0].id;
}

function buildOptions(
  exactValue: number,
  methodEstimate: number,
  initialTarget: number,
  directPercentTarget: number,
  difficulty: HypothesisAllocationDifficulty,
  correctIndex: number
): { options: HypothesisAllocationOption[]; answer: ChoiceId } | null {
  const unit = chooseAnswerUnit(exactValue);
  const correctValue = roundTo(exactValue, unit);
  // 真实考试中大多数选项间距较宽，截取前三位即可判断；仅 hard 保留近选项。
  const relativeGap = difficulty === 'easy' ? 0.14 : difficulty === 'medium' ? 0.08 : 0.015;
  const minimumRelativeGap = difficulty === 'easy' ? 0.1 : difficulty === 'medium' ? 0.06 : 0.01;
  const gap = Math.max(unit * 3, roundTo(exactValue * relativeGap, unit));

  const mistakeCandidates = [
    { value: roundTo(initialTarget, unit), mistakeTag: '只完成首次分配' },
    { value: roundTo(directPercentTarget, unit), mistakeTag: '直接用现期量乘或减增长率' },
  ];
  const offsetCandidates = [
    { value: correctValue - gap, mistakeTag: '尾差分配偏小' },
    { value: correctValue + gap, mistakeTag: '尾差分配偏大' },
    { value: correctValue + gap * 2, mistakeTag: '尾差重复计入' },
    { value: correctValue - gap * 2, mistakeTag: '尾差修正过度' },
  ];
  const wrongCandidates = difficulty === 'hard'
    ? [...offsetCandidates, ...mistakeCandidates]
    : [...mistakeCandidates, ...offsetCandidates];

  const uniqueWrong: Array<{ value: number; mistakeTag: string }> = [];
  for (const candidate of wrongCandidates) {
    if (candidate.value <= 0 || candidate.value === correctValue) continue;
    if (Math.abs(candidate.value - correctValue) / exactValue < minimumRelativeGap) continue;
    if (uniqueWrong.some(item => item.value === candidate.value)) continue;
    uniqueWrong.push(candidate);
  }

  if (uniqueWrong.length < 3) return null;
  const selectedWrong = uniqueWrong.slice(0, 3);

  const answer = CHOICE_IDS[correctIndex];
  const options: HypothesisAllocationOption[] = [];
  let wrongIndex = 0;
  for (let index = 0; index < CHOICE_IDS.length; index++) {
    if (index === correctIndex) {
      options.push({ id: CHOICE_IDS[index], value: correctValue, display: formatNumber(correctValue) });
    } else {
      const wrong = selectedWrong[wrongIndex++];
      options.push({
        id: CHOICE_IDS[index],
        value: wrong.value,
        display: formatNumber(wrong.value),
        mistakeTag: wrong.mistakeTag,
      });
    }
  }

  const exactNearest = nearestOptionId(exactValue, options);
  const methodNearest = nearestOptionId(methodEstimate, options);
  const nearestWrongGap = Math.min(
    ...options.filter(option => option.id !== answer).map(option => Math.abs(option.value - correctValue))
  );
  const methodError = Math.abs(methodEstimate - correctValue);

  if (
    exactNearest !== answer
    || methodNearest !== answer
    || methodError > nearestWrongGap * 0.25
  ) {
    return null;
  }

  return { options, answer };
}

function buildCandidate(params: CandidateParams): HypothesisAllocationQuestion | null {
  const { presentValue, ratePercent, target, difficulty, correctIndex } = params;
  if (isFeatureFractionRate(ratePercent)) return null;

  const rate = ratePercent / 100;
  const exactBase = presentValue / (1 + rate);
  const exactGrowth = presentValue - exactBase;
  const initialScale = chooseInitialScale(exactBase, difficulty);
  let initialBase = Math.floor(exactBase / initialScale) * initialScale;
  if (initialBase <= 0) return null;

  let initialGrowth = cleanNumber(initialBase * rate);
  let tail = cleanNumber(presentValue - initialBase - initialGrowth);
  if (tail / presentValue < 0.025) {
    initialBase -= initialScale;
    if (initialBase <= 0) return null;
    initialGrowth = cleanNumber(initialBase * rate);
    tail = cleanNumber(presentValue - initialBase - initialGrowth);
  }

  const tailRatio = tail / presentValue;
  if (tail <= 0 || tailRatio < 0.025 || tailRatio > 0.3) return null;

  const exactValue = target === 'base' ? exactBase : exactGrowth;
  const answerUnit = chooseAnswerUnit(exactValue);
  let tailBase: number;
  let tailGrowth: number;
  let methodEstimate: number;

  if (target === 'base') {
    tailBase = roundTo(tail / (1 + rate), answerUnit);
    tailGrowth = cleanNumber(tail - tailBase);
    methodEstimate = cleanNumber(initialBase + tailBase);
  } else {
    tailGrowth = roundTo((tail * rate) / (1 + rate), answerUnit);
    tailBase = cleanNumber(tail - tailGrowth);
    methodEstimate = cleanNumber(initialGrowth + tailGrowth);
  }

  const initialTarget = target === 'base' ? initialBase : initialGrowth;
  const directPercentTarget = target === 'base'
    ? presentValue * (1 - rate)
    : presentValue * rate;
  const optionResult = buildOptions(
    exactValue,
    methodEstimate,
    initialTarget,
    directPercentTarget,
    difficulty,
    correctIndex
  );
  if (!optionResult) return null;

  const magnitude = presentValue < 10000 ? '4-digit' : '5-digit';
  const fingerprint = [
    target,
    rateBucket(ratePercent),
    magnitude,
    initialScale,
    tailBucket(tailRatio),
    difficulty,
  ].join('|');
  const targetName = target === 'base' ? '基期量 A' : '增长量 X';
  const exactDisplay = formatNumber(exactValue);

  return {
    kind: 'hypothesis-allocation',
    id: generateId(),
    presentValue,
    ratePercent,
    target,
    options: optionResult.options,
    answer: optionResult.answer,
    fullResult: exactDisplay,
    exactValue,
    methodEstimate,
    initialBase,
    initialGrowth,
    tail,
    tailBase,
    tailGrowth,
    solutionSteps: [
      `建立份数关系：A:X = 100:${formatNumber(ratePercent)}，且 B = A + X。`,
      `首次假设基期 A₀ = ${formatNumber(initialBase)}，增长量 X₀ = A₀ × ${formatNumber(ratePercent)}% = ${formatNumber(initialGrowth)}。`,
      `首次合计 ${formatNumber(initialBase + initialGrowth)}，与现期量相差尾差 T = ${formatNumber(tail)}。`,
      `按 100:${formatNumber(ratePercent)} 再分配尾差，约分给基期 ${formatNumber(tailBase)}、增长量 ${formatNumber(tailGrowth)}。`,
      `合并得到${targetName} ≈ ${formatNumber(methodEstimate)}；精确值约 ${exactDisplay}，选择 ${optionResult.answer}。`,
    ],
    difficulty,
    fingerprint,
    generationAttempts: 0,
    usedFallback: false,
  };
}

function createRandomParams(
  rng: RandomGenerator,
  target: HypothesisAllocationTarget,
  difficulty: HypothesisAllocationDifficulty,
  correctIndex: number,
  rateFrequency: RateFrequency
): CandidateParams {
  const fiveDigit = rng() >= 0.5;
  const min = fiveDigit ? 20000 : 4000;
  const max = fiveDigit ? 98000 : 9900;
  const presentValue = Math.floor(rng() * (max - min + 1)) + min;
  const ratePool = rateFrequency === 'common' ? COMMON_RATE_POOL : HIGH_RATE_POOL;

  return {
    presentValue,
    ratePercent: ratePool[randomIndex(ratePool.length, rng)],
    target,
    difficulty,
    correctIndex,
  };
}

function buildFallback(
  seed: number,
  target: HypothesisAllocationTarget,
  difficulty: HypothesisAllocationDifficulty,
  correctIndex: number,
  rateFrequency: RateFrequency
): HypothesisAllocationQuestion {
  const recipes = rateFrequency === 'common' ? COMMON_FALLBACK_RECIPES : HIGH_FALLBACK_RECIPES;
  for (let offset = 0; offset < recipes.length; offset++) {
    const recipe = recipes[(seed + offset) % recipes.length];
    const scale = 1 + (Math.floor(seed / recipes.length) % 3);
    const candidate = buildCandidate({
      presentValue: recipe.presentValue * scale,
      ratePercent: recipe.ratePercent,
      target,
      difficulty,
      correctIndex,
    });
    if (candidate) {
      return { ...candidate, usedFallback: true };
    }
  }
  throw new Error('Unable to build a valid hypothesis-allocation fallback question');
}

export function generateHypothesisAllocationQuestion(
  rng: RandomGenerator = Math.random,
  options: GenerateOptions = {}
): HypothesisAllocationQuestion {
  const target = options.target ?? (rng() < 0.5 ? 'base' : 'growth');
  const difficultyRoll = rng();
  const difficulty = options.difficulty ?? (
    difficultyRoll < 0.4 ? 'easy' : difficultyRoll < 0.8 ? 'medium' : 'hard'
  );
  const correctIndex = options.correctIndex ?? randomIndex(4, rng);
  const rateFrequency = options.rateFrequency ?? (rng() < 0.85 ? 'common' : 'high');
  const recentFingerprints = options.recentFingerprints ?? [];
  const usedNumericKeys = options.usedNumericKeys ?? new Set<string>();
  const maxAttempts = Math.max(0, Math.min(MAX_CANDIDATE_ATTEMPTS, options.maxAttempts ?? MAX_CANDIDATE_ATTEMPTS));
  let firstValid: HypothesisAllocationQuestion | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const params = createRandomParams(rng, target, difficulty, correctIndex, rateFrequency);
    const candidate = buildCandidate(params);
    if (!candidate) continue;
    candidate.generationAttempts = attempt;
    const numericKey = `${candidate.presentValue}|${candidate.ratePercent}|${candidate.target}`;
    if (!firstValid) firstValid = candidate;
    if (!recentFingerprints.includes(candidate.fingerprint) && !usedNumericKeys.has(numericKey)) {
      return candidate;
    }
  }

  if (firstValid) return firstValid;

  const fallback = buildFallback(
    options.fallbackSeed ?? 0,
    target,
    difficulty,
    correctIndex,
    rateFrequency
  );
  fallback.generationAttempts = maxAttempts;
  return fallback;
}

export function generateHypothesisAllocationSet(
  count: number,
  rng: RandomGenerator = Math.random
): HypothesisAllocationQuestion[] {
  const questions: HypothesisAllocationQuestion[] = [];
  const usedNumericKeys = new Set<string>();
  const correctOffset = randomIndex(4, rng);
  const targetOffset = randomIndex(2, rng);
  const difficultyCycle: HypothesisAllocationDifficulty[] = ['easy', 'medium', 'easy', 'medium', 'hard'];

  // 配额控制：约 15% 为较高增长率，采用概率舍入
  const expectedHighCount = count * 0.15;
  const highCount = Math.floor(expectedHighCount) + (rng() < (expectedHighCount - Math.floor(expectedHighCount)) ? 1 : 0);

  // 先生成区间标记数组，然后洗牌
  const rateFrequencies: RateFrequency[] = [
    ...Array(highCount).fill('high' as RateFrequency),
    ...Array(count - highCount).fill('common' as RateFrequency),
  ];

  // Fisher-Yates 洗牌
  for (let index = rateFrequencies.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [rateFrequencies[index], rateFrequencies[swapIndex]] = [rateFrequencies[swapIndex], rateFrequencies[index]];
  }

  for (let index = 0; index < count; index++) {
    const target: HypothesisAllocationTarget = (index + targetOffset) % 2 === 0 ? 'base' : 'growth';
    const question = generateHypothesisAllocationQuestion(rng, {
      target,
      difficulty: difficultyCycle[index % difficultyCycle.length],
      correctIndex: (index + correctOffset) % 4,
      rateFrequency: rateFrequencies[index],
      recentFingerprints: questions.slice(-5).map(item => item.fingerprint),
      usedNumericKeys,
      fallbackSeed: index,
    });
    questions.push(question);
    usedNumericKeys.add(`${question.presentValue}|${question.ratePercent}|${question.target}`);
  }

  return questions;
}

export const HYPOTHESIS_ALLOCATION_MAX_ATTEMPTS = MAX_CANDIDATE_ATTEMPTS;
