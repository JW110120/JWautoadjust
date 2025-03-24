import React from 'react';
import { RecordProvider } from '../contexts/RecordProvider'; // 确保 RecordProvider 被导入
import { useRecordContext } from '../contexts/RecordContext';
import { useRecordProvider } from '../contexts/RecordProvider';
import { AdjustmentMenu } from './AdjustmentMenu';
import { DeleteButton } from './DeleteButton';

export const RecordButtons: React.FC = () => {
    const { isRecording } = useRecordContext();
    const {
        startRecording,
        stopRecording,
        adjustmentSteps,
        deleteAdjustmentAndLayer,
        selectedIndex
    } = useRecordProvider();

    const handleRecordClick = async () => {
        try {
            const { showAlert } = require("photoshop").core;
            if (isRecording) {
                await stopRecording();
            } else {
                await startRecording();
            }
        } catch (error) {
            console.error('录制失败:', error);
            showAlert({ message: `录制失败: ${error.message}` });
        }
    };

    return (
        <RecordProvider> {/* 确保 RecordProvider 包裹了组件内容 */}
            <div className="button-group" style={{ display: 'flex', gap: '8px' }}>
                <button
                    onClick={handleRecordClick}
                    style={{
                        backgroundColor: isRecording ? '#ff4444' : '#444',
                        border: 'none',
                        color: '#fff',
                        padding: '8px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    title={isRecording ? '停止录制' : '开始录制'}
                >
                    <span style={{ marginRight: '5px' }}>{isRecording ? '■' : '●'}</span>
                    {isRecording ? '停止' : '录制'}
                </button>
                <AdjustmentMenu />
                <DeleteButton
                    isRecording={isRecording}
                    hasSteps={adjustmentSteps.length > 0}
                    onDelete={() => deleteAdjustmentAndLayer(selectedIndex)}
                    index={selectedIndex}
                />
            </div>
        </RecordProvider>
    );
};