import * as React from'react';
import * as ReactDOM from'react-dom/client';
import MainContainer from './MainContainer';

// 创建根容器
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
// 渲染组件
root.render(<MainContainer />);