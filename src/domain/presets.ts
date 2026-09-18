import type { PresetMode } from './types';

export interface PresetModeConfig {
  id: PresetMode;
  name: string;
  category: 'add-subtract' | 'multiply' | 'divide' | 'speed-method';
}

export const PRESET_MODES: PresetModeConfig[] = [
  // 加减类
  { id: 'two-digit-add-subtract', name: '两位数加减', category: 'add-subtract' },
  { id: 'round-hundred', name: '凑整百练习', category: 'add-subtract' },
  { id: 'three-digit-add', name: '三位数加法', category: 'add-subtract' },
  { id: 'three-digit-subtract', name: '三位数减法', category: 'add-subtract' },
  { id: 'three-digit-add-subtract', name: '三位数加减', category: 'add-subtract' },
  { id: 'multi-add', name: '多数相加', category: 'add-subtract' },
  { id: 'mixed-add-subtract', name: '混合加减', category: 'add-subtract' },

  // 乘法类
  { id: 'two-digit-multiply-one-digit', name: '两位数乘一位数', category: 'multiply' },
  { id: 'three-digit-multiply-one-digit', name: '三位数乘一位数', category: 'multiply' },
  { id: 'two-digit-multiply-11', name: '两位数乘 11', category: 'multiply' },
  { id: 'two-digit-multiply-15', name: '两位数乘 15', category: 'multiply' },
  { id: 'two-digit-multiply-two-digit', name: '两位数乘两位数', category: 'multiply' },
  { id: 'multiply-estimate', name: '乘法估算', category: 'multiply' },

  // 除法类
  { id: 'three-digit-divide-one-digit', name: '三位数除一位数', category: 'divide' },
  { id: 'three-digit-divide-two-digit', name: '三位数除两位数', category: 'divide' },
  { id: 'three-digit-divide-four-digit', name: '三位数除四位数', category: 'divide' },

  // 资料速算方法
  { id: 'hypothesis-allocation', name: '假设分配', category: 'speed-method' },
];

export const QUESTION_COUNT_OPTIONS = [10, 20, 30, 50];

export function getPresetModeName(mode: PresetMode): string {
  return PRESET_MODES.find(item => item.id === mode)?.name ?? mode;
}
