import React, { useState, useEffect } from 'react';
import { adjustmentMenuItems } from '../Constants';
import { findSampleLayer, createSampleLayer } from '../utils/BuildSmartObjUtils';
import { app } from 'photoshop';

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
export const AdjustmentMenu: React.FC<AdjustmentMenuProps> = ({ 
    isRecording, 
    onAdjustmentClick,
    onDirectAdjustment 
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    const toggleMenu = () => {
        if (isRecording) return; // 录制时不允许打开菜单
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
        <div className="dropdown">
            <button 
                onClick={toggleMenu}
                style={{ 
                    backgroundColor: '#444',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 8px',
                    borderRadius: '4px',
                    cursor: isRecording ? 'not-allowed' : 'pointer',
                    opacity: isRecording ? 0.5 : 1,
                    transition: 'all 0.2s'
                }}
                disabled={isRecording}
                title={isRecording ? '录制时无法新增调整' : '新增调整'}
            >
                <span style={{ marginRight: '5px' }}>+</span> 新增
            </button>
            {isMenuOpen && (  // 移除 !isRecording 条件
                <div 
                    className="dropdown-content"
                    style={{
                        display: 'block',
                        bottom: '100%',
                        top: 'auto',
                        maxHeight: '300px',
                        overflowY: 'auto'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {adjustmentMenuItems.map(item => (
                        <a 
                            key={item.id} 
                            onClick={(e) => handleMenuItemClick(item, e)}
                            style={{
                                cursor: isRecording ? 'not-allowed' : 'pointer',
                                opacity: isRecording ? 0.5 : 1,
                                pointerEvents: isRecording ? 'none' : 'auto' // 添加这行
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