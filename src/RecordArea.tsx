import React, { useState, useEffect } from 'react';
import { app } from 'photoshop';
import { useAdjustmentSteps } from './AdjustmentStepsContext';
import { AdjustmentMenu as AdjustmentMenuComponent } from './components/AdjustmentMenu';
import { DeleteButton } from './components/DeleteButton';
import { eventToNameMap } from './constants';
import { createSampleLayer } from './utils/layerUtils';

// 录制区域组件
export const useRecord = () => {
    const { adjustmentSteps, addAdjustmentStep, deleteAdjustmentStep, clearAllSteps } = useAdjustmentSteps();
    const [isRecording, setIsRecording] = useState(false);
    const [notificationListeners, setNotificationListeners] = useState([]);
    const [sampleLayerId, setSampleLayerId] = useState(null);
    
    const isRecordingRef = React.useRef(false);
    
    useEffect(() => {
        isRecordingRef.current = isRecording;
    }, [isRecording]);
    
    useEffect(() => {
        console.log('RecordArea中的adjustmentSteps更新:', adjustmentSteps);
    }, [adjustmentSteps]);

    const syncAdjustmentLayers = async (layerId = null) => {
        try {
            const doc = app.activeDocument;
            const targetLayerId = layerId || sampleLayerId;
            
            if (!doc || !targetLayerId) return;

            clearAllSteps();
            const allLayers = doc.layers;
            
            const sampleLayer = allLayers.find(layer => layer.id === targetLayerId);
            if (!sampleLayer) return;
            
            // 获取智能滤镜信息
            const { batchPlay } = require("photoshop").action;
            const result = await batchPlay([{
                _obj: "get",
                _target: [{ _ref: "layer", _id: targetLayerId }],
                _options: { dialogOptions: "dontDisplay" }
            }], { synchronousExecution: true });

            console.log('滤镜信息:', result[0]?.smartObject?.filterFX);
            
            const filterFX = result[0]?.smartObject?.filterFX || [];
            
            // 从上到下添加滤镜记录
            for (let i = 0; i < filterFX.length; i++) {
                const filter = filterFX[i];
                // 使用 name 属性而不是 _obj
                const filterName = filter.name.split('...')[0].trim();  // 移除省略号及后面的内容
                
                const timestamp = new Date().getTime() - (filterFX.length - i) * 1000;
                const step = `${filterName} (${timestamp})`;
                
                addAdjustmentStep(step, filterName, true);
            }
        } catch (error) {
            console.error('同步调整图层失败:', error);
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

            // 设置录制状态
            setIsRecording(true);
            isRecordingRef.current = true;
    
            // 添加监听器
            const adjustmentListener = await addNotificationListener(
                ['all'],
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

            const timestamp = new Date().getTime();
            const step = `${adjustmentItem.name} (${timestamp})`;
            
            setTimeout(() => {
                addAdjustmentStep(step, adjustmentItem.name);
            }, 0);
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
                await executeAsModal(async () => {
                    const doc = app.activeDocument;
                    const allLayers = doc.layers;
                    const adjustmentLayers = [];
                    
                    for (let i = 0; i < allLayers.length; i++) {
                        const layer = allLayers[i];
                        if (layer.id === sampleLayerId) break;
                        if (layer.kind === 'adjustmentLayer' || layer.adjustmentType) {
                            adjustmentLayers.push(layer);
                        }
                    }
                    
                    adjustmentLayers.reverse();
                    const layerToDelete = adjustmentLayers[index];
                        
                    if (layerToDelete) {
                        await batchPlay(
                            [{
                                _obj: "select",
                                _target: [{ _ref: "layer", _id: layerToDelete.id }],
                                makeVisible: true,
                                _options: { dialogOptions: "dontDisplay" }
                            }],
                            { synchronousExecution: true }
                        );

                        await batchPlay(
                            [{
                                _obj: "delete",
                                _target: [{ 
                                    _ref: "layer",
                                    _enum: "ordinal",
                                    _value: "targetEnum"
                                }],
                                _options: { dialogOptions: "dontDisplay" }
                            }],
                            { synchronousExecution: true }
                        );
                    }

                    await batchPlay(
                        [{
                            _obj: "select",
                            _target: [{ _ref: "layer", _id: sampleLayerId }],
                            makeVisible: true,
                            _options: { dialogOptions: "dontDisplay" }
                        }],
                        { synchronousExecution: true }
                    );
                }, {"commandName": "删除调整图层"});
            }

            deleteAdjustmentStep(index);
        } catch (error) {
            console.error('删除调整失败:', error);
            showAlert({ message: `删除调整失败: ${error.message}` });
        }
    };

    // 修改 addAdjustmentStep 的调用方式，改为在数组开头添加新记录
    const applyDirectAdjustment = async (adjustmentItem) => {
        try {
            const timestamp = new Date().getTime();
            const step = `${adjustmentItem.name} (${timestamp})`;
            
            // 移除 setTimeout，直接添加到数组开头
            addAdjustmentStep(step, adjustmentItem.name, true); // 添加 true 参数表示添加到开头
        } catch (error) {
            console.error('记录直接调整失败:', error);
            const { showAlert } = require("photoshop").core;
            showAlert({ message: `记录调整失败: ${error.message}` });
        }
    };

    // 修改开始录制的逻辑
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

            // 设置录制状态
            setIsRecording(true);
            isRecordingRef.current = true;
    
            // 添加监听器
            const adjustmentListener = await addNotificationListener(
                ['all'],
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

    // 样本图层监听器
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

    // 将 AdjustmentMenu 组件定义为独立组件
    const AdjustmentMenuWrapper = React.memo(() => {
        return (
            <AdjustmentMenuComponent
                isRecording={isRecording}
                onAdjustmentClick={applyAdjustment}
                onDirectAdjustment={applyDirectAdjustment}
            />
        );
    });

    return {
        startRecording,
        stopRecording,
        isRecording,
        adjustmentSteps,
        applyAdjustment,
        deleteAdjustmentAndLayer,
        sampleLayerId,
        setSampleLayerId,
        applyDirectAdjustment
    };
};

// 导出独立的 AdjustmentMenu 组件
export const AdjustmentMenu = () => {
    const {
        isRecording,
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
};

// 修改 RecordArea 组件
export const RecordArea = () => {
    const {
        isRecording,
        adjustmentSteps,
        deleteAdjustmentAndLayer,
    } = useRecord();

    return (
        <div className="record-panel">
            <div className="controls">
                <AdjustmentMenu />
            </div>
            
            <div className="adjustment-list">
                {adjustmentSteps.map((step, index) => (
                    <div key={index} className="adjustment-item">
                        <span className="step-number">
                            {adjustmentSteps.length - index}.
                        </span>
                        <span className="step-name">{step}</span>
                        <DeleteButton
                            isRecording={isRecording}
                            hasSteps={adjustmentSteps.length > 0}
                            onDelete={() => deleteAdjustmentAndLayer(index)}
                            index={index}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

// 导出 DeleteButton 组件
export const DeleteButtonWrapper = ({ isRecording, hasSteps, onDelete, index }) => {
    return (
        <DeleteButton
            isRecording={isRecording}
            hasSteps={hasSteps}
            onDelete={onDelete}
            index={index}
        />
    );
};
