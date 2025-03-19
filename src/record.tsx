import React, { useState, useContext } from 'react';
import { app, Document, Layer, SmartObject } from 'photoshop';
import { AdjustmentStepsContext } from './AdjustmentStepsContext';

const Record = () => {
    const { addAdjustmentStep } = useContext(AdjustmentStepsContext);
    const [isRecording, setIsRecording] = useState(false);
    const [adjustmentSteps, setAdjustmentSteps] = useState([]);
    const [mergedLayer, setMergedLayer] = useState(null);
    const [notificationListener, setNotificationListener] = useState(null);

    // 开始录制功能实现
    const startRecording = async () => {
        const doc: Document = app.activeDocument;
        if (doc) {
            const { executeAsModal, showAlert } = require("photoshop").core;
            const { batchPlay, addNotificationListener } = require("photoshop").action;

            try {
                const result = await executeAsModal(async () => {
                    // 1. 合并可见图层
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
                        {}
                    );

                    // 获取合并后的图层
                    const mergedLayer = doc.activeLayer;

                    // 2. 置顶图层
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
                        {}
                    );

                    // 3. 重命名图层
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

                    // 4. 转换为智能对象
                    const smartObj = await batchPlay(
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

                    return smartObj;
                }, {"commandName": "开始录制"});

                // 5. 监听调整操作
                const listener = await addNotificationListener(
                    ['objectChanged', 'smartFilterChanged'],
                    async (event, descriptor) => {
                        // 检查是否是目标图层的更改
                        const isTargetLayer = descriptor._target && 
                            descriptor._target[0]._ref === "layer" && 
                            descriptor._target[0]._id === result._id;

                        // 检查是否是智能滤镜的更改
                        const isSmartFilter = descriptor._target && 
                            descriptor._target[0]._ref === "smartFilter";

                        if (isTargetLayer || isSmartFilter) {
                            let step = '';
                            if (event === 'objectChanged') {
                                step = `图层调整: ${descriptor._property || '未知属性'}`;
                            } else if (event === 'smartFilterChanged') {
                                step = `智能滤镜调整: ${descriptor._property || '未知滤镜'}`;
                            }
                            
                            if (step) {
                                setAdjustmentSteps(prev => [...prev, step]);
                                addAdjustmentStep(step);
                            }
                        }
                    }
                );

                setNotificationListener(listener);
                setMergedLayer(result);
                setIsRecording(true);
                showAlert({ message: '录制已开始！' });
            } catch (error) {
                showAlert({ message: `录制失败: ${error.message}` });
                throw error;
            }
        } else {
            throw new Error('没有活动的文档，无法开始录制');
        }
    };

    // 停止录制功能
    const stopRecording = () => {
        if (notificationListener) {
            notificationListener();
            setNotificationListener(null);
        }
        setIsRecording(false);
        const { showAlert } = require("photoshop").core;
        showAlert({ message: '录制已停止！' });
    };

    return {
        startRecording,
        stopRecording,
        isRecording
    };
};

export default Record;