import React from 'react';
import { createRoot } from 'react-dom/client';
import MainContainer from './MainContainer';
import { AdjustmentStepsProvider } from './contexts/AdjustmentStepsContext';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  
  // 创建一个根组件来管理状态
  const App = () => {
    return (
      <AdjustmentStepsProvider>
        <MainContainer />
      </AdjustmentStepsProvider>
    );
  };

  root.render(<App />);
}