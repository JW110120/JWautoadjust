import React, { useState } from 'react';
import { getButtonStyle, handleMouseOver, handleMouseOut } from '../styles/buttonStyles';
import { DeleteIcon } from '../styles/Icons';

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
    const [isDeleting, setIsDeleting] = useState(false);
    
    const isButtonDisabled = isRecording || !hasSteps || isDeleting;

    const handleClick = async () => {
        if (isButtonDisabled) return;
        
        // 校验索引范围，避免 index = -1 或其他无效索引
        if (index < 0) {
            console.warn('删除按钮点击但索引无效:', index);
            return;
        }
        
        setIsDeleting(true);
        try {
            await onDelete();
        } catch (error) {
            console.error('删除失败:', error);
        } finally {
            // 延迟恢复状态，避免快速连点
            setTimeout(() => {
                setIsDeleting(false);
            }, 300);
        }
    };

    return (
        <sp-action-button 
            onClick={handleClick}
            title={
                isDeleting ? '删除中...' : 
                isRecording ? '录制时无法删除' : 
                !hasSteps ? '请先选择要删除的步骤' : 
                '删除选中的步骤'
            }
            className={`bottom-button ${isButtonDisabled ? 'disabled' : ''}`}
            aria-label="删除步骤"
            style={getButtonStyle(isButtonDisabled)}
            onMouseOver={(e) => handleMouseOver(e, isButtonDisabled)}
            onMouseOut={handleMouseOut}
        >
            <div slot="icon" className="icon" aria-hidden="true">
                <DeleteIcon />
            </div>
            <span>{isDeleting ? '删除中' : '删除'}</span>
        </sp-action-button>
    );
};

export { DeleteButton };