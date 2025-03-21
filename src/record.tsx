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

    // 修改 startRecording 函数
    const startRecording = async () => {
        const doc = app.activeDocument;
        if (!doc) {
            console.error('没有找到活动文档');
            return;
        }
        
        const { executeAsModal, showAlert } = require("photoshop").core;
        const { batchPlay, addNotificationListener } = require("photoshop").action;
    
        try {
            // 移除清空步骤的代码
            // clearAllSteps(); // 不再清空步骤
            
            // 设置录制状态
            setIsRecording(true);
            isRecordingRef.current = true;
            console.log('设置录制状态为true');
            
            // 检查是否已存在样本图层
            let existingSampleLayer = null;
            
            // 查找名为"样本图层"的智能对象图层
            for (let i = 0; i < doc.layers.length; i++) {
                const layer = doc.layers[i];
                if (layer.name === "样本图层" && layer.kind === "smartObject") {
                    existingSampleLayer = layer;
                    break;
                }
            }
            
            // 如果已存在样本图层，直接使用它
            if (existingSampleLayer) {
                console.log('找到已存在的样本图层，ID:', existingSampleLayer.id);
                setSampleLayerId(existingSampleLayer.id);
                
                // 选中已存在的样本图层
                await executeAsModal(async () => {
                    await batchPlay(
                        [
                            {
                                _obj: "select",
                                _target: [
                                    {
                                        _ref: "layer",
                                        _id: existingSampleLayer.id
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
                }, {"commandName": "选择已存在的样本图层"});
                
                // 如果需要，可以在这里同步调整图层和记录步骤
                // 但由于我们保留了现有步骤，可能不需要额外同步
            } else {
                // 如果不存在样本图层，创建一个新的，并清空步骤
                // 只有在创建新样本图层时才清空步骤
                clearAllSteps();
                console.log('创建新样本图层，清空步骤');
                
                // 创建样本图层的代码保持不变
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
    
                        // 在新增按钮的功能中
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
            }
    
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
                        // 移除防重复逻辑，因为已经在Context中实现
                        setTimeout(() => {
                            console.log('执行添加步骤:', stepType);
                            addAdjustmentStep(stepType, stepName); // 传递显示名称
                        }, 0);
                    }
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

            // 记录调整步骤 - 简化这部分代码，移除重复的防重复逻辑
            const timestamp = new Date().getTime();
            const step = `${adjustmentItem.name} (${timestamp})`;
            
            // 直接添加步骤，依赖 AdjustmentStepsContext 中的防重复逻辑
            setTimeout(() => {
                console.log('手动添加步骤:', step);
                addAdjustmentStep(step, adjustmentItem.name); // 传递显示名称
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

    // 新增：删除调整步骤及对应的调整图层
    const deleteAdjustmentAndLayer = async (index) => {
        try {
            // 如果正在录制，不允许删除
            if (isRecording) {
                console.log('正在录制中，不能删除调整');
                return;
            }

            const doc = app.activeDocument;
            if (!doc) {
                throw new Error('没有活动文档');
            }

            const { executeAsModal, showAlert } = require("photoshop").core;
            const { batchPlay } = require("photoshop").action;

            // 确保样本图层被选中
            if (sampleLayerId) {
                await executeAsModal(async () => {
                    try {
                        // 先选择样本图层
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
                            { synchronousExecution: true }
                        );

                        // 获取所有调整图层
                        const allLayers = doc.layers;
                        const adjustmentLayers = allLayers.filter(layer => 
                            layer.kind === 'adjustmentLayer' || 
                            layer.adjustmentType !== undefined
                        );

                        // 计算要删除的图层索引
                        // 注意：调整图层的顺序可能与记录的步骤顺序相反
                        // 因为新的调整图层通常添加在顶部
                        const layerToDelete = adjustmentLayers[adjustmentLayers.length - 1 - index];
                        
                        if (layerToDelete) {
                            // 选择并删除对应的调整图层
                            await batchPlay(
                                [
                                    {
                                        _obj: "select",
                                        _target: [
                                            {
                                                _ref: "layer",
                                                _id: layerToDelete.id
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

                            await batchPlay(
                                [
                                    {
                                        _obj: "delete",
                                        _target: [
                                            {
                                                _ref: "layer",
                                                _enum: "ordinal",
                                                _value: "targetEnum"
                                            }
                                        ],
                                        _options: {
                                            dialogOptions: "dontDisplay"
                                        }
                                    }
                                ],
                                { synchronousExecution: true }
                            );

                            console.log(`已删除调整图层: ${layerToDelete.name}`);
                        } else {
                            console.warn(`未找到索引 ${index} 对应的调整图层`);
                        }

                        // 重新选择样本图层
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
                            { synchronousExecution: true }
                        );
                    } catch (error) {
                        console.error('删除调整图层失败:', error);
                        throw error;
                    }
                }, {"commandName": "删除调整图层"});
            }

            // 从记录中删除对应的步骤
            deleteAdjustmentStep(index);
            console.log(`已删除索引 ${index} 的调整步骤`);

        } catch (error) {
            console.error('删除调整失败:', error);
            const { showAlert } = require("photoshop").core;
            showAlert({ message: `删除调整失败: ${error.message}` });
        }
    };

    // 修改 AdjustmentMenu 组件，添加删除按钮状态控制
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

    // 新增：删除按钮组件
    const DeleteButton = () => {
        // 判断删除按钮是否可用：非录制状态且有调整步骤
        const isDeleteEnabled = !isRecording && adjustmentSteps.length > 0;
        
        return (
            <button 
                onClick={() => {
                    if (isDeleteEnabled && adjustmentSteps.length > 0) {
                        // 删除最后一个调整步骤
                        deleteAdjustmentAndLayer(adjustmentSteps.length - 1);
                    }
                }}
                style={{ 
                    backgroundColor: '#444',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 8px',
                    borderRadius: '4px',
                    cursor: isDeleteEnabled ? 'pointer' : 'not-allowed',
                    opacity: isDeleteEnabled ? 1 : 0.5
                }}
                disabled={!isDeleteEnabled}
            >
                <span style={{ marginRight: '5px' }}>🗑</span> 删除
            </button>
        );
    };

    return {
        startRecording,
        stopRecording,
        isRecording,
        adjustmentSteps,
        AdjustmentMenu,
        applyAdjustment,
        deleteAdjustmentAndLayer,
        DeleteButton  // 导出删除按钮组件
    };
};