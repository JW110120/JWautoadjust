import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import MainContainer from './MainContainer';
import { AdjustmentStepsContext, AdjustmentStepsProvider } from './AdjustmentStepsContext';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  
  // 创建一个根组件来管理状态
  const App = () => {
    // 移除这里的状态管理，因为我们现在使用 AdjustmentStepsProvider
    return (
      <AdjustmentStepsProvider>
        <MainContainer />
      </AdjustmentStepsProvider>
    );
  };

  root.render(<App />);
}