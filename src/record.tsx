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

export const useRecord = () => {
    // 使用自定义 Hook 而不是直接 useContext
    const { addAdjustmentStep } = useAdjustmentSteps();
    const [isRecording, setIsRecording] = useState(false);
    const [adjustmentSteps, setAdjustmentSteps] = useState([]);
    const [notificationListeners, setNotificationListeners] = useState([]);
    const [sampleLayerId, setSampleLayerId] = useState(null); // 存储样本图层ID
    const [localSteps, setLocalSteps] = useState([]); // 移到顶层

    const startRecording = async () => {
        console.log('开始录制函数被调用');
        const doc = app.activeDocument;
        if (doc) {
            console.log('获取到活动文档:', doc.name);
            const { executeAsModal, showAlert } = require("photoshop").core;
            const { batchPlay, addNotificationListener } = require("photoshop").action;
    
            try {
                setAdjustmentSteps([]);
                setIsRecording(true);
                
                await executeAsModal(async () => {
                    try {
                        // 1. 合并可见图层
                        console.log('准备合并可见图层');
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
                        console.log('准备重命名图层');
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
                                    }
                                }
                            ],
                            { synchronousExecution: true }
                        );
    
                        // 3. 置顶图层
                        console.log('准备置顶图层');
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
                                    }
                                }
                            ],
                            { synchronousExecution: true }
                        );
    
                        // 4. 转换为智能对象
                        console.log('准备转换为智能对象');
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
                        console.log('获取到智能对象ID:', smartObjId);
                        setSampleLayerId(smartObjId);
                    } catch (error) {
                        console.error('executeAsModal内部错误:', error);
                        throw error; // 重新抛出错误以便外层捕获
                    }
                }, {"commandName": "开始录制"});
    
                // 创建监听器
                console.log('准备创建调整监听器');
                const adjustmentListener = await addNotificationListener(
                    ['all'],
                    async (event, descriptor) => {
                        console.log('收到事件类型:', event);
                        console.log('事件描述符:', JSON.stringify(descriptor, null, 2));
                        
                        // 先记录更新前的状态
                        console.log('更新前的步骤:', adjustmentSteps);
                        
                        // 根据事件类型添加初始步骤
                        if (event === 'curves') {
                            addAdjustmentStep('曲线');
                        } else if (event === 'levels') {
                            addAdjustmentStep('色阶');
                        } else if (event === 'brightnessEvent') {
                            addAdjustmentStep('亮度/对比度');
                        } else if (event === 'hueSaturation') {
                            addAdjustmentStep('色相/饱和度');
                        } else if (event === 'colorBalance') {
                            addAdjustmentStep('色彩平衡');
                        } else if (event === 'exposure') {
                            addAdjustmentStep('曝光度');
                        } else if (event === 'vibrance') {
                            addAdjustmentStep('自然饱和度');
                        }
                        
                        // 检查更新后的状态
                        setTimeout(() => {
                            console.log('Context中的步骤:', adjustmentSteps);
                        }, 100);
                        
                        try {
                            if (isRecording) {
                                // 根据事件类型确定要添加的步骤
                                let stepType = null;
                                let timestamp = new Date().getTime(); // 添加时间戳确保每次操作都是唯一的
                                
                                if (event === 'curves' || descriptor?._obj === "curves") {
                                    stepType = `曲线 (${timestamp})`;
                                } else if (event === 'levels' || descriptor?._obj === "levels") {
                                    stepType = `色阶 (${timestamp})`;
                                } else if (event === 'brightnessEvent' || descriptor?._obj === "brightness") {
                                    stepType = `亮度/对比度 (${timestamp})`;
                                } else if (event === 'hueSaturation' || descriptor?._obj === "hueSaturation") {
                                    stepType = `色相/饱和度 (${timestamp})`;
                                } else if (event === 'colorBalance' || descriptor?._obj === "colorBalance") {
                                    stepType = `色彩平衡 (${timestamp})`;
                                } else if (event === 'exposure' || descriptor?._obj === "exposure") {
                                    stepType = `曝光度 (${timestamp})`;
                                } else if (event === 'vibrance' || descriptor?._obj === "vibrance") {
                                    stepType = `自然饱和度 (${timestamp})`;
                                }

                                if (stepType) {
                                    // 先添加到面板
                                    console.log('更新前的步骤:', adjustmentSteps);
                                    addAdjustmentStep(stepType);
                                    
                                    // 确保更新已经反映在界面上
                                    setTimeout(() => {
                                        console.log('Context中的步骤:', adjustmentSteps);
                                    }, 100);
                                    
                                    // 记录实际操作
                                    console.log(`捕获到${stepType.split(' (')[0]}事件，准备添加步骤`);
                                    setTimeout(() => {
                                        console.log('执行添加步骤:', stepType);
                                        addAdjustmentStep(stepType);
                                    }, 0);
                                }
                            }
                        } catch (error) {
                            console.error('调整监听器错误:', error);
                        }
                    }
                );
                console.log('调整监听器创建成功');
                setNotificationListeners([adjustmentListener]);
                
            } catch (error) {
                console.error('录制过程中发生错误:', error);
                const errorMessage = error?.message || '未知错误';
                showAlert({ message: `开始录制失败: ${errorMessage}` });
                setIsRecording(false);
            }
        } else {
            console.error('没有找到活动文档');
        }
    };

    // 停止录制
    const stopRecording = async () => {
        try {
            // 移除所有监听器
            notificationListeners.forEach(listener => {
                if (listener && typeof listener.remove === 'function') {
                    listener.remove();
                }
            });
            setNotificationListeners([]);
            
            // 更新录制状态
            setIsRecording(false);
            
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
                            {}
                        );
                        
                        // 3. 置顶图层
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
                                    }
                                }
                            ],
                            { synchronousExecution: true }
                        );

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
                            {}
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
            // 删除这里多余的大括号 }

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
            const step = `调整: ${adjustmentItem.name}`;
            addAdjustmentStep(step);
            setAdjustmentSteps(prev => {
                if (!prev.includes(step)) {
                    return [...prev, step];
                }
                return prev;
            });

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