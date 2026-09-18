// 运算类型
export type OperationType = 'add' | 'subtract' | 'multiply' | 'divide';

// 题目
export interface Question {
  id: string;
  type: OperationType;
  operands: number[];
  operators?: Array<'add' | 'subtract'>; // 多项混合加减中，各相邻操作数之间的运算符
  answer: string; // 正确答案（完整答案或前三位码）
  fullResult: string; // 完整计算结果（用于展示）
}

// 训练模式类型
export type TrainingModeType = 'preset' | 'custom';

// 预设模式
export type PresetMode =
  | 'two-digit-add-subtract'
  | 'round-hundred'
  | 'three-digit-add'
  | 'three-digit-subtract'
  | 'three-digit-add-subtract'
  | 'multi-add'
  | 'mixed-add-subtract'
  | 'two-digit-multiply-one-digit'
  | 'three-digit-multiply-one-digit'
  | 'two-digit-multiply-11'
  | 'two-digit-multiply-15'
  | 'two-digit-multiply-two-digit'
  | 'multiply-estimate'
  | 'three-digit-divide-one-digit'
  | 'three-digit-divide-two-digit'
  | 'three-digit-divide-four-digit';

// 自定义训练配置
export interface CustomConfig {
  trainingType: 'single' | 'mixed';
  operations: OperationType[];
  leftDigits: number; // 1-4
  rightDigits: number; // 1-4
}

// 训练配置
export interface TrainingConfig {
  modeType: TrainingModeType;
  presetMode?: PresetMode;
  customConfig?: CustomConfig;
  questionCount: number;
  enableTimer: boolean;
}

// 答题记录
export interface AnswerRecord {
  questionId: string;
  question: Question;
  userAnswer: string;
  isCorrect: boolean;
  timeSpent?: number;
}

// 训练结果
export interface TrainingResult {
  id: string;
  timestamp: number;
  config: TrainingConfig;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  totalTime?: number;
  averageTime?: number;
  answers?: AnswerRecord[]; // v2：全部答题记录；旧记录可能没有该字段
  wrongAnswers: AnswerRecord[];
  version: number; // 数据结构版本
}
