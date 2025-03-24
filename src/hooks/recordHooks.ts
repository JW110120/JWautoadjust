import { useState, useEffect } from 'react';
import { app } from 'photoshop';
import { useAdjustmentSteps } from '../contexts/AdjustmentStepsContext';
import { useRecordContext } from '../contexts/RecordContext';
import { createSampleLayer } from '../utils/BuildSmartObjUtils';

// 样本图层管理Hook
export const useSampleLayer = () => {
    const [sampleLayerId, setSampleLayerId] = useState(null);

    const initializeSampleLayer = async () => {
        try {
            const doc = app.activeDocument;
            if (!doc) return null;

            let existingSampleLayer = doc.layers.find(layer => 
                layer.name === "样本图层" && layer.kind === "smartObject"
            );
            
            if (existingSampleLayer) {
                return existingSampleLayer.id;
            } else {
                return await createSampleLayer();
            }
        } catch (error) {
            console.error('初始化样本图层失败:', error);
            return null;
        }
    };

    return {
        sampleLayerId,
        setSampleLayerId,
        initializeSampleLayer
    };
};

// 调整图层同步Hook
export const useAdjustmentSync = () => {
    const { clearAllSteps, addAdjustmentStep } = useAdjustmentSteps();

    const syncAdjustmentLayers = async (layerId) => {
        try {
            const doc = app.activeDocument;
            if (!doc || !layerId) return;

            const { batchPlay } = require("photoshop").action;
            
            const result = await batchPlay([{
                _obj: "get",
                _target: [{ _ref: "layer", _id: layerId }],
                _options: { dialogOptions: "dontDisplay" }
            }], { synchronousExecution: true });
            
            const filterFX = result[0]?.smartObject?.filterFX || [];
            
            clearAllSteps();
            
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

    return { syncAdjustmentLayers };
};

// 事件监听Hook
export const useAdjustmentListener = (sampleLayerId) => {
    const [notificationListeners, setNotificationListeners] = useState([]);
    const { addAdjustmentStep } = useAdjustmentSteps();
    const { isRecordingRef } = useRecordContext();

    const setupListener = async () => {
        const { addNotificationListener } = require("photoshop").action;
        const { adjustmentMenuItems } = require('../Constants');
        const adjustmentCommands = adjustmentMenuItems.map(item => item.command);

        const adjustmentListener = await addNotificationListener(
            ['make', 'set', ...adjustmentCommands],
            function(event, descriptor) {
                if (!isRecordingRef.current) return;
                
                const targetLayerId = descriptor?.target?._ref?.id;
                if (targetLayerId !== sampleLayerId) return;
                
                if (event === 'make' && descriptor?._obj === 'adjustmentLayer') {
                    const adjustmentType = descriptor?.using?.type?._obj;
                    const adjustmentItem = adjustmentMenuItems.find(item => item.command === adjustmentType);
                    if (adjustmentItem) {
                        const timestamp = new Date().getTime();
                        const stepType = `${adjustmentItem.name} (${timestamp})`;
                        addAdjustmentStep(stepType, adjustmentItem.name, true);
                    }
                    return;
                }
                
                const adjustmentItem = adjustmentMenuItems.find(item => item.command === event);
                if (adjustmentItem) {
                    const timestamp = new Date().getTime();
                    const stepType = `${adjustmentItem.name} (${timestamp})`;
                    addAdjustmentStep(stepType, adjustmentItem.name, true);
                }
            }
        );

        setNotificationListeners([adjustmentListener]);
    };

    const cleanupListeners = () => {
        notificationListeners.forEach(listener => {
            if (listener?.remove) {
                listener.remove();
            }
        });
        setNotificationListeners([]);
    };

    return {
        setupListener,
        cleanupListeners
    };
};

// 调整应用Hook
export const useAdjustmentApply = (sampleLayerId, setSampleLayerId) => {
    const applyAdjustment = async (adjustmentItem) => {
        try {
            const doc = app.activeDocument;
            if (!doc) {
                throw new Error('没有活动文档');
            }

            const { executeAsModal } = require("photoshop").core;
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

    return { applyAdjustment };
};