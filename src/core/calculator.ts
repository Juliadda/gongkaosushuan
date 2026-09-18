import type { OperationType } from '../domain/types';

// 计算完整答案（整数或小数）
export function calculateAnswer(type: OperationType, operands: number[]): number {
  switch (type) {
    case 'add':
      return operands.reduce((sum, n) => sum + n, 0);
    case 'subtract': {
      let result = operands[0];
      for (let i = 1; i < operands.length; i++) {
        result -= operands[i];
      }
      return result;
    }
    case 'multiply':
      return operands.reduce((prod, n) => prod * n, 1);
    case 'divide':
      if (operands.length !== 2) {
        throw new Error('Division requires exactly 2 operands');
      }
      if (operands[1] === 0) {
        throw new Error('Division by zero');
      }
      return operands[0] / operands[1];
    default:
      throw new Error(`Unknown operation type: ${type}`);
  }
}

export function calculateMixedAddSubtract(
  operands: number[],
  operators: Array<'add' | 'subtract'>
): number {
  if (operands.length === 0 || operators.length !== operands.length - 1) {
    throw new Error('Invalid mixed add/subtract expression');
  }

  return operators.reduce((result, operator, index) => {
    const operand = operands[index + 1];
    return operator === 'add' ? result + operand : result - operand;
  }, operands[0]);
}

// 提取前三位码（用于除法和乘法估算）
// 使用整数长除法或直接从整数提取，避免浮点误差
export function extractFirstThreeDigits(type: OperationType, operands: number[]): string {
  if (type === 'divide') {
    // 除法：使用整数长除法
    if (operands.length !== 2 || operands[1] === 0) {
      throw new Error('Invalid division operands');
    }
    return divisionFirstThreeDigits(operands[0], operands[1]);
  } else if (type === 'multiply') {
    // 乘法估算：从乘积整数提取前三位
    const product = operands.reduce((prod, n) => prod * n, 1);
    const productStr = product.toString();
    return productStr.slice(0, Math.min(3, productStr.length));
  }

  throw new Error('extractFirstThreeDigits only supports divide and multiply');
}

// 整数长除法提取前三位码
function divisionFirstThreeDigits(numerator: number, denominator: number): string {
  if (denominator === 0) {
    throw new Error('Division by zero');
  }

  const digits: string[] = [];
  let remainder = numerator;
  let foundFirstNonZero = false;

  // 处理整数部分
  const integerPart = Math.floor(numerator / denominator);
  if (integerPart > 0) {
    const integerStr = integerPart.toString();
    for (let i = 0; i < integerStr.length && digits.length < 3; i++) {
      digits.push(integerStr[i]);
      foundFirstNonZero = true;
    }
    remainder = numerator % denominator;
  }

  // 如果已经收集够 3 位，直接返回
  if (digits.length >= 3) {
    return digits.join('');
  }

  // 处理小数部分
  while (digits.length < 3 && remainder !== 0) {
    remainder *= 10;
    const digit = Math.floor(remainder / denominator);

    if (!foundFirstNonZero) {
      if (digit !== 0) {
        foundFirstNonZero = true;
        digits.push(digit.toString());
      }
    } else {
      digits.push(digit.toString());
    }

    remainder = remainder % denominator;
  }

  return digits.join('');
}

// 格式化除法结果为易读的小数形式（用于展示，不用于判题）
export function formatDivisionResult(numerator: number, denominator: number, maxDecimals: number = 6): string {
  const result = numerator / denominator;

  // 如果是整数
  if (Number.isInteger(result)) {
    return result.toString();
  }

  // 使用固定小数位数，然后去除尾部多余的 0
  let formatted = result.toFixed(maxDecimals);
  formatted = formatted.replace(/\.?0+$/, '');

  // 如果结果过长，添加省略号
  if (formatted.length > 15) {
    formatted = formatted.slice(0, 15) + '...';
  }

  return formatted;
}
