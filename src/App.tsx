import { useState } from 'react';
import type { TrainingConfig, AnswerRecord } from './domain/types';
import { HomeView } from './views/HomeView';
import { PracticeView } from './views/PracticeView';
import { ResultView } from './views/ResultView';
import { HistoryView } from './views/HistoryView';
import { saveTrainingResult } from './storage/history';
import './styles/globals.css';

type AppView = 'home' | 'practice' | 'result' | 'history';

function App() {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [currentConfig, setCurrentConfig] = useState<TrainingConfig | null>(null);
  const [practiceRecords, setPracticeRecords] = useState<AnswerRecord[]>([]);
  const [practiceTotalTime, setPracticeTotalTime] = useState<number | undefined>();

  const handleStartTraining = (config: TrainingConfig) => {
    setCurrentConfig(config);
    setCurrentView('practice');
  };

  const handlePracticeComplete = (records: AnswerRecord[], totalTime?: number) => {
    setPracticeRecords(records);
    setPracticeTotalTime(totalTime);

    // 保存到历史记录
    if (currentConfig) {
      const correctCount = records.filter(r => r.isCorrect).length;
      const wrongCount = records.length - correctCount;
      const accuracy = records.length > 0 ? (correctCount / records.length) * 100 : 0;
      const averageTime = totalTime !== undefined && records.length > 0
        ? totalTime / records.length
        : undefined;

      const result = {
        id: `result_${Date.now()}`,
        timestamp: Date.now(),
        config: currentConfig,
        totalQuestions: records.length,
        correctCount,
        wrongCount,
        accuracy,
        totalTime,
        averageTime,
        answers: records,
        wrongAnswers: records.filter(r => !r.isCorrect),
        version: 2,
      };

      saveTrainingResult(result);
    }

    setCurrentView('result');
  };

  const handlePracticeExit = () => {
    setCurrentView('home');
    setCurrentConfig(null);
  };

  const handleRestart = () => {
    if (currentConfig) {
      setCurrentView('practice');
    }
  };

  const handleBackHome = () => {
    setCurrentView('home');
    setCurrentConfig(null);
  };

  const handleViewHistory = () => {
    setCurrentView('history');
  };

  return (
    <>
      {currentView === 'home' && (
        <HomeView
          onStartTraining={handleStartTraining}
          onViewHistory={handleViewHistory}
        />
      )}

      {currentView === 'practice' && currentConfig && (
        <PracticeView
          config={currentConfig}
          onComplete={handlePracticeComplete}
          onExit={handlePracticeExit}
        />
      )}

      {currentView === 'result' && currentConfig && (
        <ResultView
          config={currentConfig}
          records={practiceRecords}
          totalTime={practiceTotalTime}
          onRestart={handleRestart}
          onBackHome={handleBackHome}
          onViewHistory={handleViewHistory}
        />
      )}

      {currentView === 'history' && (
        <HistoryView onBack={handleBackHome} />
      )}
    </>
  );
}

export default App;
