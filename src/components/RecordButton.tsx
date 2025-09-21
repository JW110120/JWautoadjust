import React, { useState, useEffect } from 'react';
import { app } from 'photoshop';
import { getButtonStyle, handleMouseOver, handleMouseOut } from '../styles/buttonStyles';
import { RecordIcon } from '../styles/Icons';

interface RecordButtonProps {
    isRecording: boolean;
    onRecordClick: () => Promise<void>;
}

const RecordButton: React.FC<RecordButtonProps> = ({ isRecording, onRecordClick }) => {
    const [hasActiveDocument, setHasActiveDocument] = useState(false);
    const isButtonDisabled = !hasActiveDocument;

    // 检查是否有活动文档
    useEffect(() => {
        const checkDocument = () => {
            setHasActiveDocument(!!app.activeDocument);
        };

        // 初始检查
        checkDocument();

        // 每500ms检查一次文档状态
        const interval = setInterval(checkDocument, 500);

        return () => clearInterval(interval);
    }, []);

    return (
        <sp-action-button 
            onClick={onRecordClick}
            className={`bottom-button ${isRecording ? 'recording' : ''} ${isButtonDisabled ? 'disabled' : ''}`}
            title={!hasActiveDocument ? "没有活动的文档" : isRecording ? "点击停止录制" : "点击开始录制"}
            aria-disabled={isButtonDisabled}
            role="button"
            style={getButtonStyle(isButtonDisabled)}
            onMouseOver={(e) => handleMouseOver(e, isButtonDisabled)}
            onMouseOut={handleMouseOut}
        >
            <div slot="icon" className="icon" aria-hidden="true">
                <RecordIcon active={isRecording} disabled={isButtonDisabled} />
            </div>
            <span>{isRecording ? '停止' : '记录'}</span>
        </sp-action-button>
    );
};

export default RecordButton;