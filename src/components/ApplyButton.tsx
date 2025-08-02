import React from 'react';
import { getButtonStyle, handleMouseOver, handleMouseOut } from '../styles/buttonStyles';

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

    return (
        <sp-action-button
            onClick={onClick}
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
                <svg 
                    viewBox="0 0 18 18"
                    focusable="false"
                    aria-hidden="true"
                    role="img"
                >
                    <path d="M4.73,2H3.5a.5.5,0,0,0-.5.5v13a.5.5,0,0,0,.5.5H4.73a1,1,0,0,0,.5035-.136l11.032-6.433a.5.5,0,0,0,0-.862L5.2335,2.136A1,1,0,0,0,4.73,2Z" />
                </svg>
            </div>
            <span>{isProcessing ? `${progress}%` : '应用'}</span>
        </sp-action-button>
    );
}; 

export default ApplyButton;