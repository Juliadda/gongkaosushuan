import { useState, useEffect } from 'react';
import type { TrainingResult } from '../domain/types';
import { isHypothesisAllocationQuestion } from '../domain/types';
import { loadTrainingHistory, clearTrainingHistory } from '../storage/history';
import { QuestionDisplay } from '../components/QuestionDisplay';
import { getPresetModeName } from '../domain/presets';
import './HistoryView.css';

interface HistoryViewProps {
  onBack: () => void;
}

export function HistoryView({ onBack }: HistoryViewProps) {
  const [history, setHistory] = useState<TrainingResult[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setHistory(loadTrainingHistory());
  }, []);

  const handleClear = () => {
    if (confirm('确定要清空所有历史记录吗？此操作无法撤销。')) {
      clearTrainingHistory();
      setHistory([]);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  const getModeName = (result: TrainingResult) => {
    if (result.config.modeType === 'preset' && result.config.presetMode) {
      return getPresetModeName(result.config.presetMode);
    }
    return '自定义训练';
  };

  // 按时间倒序排列
  const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);

  if (sortedHistory.length === 0) {
    return (
      <div className="history-view">
        <div className="history-container">
          <header className="history-header">
            <h1>历史记录</h1>
            <button className="btn-back" onClick={onBack}>
              返回首页
            </button>
          </header>

          <div className="history-empty">
            <p>暂无训练记录</p>
            <button className="btn-primary" onClick={onBack}>
              开始练习
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="history-view">
      <div className="history-container">
        <header className="history-header">
          <h1>历史记录</h1>
          <div className="header-actions">
            <button className="btn-clear" onClick={handleClear}>
              清空记录
            </button>
            <button className="btn-back" onClick={onBack}>
              返回首页
            </button>
          </div>
        </header>

        <main className="history-main">
          <div className="history-list">
            {sortedHistory.map((result) => (
              <div key={result.id} className="history-item">
                <div
                  className="history-item-header"
                onClick={() => toggleExpand(result.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      toggleExpand(result.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-expanded={expandedId === result.id}
                >
                  <div className="history-item-info">
                    <div className="history-item-title">
                      {getModeName(result)}
                    </div>
                    <div className="history-item-meta">
                      {formatDate(result.timestamp)}
                    </div>
                  </div>

                  <div className="history-item-stats">
                    <span className="stat-badge stat-total">
                      {result.totalQuestions}题
                    </span>
                    <span className="stat-badge stat-correct">
                      ✓ {result.correctCount}
                    </span>
                    <span className="stat-badge stat-wrong">
                      ✗ {result.wrongCount}
                    </span>
                    <span className="stat-badge stat-accuracy">
                      {result.accuracy.toFixed(0)}%
                    </span>
                    {result.totalTime !== undefined && (
                      <span className="stat-badge stat-time">
                        {formatTime(result.totalTime)}
                      </span>
                    )}
                  </div>

                  <div className="expand-icon">
                    {expandedId === result.id ? '▼' : '▶'}
                  </div>
                </div>

                {expandedId === result.id && (
                  <div className="history-item-details">
                    {(result.answers ?? result.wrongAnswers).length > 0 ? (
                      <>
                        <h4>{result.answers ? '每题用时与答题详情' : '错题详情（旧记录）'}</h4>
                        <div className="wrong-answers-list">
                          {(result.answers ?? result.wrongAnswers).map((record, index) => (
                            <div
                              key={record.questionId}
                              className={`wrong-answer-item ${record.isCorrect ? 'answer-item-correct' : 'answer-item-wrong'}`}
                            >
                              <div className="wrong-answer-number">
                                第 {index + 1} 题 · {record.isCorrect ? '正确' : '错误'} ·{' '}
                                {record.timeSpent === undefined ? '未计时' : `${record.timeSpent.toFixed(1)} 秒`}
                              </div>

                              <div className="wrong-answer-question">
                                <QuestionDisplay
                                  question={record.question}
                                  selectedAnswer={record.userAnswer}
                                  revealAnswer={isHypothesisAllocationQuestion(record.question)}
                                />
                              </div>

                              <div className="wrong-answer-info">
                                <div>
                                  {isHypothesisAllocationQuestion(record.question) ? '你的选择' : '你的答案'}：
                                  <strong>{record.userAnswer}</strong>
                                </div>
                                <div>
                                  {isHypothesisAllocationQuestion(record.question)
                                    ? '正确选项'
                                    : record.question.type === 'divide' ? '参考码' : '正确答案'}：
                                  <strong className="text-correct">{record.question.answer}</strong>
                                </div>
                                <div>
                                  {isHypothesisAllocationQuestion(record.question) ? '精确结果' : '计算结果'}：
                                  {record.question.fullResult}
                                </div>
                                {isHypothesisAllocationQuestion(record.question) && !record.isCorrect && (
                                  <ol className="history-solution-steps">
                                    {record.question.solutionSteps.map((step, stepIndex) => (
                                      <li key={stepIndex}>{step}</li>
                                    ))}
                                  </ol>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="no-wrong-answers">
                        <p>暂无答题明细</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
