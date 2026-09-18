import type { TrainingConfig, AnswerRecord } from '../domain/types';
import { QuestionDisplay } from '../components/QuestionDisplay';
import { getPresetModeName } from '../domain/presets';
import './ResultView.css';

interface ResultViewProps {
  config: TrainingConfig;
  records: AnswerRecord[];
  totalTime?: number;
  onRestart: () => void;
  onBackHome: () => void;
  onViewHistory: () => void;
}

export function ResultView({
  config,
  records,
  totalTime,
  onRestart,
  onBackHome,
  onViewHistory,
}: ResultViewProps) {
  const totalQuestions = records.length;
  const correctCount = records.filter(r => r.isCorrect).length;
  const wrongCount = totalQuestions - correctCount;
  const accuracy = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
  const averageTime = totalTime && totalQuestions > 0 ? totalTime / totalQuestions : undefined;

  const wrongAnswers = records.filter(r => !r.isCorrect);

  const formatQuestionTime = (seconds?: number) => {
    return seconds === undefined ? '未计时' : `${seconds.toFixed(1)} 秒`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  const getModeName = () => {
    if (config.modeType === 'preset' && config.presetMode) {
      return getPresetModeName(config.presetMode);
    }
    return '自定义训练';
  };

  return (
    <div className="result-view">
      <div className="result-container">
        <header className="result-header">
          <h1>训练完成</h1>
        </header>

        <main className="result-main">
          <section className="result-summary">
            <h2>训练统计</h2>

            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-label">训练模式</span>
                <span className="summary-value">{getModeName()}</span>
              </div>

              <div className="summary-item">
                <span className="summary-label">题目数量</span>
                <span className="summary-value">{totalQuestions}</span>
              </div>

              <div className="summary-item summary-correct">
                <span className="summary-label">正确数</span>
                <span className="summary-value">{correctCount}</span>
              </div>

              <div className="summary-item summary-wrong">
                <span className="summary-label">错误数</span>
                <span className="summary-value">{wrongCount}</span>
              </div>

              <div className="summary-item summary-accuracy">
                <span className="summary-label">正确率</span>
                <span className="summary-value">{accuracy.toFixed(1)}%</span>
              </div>

              {totalTime !== undefined && (
                <>
                  <div className="summary-item">
                    <span className="summary-label">总用时</span>
                    <span className="summary-value">{formatTime(totalTime)}</span>
                  </div>

                  {averageTime !== undefined && (
                    <div className="summary-item">
                      <span className="summary-label">平均用时</span>
                      <span className="summary-value">{averageTime.toFixed(1)}秒/题</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          <section className="question-times">
            <h2>每题用时</h2>
            <div className="question-times-grid">
              {records.map((record, index) => (
                <div
                  key={record.questionId}
                  className={`question-time-item ${record.isCorrect ? 'is-correct' : 'is-wrong'}`}
                >
                  <span className="question-time-number">第 {index + 1} 题</span>
                  <span className="question-time-status">
                    {record.isCorrect ? '正确' : '错误'}
                  </span>
                  <span className="question-time-value">
                    {formatQuestionTime(record.timeSpent)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {wrongAnswers.length > 0 && (
            <section className="wrong-answers">
              <h2>错题列表</h2>

              <div className="wrong-list">
                {wrongAnswers.map((record, index) => (
                  <div key={record.questionId} className="wrong-item">
                    <div className="wrong-item-header">
                      <span className="wrong-item-number">错题 {index + 1}</span>
                    </div>

                    <div className="wrong-item-question">
                      <QuestionDisplay question={record.question} />
                    </div>

                    <div className="wrong-item-answers">
                      <div className="answer-row answer-user">
                        <span className="answer-label">你的答案：</span>
                        <span className="answer-value">{record.userAnswer}</span>
                      </div>
                      <div className="answer-row answer-correct">
                        <span className="answer-label">
                          {record.question.type === 'divide' ? '参考码：' : '正确答案：'}
                        </span>
                        <span className="answer-value">{record.question.answer}</span>
                      </div>
                      <div className="answer-row answer-result">
                        <span className="answer-label">计算结果：</span>
                        <span className="answer-value">{record.question.fullResult}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {wrongAnswers.length === 0 && (
            <div className="perfect-score">
              <div className="perfect-icon">🎉</div>
              <p>全部正确！继续保持！</p>
            </div>
          )}

          <div className="result-actions">
            <button className="btn-primary" onClick={onRestart}>
              再练一次
            </button>
            <button className="btn-secondary" onClick={onBackHome}>
              返回首页
            </button>
            <button className="btn-secondary" onClick={onViewHistory}>
              查看历史记录
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
