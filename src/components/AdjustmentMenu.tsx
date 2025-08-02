import React, { useState, useEffect } from 'react';
import { adjustmentMenuItems } from '../styles/Constants';
import { findSampleLayer, createSampleLayer } from '../utils/layerUtils';
import { app } from 'photoshop';
import { getButtonStyle, handleMouseOver, handleMouseOut } from '../styles/buttonStyles';

interface AdjustmentMenuProps {
    isRecording: boolean;
    onAdjustmentClick: (item: {
        id: string;
        name: string;
        command: string;
    }) => Promise<void>;
    onDirectAdjustment: (item: {
        id: string;
        name: string;
        command: string;
    }) => Promise<void>;
}

// 修改组件的 props 解构
export const AdjustmentMenu: React.FC<AdjustmentMenuProps> = ({ isRecording, onAdjustmentClick, onDirectAdjustment }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const isButtonDisabled = isRecording; // 将禁用状态逻辑提取出来
    
    const toggleMenu = () => {
        if (isRecording) return;
        setIsMenuOpen(!isMenuOpen);
    };
    
    const handleMenuItemClick = async (item: any, event: React.MouseEvent) => {
        event.stopPropagation();
        if (isRecording) {
            setIsMenuOpen(false);
            return;
        }
        try {
            const { executeAsModal, showAlert } = require("photoshop").core;
            const { batchPlay } = require("photoshop").action;

            // 检查是否存在样本图层
            const sampleLayer = await findSampleLayer();
            let targetLayer = sampleLayer;

            if (!targetLayer) {
                const smartObjId = await createSampleLayer();
                targetLayer = app.activeDocument.layers.find(layer => layer.id === smartObjId);
            }

            if (targetLayer) {
                await executeAsModal(async () => {
                    // 选中样本图层
                    await batchPlay(
                        [{
                            _obj: "select",
                            _target: [{ _ref: "layer", _id: targetLayer.id }],
                            makeVisible: true,
                            _options: { dialogOptions: "dontDisplay" }
                        }],
                        { synchronousExecution: true }
                    );

                    // 记录调整前的智能滤镜数量
                    const beforeFilters = await batchPlay([{
                        _obj: "get",
                        _target: [{ _ref: "layer", _id: targetLayer.id }],
                        _options: { dialogOptions: "dontDisplay" }
                    }], { synchronousExecution: true });
                    
                    const beforeFilterCount = beforeFilters[0]?.smartObject?.filterFX?.length || 0;

                    // 直接对样本图层应用调整
                    await batchPlay(
                        [{
                            _obj: item.command,
                            _options: { dialogOptions: "display" }
                        }],
                        { synchronousExecution: true }
                    );

                    // 检查调整后的智能滤镜数量
                    const afterFilters = await batchPlay([{
                        _obj: "get",
                        _target: [{ _ref: "layer", _id: targetLayer.id }],
                        _options: { dialogOptions: "dontDisplay" }
                    }], { synchronousExecution: true });
                    
                    const afterFilterCount = afterFilters[0]?.smartObject?.filterFX?.length || 0;

                    // 只有当智能滤镜数量增加时才记录调整
                    if (afterFilterCount > beforeFilterCount) {
                        await onDirectAdjustment(item);
                    }
                }, { "commandName": `直接应用${item.name}调整` });
            }
        } catch (error) {
            console.error('处理调整图层失败:', error);
            const { showAlert } = require("photoshop").core;
            showAlert({ message: `添加调整失败: ${error.message}` });
        }
        setIsMenuOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isMenuOpen && !(event.target as Element).closest('.dropdown')) {
                setIsMenuOpen(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);

    return (
        <div className="dropdown" style={{ position: 'relative' }}>  
            <sp-action-button 
                onClick={toggleMenu}
                title={isRecording ? '录制时无法新增调整' : '新增调整'}
                className={`bottom-button ${isButtonDisabled ? 'disabled' : ''}`}
                aria-label="新增调整"
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
                        <path d="M6,12H2V2H16V7.812a6.023,6.023,0,0,1,1,.729V1.5a.5.5,0,0,0-.5-.5H1.5a.5.5,0,0,0-.5.5v11a.5.5,0,0,0,.5.5H7a5.98723,5.98723,0,0,1,.0905-1Z" />
                        <path d="M13,8.025A4.975,4.975,0,1,0,17.975,13,4.975,4.975,0,0,0,13,8.025Zm3,5.725a.25.25,0,0,1-.25.25H14v1.75a.25.25,0,0,1-.25.25h-1.5a.25.25,0,0,1-.25-.25V14H10.25a.25.25,0,0,1-.25-.25v-1.5a.25.25,0,0,1,.25-.25H12V10.25a.25.25,0,0,1,.25-.25h1.5a.25.25,0,0,1,.25.25V12h1.75a.25.25,0,0,1,.25.25Z" />
                    </svg>
                </div>
                <span>新增</span>
            </sp-action-button>
            {isMenuOpen && (
                <div 
                    className="dropdown-content"
                    style={{
                        display: 'block',
                        position: 'absolute',
                        bottom: '100%',
                        left: 0,
                        width: '100%',
                        zIndex: 1000,
                        maxHeight: '300px',
                        overflowY: 'auto',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {adjustmentMenuItems.map(item => (
                        <a 
                            key={item.id} 
                            onClick={(e) => handleMenuItemClick(item, e)}
                            style={{
                                cursor: isRecording ? 'not-allowed' : 'pointer',
                                pointerEvents: isRecording ? 'none' : 'auto'
                            }}
                        >
                            {item.name}
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
};