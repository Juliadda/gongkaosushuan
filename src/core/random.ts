// 可注入的随机数生成器（用于测试）
export type RandomGenerator = () => number;

let randomGenerator: RandomGenerator = Math.random;

export function setRandomGenerator(generator: RandomGenerator) {
  randomGenerator = generator;
}

export function resetRandomGenerator() {
  randomGenerator = Math.random;
}

// 生成指定位数的随机正整数
// digits: 1-4
export function randomInt(digits: number, rng: RandomGenerator = randomGenerator): number {
  if (digits < 1 || digits > 4) {
    throw new Error('digits must be 1-4');
  }

  const min = digits === 1 ? 1 : Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;

  return Math.floor(rng() * (max - min + 1)) + min;
}

// 生成指定范围内的随机整数 [min, max]
export function randomRange(min: number, max: number, rng: RandomGenerator = randomGenerator): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}
