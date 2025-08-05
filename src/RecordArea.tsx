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
    
    // 多选状态管理
    const [selectedIndices, setSelectedIndices] = useState(new Set());
    const [lastClickedIndex, setLastClickedIndex] = useState(null);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null); 
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

    // 处理项目选择（支持多选）
    const handleItemSelect = (index, event) => {
        if (event && (event.ctrlKey || event.metaKey)) {
            // Ctrl+点击：切换选中状态
            if (selectedIndex === index && selectedIndices.size === 0) {
                setSelectedIndex(null);
                setLastClickedIndex(null);
                return;
            }
            
            const newSelectedIndices = new Set(selectedIndices);
            
            // 如果当前是单选状态，先将单选项加入多选集合
            if (selectedIndex !== null && selectedIndices.size === 0) {
                newSelectedIndices.add(selectedIndex);
            }
            
            if (newSelectedIndices.has(index)) {
                newSelectedIndices.delete(index);
            } else {
                newSelectedIndices.add(index);
            }
            
            setSelectedIndices(newSelectedIndices);
            setLastClickedIndex(index);
            
            // 如果多选集合为空，清空所有选中状态
            if (newSelectedIndices.size === 0) {
                setSelectedIndex(null);
            } else if (newSelectedIndices.size === 1) {
                // 如果只剩一个，转为单选状态
                const remainingIndex = Array.from(newSelectedIndices)[0];
                setSelectedIndex(remainingIndex);
                setSelectedIndices(new Set());
            } else {
                // 多选时清空单选状态
                setSelectedIndex(null);
            }
        } else if (event && event.shiftKey && lastClickedIndex !== null) {
            // Shift+点击：范围选择
            const newSelectedIndices = new Set(selectedIndices);
            
            // 如果当前是单选状态，先将单选项加入多选集合
            if (selectedIndex !== null && selectedIndices.size === 0) {
                newSelectedIndices.add(selectedIndex);
            }
            
            const start = Math.min(lastClickedIndex, index);
            const end = Math.max(lastClickedIndex, index);
            for (let i = start; i <= end; i++) {
                newSelectedIndices.add(i);
            }
            
            setSelectedIndices(newSelectedIndices);
            setSelectedIndex(null); // 多选时清空单选状态
        } else {
            // 普通点击：根据当前状态决定行为
            if (selectedIndices.size > 0) {
                // 如果当前是多选状态，点击任何项目都转为单选该项目
                setSelectedIndex(index);
                setSelectedIndices(new Set());
                setLastClickedIndex(index);
            } else {
                // 单选状态的普通点击
                setSelectedIndex(index);
                setSelectedIndices(new Set());
                setLastClickedIndex(index);
            }
        }
    };

    // 处理空白区域点击，取消选择
    const handleBlankAreaClick = () => {
        setSelectedIndex(null);
        setSelectedIndices(new Set());
        setLastClickedIndex(null);
    };

    // 拖拽开始
    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);
    };

    // 拖拽经过
    const handleDragOver = (e, index) => {
        e.preventDefault();
        setDragOverIndex(index);
    };

    // 拖拽离开
    const handleDragLeave = () => {
        setDragOverIndex(null);
    };

    // 拖拽放下
    const handleDrop = async (e, dropIndex) => {
        e.preventDefault();
        
        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }

        try {
            const { executeAsModal, showAlert } = require("photoshop").core;
            const { batchPlay } = require("photoshop").action;
            
            // 如果有样本图层，同步移动智能滤镜
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
                    
                    if (filterFX.length > 0) {
                        // 计算智能滤镜的索引（从底部开始计数）
                        const sourceFilterIndex = filterFX.length - 1 - draggedIndex;
                        // 当拖拽到最顶部时，targetFilterIndex应该是filterFX.length
                        const targetFilterIndex = dropIndex === 0 ? filterFX.length : filterFX.length - 1 - dropIndex;
                        
                        // 移动智能滤镜
                        await batchPlay([{
                            _obj: "move",
                            _target: [
                                {
                                    _ref: "filterFX",
                                    _index: sourceFilterIndex
                                },
                                {
                                    _ref: "layer",
                                    _enum: "ordinal",
                                    _value: "targetEnum"
                                }
                            ],
                            to: {
                                _ref: [
                                    {
                                        _ref: "filterFX",
                                        _index: targetFilterIndex
                                    },
                                    {
                                        _ref: "layer",
                                        _enum: "ordinal",
                                        _value: "targetEnum"
                                    }
                                ]
                            },
                            _isCommand: false
                        }], { synchronousExecution: true });
                    }
                }, { "commandName": "移动智能滤镜" });
            }

            // 移动调整步骤
            const newSteps = [...adjustmentSteps];
            
            // 处理多选拖拽
            if (selectedIndices.size > 0) {
                // 获取所有选中的项目
                const selectedItems = Array.from(selectedIndices).sort((a, b) => a - b).map(index => ({
                    index,
                    step: newSteps[index]
                }));
                
                // 从后往前删除选中的项目
                for (let i = selectedItems.length - 1; i >= 0; i--) {
                    newSteps.splice(selectedItems[i].index, 1);
                }
                
                // 计算插入位置
                let insertIndex = dropIndex;
                // 调整插入位置（考虑已删除的项目）
                for (const item of selectedItems) {
                    if (item.index < dropIndex) {
                        insertIndex--;
                    }
                }
                
                // 插入所有选中的项目
                for (let i = 0; i < selectedItems.length; i++) {
                    newSteps.splice(insertIndex + i, 0, selectedItems[i].step);
                }
                
                // 更新状态
                clearAllSteps();
                newSteps.forEach((step, index) => {
                    addAdjustmentStep(step, step.split(' (')[0], true);
                });
                
                // 更新多选状态到新位置
                const newSelectedIndices = new Set();
                for (let i = 0; i < selectedItems.length; i++) {
                    newSelectedIndices.add(insertIndex + i);
                }
                setSelectedIndices(newSelectedIndices);
                setSelectedIndex(null);
            } else {
                // 单选拖拽
                const draggedStep = newSteps[draggedIndex];
                
                // 删除原位置的项目
                newSteps.splice(draggedIndex, 1);
                
                // 计算正确的插入位置
                // 由于显示顺序是倒序的，拖拽逻辑需要特殊处理
                let insertIndex;
                if (draggedIndex < dropIndex) {
                    // 从上往下拖（从小索引到大索引，在显示上是从大编号到小编号）
                    // 删除后数组长度减1，所以插入位置是dropIndex - 1
                    insertIndex = dropIndex - 1;
                } else {
                    // 从下往上拖（从大索引到小索引，在显示上是从小编号到大编号）
                    // 插入位置就是dropIndex
                    insertIndex = dropIndex;
                }
                
                newSteps.splice(insertIndex, 0, draggedStep);
                
                // 更新状态
                clearAllSteps();
                newSteps.forEach((step, index) => {
                    addAdjustmentStep(step, step.split(' (')[0], true);
                });
                
                // 更新选中状态到新位置
                if (selectedIndex === draggedIndex) {
                    setSelectedIndex(insertIndex);
                }
            }
            
        } catch (error) {
            console.error('拖拽移动失败:', error);
            const { showAlert } = require("photoshop").core;
            showAlert({ message: `拖拽移动失败: ${error.message}` });
        } finally {
            setDraggedIndex(null);
            setDragOverIndex(null);
        }
    };

    // 删除选中的项目
    const deleteSelectedItems = async () => {
        if (isRecording || !app.activeDocument) return;

        const { executeAsModal, showAlert } = require("photoshop").core;
        const { batchPlay } = require("photoshop").action;

        try {
            if (sampleLayerId) {
                // 获取要删除的索引列表
                let indicesToDelete = [];
                if (selectedIndices.size > 0) {
                    indicesToDelete = Array.from(selectedIndices).sort((a, b) => b - a); // 从后往前删除
                } else if (selectedIndex !== null) {
                    indicesToDelete = [selectedIndex];
                }

                if (indicesToDelete.length === 0) return;

                // 暂时禁用同步
                const currentSyncInterval = syncInterval.current;
                if (currentSyncInterval) {
                    clearInterval(currentSyncInterval);
                }

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
                    
                    // 删除选中的滤镜（从后往前删除）
                    for (const index of indicesToDelete) {
                        if (adjustmentSteps.length === 1) {
                            // 删除所有滤镜
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
                        } else {
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
                            }
                        }
                        
                        // 更新步骤记录
                        deleteAdjustmentStep(index);
                    }
                }, { "commandName": "删除智能滤镜" });

                // 清空选中状态
                setSelectedIndex(null);
                setSelectedIndices(new Set());
                setLastClickedIndex(null);

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

    // 单个项目删除（保持向后兼容）
    const deleteAdjustmentAndLayer = async (index) => {
        setSelectedIndex(index);
        setSelectedIndices(new Set());
        await deleteSelectedItems();
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
        setSelectedIndex,
        // 新增的多选和拖拽功能
        selectedIndices,
        handleItemSelect,
        handleBlankAreaClick,
        handleDragStart,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        deleteSelectedItems,
        draggedIndex,
        dragOverIndex
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