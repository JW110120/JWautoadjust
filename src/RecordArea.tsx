import React, { useState, useEffect } from 'react';
import { app } from 'photoshop';
import { useAdjustmentSteps } from './AdjustmentStepsContext';
import { AdjustmentMenu as AdjustmentMenuComponent } from './components/AdjustmentMenu';
import { DeleteButton } from './components/DeleteButton';
import { eventToNameMap } from './constants';
import { createSampleLayer } from './utils/layerUtils';
import { useRecordContext } from './contexts/RecordContext';

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

    // 使用 RecordContext 替代本地状态
    const { isRecording, setIsRecording, isRecordingRef } = useRecordContext();
    const [notificationListeners, setNotificationListeners] = useState([]);
    const [sampleLayerId, setSampleLayerId] = useState(null);

    // 添加同步调整图层函数
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
                        // 直接清除所有智能滤镜
                        await batchPlay([{
                            _obj: "delete",
                            _target: [
                                {
                                    _ref: "filterFX"
                                },
                                {
                                    _ref: "layer",
                                    _enum: "ordinal",
                                    _value: "targetEnum"
                                }
                            ],
                            _options: {
                                dialogOptions: "dontDisplay"
                            }
                        }], {});
                    } else {
                        let filterIndex;
                        // 智能滤镜是从下往上排列的，索引0是最底部的滤镜，FilterIndex中的索引1是最上方的条目所以需要反转索引关系
                        filterIndex = filterFX.length - index;
                        
                        // 确保索引在有效范围内
                        if (filterIndex < 0) filterIndex = 0;
                        if (filterIndex >= filterFX.length) filterIndex = filterFX.length ;
                    }
                    
                    if (filterIndex >= 0 && filterIndex <= filterFX.length) {
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

                // 删除步骤记录
                deleteAdjustmentStep(index);
            }
        } catch (error) {
            console.error('删除调整失败:', error);
            showAlert({ message: `删除调整失败: ${error.message}` });
        }
    };

    const applyDirectAdjustment = async (adjustmentItem) => {
        try {
            const timestamp = new Date().getTime();
            const step = `${adjustmentItem.name} (${timestamp})`;
            
            // 在非录制状态下，不传入 addToStart 参数，让 Context 中的逻辑处理插入位置
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

    // 添加新的同步函数
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

    // 添加文档监听器
    useEffect(() => {
        let currentDocId = app.activeDocument?.id;
        
        const checkDocument = setInterval(() => {
            const newDocId = app.activeDocument?.id;
            
            // 如果文档ID发生变化，说明切换了文档
            if (newDocId && newDocId !== currentDocId) {
                currentDocId = newDocId;
                
                // 尝试在新文档中查找样本图层
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

    // 组件挂载时同步
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

    // 修改现有的同步监听器，增加错误处理
    useEffect(() => {
        if (!isRecording && sampleLayerId) {
            const syncInterval = setInterval(async () => {
                try {
                    await syncWithSampleLayer();
                } catch (error) {
                    console.error('同步失败:', error);
                    // 如果同步失败，可能是图层已被删除
                    if (error.message?.includes('not found')) {
                        clearAllSteps();
                        setSampleLayerId(null);
                    }
                }
            }, 500);
            return () => clearInterval(syncInterval);
        }
    }, [isRecording, sampleLayerId]);

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

    return {
        startRecording,
        stopRecording,
        isRecording,
        adjustmentSteps,
        applyAdjustment,
        deleteAdjustmentAndLayer,
        sampleLayerId,
        setSampleLayerId,
        applyDirectAdjustment,   // 添加逗号
        selectedIndex,     
        setSelectedIndex   
    };
};

// 修改 AdjustmentMenu 组件，使用 useRecordContext
export const AdjustmentMenu = React.memo(() => {
    // 直接使用 useRecordContext 而不是从 props 接收 isRecording
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

export const RecordArea = () => {
    const {
        isRecording,
        adjustmentSteps,
        deleteAdjustmentAndLayer,
        selectedIndex,     // 添加这行
        setSelectedIndex   // 添加这行
    } = useRecord();

    const listRef = useRef(null);
    const [scrollPosition, setScrollPosition] = useState(0);

    // 保存滚动位置
    const handleScroll = useCallback(() => {
        if (listRef.current) {
            setScrollPosition(listRef.current.scrollTop);
        }
    }, []);

    // 恢复滚动位置
    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = scrollPosition;
        }
    }, [adjustmentSteps, scrollPosition]);

    // 添加滚动事件监听
    useEffect(() => {
        const listElement = listRef.current;
        if (listElement) {
            listElement.addEventListener('scroll', handleScroll);
            return () => {
                listElement.removeEventListener('scroll', handleScroll);
            };
        }
    }, [handleScroll]);

    return (
        <div className="section">
            <div className="section-header">
                <h2 className="section-header-title">
                    当前文件: {app.activeDocument?.name || '无文档'} | 
                    {app.activeDocument?.layers?.length || 0} 个图层
                </h2>
            </div>
            <div className="scrollable-area" ref={listRef}>
                {adjustmentSteps.map((step, index) => (
                    <div
                        key={index}
                        className={`list-item ${selectedIndex === index ? 'selected' : ''}`}
                        onClick={() => setSelectedIndex(index)}
                    >
                        <span className="step-number">{index + 1}.</span>
                        <span className="step-content">{step}</span>
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
