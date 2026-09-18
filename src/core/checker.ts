import type { OperationType, PresetMode, Question } from '../domain/types';
import { isHypothesisAllocationQuestion } from '../domain/types';
import {
  extractFirstThreeDigits,
  calculateAnswer,
  calculateMixedAddSubtract,
} from './calculator';

export const DIVISION_RELATIVE_TOLERANCE = 0.01;

// 判断某个运算类型是否需要使用前三位码判题
export function usesFirstThreeDigits(type: OperationType, presetMode?: PresetMode): boolean {
  // 所有除法使用前三位码
  if (type === 'divide') {
    return true;
  }

  // 只有"乘法估算"模式使用前三位码
  if (type === 'multiply' && presetMode === 'multiply-estimate') {
    return true;
  }

  return false;
}

// 检查答案是否正确
export function checkAnswer(
  userAnswer: string,
  type: OperationType,
  operands: number[],
  presetMode?: PresetMode,
  operators?: Array<'add' | 'subtract'>
): boolean {
  const trimmed = userAnswer.trim();

  // 空答案
  if (!trimmed) {
    return false;
  }

  // 只允许数字
  if (!/^\d+$/.test(trimmed)) {
    return false;
  }

  // 除法和乘法估算：前三位估算码所代表的数值允许 ±1% 相对误差。
  if (type === 'divide') {
    return isEstimateWithinTolerance(userAnswer, type, operands);
  }

  if (type === 'multiply' && presetMode === 'multiply-estimate') {
    return isEstimateWithinTolerance(userAnswer, type, operands);
  }

  // 其他使用前三位码的模式仍按唯一前三位码判题。
  if (usesFirstThreeDigits(type, presetMode)) {
    const correctCode = extractFirstThreeDigits(type, operands);
    return trimmed === correctCode;
  } else {
    // 完整答案
    const correctAnswer = operators
      ? calculateMixedAddSubtract(operands, operators)
      : calculateAnswer(type, operands);
    return trimmed === correctAnswer.toString();
  }
}

// 统一判题入口：方法题比较选项标识，旧算术题继续沿用原判题规则。
export function checkQuestionAnswer(
  userAnswer: string,
  question: Question,
  presetMode?: PresetMode
): boolean {
  if (isHypothesisAllocationQuestion(question)) {
    return userAnswer.trim().toUpperCase() === question.answer;
  }

  return checkAnswer(
    userAnswer,
    question.type,
    question.operands,
    presetMode,
    question.operators
  );
}

export function isEstimateWithinTolerance(
  userAnswer: string,
  type: OperationType,
  operands: number[],
  tolerance: number = DIVISION_RELATIVE_TOLERANCE
): boolean {
  if (!/^\d+$/.test(userAnswer) || operands.length !== 2) {
    return false;
  }

  let actualValue: number;
  if (type === 'divide') {
    if (operands[1] === 0) return false;
    actualValue = operands[0] / operands[1];
  } else if (type === 'multiply') {
    actualValue = operands[0] * operands[1];
  } else {
    return false;
  }

  const referenceCode = extractFirstThreeDigits(type, operands);

  // 保留原有”0.5 → 5、2.4 → 24”的位数规则，避免短码产生歧义。
  if (actualValue <= 0 || userAnswer.length !== referenceCode.length) {
    return false;
  }

  const firstDigitMagnitude = Math.floor(Math.log10(actualValue));
  const estimatedValue = Number(userAnswer)
    * 10 ** (firstDigitMagnitude - (userAnswer.length - 1));
  const relativeError = Math.abs(estimatedValue - actualValue) / actualValue;

  return relativeError <= tolerance + Number.EPSILON;
}

export function isDivisionEstimateWithinTolerance(
  userAnswer: string,
  operands: number[],
  tolerance: number = DIVISION_RELATIVE_TOLERANCE
): boolean {
  return isEstimateWithinTolerance(userAnswer, 'divide', operands, tolerance);
}

// 获取正确答案（字符串形式）
export function getCorrectAnswer(
  type: OperationType,
  operands: number[],
  presetMode?: PresetMode,
  operators?: Array<'add' | 'subtract'>
): string {
  if (usesFirstThreeDigits(type, presetMode)) {
    return extractFirstThreeDigits(type, operands);
  } else {
    return (operators
      ? calculateMixedAddSubtract(operands, operators)
      : calculateAnswer(type, operands)
    ).toString();
  }
}
