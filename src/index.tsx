import React from 'react';
import { createRoot } from 'react-dom/client';
import MainContainer from './MainContainer';
import { AdjustmentStepsProvider } from './contexts/AdjustmentStepsContext';
import { DocumentInfoProvider } from './contexts/DocumentInfoContext';
import { RecordProvider } from './contexts/RecordContext';
import { ProcessingProvider } from './contexts/ProcessingContext';
import { initializeTheme } from './styles/theme';
import './styles/styles.css';
import { defaultTheme, Provider } from '@adobe/react-spectrum';

// 初始化主题
initializeTheme();

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  
  // 创建一个根组件来管理状态
  const App = () => {
    return (
      <Provider theme={defaultTheme} colorScheme="dark" UNSAFE_style={{ width: '100%', height: '100%' }}>
        <div style={{ width: '100%', height: '100%', display: 'flex', overflow: 'hidden' }}>
          <DocumentInfoProvider>
            <AdjustmentStepsProvider>
              <RecordProvider>
                <ProcessingProvider>
                    <MainContainer />
                </ProcessingProvider>
              </RecordProvider>
            </AdjustmentStepsProvider>
          </DocumentInfoProvider>
        </div>
      </Provider>
    );
  };

  root.render(<App />);
}