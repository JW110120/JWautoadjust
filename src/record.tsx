import React, { useState, useContext, useEffect } from 'react';
import { app } from 'photoshop';
import { AdjustmentStepsContext, useAdjustmentSteps } from './AdjustmentStepsContext';

// 添加调整菜单项
export const adjustmentMenuItems = [
    { id: 'brightness', name: '亮度/对比度', command: 'brightnessEvent' },
    { id: 'levels', name: '色阶', command: 'levels' },
    { id: 'curves', name: '曲线', command: 'curves' },
    { id: 'exposure', name: '曝光度', command: 'exposure' },
    { id: 'vibrance', name: '自然饱和度', command: 'vibrance' },
    { id: 'hsl', name: '色相/饱和度', command: 'hueSaturation' },
    { id: 'colorBalance', name: '色彩平衡', command: 'colorBalance' },
    { id: 'blackAndWhite', name: '黑白', command: 'blackAndWhite' },
    { id: 'photoFilter', name: '照片滤镜', command: 'photoFilter' },
    { id: 'channelMixer', name: '通道混合器', command: 'channelMixer' },
    { id: 'colorLookup', name: '颜色查找', command: 'colorLookup' },
    { id: 'invert', name: '反相', command: 'invert' },
    { id: 'posterize', name: '色调分离', command: 'posterize' },
    { id: 'threshold', name: '阈值', command: 'threshold' },
    { id: 'gradientMap', name: '渐变映射', command: 'gradientMapEvent' },
    { id: 'selectiveColor', name: '可选颜色', command: 'selectiveColor' }
];

// 创建事件到名称的映射
const eventToNameMap = {
    'curves': '曲线',
    'levels': '色阶',
    'brightnessEvent': '亮度/对比度',
    'hueSaturation': '色相/饱和度',
    'colorBalance': '色彩平衡',
    'exposure': '曝光度',
    'vibrance': '自然饱和度',
    'blackAndWhite': '黑白',
    'photoFilter': '照片滤镜',
    'channelMixer': '通道混合器',
    'colorLookup': '颜色查找',
    'invert': '反相',
    'posterize': '色调分离',
    'threshold': '阈值',
    'gradientMapEvent': '渐变映射',
    'selectiveColor': '可选颜色'
};

