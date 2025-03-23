import React from 'react';

interface DeleteButtonProps {
    isRecording: boolean;
    hasSteps: boolean;
    onDelete: () => void;
    index?: number;
}

export const DeleteButton: React.FC<DeleteButtonProps> = ({ isRecording, hasSteps, onDelete, index }) => {
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
                opacity: isDeleteEnabled ? 1 : 0.5,
                transition: 'all 0.2s'
            }}
            disabled={!isDeleteEnabled}
            title={
                isRecording ? '录制时无法删除' : 
                !hasSteps ? '请先选择要删除的步骤' : 
                '删除选中的步骤'
            }
        >
            <span style={{ marginRight: '5px' }}>X</span> 删除
        </button>
    );
};