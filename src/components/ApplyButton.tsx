import React from 'react';
import { getButtonStyle, handleMouseOver, handleMouseOut } from '../styles/buttonStyles';
import { ApplyIcon } from '../styles/Icons';

interface ApplyButtonProps {
    onClick: () => void;
    isRecording?: boolean;
    disabled?: boolean;
    progress?: number;
    isProcessing?: boolean;
}

const ApplyButton: React.FC<ApplyButtonProps> = ({ 
    onClick, 
    isRecording = false,
    disabled = false,
    progress = 0,
    isProcessing = false
}) => {
    const isButtonDisabled = !(!isRecording && !disabled) || isProcessing;

    const handleClick = (e: React.MouseEvent<HTMLElement>) => {
        if (isButtonDisabled) return;
        // 先重置悬停样式，并移除焦点，避免颜色残留
        handleMouseOut(e);
        (e.currentTarget as HTMLElement).blur();
        onClick();
    };

    return (
        <sp-action-button
            disabled={isButtonDisabled as any}
            onClick={handleClick}
            title={
                isRecording ? "录制时无法应用" : 
                disabled ? "没有可应用的调整" : 
                isProcessing ? `处理中 ${progress}%` : 
                "应用所有调整"
            }
            className={`bottom-button ${isButtonDisabled ? 'disabled' : ''}`}
            aria-label={isProcessing ? `处理中 ${progress}%` : '应用所有调整'}
            style={getButtonStyle(isButtonDisabled)}
            onMouseOver={(e) => handleMouseOver(e, isButtonDisabled)}
            onMouseOut={handleMouseOut}
        >
            <div slot="icon" className="icon" aria-hidden="true">
                <ApplyIcon />
            </div>
            <span>{isProcessing ? `${progress}%` : '应用'}</span>
        </sp-action-button>
    );
}; 

export default ApplyButton;