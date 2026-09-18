import './Fraction.css';

interface FractionProps {
  numerator: number;
  denominator: number;
  size?: 'normal' | 'large';
}

export function Fraction({ numerator, denominator, size = 'normal' }: FractionProps) {
  return (
    <div
      className={`fraction ${size === 'large' ? 'fraction-large' : ''}`}
      role="img"
      aria-label={`${numerator} 除以 ${denominator}`}
    >
      <div className="fraction-numerator">{numerator}</div>
      <div className="fraction-line"></div>
      <div className="fraction-denominator">{denominator}</div>
    </div>
  );
}
