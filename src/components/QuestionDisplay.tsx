import type { ChoiceId, Question } from '../domain/types';
import { isHypothesisAllocationQuestion } from '../domain/types';
import { Fraction } from './Fraction';
import './QuestionDisplay.css';

interface QuestionDisplayProps {
  question: Question;
  size?: 'normal' | 'large';
  selectedAnswer?: string;
  onOptionSelect?: (choice: ChoiceId) => void;
  disabled?: boolean;
  revealAnswer?: boolean;
}

export function QuestionDisplay({
  question,
  size = 'normal',
  selectedAnswer,
  onOptionSelect,
  disabled = false,
  revealAnswer = false,
}: QuestionDisplayProps) {
  if (isHypothesisAllocationQuestion(question)) {
    const targetName = question.target === 'base' ? '基期量 A' : '增长量 X';
    return (
      <div className={`method-question ${size === 'large' ? 'method-question-large' : ''}`}>
        <div className="method-question-stem">
          <span>现期量 B = <strong>{question.presentValue.toLocaleString('zh-CN')}</strong></span>
          <span>同比增长 <strong>{question.ratePercent}%</strong></span>
        </div>
        <div className="method-question-target">估算{targetName}</div>
        <div className="method-question-relation">B = A + X，X = A × R</div>
        <div className="method-options" role={onOptionSelect ? 'radiogroup' : undefined} aria-label="答案选项">
          {question.options.map(option => {
            const isSelected = selectedAnswer === option.id;
            const isCorrect = revealAnswer && option.id === question.answer;
            const className = [
              'method-option',
              isSelected ? 'is-selected' : '',
              isCorrect ? 'is-correct' : '',
              revealAnswer && isSelected && !isCorrect ? 'is-wrong' : '',
            ].filter(Boolean).join(' ');

            if (onOptionSelect) {
              return (
                <button
                  key={option.id}
                  type="button"
                  className={className}
                  onClick={() => onOptionSelect(option.id)}
                  disabled={disabled}
                  role="radio"
                  aria-checked={isSelected}
                >
                  <span className="method-option-id">{option.id}</span>
                  <span className="method-option-value">{option.display}</span>
                </button>
              );
            }

            return (
              <div key={option.id} className={className}>
                <span className="method-option-id">{option.id}</span>
                <span className="method-option-value">{option.display}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const { type, operands, operators } = question;

  // 除法：显示分数形式
  if (type === 'divide') {
    return (
      <div className={`question-display ${size === 'large' ? 'question-display-large' : ''}`}>
        <Fraction
          numerator={operands[0]}
          denominator={operands[1]}
          size={size}
        />
      </div>
    );
  }

  // 其他运算：显示运算表达式
  const operatorSymbol = {
    add: '+',
    subtract: '−',
    multiply: '×',
  }[type];

  return (
    <div className={`question-display ${size === 'large' ? 'question-display-large' : ''}`}>
      <span className="question-expression">
        {operands.map((num, index) => (
          <span key={index}>
            {index > 0 && (
              <span className="operator">
                {' '}{operators?.[index - 1] === 'subtract' ? '−' : operators ? '+' : operatorSymbol}{' '}
              </span>
            )}
            <span className="operand">{num}</span>
          </span>
        ))}
      </span>
    </div>
  );
}
