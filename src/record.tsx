import React, { useState, useContext } from 'react';
import { app } from 'photoshop';
import { AdjustmentStepsContext } from './AdjustmentStepsContext';

export const useRecord = () => {
    const { addAdjustmentStep } = useContext(AdjustmentStepsContext);
    const [isRecording, setIsRecording] = useState(false);
    const [adjustmentSteps, setAdjustmentSteps] = useState([]);
    const [notificationListeners, setNotificationListeners] = useState([]);
    const [mergedLayer, setMergedLayer] = useState(null);  // 添加这一行来存储合并后的图层

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
                    
                    // 1. 合并可见图层
                    console.log('准备合并可见图层');
                    const mergeResult = await batchPlay(
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

                    // 直接获取当前激活的图层
                    const mergedLayer = doc.activeLayer;
                    console.log('获取到合并后的图层:', mergedLayer?.name);

                    if (!mergedLayer) {
                        console.error('无法获取合并后的图层');
                        throw new Error('无法获取合并后的图层');
                    }

                    setMergedLayer(mergedLayer);
                    
                    // 2. 置顶图层
                    console.log('准备置顶图层');
                    const moveResult = await batchPlay(
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
                        {}
                    );
                    console.log('置顶图层结果:', moveResult);

                    // 3. 重命名图层
                    console.log('准备重命名图层');
                    const renameResult = await batchPlay(
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
                    console.log('重命名图层结果:', renameResult);

                    // 4. 转换为智能对象
                    console.log('准备转换为智能对象');
                    const convertResult = await batchPlay(
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
                    console.log('转换为智能对象结果:', convertResult);

                    // 保存智能对象的ID
                    const smartObjId = doc.activeLayer.id;
                    console.log('获取到智能对象ID:', smartObjId);
                    setSampleLayerId(smartObjId);
                }, {"commandName": "开始录制"});

                // 创建监听器
                console.log('准备创建调整监听器');
                const adjustmentListener = await addNotificationListener(
                    ['adjustmentChanged', 'adjustmentLayerChanged', 'smartFilterChanged', 'filterChanged'],
                    async (event, descriptor) => {
                        console.log('收到调整事件:', event);
                        console.log('调整描述符:', descriptor);
                        try {
                            if (isRecording && doc.activeLayer) {
                                const adjustmentType = descriptor._obj || descriptor.type || descriptor.name || '调整';
                                const step = `调整: ${adjustmentType}`;
                                console.log('记录调整步骤:', step);
                                
                                if (step) {
                                    setAdjustmentSteps(prev => {
                                        if (!prev.includes(step)) {
                                            addAdjustmentStep(step);
                                            return [...prev, step];
                                        }
                                        return prev;
                                    });
                                }
                            }
                        } catch (error) {
                            console.error('调整监听器错误:', error);
                        }
                    }
                );
                console.log('调整监听器创建成功');
                setNotificationListeners([adjustmentListener]);
                
                showAlert({ message: '录制已开始，请对样本图层进行调整操作！' });
                
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

    return {
        startRecording,
        stopRecording,
        isRecording,
        adjustmentSteps
    };
};

// 删除这一行，因为没有定义Record组件
// export default Record;