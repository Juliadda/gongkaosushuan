import { useState } from 'react';
import type { OperationType, PresetMode, TrainingConfig } from '../domain/types';
import { PRESET_MODES, QUESTION_COUNT_OPTIONS } from '../domain/presets';
import './HomeView.css';

interface HomeViewProps {
  onStartTraining: (config: TrainingConfig) => void;
  onViewHistory: () => void;
}

export function HomeView({ onStartTraining, onViewHistory }: HomeViewProps) {
  const [selectedMode, setSelectedMode] = useState<PresetMode | 'custom' | null>(null);
  const [questionCount, setQuestionCount] = useState(20);
  const [enableTimer, setEnableTimer] = useState(true);

  // 自定义训练状态
  const [customType, setCustomType] = useState<'single' | 'mixed'>('single');
  const [selectedOperations, setSelectedOperations] = useState<Set<OperationType>>(new Set(['add']));
  const [leftDigits, setLeftDigits] = useState(2);
  const [rightDigits, setRightDigits] = useState(2);

  const handleStart = () => {
    if (!selectedMode) return;

    if (selectedMode === 'custom') {
      // 验证自定义配置
      if (customType === 'mixed' && selectedOperations.size < 2) {
        alert('混合运算至少需要选择两种运算');
        return;
      }

      if (customType === 'single' && selectedOperations.size !== 1) {
        alert('单一运算只能选择一种运算');
        return;
      }

      if (selectedOperations.has('subtract') && leftDigits < rightDigits) {
        alert('为保证减法结果非负，左操作数位数不能少于右操作数位数');
        return;
      }

      const config: TrainingConfig = {
        modeType: 'custom',
        customConfig: {
          trainingType: customType,
          operations: Array.from(selectedOperations),
          leftDigits,
          rightDigits,
        },
        questionCount,
        enableTimer,
      };
      onStartTraining(config);
    } else {
      const config: TrainingConfig = {
        modeType: 'preset',
        presetMode: selectedMode,
        questionCount,
        enableTimer,
      };
      onStartTraining(config);
    }
  };

  const toggleOperation = (op: OperationType) => {
    if (customType === 'single') {
      setSelectedOperations(new Set([op]));
      return;
    }

    const newOps = new Set(selectedOperations);
    if (newOps.has(op)) {
      newOps.delete(op);
    } else {
      newOps.add(op);
    }
    setSelectedOperations(newOps);
  };

  const changeCustomType = (type: 'single' | 'mixed') => {
    setCustomType(type);
    if (type === 'single') {
      const firstOperation = selectedOperations.values().next().value as OperationType | undefined;
      setSelectedOperations(new Set([firstOperation ?? 'add']));
    }
  };

  const addSubtractModes = PRESET_MODES.filter(m => m.category === 'add-subtract');
  const multiplyModes = PRESET_MODES.filter(m => m.category === 'multiply');
  const divideModes = PRESET_MODES.filter(m => m.category === 'divide');

  return (
    <div className="home-view">
      <header className="home-header">
        <h1>公考资料分析速算训练</h1>
      </header>

      <main className="home-main">
        <section className="mode-selection">
          <h2>选择训练模式</h2>

          <div className="mode-category">
            <h3>加减类</h3>
            <div className="mode-grid">
              {addSubtractModes.map(mode => (
                <button
                  key={mode.id}
                  className={`mode-card ${selectedMode === mode.id ? 'selected' : ''}`}
                  onClick={() => setSelectedMode(mode.id)}
                  aria-pressed={selectedMode === mode.id}
                >
                  {mode.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mode-category">
            <h3>乘法类</h3>
            <div className="mode-grid">
              {multiplyModes.map(mode => (
                <button
                  key={mode.id}
                  className={`mode-card ${selectedMode === mode.id ? 'selected' : ''}`}
                  onClick={() => setSelectedMode(mode.id)}
                  aria-pressed={selectedMode === mode.id}
                >
                  {mode.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mode-category">
            <h3>除法类</h3>
            <div className="mode-grid">
              {divideModes.map(mode => (
                <button
                  key={mode.id}
                  className={`mode-card ${selectedMode === mode.id ? 'selected' : ''}`}
                  onClick={() => setSelectedMode(mode.id)}
                  aria-pressed={selectedMode === mode.id}
                >
                  {mode.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mode-category">
            <h3>自定义</h3>
            <button
              className={`mode-card mode-card-custom ${selectedMode === 'custom' ? 'selected' : ''}`}
              onClick={() => setSelectedMode('custom')}
              aria-pressed={selectedMode === 'custom'}
            >
              自定义训练
            </button>
          </div>
        </section>

        {selectedMode === 'custom' && (
          <section className="custom-config">
            <h3>自定义配置</h3>

            <div className="config-group">
              <label>训练类型：</label>
              <div className="radio-group">
                <label>
                  <input
                    type="radio"
                    checked={customType === 'single'}
                    onChange={() => changeCustomType('single')}
                  />
                  单一运算
                </label>
                <label>
                  <input
                    type="radio"
                    checked={customType === 'mixed'}
                    onChange={() => changeCustomType('mixed')}
                  />
                  混合运算
                </label>
              </div>
            </div>

            <div className="config-group">
              <label>运算类型（{customType === 'mixed' ? '至少选择两种' : '选择一种'}）：</label>
              <div className="checkbox-group">
                <label>
                  <input
                    type={customType === 'single' ? 'radio' : 'checkbox'}
                    name={customType === 'single' ? 'single-operation' : undefined}
                    checked={selectedOperations.has('add')}
                    onChange={() => toggleOperation('add')}
                  />
                  加法
                </label>
                <label>
                  <input
                    type={customType === 'single' ? 'radio' : 'checkbox'}
                    name={customType === 'single' ? 'single-operation' : undefined}
                    checked={selectedOperations.has('subtract')}
                    onChange={() => toggleOperation('subtract')}
                  />
                  减法
                </label>
                <label>
                  <input
                    type={customType === 'single' ? 'radio' : 'checkbox'}
                    name={customType === 'single' ? 'single-operation' : undefined}
                    checked={selectedOperations.has('multiply')}
                    onChange={() => toggleOperation('multiply')}
                  />
                  乘法
                </label>
                <label>
                  <input
                    type={customType === 'single' ? 'radio' : 'checkbox'}
                    name={customType === 'single' ? 'single-operation' : undefined}
                    checked={selectedOperations.has('divide')}
                    onChange={() => toggleOperation('divide')}
                  />
                  除法
                </label>
              </div>
            </div>

            <div className="config-group">
              <label htmlFor="left-digits">左操作数位数：</label>
              <select
                id="left-digits"
                value={leftDigits}
                onChange={(e) => setLeftDigits(Number(e.target.value))}
              >
                <option value={1}>1 位</option>
                <option value={2}>2 位</option>
                <option value={3}>3 位</option>
                <option value={4}>4 位</option>
              </select>
            </div>

            <div className="config-group">
              <label htmlFor="right-digits">右操作数位数：</label>
              <select
                id="right-digits"
                value={rightDigits}
                onChange={(e) => setRightDigits(Number(e.target.value))}
              >
                <option value={1}>1 位</option>
                <option value={2}>2 位</option>
                <option value={3}>3 位</option>
                <option value={4}>4 位</option>
              </select>
            </div>
          </section>
        )}

        <section className="training-settings">
          <div className="setting-group">
            <label htmlFor="question-count">题量：</label>
            <select
              id="question-count"
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
            >
              {QUESTION_COUNT_OPTIONS.map(count => (
                <option key={count} value={count}>{count} 题</option>
              ))}
            </select>
          </div>

          <div className="setting-group">
            <label>
              <input
                type="checkbox"
                checked={enableTimer}
                onChange={(e) => setEnableTimer(e.target.checked)}
              />
              启用计时
            </label>
          </div>
        </section>

        {selectedMode && (
          <div className="answer-rule-hint">
            <p>
              <strong>判题规则：</strong>
              加法、减法、普通乘法输入完整答案；
              除法输入前三位估算码并允许 ±3% 相对误差；乘法估算输入精确前三位码。
            </p>
          </div>
        )}

        <div className="action-buttons">
          <button
            className="btn-primary btn-large"
            onClick={handleStart}
            disabled={!selectedMode}
          >
            开始练习
          </button>
          <button
            className="btn-secondary"
            onClick={onViewHistory}
          >
            历史记录
          </button>
        </div>
      </main>
    </div>
  );
}
