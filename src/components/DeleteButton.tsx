import React from 'react';

interface DeleteButtonProps {
    isRecording: boolean;
    hasSteps: boolean;
    onDelete: () => void;
}

export const DeleteButton: React.FC<DeleteButtonProps> = ({ isRecording, hasSteps, onDelete }) => {
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
        >
            <span style={{ marginRight: '5px' }}>🗑</span> 删除
        </button>
    );
};