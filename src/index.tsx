import React from 'react';
import { createRoot } from 'react-dom/client';
import MainContainer from './MainContainer';
import { AdjustmentStepsProvider } from './AdjustmentStepsContext';

// 确保 root 元素存在
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <AdjustmentStepsProvider value={{ 
        adjustmentSteps: [],
        addAdjustmentStep: () => {},
        deleteAdjustmentStep: () => {}
    }}>
      <MainContainer />
    </AdjustmentStepsProvider>
  );
}