import React, { useState, useEffect, useRef } from 'react';
import { app } from 'photoshop';
import { useAdjustmentSteps } from './contexts/AdjustmentStepsContext';
import { AdjustmentMenu as AdjustmentMenuComponent } from './components/AdjustmentMenu';
import { eventToNameMap } from './styles/Constants';
import { createSampleLayer } from './utils/layerUtils';
import { useRecordContext } from './contexts/RecordContext';
import { adjustmentMenuItems } from './styles/Constants';
import { useProcessing } from './contexts/ProcessingContext';

// 录制区域组件
export const useRecord = () => {
    const { 
        adjustmentSteps, 
        addAdjustmentStep, 
        deleteAdjustmentStep, 
        clearAllSteps,
        selectedIndex,
        setSelectedIndex
    } = useAdjustmentSteps(); 
    const { isProcessing } = useProcessing();  // 获取处理状态
    const { isRecording, setIsRecording, isRecordingRef } = useRecordContext();
    const [notificationListeners, setNotificationListeners] = useState([]);
    const [sampleLayerId, setSampleLayerId] = useState(null);

    // 单次智能滤镜同步给记录面板的
    const syncAdjustmentLayers = async (layerId) => {
        try {
            const doc = app.activeDocument;
            if (!doc || !layerId) return;

            const { batchPlay } = require("photoshop").action;
            
            // 获取智能滤镜信息
            const result = await batchPlay([{
                _obj: "get",
                _target: [{ _ref: "layer", _id: layerId }],
                _options: { dialogOptions: "dontDisplay" }
            }], { synchronousExecution: true });
            
            const filterFX = result[0]?.smartObject?.filterFX || [];
            
            // 清空现有步骤
            clearAllSteps();
            
            // 从上到下添加滤镜记录
            for (let i = 0; i < filterFX.length; i++) {
                const filter = filterFX[i];
                const filterName = filter.name.split('...')[0].trim();
                
                const timestamp = new Date().getTime() - (filterFX.length - i) * 1000;
                const step = `${filterName} (${timestamp})`;
                
                addAdjustmentStep(step, filterName, true);
            }
        } catch (error) {
            console.error('同步调整图层失败:', error);
            const { showAlert } = require("photoshop").core;
            showAlert({ message: `同步调整图层失败: ${error.message}` });
        }
    };

    const startRecording = async () => {
        const doc = app.activeDocument;
        if (!doc) return;
        
        const { executeAsModal, showAlert } = require("photoshop").core;
        const { batchPlay, addNotificationListener } = require("photoshop").action;
    
        try {
            // 首先查找现有的样本图层
            let existingSampleLayer = doc.layers.find(layer => 
                layer.name === "样本图层" && layer.kind === "smartObject"
            );
            
            if (existingSampleLayer) {
                const layerId = existingSampleLayer.id;
                setSampleLayerId(layerId);
                
                // 同步现有的智能滤镜
                await syncAdjustmentLayers(layerId);
            } else {
                clearAllSteps();
                try {
                    const smartObjId = await createSampleLayer();
                    setSampleLayerId(smartObjId);
                } catch (error) {
                    showAlert({ message: `创建样本图层失败: ${error.message}` });
                    return;
                }
            }

            setIsRecording(true);
            isRecordingRef.current = true;
            
            // 提取命令列表
            const commands = adjustmentMenuItems.map(item => item.command);

            // 添加调整以及滤镜的监听器
            const adjustmentListener = await addNotificationListener(
                commands, // 使用提取的命令列表
                function(event, descriptor) {
                    if (!isRecordingRef.current) return;
                    
                    let stepName = eventToNameMap[event] || 
                                 (descriptor?._obj && eventToNameMap[descriptor._obj]);
                    
                    if (stepName) {
                        const timestamp = new Date().getTime();
                        const stepType = `${stepName} (${timestamp})`;
                        
                        // 直接添加到数组开头
                        addAdjustmentStep(stepType, stepName, true);
                    }
                }
            );
    
            setNotificationListeners([adjustmentListener]);
        } catch (error) {
            showAlert({ message: `开始录制失败: ${error?.message || '未知错误'}` });
            setIsRecording(false);
            isRecordingRef.current = false;
        }
    };

    const stopRecording = async () => {
        try {
            setIsRecording(false);
            isRecordingRef.current = false;
            notificationListeners.forEach(listener => {
                if (listener?.remove) {
                    listener.remove();
                }
            });
            setNotificationListeners([]);
        } catch (error) {
            console.error('停止录制失败:', error);
        }
    };

    const applyAdjustment = async (adjustmentItem) => {
        try {
            const doc = app.activeDocument;
            if (!doc) {
                throw new Error('没有活动文档');
            }

            const { executeAsModal, showAlert } = require("photoshop").core;
            const { batchPlay } = require("photoshop").action;

            if (!sampleLayerId) {
                try {
                    const smartObjId = await createSampleLayer();
                    setSampleLayerId(smartObjId);
                } catch (error) {
                    throw new Error(`创建样本图层失败: ${error.message}`);
                }
            }

            await executeAsModal(async () => {
                await batchPlay(
                    [{
                        _obj: "make",
                        _target: [{ _ref: "adjustmentLayer" }],
                        using: {
                            _obj: "adjustmentLayer",
                            type: {
                                _obj: adjustmentItem.command,
                                _target: { _ref: "adjustment" }
                            }
                        },
                        _options: { dialogOptions: "display" }
                    }],
                    {}
                );
            }, {"commandName": `应用${adjustmentItem.name}调整`});

        } catch (error) {
            console.error('应用调整失败:', error);
            const { showAlert } = require("photoshop").core;
            showAlert({ message: `应用调整失败: ${error.message}` });
        }
    };

    const deleteAdjustmentAndLayer = async (index) => {
        if (isRecording || !app.activeDocument) return;

        const { executeAsModal, showAlert } = require("photoshop").core;
        const { batchPlay } = require("photoshop").action;

        try {
            if (sampleLayerId) {
                // 暂时禁用同步
                const currentSyncInterval = syncInterval.current;
                if (currentSyncInterval) {
                    clearInterval(currentSyncInterval);
                }

                let deletionSuccessful = false;

                await executeAsModal(async () => {
                    // 选中样本图层
                    await batchPlay([{
                        _obj: "select",
                        _target: [{ _ref: "layer", _id: sampleLayerId }],
                        makeVisible: true,
                        _options: { dialogOptions: "dontDisplay" }
                    }], { synchronousExecution: true });

                    // 获取智能滤镜信息
                    const result = await batchPlay([{
                        _obj: "get",
                        _target: [{ _ref: "layer", _id: sampleLayerId }],
                        _options: { dialogOptions: "dontDisplay" }
                    }], { synchronousExecution: true });

                    const filterFX = result[0]?.smartObject?.filterFX || [];
                    
                    // 特殊处理只有一条记录的情况
                    if (adjustmentSteps.length === 1) {
                        await batchPlay([{
                            _obj: "delete",
                            _target: [
                                { _ref: "filterFX" },
                                {
                                    _ref: "layer",
                                    _enum: "ordinal",
                                    _value: "targetEnum"
                                }
                            ],
                            _options: { dialogOptions: "dontDisplay" }
                        }], { synchronousExecution: true });
                        deletionSuccessful = true;
                
                        deleteAdjustmentStep(index);
                        return;
                    }
                    
                    const filterIndex = filterFX.length - index;
                    
                    if (filterIndex >= 1 && filterIndex <= filterFX.length) {
                        await batchPlay([{
                            _obj: "delete",
                            _target: [{
                                _ref: "filterFX",
                                _index: filterIndex
                            }],
                            _options: { dialogOptions: "dontDisplay" }
                        }], { synchronousExecution: true });
                        deletionSuccessful = true;
                        
                        // 立即更新步骤记录
                        deleteAdjustmentStep(index);
                    }
                }, { "commandName": "删除智能滤镜" });

                // 等待一段时间后再恢复同步
                setTimeout(() => {
                    if (!isRecording && sampleLayerId) {
                        syncInterval.current = setInterval(async () => {
                            try {
                                await syncWithSampleLayer();
                            } catch (error) {
                                console.error('同步失败:', error);
                            }
                        }, 500);
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('删除调整失败:', error);
            showAlert({ message: `删除调整失败: ${error.message}` });
        }
    };

    // 添加 ref 来存储同步定时器
    const syncInterval = useRef(null);

    useEffect(() => {
        if (!isRecording && sampleLayerId) {
            const syncInterval = setInterval(async () => {
                try {
                    await syncWithSampleLayer();
                } catch (error) {
                    console.error('同步失败:', error);
                    if (error.message?.includes('not found')) {
                        clearAllSteps();
                        setSampleLayerId(null);
                    }
                }
            }, 500);
            return () => clearInterval(syncInterval);
        } 
    }, [isRecording, sampleLayerId]);

    const applyDirectAdjustment = async (adjustmentItem) => {
        try {
            const timestamp = new Date().getTime();
            const step = `${adjustmentItem.name} (${timestamp})`;
            
            if (isRecording) {
                addAdjustmentStep(step, adjustmentItem.name, true);
            } else {
                addAdjustmentStep(step, adjustmentItem.name);
            }
        } catch (error) {
            console.error('记录直接调整失败:', error);
            const { showAlert } = require("photoshop").core;
            showAlert({ message: `记录调整失败: ${error.message}` });
        }
    };

    // 保持样本图层同步给记录
    const syncWithSampleLayer = async () => {
        try {
            const doc = app.activeDocument;
            if (!doc) return;

            const sampleLayer = doc.layers.find(layer => 
                layer.name === "样本图层" && 
                layer.kind === "smartObject"
            );

            if (sampleLayer) {
                await syncAdjustmentLayers(sampleLayer.id);
            } else {
                // 如果没有找到样本图层，清空记录
                clearAllSteps();
                setSampleLayerId(null);
            }
        } catch (error) {
            console.error('同步样本图层失败:', error);
        }
    };

    // 添加文档监听器，用于监测文档切换和状态变化
    useEffect(() => {
    const handleDocumentChange = async () => {
        if (!app.activeDocument) {
            clearAllSteps();
            setSampleLayerId(null);
            return;
        }
        
        try {
            const sampleLayer = app.activeDocument.layers.find(layer => 
                layer.name === "样本图层" && 
                layer.kind === "smartObject" 
            );
            
            if (sampleLayer) {
                setSampleLayerId(sampleLayer.id);
                await syncAdjustmentLayers(sampleLayer.id);
            } else {
                clearAllSteps();
                setSampleLayerId(null);
            }
        } catch (error) {
            console.error('文档切换处理失败:', error);
        }
    };

    const { addNotificationListener } = require("photoshop").action;
    
    const listeners = [
        // 监听历史记录变化
        addNotificationListener(
            ["historyStateChanged"], 
            () => {
                if (!isProcessing) {  
                    // 添加防抖处理
                    const timeoutId = setTimeout(() => {
                        console.log('RecordArea历史记录变化事件触发');
                        handleDocumentChange();
                    }, 100);
                    
                    return () => clearTimeout(timeoutId);
                }
            }
        ),
        // 监听文档选择事件
       addNotificationListener(
        ["select"], 
        (event, descriptor) => {
            if (descriptor?._target?.[0]?._ref === "document") {
                console.log('文档选择事件触发');
                handleDocumentChange();
            }
        }
    ),
        // 监听文档打开和关闭事件
        addNotificationListener(
            ["open", "close", "newDocument"], 
            () => {
                console.log('文档已打开/关闭或新建');
                handleDocumentChange();
            }
        )
    ];
    
    // 组件卸载时清理监听器
    return () => {
        listeners.forEach(listener => {
            if (listener?.remove) {
                listener.remove();
            }
        });
    };
    }, []);

    // 组件挂载时同步样本图层状态
    useEffect(() => {
        const doc = app.activeDocument;
        if (!doc) return;

        const sampleLayer = doc.layers.find(layer => 
            layer.name === "样本图层" && 
            layer.kind === "smartObject"
        );

        if (sampleLayer) {
            setSampleLayerId(sampleLayer.id);
            syncAdjustmentLayers(sampleLayer.id);
        }
    }, []); // 仅在挂载时执行一次

    // 非录制状态定期同步样本图层状态
    useEffect(() => {
        if (!isRecording && sampleLayerId) {
            const syncInterval = setInterval(async () => {
                try {
                    await syncWithSampleLayer();
                } catch (error) {
                    console.error('同步失败:', error);
                    if (error.message?.includes('not found')) {
                        clearAllSteps();
                        setSampleLayerId(null);
                    }
                }
            }, 500);
            return () => clearInterval(syncInterval);
        } 
    }, [isRecording, sampleLayerId]);

    // 录制状态中，监测样本图层是否被删监
    useEffect(() => {
        if (isRecording && sampleLayerId) {
            const checkSampleLayer = setInterval(() => {
                const doc = app.activeDocument;
                if (!doc) return;

                const sampleLayerExists = doc.layers.some(layer => 
                    layer.id === sampleLayerId && 
                    layer.name === "样本图层" && 
                    layer.kind === "smartObject"
                );

                if (!sampleLayerExists) {
                    console.log('样本图层被删除，停止录制');
                    stopRecording();
                    clearAllSteps();
                    setSampleLayerId(null);
                }
            }, 500);

            return () => clearInterval(checkSampleLayer);
        }
    }, [isRecording, sampleLayerId]);

    return {
        startRecording,
        stopRecording,
        isRecording,
        adjustmentSteps,
        applyAdjustment,
        deleteAdjustmentAndLayer, 
        sampleLayerId,
        setSampleLayerId,
        applyDirectAdjustment,
        selectedIndex,
        setSelectedIndex
    };
};

export const AdjustmentMenu = React.memo(() => {
    const { isRecording } = useRecordContext();
    const {
        applyAdjustment,
        applyDirectAdjustment
    } = useRecord();

    return (
        <AdjustmentMenuComponent
            isRecording={isRecording}
            onAdjustmentClick={applyAdjustment}
            onDirectAdjustment={applyDirectAdjustment}
        />
    );
});