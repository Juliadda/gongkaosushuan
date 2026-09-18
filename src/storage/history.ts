import type { TrainingResult } from '../domain/types';

const STORAGE_KEY = 'gongkaosushuan_history';

// 检查 localStorage 是否可用
function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

// 保存训练结果
export function saveTrainingResult(result: TrainingResult): void {
  if (!isStorageAvailable()) {
    console.warn('localStorage is not available');
    return;
  }

  try {
    const history = loadTrainingHistory();
    history.push(result);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save training result:', error);
  }
}

// 加载训练历史
export function loadTrainingHistory(): TrainingResult[] {
  if (!isStorageAvailable()) {
    return [];
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }

    const parsed = JSON.parse(data);

    // 验证数据格式
    if (!Array.isArray(parsed)) {
      console.warn('Invalid history data format');
      return [];
    }

    // 过滤并验证每条记录
    const validated = parsed.filter((item): item is TrainingResult => {
      return (
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.timestamp === 'number' &&
        item.config &&
        typeof item.config === 'object' &&
        typeof item.totalQuestions === 'number' &&
        typeof item.correctCount === 'number' &&
        typeof item.wrongCount === 'number' &&
        typeof item.accuracy === 'number' &&
        Array.isArray(item.wrongAnswers) &&
        (item.answers === undefined || Array.isArray(item.answers))
      );
    });

    return validated;
  } catch (error) {
    console.error('Failed to load training history:', error);
    return [];
  }
}

// 清空训练历史
export function clearTrainingHistory(): void {
  if (!isStorageAvailable()) {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear training history:', error);
  }
}

// 获取单条训练记录
export function getTrainingResult(id: string): TrainingResult | null {
  const history = loadTrainingHistory();
  return history.find(item => item.id === id) || null;
}