export const useRecord = () => {
    const { adjustmentSteps, addAdjustmentStep, deleteAdjustmentStep, clearAllSteps } = useAdjustmentSteps();
    const [isRecording, setIsRecording] = useState(false);
    const [notificationListeners, setNotificationListeners] = useState([]);
    const [sampleLayerId, setSampleLayerId] = useState(null);
    
    // 使用ref跟踪录制状态，避免闭包问题
    const isRecordingRef = React.useRef(false);
    
    // 同步更新ref
    useEffect(() => {
        isRecordingRef.current = isRecording;
        console.log('录制状态更新:', isRecording);
    }, [isRecording]);
    
    // 监听adjustmentSteps变化
    useEffect(() => {
        console.log('useRecord中的adjustmentSteps更新:', adjustmentSteps);
    }, [adjustmentSteps]);

    const startRecording = async () => {
        const doc = app.activeDocument;
        if (!doc) {
            console.error('没有找到活动文档');
            return;
        }
        
        const { executeAsModal, showAlert } = require("photoshop").core;
        const { batchPlay, addNotificationListener } = require("photoshop").action;

        try {
            // 先清空步骤
            console.log('开始录制 - 清空前的步骤:', adjustmentSteps);
            clearAllSteps();
            
            // 设置录制状态
            setIsRecording(true);
            isRecordingRef.current = true;
            console.log('设置录制状态为true');
            
            await executeAsModal(async () => {
                try {
                    // 1. 合并可见图层
                    await batchPlay(
                        [
                            {
                                _obj: "mergeVisible",
                                duplicate: true,
                                _options: {
                                    dialogOptions: "dontDisplay"
                                }
                            }
                        ],
                        { synchronousExecution: true }
                    );
    
                    // 2. 重命名图层
                    await batchPlay(
                        [
                            {
                                _obj: "set",
                                _target: [
                                    {
                                        _ref: "layer",
                                        _enum: "ordinal",
                                        _value: "targetEnum"
                                    }
                                ],
                                to: {
                                    _obj: "layer",
                                    name: "样本图层"
                                },
                                _options: {
                                    dialogOptions: "dontDisplay"
                                }
                            }
                        ],
                        { synchronousExecution: true }
                    );
    
                    // 3. 置顶图层
                    // 先检查当前图层是否已经在顶部
                    const currentLayers = doc.layers;
                    const targetLayer = doc.activeLayers[0];
                    const isAlreadyOnTop = targetLayer && currentLayers.length > 0 && targetLayer.id === currentLayers[0].id;
                    
                    if (!isAlreadyOnTop) {
                        await batchPlay(
                            [
                                {
                                    _obj: "move",
                                    _target: [
                                        {
                                            _ref: "layer",
                                            _enum: "ordinal",
                                            _value: "targetEnum"
                                        }
                                    ],
                                    to: {
                                        _ref: "layer",
                                        _enum: "ordinal",
                                        _value: "front"
                                    },
                                    _options: {
                                        dialogOptions: "dontDisplay"
                                    }
                                }
                            ],
                            { synchronousExecution: true }
                        );
                    } else {
                        console.log('图层已经在顶部，跳过置顶操作');
                    }
    
                    // 4. 转换为智能对象
                    await batchPlay(
                        [
                            {
                                _obj: "newPlacedLayer"
                            }
                        ],
                        { synchronousExecution: true }
                    );
    
                    // 添加延迟
                    await new Promise(resolve => setTimeout(resolve, 500));
    
                    // 先强制选择当前图层
                    await batchPlay(
                        [
                            {
                                _obj: "select",
                                _target: [
                                    {
                                        _ref: "layer",
                                        _enum: "ordinal",
                                        _value: "targetEnum"
                                    }
                                ],
                                makeVisible: true,
                                _options: {
                                    dialogOptions: "dontDisplay"
                                }
                            }
                        ],
                        { synchronousExecution: true }
                    );
    
                    // 在记录按钮的功能中
                    const activeLayer = doc.activeLayers[0];
                    if (!activeLayer) {
                        throw new Error('无法获取智能对象图层');
                    }
                    const smartObjId = activeLayer.id;
                    if (typeof smartObjId === 'undefined') {
                        throw new Error('无法获取智能对象ID');
                    }
                    setSampleLayerId(smartObjId);
                } catch (error) {
                    console.error('executeAsModal内部错误:', error);
                    throw error; // 重新抛出错误以便外层捕获
                }
            }, {"commandName": "开始录制"});
    
            // 创建监听器 - 使用普通函数而不是箭头函数，避免this绑定问题
            const adjustmentListener = await addNotificationListener(
                ['all'],
                function(event, descriptor) {
                    console.log('收到事件类型:', event, '当前录制状态:', isRecordingRef.current);
                    
                    // 确保在录制状态下才处理事件
                    if (!isRecordingRef.current) {
                        console.log('未在录制状态，忽略事件');
                        return;
                    }
                    
                    // 根据事件类型确定要添加的步骤
                    let stepName = null;
                    
                    // 从事件或描述符中获取调整类型
                    if (eventToNameMap[event]) {
                        stepName = eventToNameMap[event];
                    } else if (descriptor?._obj && eventToNameMap[descriptor._obj]) {
                        stepName = eventToNameMap[descriptor._obj];
                    }
                    
                    // 在 record.tsx 中修改添加步骤的部分
                    if (stepName) {
                    // 添加时间戳确保每次操作都是唯一的
                    const timestamp = new Date().getTime();
                    const stepType = `${stepName} (${timestamp})`;
                    
                    console.log(`捕获到${stepName}事件，准备添加步骤:`, stepType);
                    
                    // 使用setTimeout确保在React事件循环中执行
                    setTimeout(() => {
                        console.log('执行添加步骤:', stepType);
                        addAdjustmentStep(stepType, stepName); // 传递显示名称
                    }, 0);
                }
                
                // 在 applyAdjustment 函数中修改添加步骤的部分
                // 记录调整步骤
                const timestamp = new Date().getTime();
                const step = `${adjustmentItem.name} (${timestamp})`;
                
                // 使用setTimeout确保在React事件循环中执行
                setTimeout(() => {
                    addAdjustmentStep(step, adjustmentItem.name); // 传递显示名称
                    console.log('手动添加步骤后，检查Provider中的状态');
                }, 0);
            }
            );
            
            setNotificationListeners([adjustmentListener]);
            console.log('已设置事件监听器');
            
        } catch (error) {
            console.error('录制过程中发生错误:', error);
            const errorMessage = error?.message || '未知错误';
            showAlert({ message: `开始录制失败: ${errorMessage}` });
            setIsRecording(false);
            isRecordingRef.current = false;
        }
    };

    const stopRecording = async () => {
        try {
            // 先更新状态，再移除监听器
            setIsRecording(false);
            isRecordingRef.current = false;
            console.log('设置录制状态为false');
            
            // 移除所有监听器
            notificationListeners.forEach(listener => {
                if (listener && typeof listener.remove === 'function') {
                    listener.remove();
                    console.log('已移除监听器');
                }
            });
            setNotificationListeners([]);
            
        } catch (error) {
            console.error('停止录制失败:', error);
        }
    };

    // 新增：应用调整功能
    const applyAdjustment = async (adjustmentItem) => {
        try {
            const doc = app.activeDocument;
            if (!doc) {
                throw new Error('没有活动文档');
            }

            const { executeAsModal, showAlert } = require("photoshop").core;
            const { batchPlay } = require("photoshop").action;

            // 如果没有样本图层，创建一个
            if (!sampleLayerId) {
                await executeAsModal(async () => {
                    try {
                        // 1. 合并可见图层
                        await batchPlay(
                            [
                                {
                                    _obj: "mergeVisible",
                                    duplicate: true,
                                    _options: {
                                        dialogOptions: "dontDisplay"
                                    }
                                }
                            ],
                            { synchronousExecution: true }
                        );

                        // 2. 重命名图层
                        await batchPlay(
                            [
                                {
                                    _obj: "set",
                                    _target: [
                                        {
                                            _ref: "layer",
                                            _enum: "ordinal",
                                            _value: "targetEnum"
                                        }
                                    ],
                                    to: {
                                        _obj: "layer",
                                        name: "样本图层"
                                    },
                                    _options: {
                                        dialogOptions: "dontDisplay"
                                    }
                                }
                            ],
                            { synchronousExecution: true }
                        );
                        
                         // 3. 置顶图层
                    // 先检查当前图层是否已经在顶部
                    const currentLayers = doc.layers;
                    const targetLayer = doc.activeLayers[0];
                    const isAlreadyOnTop = targetLayer && currentLayers.length > 0 && targetLayer.id === currentLayers[0].id;
                    
                    if (!isAlreadyOnTop) {
                        await batchPlay(
                            [
                                {
                                    _obj: "move",
                                    _target: [
                                        {
                                            _ref: "layer",
                                            _enum: "ordinal",
                                            _value: "targetEnum"
                                        }
                                    ],
                                    to: {
                                        _ref: "layer",
                                        _enum: "ordinal",
                                        _value: "front"
                                    },
                                    _options: {
                                        dialogOptions: "dontDisplay"
                                    }
                                }
                            ],
                            { synchronousExecution: true }
                        );
                    } else {
                        console.log('图层已经在顶部，跳过置顶操作');
                    }

                        // 4. 转换为智能对象
                        await batchPlay(
                            [
                                {
                                    _obj: "newPlacedLayer",
                                    _options: {
                                        dialogOptions: "dontDisplay"
                                    }
                                }
                            ],
                            { synchronousExecution: true }
                        );

                        // 在新增按钮的功能中
                        const activeLayer = doc.activeLayers[0];
                        if (!activeLayer) {
                            throw new Error('无法获取智能对象图层');
                        }
                        const smartObjId = activeLayer.id;
                        setSampleLayerId(smartObjId);
                    } catch (error) {
                        console.error('创建样本图层失败:', error);
                        throw error;
                    }
                }, {"commandName": "创建样本图层"});
            }
            
            // 确保样本图层被选中
            await executeAsModal(async () => {
                await batchPlay(
                    [
                        {
                            _obj: "select",
                            _target: [
                                {
                                    _ref: "layer",
                                    _id: sampleLayerId
                                }
                            ],
                            makeVisible: true,
                            _options: {
                                dialogOptions: "dontDisplay"
                            }
                        }
                    ],
                    {}
                );
            }, {"commandName": "选择样本图层"});

            // 应用调整
            await executeAsModal(async () => {
                await batchPlay(
                    [
                        {
                            _obj: "make",
                            _target: [
                                {
                                    _ref: "adjustmentLayer"
                                }
                            ],
                            using: {
                                _obj: "adjustmentLayer",
                                type: {
                                    _obj: adjustmentItem.command,
                                    _target: {
                                        _ref: "adjustment"
                                    }
                                }
                            },
                            _options: {
                                dialogOptions: "display"  // 显示调整对话框
                            }
                        }
                    ],
                    {}
                );
            }, {"commandName": `应用${adjustmentItem.name}调整`});

            // 记录调整步骤
            const timestamp = new Date().getTime();
            const step = `${adjustmentItem.name} (${timestamp})`;
            
            // 使用setTimeout确保在React事件循环中执行
            setTimeout(() => {
                addAdjustmentStep(step);
                console.log('手动添加步骤后，检查Provider中的状态');
            }, 0);

        } catch (error) {
            console.error('应用调整失败:', error);
            const { showAlert } = require("photoshop").core;
            showAlert({ message: `应用调整失败: ${error.message}` });
        }
    };

    // 导出调整菜单组件
    const AdjustmentMenu = () => {
        const [isMenuOpen, setIsMenuOpen] = useState(false);
        
        const toggleMenu = () => {
            setIsMenuOpen(!isMenuOpen);
        };
        
        // 点击菜单项后关闭菜单
        const handleMenuItemClick = (item, event) => {
            // 阻止事件冒泡
            event.stopPropagation();
            
            if (!isRecording) {
                applyAdjustment(item);
            }
            setIsMenuOpen(false);
        };
        
        // 点击外部区域关闭菜单
        useEffect(() => {
            const handleClickOutside = (event) => {
                if (isMenuOpen && !event.target.closest('.dropdown')) {
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
                        cursor: 'pointer'
                    }}
                >
                    <span style={{ marginRight: '5px' }}>+</span> 新增
                </button>
                {isMenuOpen && (
                    <div 
                        className="dropdown-content"
                        style={{
                            display: 'block',
                            bottom: '100%',  // 向上展开
                            top: 'auto',     // 取消向下展开
                            maxHeight: '300px',
                            overflowY: 'auto'
                        }}
                        // 阻止点击菜单本身时关闭菜单
                        onClick={(e) => e.stopPropagation()}
                    >
                        {adjustmentMenuItems.map(item => (
                            <a 
                                key={item.id} 
                                onClick={(e) => handleMenuItemClick(item, e)}
                                style={{ opacity: isRecording ? 0.5 : 1 }}
                            >
                                {item.name}
                            </a>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return {
        startRecording,
        stopRecording,
        isRecording,
        adjustmentSteps,
        AdjustmentMenu,
        applyAdjustment
    };
};