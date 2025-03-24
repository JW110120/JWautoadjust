import React, { createContext, useContext } from 'react';
import { app } from 'photoshop';
import { useAdjustmentSteps } from './AdjustmentStepsContext';
import { findSampleLayer, createSampleLayer } from '../utils/BuildSmartObjUtils';

interface AdjustmentContextType {
    handleAdjustmentClick: (item: any) => Promise<void>;
    handleDirectAdjustment: (item: any) => Promise<void>;
}

const AdjustmentContext = createContext<AdjustmentContextType | null>(null);

export const useAdjustment = () => {
    const context = useContext(AdjustmentContext);
    if (!context) {
        throw new Error('useAdjustment must be used within an AdjustmentProvider');
    }
    return context;
};

export const AdjustmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { addAdjustmentStep } = useAdjustmentSteps();

    const handleAdjustmentClick = async (item: any) => {
        try {
            const { executeAsModal, showAlert } = require("photoshop").core;
            const { batchPlay } = require("photoshop").action;

            const sampleLayer = await findSampleLayer();
            let targetLayer = sampleLayer;

            if (!targetLayer) {
                const smartObjId = await createSampleLayer();
                targetLayer = app.activeDocument.layers.find(layer => layer.id === smartObjId);
            }

            if (targetLayer) {
                await executeAsModal(async () => {
                    await batchPlay(
                        [{
                            _obj: "select",
                            _target: [{ _ref: "layer", _id: targetLayer.id }],
                            makeVisible: true,
                            _options: { dialogOptions: "dontDisplay" }
                        }],
                        { synchronousExecution: true }
                    );

                    const beforeFilters = await batchPlay([{
                        _obj: "get",
                        _target: [{ _ref: "layer", _id: targetLayer.id }],
                        _options: { dialogOptions: "dontDisplay" }
                    }], { synchronousExecution: true });
                    
                    const beforeFilterCount = beforeFilters[0]?.smartObject?.filterFX?.length || 0;

                    await batchPlay(
                        [{
                            _obj: item.command,
                            _options: { dialogOptions: "display" }
                        }],
                        { synchronousExecution: true }
                    );

                    const afterFilters = await batchPlay([{
                        _obj: "get",
                        _target: [{ _ref: "layer", _id: targetLayer.id }],
                        _options: { dialogOptions: "dontDisplay" }
                    }], { synchronousExecution: true });
                    
                    const afterFilterCount = afterFilters[0]?.smartObject?.filterFX?.length || 0;

                    if (afterFilterCount > beforeFilterCount) {
                        await handleDirectAdjustment(item);
                    }
                }, { "commandName": `直接应用${item.name}调整` });
            }
        } catch (error) {
            console.error('处理调整图层失败:', error);
            const { showAlert } = require("photoshop").core;
            showAlert({ message: `添加调整失败: ${error.message}` });
        }
    };

    const handleDirectAdjustment = async (adjustmentItem: any) => {
        try {
            const timestamp = new Date().getTime();
            const step = `${adjustmentItem.name} (${timestamp})`;
            addAdjustmentStep(step, adjustmentItem.name);
        } catch (error) {
            console.error('记录直接调整失败:', error);
            const { showAlert } = require("photoshop").core;
            showAlert({ message: `记录调整失败: ${error.message}` });
        }
    };

    const value = {
        handleAdjustmentClick,
        handleDirectAdjustment
    };

    return (
        <AdjustmentContext.Provider value={value}>
            {children}
        </AdjustmentContext.Provider>
    );
};