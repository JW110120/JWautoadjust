import React, { useState, useEffect } from 'react';
import { app } from 'photoshop';
import { useAdjustmentSteps } from './AdjustmentStepsContext';
import { AdjustmentMenu } from './components/AdjustmentMenu';
import { DeleteButton } from './components/DeleteButton';
import { eventToNameMap } from './constants';
import { createSampleLayer } from './utils/layerUtils';

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
        console.log('useRecord中的adjustmentSteps更新:', adjustmentSteps);
    }, [adjustmentSteps]);

    const syncAdjustmentLayers = async (layerId = null) => {
        try {
            const doc = app.activeDocument;
            const targetLayerId = layerId || sampleLayerId;
            
            if (!doc || !targetLayerId) {
                return;
            }

            clearAllSteps();
            const allLayers = doc.layers;
            
            const sampleLayer = allLayers.find(layer => layer.id === targetLayerId);
            if (!sampleLayer) {
                return;
            }
            
            const adjustmentLayers = [];
            
            for (let i = 0; i < allLayers.length; i++) {
                const layer = allLayers[i];
                if (layer.id === targetLayerId) {
                    break;
                }
                if (layer.kind === 'adjustmentLayer' || layer.adjustmentType) {
                    adjustmentLayers.push(layer);
                }
            }
            
            adjustmentLayers.reverse();
            
            for (const layer of adjustmentLayers) {
                let adjustmentType = '';
                
                for (const [command, name] of Object.entries(eventToNameMap)) {
                    if (layer.name.includes(name)) {
                        adjustmentType = name;
                        break;
                    }
                }
                
                if (!adjustmentType && layer.adjustmentType) {
                    adjustmentType = eventToNameMap[layer.adjustmentType] || layer.adjustmentType;
                }
                
                if (!adjustmentType) {
                    adjustmentType = layer.name;
                }
                
                const timestamp = new Date().getTime() - (adjustmentLayers.length - adjustmentLayers.indexOf(layer)) * 1000;
                const step = `${adjustmentType} (${timestamp})`;
                
                addAdjustmentStep(step, adjustmentType);
            }
            
        } catch (error) {
            console.error('同步调整图层失败:', error);
        }
    };

    const startRecording = async () => {
        const doc = app.activeDocument;
        if (!doc) {
            return;
        }
        
        const { executeAsModal, showAlert } = require("photoshop").core;
        const { batchPlay, addNotificationListener } = require("photoshop").action;
    
        try {
            setIsRecording(true);
            isRecordingRef.current = true;
            
            let existingSampleLayer = doc.layers.find(layer => 
                layer.name === "样本图层" && layer.kind === "smartObject"
            );
            
            if (existingSampleLayer) {
                const layerId = existingSampleLayer.id;
                setSampleLayerId(layerId);
                
                await executeAsModal(async () => {
                    await batchPlay(
                        [{
                            _obj: "select",
                            _target: [{ _ref: "layer", _id: layerId }],
                            makeVisible: true,
                            _options: { dialogOptions: "dontDisplay" }
                        }],
                        { synchronousExecution: true }
                    );
                }, {"commandName": "选择已存在的样本图层"});
                
                await syncAdjustmentLayers(layerId);
                
            } else {
                clearAllSteps();
                try {
                    const smartObjId = await createSampleLayer();
                    setSampleLayerId(smartObjId);
                } catch (error) {
                    showAlert({ message: `创建样本图层失败: ${error.message}` });
                    setIsRecording(false);
                    isRecordingRef.current = false;
                    return;
                }
            }
    
            const adjustmentListener = await addNotificationListener(
                ['all'],
                function(event, descriptor) {
                    if (!isRecordingRef.current) {
                        return;
                    }
                    
                    let stepName = eventToNameMap[event] || 
                                 (descriptor?._obj && eventToNameMap[descriptor._obj]);
                    
                    if (stepName) {
                        const timestamp = new Date().getTime();
                        const stepType = `${stepName} (${timestamp})`;
                        
                        setTimeout(() => {
                            addAdjustmentStep(stepType, stepName);
                        }, 0);
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
        if (isRecording || !app.activeDocument) {
            return;
        }

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
                        if (layer.id === sampleLayerId) {
                            break;
                        }
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

    return {
        startRecording,
        stopRecording,
        isRecording,
        adjustmentSteps,
        AdjustmentMenu,
        DeleteButton,
        applyAdjustment,
        deleteAdjustmentAndLayer
    };
};
