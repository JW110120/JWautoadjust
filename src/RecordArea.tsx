import React, { useState, useEffect, useRef } from 'react';
import { app } from 'photoshop';
import { useAdjustmentSteps } from './contexts/AdjustmentStepsContext';
import { createSampleLayer } from './utils/layerUtils';
import { useRecordContext } from './contexts/RecordContext';
import { useProcessing } from './contexts/ProcessingContext';

// 录制区域组件
export const useRecord = () => {
    const { 
        adjustmentSteps, 
        addAdjustmentStep, 
        deleteAdjustmentStep, 
        clearAllSteps,
        selectedIndex,
        setSelectedIndex,
        setAdjustmentSteps
    } = useAdjustmentSteps();
    
    // 多选状态管理
    const [selectedIndices, setSelectedIndices] = useState(new Set());
    const [lastClickedIndex, setLastClickedIndex] = useState(null);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null); 
    
    // PS风格拖拽状态
    const [dropTargetIndex, setDropTargetIndex] = useState(null); // 拖拽到哪个位置
    const [dropPosition, setDropPosition] = useState(null); // 'above' | 'below'
    const { isProcessing } = useProcessing();  // 获取处理状态
    const { isRecording, setIsRecording, isRecordingRef } = useRecordContext();
    const [notificationListeners, setNotificationListeners] = useState([]);
    const [sampleLayerId, setSampleLayerId] = useState(null);
    
    // 添加拖拽防抖和清理机制
    const dragTimeoutRef = useRef(null);
    const syncTimeoutRef = useRef(null);
    
    // 清理所有拖拽状态的通用函数
    const clearAllDragStates = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
        setDropTargetIndex(null);
        setDropPosition(null);
        
        // 清理拖拽计时器
        if (dragTimeoutRef.current) {
            clearTimeout(dragTimeoutRef.current);
            dragTimeoutRef.current = null;
        }
    };

    // 单次智能滤镜同步给记录面板的 - 优化版本使用批量更新
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
            
            // 构建新的步骤数组和显示名映射
            const newSteps = [];
            const newDisplayNames = {};
            
            // 从最新到最老添加滤镜记录（倒序遍历filterFX数组）
            // 这样智能滤镜索引大的（最新的）会在newSteps数组开头，显示在最上方
            for (let i = filterFX.length - 1; i >= 0; i--) {
                const filter = filterFX[i];
                const filterName = filter.name.split('...')[0].trim();
                
                // 时间戳应该反映真实的添加顺序：索引越大，时间戳越新
                const timestamp = new Date().getTime() - (filterFX.length - 1 - i) * 1000;
                const step = `${filterName} (${timestamp})`;
                
                newSteps.push(step);
                newDisplayNames[step] = filterName;
            }
            
            // 使用批量更新API，一次性更新所有状态
            setAdjustmentSteps(newSteps, newDisplayNames);
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
        // 优先处理 Shift 区间选择
        if (event && event.shiftKey) {
            const anchor = lastClickedIndex !== null ? lastClickedIndex : selectedIndex;
            if (anchor === null || anchor === undefined) {
                // 没有锚点则退化为单选
                setSelectedIndex(index);
                setSelectedIndices(new Set());
                setLastClickedIndex(index);
                return;
            }
            const start = Math.min(anchor, index);
            const end = Math.max(anchor, index);
            const range = new Set<number>();
            for (let i = start; i <= end; i++) range.add(i);
            setSelectedIndices(range);
            setSelectedIndex(null);
            // 保持锚点不变，方便继续扩展选择
            return;
        }

        // Ctrl/Meta 切换选择
        if (event && (event.ctrlKey || event.metaKey)) {
            const newSet = new Set(selectedIndices);
            
            // 若当前为单选，先将单选加入集合
            if (selectedIndex !== null && selectedIndices.size === 0) {
                newSet.add(selectedIndex);
            }
            if (newSet.has(index)) newSet.delete(index); else newSet.add(index);
            
            if (newSet.size === 0) {
                setSelectedIndex(null);
                setSelectedIndices(new Set());
            } else if (newSet.size === 1) {
                const only = Array.from(newSet)[0];
                setSelectedIndex(only);
                setSelectedIndices(new Set());
                setLastClickedIndex(only);
            } else {
                setSelectedIndices(newSet);
                setSelectedIndex(null);
                setLastClickedIndex(index);
            }
            return;
        }

        // 普通点击：单选并更新锚点
        setSelectedIndex(index);
        setSelectedIndices(new Set());
        setLastClickedIndex(index);
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

    // 拖拽悬停 - 简化逻辑以避免抖动和状态不一致
    const handleDragOver = (e, index) => {
        e.preventDefault();
        
        if (draggedIndex === null) return;
        
        // 清理之前的计时器
        if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
        
        const target = e.currentTarget;
        const rect = target.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const isUpperHalf = y < rect.height / 2;
        
        // 清理旧状态，设置新状态
        setDragOverIndex(index);
        
        // 决定显示哪个位置的拖拽线
        if (isUpperHalf) {
            // 鼠标在上半部分：显示当前项的上边线
            setDropTargetIndex(index);
            setDropPosition('above');
        } else {
            // 鼠标在下半部分：显示下一项的上边线
            // 除非是最后一项，则显示当前项的下边线
            if (index === adjustmentSteps.length - 1) {
                setDropTargetIndex(index);
                setDropPosition('below');
            } else {
                setDropTargetIndex(index + 1);
                setDropPosition('above');
            }
        }
    };

    // 拖拽离开
    const handleDragLeave = () => {
        if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
        clearAllDragStates();
    };

    // 拖拽放下
    const handleDrop = async (e, dropIndex) => {
        e.preventDefault();
        if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
        
        if (draggedIndex === null) {
            clearAllDragStates();
            return;
        }

        // 依据PS逻辑：仅有上边界高亮表示插入到该项上方；
        // 只有拖到所有项的最下方时，插入到最后。
        let actualDropIndex;
        if (dropTargetIndex === null || dropPosition === null) {
            actualDropIndex = dropIndex;
        } else {
            actualDropIndex = dropPosition === 'above' ? dropTargetIndex : dropTargetIndex + 1;
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
                        // 左侧 index 0 是顶部（最新），PS 的 filterFX 索引 1 表示最底部
                        // 先将 UI 索引转换为 PS 的 1-based 索引
                        const sourceZero = filterFX.length - 1 - draggedIndex; // 0-based，自底向上
                        const targetZero = actualDropIndex === 0 ? filterFX.length : (filterFX.length - 1 - actualDropIndex); // mixed，后续再调整

                        const sourceIndex = sourceZero + 1; // 1-based
                        // 目标位置：在PS中 move to 的含义是“插入到该索引之前”，因此当拖到UI顶部(actualDropIndex=0)时，应 to 到 index=filterFX.length（也就是最顶部之前，相当于到最上方）
                        const targetIndex = actualDropIndex === 0 ? filterFX.length : (targetZero + 1);

                        if (sourceIndex !== targetIndex) {
                            await batchPlay([
                                {
                                    _obj: "move",
                                    _target: [
                                        {
                                            _ref: "filterFX",
                                            _index: sourceIndex
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
                                                _index: targetIndex
                                            },
                                            {
                                                _ref: "layer",
                                                _enum: "ordinal",
                                                _value: "targetEnum"
                                            }
                                        ]
                                    },
                                    _isCommand: false
                                }
                            ], { synchronousExecution: true });
                        }
                    }
                }, { "commandName": "移动智能滤镜" });
            }

            // 移动调整步骤
            // 移动调整步骤
            const newSteps = [...adjustmentSteps];
            const { displayNames } = adjustmentSteps.reduce((acc, step) => {
                const displayName = step.split(' (')[0];
                acc.displayNames[step] = displayName;
                return acc;
            }, { displayNames: {} });
            
            // 处理多选拖拽
            if (selectedIndices.size > 0) {
                // 获取所有选中的项目（按原始顺序）
                const selectedItems = Array.from(selectedIndices).sort((a, b) => a - b).map(index => ({
                    index,
                    step: newSteps[index]
                }));

                // ====== UI 数据结构更新 ======
                // 1. 提取选中的记录
                const selectedSteps = selectedItems.map(item => item.step);
                
                // 2. 从原数组中移除选中的记录（从后往前删除，避免索引错乱）
                for (let i = selectedItems.length - 1; i >= 0; i--) {
                    newSteps.splice(selectedItems[i].index, 1);
                }
                
                // 3. 计算实际插入位置
                // actualDropIndex 是目标位置，需要考虑已删除的项目对索引的影响
                let actualInsertIndex = actualDropIndex;
                for (const item of selectedItems) {
                    if (item.index < actualDropIndex) {
                        actualInsertIndex--;
                    }
                }
                
                // 4. 将选中的记录作为整体插入到目标位置
                // 使用 splice 的展开语法一次性插入所有记录
                newSteps.splice(actualInsertIndex, 0, ...selectedSteps);
                
                // 5. 使用批量更新API
                setAdjustmentSteps(newSteps, displayNames);
                
                // 6. 更新选中状态：选中的记录现在位于 actualInsertIndex 开始的连续位置
                const newSelectedIndices = new Set();
                for (let i = 0; i < selectedSteps.length; i++) {
                    newSelectedIndices.add(actualInsertIndex + i);
                }
                setSelectedIndices(newSelectedIndices);
                setSelectedIndex(null); // 保持多选状态

                // ====== 多选拖拽智能滤镜同步 ======
                if (sampleLayerId) {
                    // 延迟触发完整的重建式同步，确保不干扰已完成的UI更新
                    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
                    syncTimeoutRef.current = setTimeout(async () => {
                        try {
                            await syncAdjustmentLayers(sampleLayerId);
                            console.log("多选拖拽后的智能滤镜同步完成");
                        } catch (error) {
                            console.error('多选拖拽后同步失败:', error);
                        }
                    }, 600);
                }
            } else {
                // 单选拖拽
                const draggedStep = newSteps[draggedIndex];
                
                // 删除原位置的项目
                newSteps.splice(draggedIndex, 1);
                
                // 计算正确的插入位置
                let insertIndex;
                if (draggedIndex < actualDropIndex) {
                    insertIndex = actualDropIndex - 1;
                } else {
                    insertIndex = actualDropIndex;
                }
                
                newSteps.splice(insertIndex, 0, draggedStep);
                
                // 使用批量更新API
                setAdjustmentSteps(newSteps, displayNames);
                
                // 更新选中状态到新位置（始终保持拖动项被选中）
                setSelectedIndex(insertIndex);
                setSelectedIndices(new Set());
                setLastClickedIndex(insertIndex);

                // ====== 单选拖拽智能滤镜同步 ======
                // 单选时立即同步智能滤镜移动，保持UI与PS的高度一致性
                if (sampleLayerId) {
                    setTimeout(async () => {
                        try {
                            await syncAdjustmentLayers(sampleLayerId);
                            console.log("单选拖拽后的智能滤镜同步完成");
                        } catch (error) {
                            console.error('单选拖拽后同步失败:', error);
                        }
                    }, 200);
                }
            }
            
        } catch (error) {
            console.error('拖拽移动失败:', error);
            const { showAlert } = require("photoshop").core;
            showAlert({ message: `拖拽移动失败: ${error.message}` });
        } finally {
            clearAllDragStates();
        }
    };

    // 删除选中的项目
    const deleteSelectedItems = async () => {
        if (isRecording || !app.activeDocument) return;

        // 防重入：删除进行中则直接返回
        if ((deleteSelectedItems as any)._inProgress) {
            console.warn('删除操作进行中，忽略重复请求');
            return;
        }
        (deleteSelectedItems as any)._inProgress = true;

        const { executeAsModal, showAlert } = require("photoshop").core;
        const { batchPlay } = require("photoshop").action;

        try {
            if (sampleLayerId) {
                // 获取要删除的索引列表
                let indicesToDelete = [] as number[];
                if (selectedIndices.size > 0) {
                    indicesToDelete = Array.from(selectedIndices).filter(i => i >= 0).sort((a, b) => b - a); // 从后往前删除
                } else if (selectedIndex !== null && selectedIndex >= 0) {
                    indicesToDelete = [selectedIndex];
                }

                if (indicesToDelete.length === 0) return;

                // 先立即清空本地选中状态，提升交互反馈
                setSelectedIndex(null);
                setSelectedIndices(new Set());
                setLastClickedIndex(null);

                // 暂时禁用同步
                const currentSyncInterval = syncInterval.current;
                if (currentSyncInterval) {
                    clearInterval(currentSyncInterval);
                }

                await executeAsModal(async () => {
                    // 选中样本图层
                    await batchPlay([
                        {
                            _obj: "select",
                            _target: [{ _ref: "layer", _id: sampleLayerId }],
                            makeVisible: true,
                            _options: { dialogOptions: "dontDisplay" }
                        }
                    ], { synchronousExecution: true });

                    // 删除选中的滤镜（从后往前删除）
                    for (const index of indicesToDelete) {
                        // 每次删除前都重新获取智能滤镜信息
                        const result = await batchPlay([
                            {
                                _obj: "get",
                                _target: [{ _ref: "layer", _id: sampleLayerId }],
                                _options: { dialogOptions: "dontDisplay" }
                            }
                        ], { synchronousExecution: true });

                        const filterFX = result[0]?.smartObject?.filterFX || [];

                        if (filterFX.length === 0) {
                            console.warn(`智能滤镜已被清空，跳过索引 ${index}`);
                            continue;
                        }

                        if (filterFX.length === 1) {
                            // 只剩一个滤镜时，删除所有滤镜
                            await batchPlay([
                                {
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
                                }
                            ], { synchronousExecution: true });
                        } else {
                            // 计算当前滤镜在PS中的索引
                            // 左侧index 0对应filterFX最高索引，PS的_index从1开始
                            const filterZeroBased = Math.min(filterFX.length - 1 - index, filterFX.length - 1);
                            if (filterZeroBased >= 0) {
                                const filterIndex = filterZeroBased + 1; // 转为1-based
                                console.log(`删除索引 ${index}，对应PS滤镜索引 ${filterIndex}，当前filterFX长度: ${filterFX.length}`);
                                
                                try {
                                    await batchPlay([
                                        {
                                            _obj: "delete",
                                            _target: [
                                                {
                                                    _ref: "filterFX",
                                                    _index: filterIndex
                                                }
                                            ],
                                            _options: { dialogOptions: "dontDisplay" }
                                        }
                                    ], { synchronousExecution: true });
                                } catch (deleteError) {
                                    console.warn(`删除滤镜 ${filterIndex} 失败:`, deleteError.message);
                                    // 继续处理下一个
                                }
                            } else {
                                console.warn(`跳过无效索引 ${index}，filterZeroBased: ${filterZeroBased}`);
                            }
                        }
                    }
                }, { "commandName": "删除智能滤镜" });

                // 在PS操作完成后，统一更新UI状态（从后往前删除UI记录）
                const newSteps = [...adjustmentSteps];
                const newDisplayNames = { ...adjustmentSteps.reduce((acc, step) => {
                    acc[step] = step.split(' (')[0];
                    return acc;
                }, {}) };

                // 强制降序，确保按从后到前删除
                const sortedIndicesToDelete = [...indicesToDelete].sort((a, b) => b - a);

                // 从后往前删除，确保索引不会因前面的删除而失效
                for (const index of sortedIndicesToDelete) {
                    if (index >= 0 && index < newSteps.length) {
                        // 基于原始数组长度计算显示序号
                        const originalDisplayNumber = adjustmentSteps.length - index;
                        console.log('删除记录步骤，索引:', index, '该数组索引对应的原序号:', originalDisplayNumber);
                        
                        const deletedStep = newSteps[index];
                        newSteps.splice(index, 1);
                        if (deletedStep) {
                            delete newDisplayNames[deletedStep];
                        }
                    }
                }

                // 批量更新状态
                setAdjustmentSteps(newSteps, newDisplayNames);

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
                }, 600);
            }
        } catch (error) {
            console.error('删除调整失败:', error);
            const { showAlert } = require("photoshop").core;
            showAlert({ message: `删除调整失败: ${error.message}` });
        } finally {
            (deleteSelectedItems as any)._inProgress = false;
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

    const applyDirectAdjustment = async (adjustmentItem) => {
        try {
            const timestamp = new Date().getTime();
            const step = `${adjustmentItem.name} (${timestamp})`;
            
            if (isRecording) {
                addAdjustmentStep(step, adjustmentItem.name, true);
            } else {
                // 非录制状态：根据选中位置插入新调整
                if (selectedIndex !== null && sampleLayerId) {
                    // 如果有选中项，需要将新调整插入到正确位置
                    // 并且移动智能滤镜到对应位置
                    await moveNewFilterToPosition(step, adjustmentItem.name, selectedIndex);
                } else {
                    addAdjustmentStep(step, adjustmentItem.name);
                }
            }
        } catch (error) {
            console.error('记录直接调整失败:', error);
            const { showAlert } = require("photoshop").core;
            showAlert({ message: `记录调整失败: ${error.message}` });
        }
    };

    // 新增：将新创建的智能滤镜移动到指定位置
    const moveNewFilterToPosition = async (step, displayName, targetIndex) => {
        try {
            const { executeAsModal, showAlert } = require("photoshop").core;
            const { batchPlay } = require("photoshop").action;

            if (!sampleLayerId) return;

            await executeAsModal(async () => {
                // 选中样本图层
                await batchPlay([{
                    _obj: "select",
                    _target: [{ _ref: "layer", _id: sampleLayerId }],
                    makeVisible: true,
                    _options: { dialogOptions: "dontDisplay" }
                }], { synchronousExecution: true });

                // 获取当前智能滤镜数量
                const result = await batchPlay([{
                    _obj: "get",
                    _target: [{ _ref: "layer", _id: sampleLayerId }],
                    _options: { dialogOptions: "dontDisplay" }
                }], { synchronousExecution: true });

                const filterFX = result[0]?.smartObject?.filterFX || [];
                const filterCount = filterFX.length;

                if (filterCount > 0) {
                    // 新滤镜默认在顶部（索引为filterCount），需要移动到targetIndex对应的位置
                    const sourceIndex = filterCount; // 新滤镜在最顶部
                    const targetFilterIndex = filterCount - targetIndex; // 转换为PS的索引

                    if (sourceIndex !== targetFilterIndex) {
                        // 移动智能滤镜到目标位置
                        await batchPlay([{
                            _obj: "move",
                            _target: [
                                {
                                    _ref: "filterFX",
                                    _index: sourceIndex
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
                }
            }, { "commandName": `移动新增滤镜到位置${targetIndex}` });

            // 添加调整步骤到记录（插入到指定位置）
            const newSteps = [...adjustmentSteps];
            newSteps.splice(targetIndex, 0, step);
            
            const newDisplayNames = adjustmentSteps.reduce((acc, s) => {
                acc[s] = s.split(' (')[0];
                return acc;
            }, {});
            newDisplayNames[step] = displayName;

            setAdjustmentSteps(newSteps, newDisplayNames);

        } catch (error) {
            console.error('移动新滤镜失败:', error);
            // 如果移动失败，回退到默认添加方式
            addAdjustmentStep(step, displayName);
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
        dragOverIndex,
        getItemClass: (index) => {
            const classes = ['record-item'];
            if (dropTargetIndex === index && dropPosition === 'above') {
                classes.push('drop-line-above');
            }
            if (dropTargetIndex === adjustmentSteps.length - 1 && dropPosition === 'below' && index === adjustmentSteps.length - 1) {
                classes.push('drop-line-below');
            }
            return classes.join(' ');
        },
        dropTargetIndex,
        dropPosition
    };
};