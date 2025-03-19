import React from'react';
import Record from './Record';
import Adjust from './Adjust';

const MainContainer = () => {
    return (
        <div style={{ 
            display: 'flex',
            gap: 20,
            height: '100vh',
            padding: '20px',
            boxSizing: 'border-box',
            overflow: 'auto',
            width: '100%' // 添加宽度约束
        }}>
            {/* 为两个面板添加弹性容器 */}
            <div style={{ flex: 1, minWidth: 300 }}>
                <Record />
            </div>
            <div style={{ flex: 1, minWidth: 300 }}>
                <Adjust />
            </div>
        </div>
    );
};

export default MainContainer;