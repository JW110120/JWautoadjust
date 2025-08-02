import React from 'react';
import { getButtonStyle, handleMouseOver, handleMouseOut } from '../styles/buttonStyles';

interface DeleteButtonProps {
    isRecording: boolean;
    hasSteps: boolean;
    onDelete: () => void;
    index: number;
}

const DeleteButton: React.FC<DeleteButtonProps> = ({ 
    isRecording,
    hasSteps,
    onDelete,
    index
}) => {
    const isButtonDisabled = isRecording || !hasSteps;

    return (
        <sp-action-button 
            onClick={onDelete}
            title={isRecording ? '录制时无法删除' : !hasSteps ? '请先选择要删除的步骤' : '删除选中的步骤'}
            className={`bottom-button ${isButtonDisabled ? 'disabled' : ''}`}
            aria-label="删除步骤"
            style={getButtonStyle(isButtonDisabled)}
            onMouseOver={(e) => handleMouseOver(e, isButtonDisabled)}
            onMouseOut={handleMouseOut}
        >
            <div slot="icon" className="icon">
                <svg
                    viewBox="0 0 18 18"
                    focusable="false"
                    aria-hidden="true"
                    role="img"
                >
                    <path d="M15.75,3H12V2a1,1,0,0,0-1-1H6A1,1,0,0,0,5,2V3H1.25A.25.25,0,0,0,1,3.25v.5A.25.25,0,0,0,1.25,4h1L3.4565,16.55a.5.5,0,0,0,.5.45H13.046a.5.5,0,0,0,.5-.45L14.75,4h1A.25.25,0,0,0,16,3.75v-.5A.25.25,0,0,0,15.75,3ZM5.5325,14.5a.5.5,0,0,1-.53245-.46529L5,14.034l-.5355-8a.50112.50112,0,0,1,1-.067l.5355,8a.5.5,0,0,1-.46486.53283ZM9,14a.5.5,0,0,1-1,0V6A.5.5,0,0,1,9,6ZM11,3H6V2h5Zm1,11.034a.50112.50112,0,0,1-1-.067l.5355-8a.50112.50112,0,1,1,1,.067Z" />
                </svg>
            </div>
            <span>删除</span>
        </sp-action-button>
    );
};

export { DeleteButton };