import React, { createContext, useContext, useState, useCallback } from 'react';
import { Layer } from 'photoshop';

interface LayerProcessContextType {
    progress: number;
    processLayer: (layer: Layer) => Promise<void>;
    applyAdjustments: () => Promise<void>;
}

const LayerProcessContext = createContext<LayerProcessContextType>({
    progress: 0,
    processLayer: async () => {},
    applyAdjustments: async () => {}
});

export const useLayerProcess = () => useContext(LayerProcessContext);

export const LayerProcessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [progress, setProgress] = useState(0);

    const processLayer = useCallback(async (layer: Layer) => {
        try {
            const { executeAsModal } = require("photoshop").core;
            const { batchPlay } = require("photoshop").action;

            await executeAsModal(async () => {
                await batchPlay([{
                    _obj: "select",
                    _target: [{ _ref: "layer", _id: layer.id }],
                    makeVisible: false
                }], { synchronousExecution: true });

                await batchPlay([{
                    _obj: "newPlacedLayer"
                }], { synchronousExecution: true });

                const result = await batchPlay([{
                    _obj: "get",
                    _target: [{
                        _ref: "layer",
                        _enum: "ordinal",
                        _value: "targetEnum"
                    }],
                    _options: {
                        dialogOptions: "dontDisplay"
                    }
                }], { synchronousExecution: true });

                if (result && result[0] && result[0].layerID) {
                    const smartObjectId = result[0].layerID;
                    await batchPlay([{
                        _obj: "rasterizeLayer",
                        _target: [{
                            _ref: "layer",
                            _id: smartObjectId
                        }],
                        rasterizeLayer: "entire"
                    }], { synchronousExecution: true });
                }
            }, { commandName: "处理图层" });
        } catch (error) {
            console.error('处理图层失败:', error);
            throw error;
        }
    }, []);

    const applyAdjustments = useCallback(async () => {
        try {
            const { showAlert } = require("photoshop").core;
            showAlert({ message: '所有图层处理完成' });
        } catch (error) {
            console.error('应用调整失败:', error);
            const { showAlert } = require("photoshop").core;
            showAlert({ message: `应用调整失败: ${error.message}` });
        }
    }, []);

    return (
        <LayerProcessContext.Provider value={{
            progress,
            processLayer,
            applyAdjustments
        }}>
            {children}
        </LayerProcessContext.Provider>
    );
};