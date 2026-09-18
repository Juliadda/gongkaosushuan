import type { Question } from '../domain/types';
import { Fraction } from './Fraction';
import './QuestionDisplay.css';

interface QuestionDisplayProps {
  question: Question;
  size?: 'normal' | 'large';
}

export function QuestionDisplay({ question, size = 'normal' }: QuestionDisplayProps) {
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
