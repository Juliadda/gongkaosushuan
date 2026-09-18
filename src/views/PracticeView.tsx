import { useState, useEffect, useRef } from 'react';
import type { Question, TrainingConfig, AnswerRecord, ChoiceId } from '../domain/types';
import { isHypothesisAllocationQuestion } from '../domain/types';
import { generatePresetQuestions, generateCustomQuestion } from '../core/generator';
import { checkQuestionAnswer, usesFirstThreeDigits } from '../core/checker';
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
    if (config.modeType === 'preset' && config.presetMode) {
      return generatePresetQuestions(config.presetMode, config.questionCount);
    }

    const qs: Question[] = [];
    for (let index = 0; index < config.questionCount; index++) {
      if (config.modeType === 'custom' && config.customConfig) {
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
  const isMethodQuestion = isHypothesisAllocationQuestion(currentQuestion);

  useEffect(() => {
    if (!config.enableTimer) return;

    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [config.enableTimer, startTime]);

  useEffect(() => {
    if (answerState === 'input' && !isMethodQuestion) {
      inputRef.current?.focus();
    }
  }, [currentIndex, answerState, isMethodQuestion]);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  const handleNext = (completedRecords: AnswerRecord[] = records) => {
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
      const totalTime = config.enableTimer
        ? Math.floor((Date.now() - startTime) / 1000)
        : undefined;
      onComplete(completedRecords, totalTime);
    }
  };

  const handleSubmit = (selectedChoice?: ChoiceId) => {
    if (answerState !== 'input') return;

    const submittedAnswer = (selectedChoice ?? userAnswer).trim().toUpperCase();
    if (!submittedAnswer) {
      setError(isMethodQuestion ? '请选择一个选项' : '请输入答案');
      return;
    }
    if (!isMethodQuestion && !/^\d+$/.test(submittedAnswer)) {
      setError('只能输入数字');
      return;
    }

    setError('');
    setUserAnswer(submittedAnswer);
    const isCorrect = checkQuestionAnswer(submittedAnswer, currentQuestion, config.presetMode);
    const timeSpent = config.enableTimer
      ? Math.max(0.1, Math.round((Date.now() - questionStartTime) / 100) / 10)
      : undefined;
    const record: AnswerRecord = {
      questionId: currentQuestion.id,
      question: currentQuestion,
      userAnswer: submittedAnswer,
      isCorrect,
      timeSpent,
    };
    const nextRecords = [...records, record];

    setRecords(nextRecords);
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
      setAnswerState('correct');
    } else {
      setWrongCount(prev => prev + 1);
      setAnswerState('wrong');
    }

    // 方法题答错时停留查看完整步骤；其余情况延续原有快速跳转。
    if (!(isMethodQuestion && !isCorrect)) {
      feedbackTimerRef.current = window.setTimeout(() => {
        handleNext(nextRecords);
      }, 300);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (answerState === 'input') {
      handleSubmit();
    } else {
      handleNext();
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
    if (isMethodQuestion) return '用假设分配快速估算，选择最接近的答案';
    if (currentQuestion.type === 'divide') {
      return '输入前三位估算码（允许 ±3% 相对误差）';
    }
    if (usesFirstThreeDigits(currentQuestion.type, config.presetMode)) {
      return '输入前三位码';
    }
    return '输入完整答案';
  };

  const correctDisplay = isMethodQuestion
    ? `${currentQuestion.answer}（${currentQuestion.options.find(option => option.id === currentQuestion.answer)?.display}）`
    : currentQuestion.answer;

  return (
    <div className="practice-view">
      <div className="practice-container">
        <header className="practice-header">
          <button className="btn-exit" onClick={handleExit}>退出练习</button>
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
              <div className="question-number">第 {currentIndex + 1} 题</div>

              <QuestionDisplay
                question={currentQuestion}
                size="large"
                selectedAnswer={isMethodQuestion ? userAnswer : undefined}
                onOptionSelect={isMethodQuestion ? handleSubmit : undefined}
                disabled={answerState !== 'input'}
                revealAnswer={isMethodQuestion && answerState === 'wrong'}
              />

              <div className="answer-rule">{getAnswerRuleHint()}</div>

              {!isMethodQuestion && (
                <div className="answer-input-section">
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    className={`answer-input ${answerState !== 'input' ? 'answered' : ''}`}
                    value={userAnswer}
                    onChange={(event) => setUserAnswer(event.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={answerState !== 'input'}
                    placeholder="输入答案"
                    aria-label="答案输入框"
                  />

                  {error && <div className="error-message" role="alert">{error}</div>}

                  {answerState === 'input' ? (
                    <button className="btn-submit" onClick={() => handleSubmit()}>提交答案</button>
                  ) : (
                    <button className="btn-next" onClick={() => handleNext()}>
                      {currentIndex < questions.length - 1 ? '下一题' : '查看结果'}
                    </button>
                  )}
                </div>
              )}

              {isMethodQuestion && error && (
                <div className="error-message method-error" role="alert">{error}</div>
              )}

              {isMethodQuestion && answerState === 'wrong' && (
                <div className="method-next-action">
                  <button className="btn-next" onClick={() => handleNext()}>
                    {currentIndex < questions.length - 1 ? '看懂了，下一题' : '查看结果'}
                  </button>
                </div>
              )}

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
                    <div>{isMethodQuestion ? '你的选择' : '你的答案'}：{userAnswer}</div>
                    <div>
                      {isMethodQuestion ? '正确选项' : currentQuestion.type === 'divide' ? '参考码' : '正确答案'}：
                      {correctDisplay}
                    </div>
                    <div>{isMethodQuestion ? '精确结果' : '计算结果'}：{currentQuestion.fullResult}</div>
                    {!isMethodQuestion && usesFirstThreeDigits(currentQuestion.type, config.presetMode) && (
                      <div className="feedback-note">
                        （{currentQuestion.type === 'divide'
                          ? `参考前三位码：${currentQuestion.answer}，允许 ±3% 相对误差`
                          : `前三位码：${currentQuestion.answer}`}）
                      </div>
                    )}
                    {isMethodQuestion && answerState === 'wrong' && (
                      <ol className="solution-steps">
                        {currentQuestion.solutionSteps.map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ol>
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
