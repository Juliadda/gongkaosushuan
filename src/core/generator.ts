import type { Question, OperationType, PresetMode, CustomConfig } from '../domain/types';
import { randomInt, randomRange, type RandomGenerator } from './random';
import { getCorrectAnswer } from './checker';
import { calculateAnswer, calculateMixedAddSubtract, formatDivisionResult } from './calculator';

let questionIdCounter = 0;

function generateId(): string {
  return `q_${Date.now()}_${questionIdCounter++}`;
}

// 生成单个题目
export function generateQuestion(
  type: OperationType,
  operands: number[],
  presetMode?: PresetMode,
  operators?: Array<'add' | 'subtract'>
): Question {
  const answer = getCorrectAnswer(type, operands, presetMode, operators);

  let fullResult: string;
  if (type === 'divide') {
    fullResult = formatDivisionResult(operands[0], operands[1]);
  } else if (operators) {
    fullResult = calculateMixedAddSubtract(operands, operators).toString();
  } else {
    fullResult = calculateAnswer(type, operands).toString();
  }

  return {
    id: generateId(),
    type,
    operands,
    operators,
    answer,
    fullResult,
  };
}

// 生成二元运算题目（加、减、乘、除）
function generateBinaryQuestion(
  type: OperationType,
  leftDigits: number,
  rightDigits: number,
  presetMode?: PresetMode,
  rng?: RandomGenerator
): Question {
  if (type === 'subtract' && leftDigits < rightDigits) {
    throw new Error('Non-negative subtraction requires leftDigits >= rightDigits');
  }

  let left = randomInt(leftDigits, rng);
  let right = randomInt(rightDigits, rng);

  // 除法：除数不能为 0
  if (type === 'divide' && right === 0) {
    right = randomInt(rightDigits, rng);
    if (right === 0) right = 1; // 保险起见
  }

  // 减法：结果不能为负
  if (type === 'subtract' && left < right) {
    [left, right] = [right, left];
  }

  return generateQuestion(type, [left, right], presetMode);
}

// 生成多数相加题目
function generateMultiAddQuestion(count: number, digits: number, rng?: RandomGenerator): Question {
  const operands = Array.from({ length: count }, () => randomInt(digits, rng));
  return generateQuestion('add', operands);
}

// 生成混合加减题目
function generateMixedAddSubtractQuestion(count: number, rng?: RandomGenerator): Question {
  const operands: number[] = [randomInt(3, rng)];
  const operators: Array<'add' | 'subtract'> = [];
  let current = operands[0];
  const firstOperator: 'add' | 'subtract' = randomRange(0, 1, rng) === 0
    ? 'add'
    : 'subtract';

  for (let i = 1; i < count; i++) {
    let operator: 'add' | 'subtract' = i % 2 === 1
      ? firstOperator
      : firstOperator === 'add' ? 'subtract' : 'add';
    let next = randomInt(randomRange(2, 3, rng), rng);

    if (operator === 'subtract' && next > current) {
      if (current >= 10) {
        next = randomRange(10, Math.min(current, 999), rng);
      } else {
        operator = 'add';
      }
    }

    operators.push(operator);
    operands.push(next);
    current = operator === 'add' ? current + next : current - next;
  }

  return generateQuestion('add', operands, 'mixed-add-subtract', operators);
}

// 生成凑整百题目（减法练习）
function generateRoundHundredQuestion(rng?: RandomGenerator): Question {
  // 生成整百数作为被减数（100-900）
  const hundreds = randomRange(1, 9, rng);
  const nextHundred = hundreds * 100;

  // 生成减数：10到(被减数-1)之间的数，且不能是整百
  const maxSubtrahend = nextHundred - 1;
  let subtrahend = randomRange(10, maxSubtrahend, rng);

  // 确保减数不是整百
  while (subtrahend % 100 === 0) {
    subtrahend = randomRange(10, maxSubtrahend, rng);
  }

  return generateQuestion('subtract', [nextHundred, subtrahend]);
}

// 根据预设模式生成题目
export function generatePresetQuestion(mode: PresetMode, rng?: RandomGenerator): Question {
  switch (mode) {
    case 'two-digit-add-subtract': {
      const type = randomRange(0, 1, rng) === 0 ? 'add' : 'subtract';
      return generateBinaryQuestion(type, 2, 2, mode, rng);
    }

    case 'round-hundred':
      return generateRoundHundredQuestion(rng);

    case 'three-digit-add':
      return generateBinaryQuestion('add', 3, 3, mode, rng);

    case 'three-digit-subtract':
      return generateBinaryQuestion('subtract', 3, 3, mode, rng);

    case 'three-digit-add-subtract': {
      const type = randomRange(0, 1, rng) === 0 ? 'add' : 'subtract';
      return generateBinaryQuestion(type, 3, 3, mode, rng);
    }

    case 'multi-add': {
      const count = randomRange(3, 5, rng);
      return generateMultiAddQuestion(count, 2, rng);
    }

    case 'mixed-add-subtract': {
      const count = randomRange(3, 5, rng);
      return generateMixedAddSubtractQuestion(count, rng);
    }

    case 'two-digit-multiply-one-digit':
      return generateBinaryQuestion('multiply', 2, 1, mode, rng);

    case 'three-digit-multiply-one-digit':
      return generateBinaryQuestion('multiply', 3, 1, mode, rng);

    case 'two-digit-multiply-11': {
      const left = randomInt(2, rng);
      return generateQuestion('multiply', [left, 11], mode);
    }

    case 'two-digit-multiply-15': {
      const left = randomInt(2, rng);
      return generateQuestion('multiply', [left, 15], mode);
    }

    case 'two-digit-multiply-two-digit':
      return generateBinaryQuestion('multiply', 2, 2, mode, rng);

    case 'multiply-estimate':
      return generateBinaryQuestion('multiply', 2, 2, mode, rng);

    case 'three-digit-divide-one-digit':
      return generateBinaryQuestion('divide', 3, 1, mode, rng);

    case 'three-digit-divide-two-digit':
      return generateBinaryQuestion('divide', 3, 2, mode, rng);

    case 'three-digit-divide-four-digit':
      return generateBinaryQuestion('divide', 3, 4, mode, rng);

    default:
      throw new Error(`Unknown preset mode: ${mode}`);
  }
}

// 根据自定义配置生成题目
export function generateCustomQuestion(config: CustomConfig, rng?: RandomGenerator): Question {
  if (config.trainingType === 'single') {
    // 单一运算
    const type = config.operations[0];
    return generateBinaryQuestion(type, config.leftDigits, config.rightDigits, undefined, rng);
  } else {
    // 混合运算：随机选择一种运算
    const type = config.operations[randomRange(0, config.operations.length - 1, rng)];
    return generateBinaryQuestion(type, config.leftDigits, config.rightDigits, undefined, rng);
  }
}
