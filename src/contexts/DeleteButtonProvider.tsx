import React, { createContext, useContext } from 'react';
import { app } from 'photoshop';

interface DeleteButtonContextType {
    handleDelete: (index: number) => Promise<void>;
}

const DeleteButtonContext = createContext<DeleteButtonContextType | null>(null);

export const useDeleteButton = () => {
    const context = useContext(DeleteButtonContext);
    if (!context) {
        throw new Error('useDeleteButton must be used within a DeleteButtonProvider');
    }
    return context;
};

export const DeleteButtonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const handleDelete = async (index: number) => {
        if (!app.activeDocument) return;

        const { executeAsModal, showAlert } = require("photoshop").core;
        const { batchPlay } = require("photoshop").action;

        try {
            const doc = app.activeDocument;
            const sampleLayer = doc.layers.find(layer => 
                layer.name === "样本图层" && 
                layer.kind === "smartObject"
            );

            if (sampleLayer) {
                await executeAsModal(async () => {
                    await batchPlay([{
                        _obj: "select",
                        _target: [{ _ref: "layer", _id: sampleLayer.id }],
                        makeVisible: true,
                        _options: { dialogOptions: "dontDisplay" }
                    }], { synchronousExecution: true });

                    const result = await batchPlay([{
                        _obj: "get",
                        _target: [{ _ref: "layer", _id: sampleLayer.id }],
                        _options: { dialogOptions: "dontDisplay" }
                    }], { synchronousExecution: true });

                    const filterFX = result[0]?.smartObject?.filterFX || [];
                    
                    let filterIndex = filterFX.length - index - 1;
                    
                    if (filterIndex < 0) filterIndex = 0;
                    if (filterIndex >= filterFX.length) filterIndex = filterFX.length - 1;
                    
                    if (filterIndex >= 0 && filterIndex < filterFX.length) {
                        try {
                            await batchPlay([{
                                _obj: "delete",
                                _target: [{
                                    _ref: "filterFX",
                                    _index: filterIndex
                                }],
                                _options: { dialogOptions: "dontDisplay" }
                            }], { synchronousExecution: true });
                        } catch (error) {
                            await batchPlay([{
                                _obj: "set",
                                _target: [{
                                    _ref: "filterFX",
                                    _index: filterIndex
                                }],
                                enabled: false,
                                _options: { dialogOptions: "dontDisplay" }
                            }], { synchronousExecution: true });

                            await batchPlay([{
                                _obj: "delete",
                                _target: [{
                                    _ref: "filterFX",
                                    _index: filterIndex
                                }],
                                _options: { dialogOptions: "dontDisplay" }
                            }], { synchronousExecution: true });
                        }
                    }
                }, { "commandName": "删除智能滤镜" });
            }
        } catch (error) {
            console.error('删除调整失败:', error);
            showAlert({ message: `删除调整失败: ${error.message}` });
        }
    };

    const value = {
        handleDelete
    };

    return (
        <DeleteButtonContext.Provider value={value}>
            {children}
        </DeleteButtonContext.Provider>
    );
};