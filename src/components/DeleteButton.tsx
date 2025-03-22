import React from 'react';

interface DeleteButtonProps {
    isRecording: boolean;
    hasSteps: boolean;
    onDelete: () => void;
    index?: number;  // 索引属性
}

export const DeleteButton: React.FC<DeleteButtonProps> = ({ isRecording, hasSteps, onDelete, index }) => {
    // 简化判断逻辑，不再检查index是否为数字
    const isDeleteEnabled = !isRecording && hasSteps;
    
    return (
        <button 
            onClick={() => {
                if (isDeleteEnabled) {
                    onDelete();
                }
            }}
            style={{ 
                backgroundColor: '#444',
                border: 'none',
                color: '#fff',
                padding: '8px 8px',
                borderRadius: '4px',
                cursor: isDeleteEnabled ? 'pointer' : 'not-allowed',
                opacity: isDeleteEnabled ? 1 : 0.5
            }}
            disabled={!isDeleteEnabled}
            title={isDeleteEnabled ? '删除此调整' : '录制时无法删除'}
        >
            <span style={{ marginRight: '5px' }}>X</span> 删除
        </button>
    );
};