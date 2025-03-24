import React, { createContext, useContext, useEffect } from 'react';
import { app } from 'photoshop';
import { useAdjustmentSteps } from './AdjustmentStepsContext';
import { useSampleLayer, useAdjustmentSync, useAdjustmentListener, useAdjustmentApply } from '../hooks/recordHooks';
import { RecordProvider as RecordContextProvider, useRecordContext } from './RecordContext'; // 确保导入 RecordContextProvider

interface RecordContextType {
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<void>;
    isRecording: boolean;
    adjustmentSteps: string[];
    applyAdjustment: (item: any) => Promise<void>;
    deleteAdjustmentAndLayer: (index: number) => Promise<void>;
    sampleLayerId: number | null;
    setSampleLayerId: (id: number | null) => void;
    applyDirectAdjustment: (item: any) => Promise<void>;
    selectedIndex: number;
    setSelectedIndex: (index: number) => void;
}

const RecordProviderContext = createContext<RecordContextType | null>(null);

export const useRecordProvider = () => {
    const context = useContext(RecordProviderContext);
    if (!context) {
        throw new Error('useRecordProvider must be used within a RecordProvider');
    }
    return context;
};

export const RecordProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <RecordContextProvider> {/* 使用 RecordContextProvider 包裹内容 */}
            <RecordProviderContent>{children}</RecordProviderContent>
        </RecordContextProvider>
    );
};

const RecordProviderContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { 
        adjustmentSteps, 
        addAdjustmentStep, 
        deleteAdjustmentStep, 
        clearAllSteps,
        selectedIndex,
        setSelectedIndex
    } = useAdjustmentSteps(); 

    const { isRecording, setIsRecording, isRecordingRef } = useRecordContext();
    const { sampleLayerId, setSampleLayerId, initializeSampleLayer } = useSampleLayer();
    const { syncAdjustmentLayers } = useAdjustmentSync();
    const { setupListener, cleanupListeners } = useAdjustmentListener(sampleLayerId);
    const { applyAdjustment } = useAdjustmentApply(sampleLayerId, setSampleLayerId);

    const startRecording = async () => {
        const doc = app.activeDocument;
        if (!doc) return;
        
        const { showAlert } = require("photoshop").core;
    
        try {
            const layerId = await initializeSampleLayer();
            if (!layerId) {
                showAlert({ message: "创建样本图层失败" });
                return;
            }
            setSampleLayerId(layerId);
            await syncAdjustmentLayers(layerId);

            setIsRecording(true);
            isRecordingRef.current = true;
            await setupListener();

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
            cleanupListeners();
        } catch (error) {
            console.error('停止录制失败:', error);
        }
    };

    const deleteAdjustmentAndLayer = async (index: number) => {
        if (isRecording || !app.activeDocument) return;

        const { executeAsModal, showAlert } = require("photoshop").core;
        const { batchPlay } = require("photoshop").action;

        try {
            if (sampleLayerId) {
                await executeAsModal(async () => {
                    await batchPlay([{
                        _obj: "select",
                        _target: [{ _ref: "layer", _id: sampleLayerId }],
                        makeVisible: true,
                        _options: { dialogOptions: "dontDisplay" }
                    }], { synchronousExecution: true });

                    const result = await batchPlay([{
                        _obj: "get",
                        _target: [{ _ref: "layer", _id: sampleLayerId }],
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

                deleteAdjustmentStep(index);
            }
        } catch (error) {
            console.error('删除调整失败:', error);
            showAlert({ message: `删除调整失败: ${error.message}` });
        }
    };

    const applyDirectAdjustment = async (adjustmentItem: any) => {
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

    useEffect(() => {
        let currentDocId = app.activeDocument?.id;
        
        const checkDocument = setInterval(() => {
            const newDocId = app.activeDocument?.id;
            
            if (newDocId && newDocId !== currentDocId) {
                currentDocId = newDocId;
                
                const doc = app.activeDocument;
                const sampleLayer = doc.layers.find(layer => 
                    layer.name === "样本图层" && 
                    layer.kind === "smartObject"
                );
                
                if (sampleLayer) {
                    setSampleLayerId(sampleLayer.id);
                    syncAdjustmentLayers(sampleLayer.id);
                } else {
                    clearAllSteps();
                    setSampleLayerId(null);
                }
            }
        }, 500);

        return () => clearInterval(checkDocument);
    }, []);

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
    }, []);

    useEffect(() => {
        if (!isRecording && sampleLayerId) {
            const syncInterval = setInterval(async () => {
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
                        clearAllSteps();
                        setSampleLayerId(null);
                    }
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

    const value = {
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

    return (
        <RecordProviderContext.Provider value={value}>
            {children}
        </RecordProviderContext.Provider>
    );
};