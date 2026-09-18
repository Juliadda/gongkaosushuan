import { useState, useEffect, useRef } from 'react';
import type { Question, TrainingConfig, AnswerRecord } from '../domain/types';
import { generatePresetQuestion, generateCustomQuestion } from '../core/generator';
import { checkAnswer, usesFirstThreeDigits } from '../core/checker';
import { QuestionDisplay } from '../components/QuestionDisplay';
import { getPresetModeName } from '../domain/presets';
import './PracticeView.css';

interface PracticeViewProps {
  config: TrainingConfig;
  onComplete: (records: AnswerRecord[], totalTime?: number) => void;
  onExit: () => void;
}

export function PracticeView({ config, onComplete, onExit }: PracticeViewProps) {
  const [questions] = useState<Question[]>(() => {
    const qs: Question[] = [];
    for (let i = 0; i < config.questionCount; i++) {
      if (config.modeType === 'preset' && config.presetMode) {
        qs.push(generatePresetQuestion(config.presetMode));
      } else if (config.modeType === 'custom' && config.customConfig) {
        qs.push(generateCustomQuestion(config.customConfig));
      }
    }
    return qs;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [answerState, setAnswerState] = useState<'input' | 'correct' | 'wrong'>('input');
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [error, setError] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const feedbackTimerRef = useRef<number | null>(null);

  const currentQuestion = questions[currentIndex];

  // 计时器
  useEffect(() => {
    if (!config.enableTimer) return;

    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [config.enableTimer, startTime]);

  // 自动聚焦输入框
  useEffect(() => {
    if (answerState === 'input') {
      inputRef.current?.focus();
    }
  }, [currentIndex, answerState]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  const handleSubmit = () => {
    if (answerState !== 'input') return;

    const trimmed = userAnswer.trim();

    // 验证输入
    if (!trimmed) {
      setError('请输入答案');
      return;
    }

    if (!/^\d+$/.test(trimmed)) {
      setError('只能输入数字');
      return;
    }

    setError('');

    // 判题
    const isCorrect = checkAnswer(
      trimmed,
      currentQuestion.type,
      currentQuestion.operands,
      config.presetMode,
      currentQuestion.operators
    );

    const timeSpent = config.enableTimer
      ? Math.max(0.1, Math.round((Date.now() - questionStartTime) / 100) / 10)
      : undefined;

    const record: AnswerRecord = {
      questionId: currentQuestion.id,
      question: currentQuestion,
      userAnswer: trimmed,
      isCorrect,
      timeSpent,
    };

    setRecords(prev => [...prev, record]);

    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
      setAnswerState('correct');
    } else {
      setWrongCount(prev => prev + 1);
      setAnswerState('wrong');
    }

    // 300ms 后自动跳转下一题
    feedbackTimerRef.current = window.setTimeout(() => {
      handleNext();
    }, 300);
  };

  const handleNext = () => {
    // 清除可能存在的自动跳转定时器
    if (feedbackTimerRef.current !== null) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setUserAnswer('');
      setAnswerState('input');
      setError('');
      setQuestionStartTime(Date.now());
    } else {
      // 完成训练
      const totalTime = config.enableTimer
        ? Math.floor((Date.now() - startTime) / 1000)
        : undefined;
      onComplete(records, totalTime);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (answerState === 'input') {
        handleSubmit();
      } else {
        handleNext();
      }
    }
  };

  const handleExit = () => {
    if (confirm('确定要退出当前练习吗？已完成的题目将不会保存。')) {
      onExit();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getAnswerRuleHint = () => {
    if (currentQuestion.type === 'divide') {
      return '输入前三位估算码（允许 ±3% 相对误差）';
    }
    if (usesFirstThreeDigits(currentQuestion.type, config.presetMode)) {
      return '输入前三位码';
    }
    return '输入完整答案';
  };

  return (
    <div className="practice-view">
      <div className="practice-container">
        <header className="practice-header">
          <button className="btn-exit" onClick={handleExit}>
            退出练习
          </button>
          <div className="practice-title">
            {config.modeType === 'preset' && config.presetMode && (
              <span>{getPresetModeName(config.presetMode)}</span>
            )}
            {config.modeType === 'custom' && <span>自定义训练</span>}
          </div>
        </header>

        <div className="practice-content">
          <aside className="practice-stats">
            <div className="stat-item">
              <span className="stat-label">进度</span>
              <span className="stat-value">{currentIndex + 1} / {questions.length}</span>
            </div>
            <div className="stat-item stat-correct">
              <span className="stat-label">正确</span>
              <span className="stat-value">{correctCount}</span>
            </div>
            <div className="stat-item stat-wrong">
              <span className="stat-label">错误</span>
              <span className="stat-value">{wrongCount}</span>
            </div>
            {config.enableTimer && (
              <div className="stat-item">
                <span className="stat-label">用时</span>
                <span className="stat-value stat-time">{formatTime(elapsedTime)}</span>
              </div>
            )}
          </aside>

          <main className="practice-main">
            <div className="question-section">
              <div className="question-number">
                第 {currentIndex + 1} 题
              </div>

              <QuestionDisplay question={currentQuestion} size="large" />

              <div className="answer-rule">
                {getAnswerRuleHint()}
              </div>

              <div className="answer-input-section">
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  className={`answer-input ${answerState !== 'input' ? 'answered' : ''}`}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={answerState !== 'input'}
                  placeholder="输入答案"
                  aria-label="答案输入框"
                />

                {error && (
                  <div className="error-message" role="alert">
                    {error}
                  </div>
                )}

                {answerState === 'input' ? (
                  <button
                    className="btn-submit"
                    onClick={handleSubmit}
                  >
                    提交答案
                  </button>
                ) : (
                  <button
                    className="btn-next"
                    onClick={handleNext}
                  >
                    {currentIndex < questions.length - 1 ? '下一题' : '查看结果'}
                  </button>
                )}
              </div>

              {answerState !== 'input' && (
                <div
                  className={`feedback ${answerState === 'correct' ? 'feedback-correct' : 'feedback-wrong'}`}
                  role="status"
                  aria-live="polite"
                >
                  <div className="feedback-title">
                    {answerState === 'correct' ? '✓ 回答正确' : '✗ 回答错误'}
                  </div>
                  <div className="feedback-details">
                    <div>你的答案：{userAnswer}</div>
                    <div>{currentQuestion.type === 'divide' ? '参考码' : '正确答案'}：{currentQuestion.answer}</div>
                    <div>计算结果：{currentQuestion.fullResult}</div>
                    {usesFirstThreeDigits(currentQuestion.type, config.presetMode) && (
                      <div className="feedback-note">
                        （{currentQuestion.type === 'divide'
                          ? `参考前三位码：${currentQuestion.answer}，允许 ±3% 相对误差`
                          : `前三位码：${currentQuestion.answer}`}）
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
