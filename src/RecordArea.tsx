import React, { useState, useEffect, useRef } from 'react';
import { app } from 'photoshop';
import { useAdjustmentSteps } from './contexts/AdjustmentStepsContext';
import { createSampleLayer, findSampleLayer } from './utils/layerUtils';
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
        setAdjustmentSteps,
        displayNames
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
    const { isRecording, setIsRecording, isRecordingRef, currentSampleTs, previousSampleTs, setCurrentSampleTs, setPreviousSampleTs } = useRecordContext();
    const [notificationListeners, setNotificationListeners] = useState([]);
    const [sampleLayerId, setSampleLayerId] = useState(null);
    
    // 添加拖拽防抖和清理机制
    const dragTimeoutRef = useRef(null);
    const syncTimeoutRef = useRef(null);
    
    // 列表容器引用与全局拖拽守护
    const containerRef = useRef<HTMLUListElement | null>(null);
    const lastHoverTsRef = useRef<number>(0);
    const hoverWatchdogRef = useRef<any>(null);
    
    // 清理所有拖拽状态的通用函数（完整清理，包含拖拽源）
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
        // 重置上一次的落点记录，避免蓝线残留
        lastDropRef.current = null;
    };

    // 仅清理悬停与高亮（不清理拖拽源），用于 onDragLeave 降低抖动
    const clearHoverStates = () => {
        setDragOverIndex(null);
        setDropTargetIndex(null);
        setDropPosition(null);
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

            // 递归判断给定 id 的图层是否仍然存在
            const existsById = (layers, id) => {
                if (!layers) return false;
                for (const lyr of layers) {
                    if (lyr.id === id) return true;
                    if (lyr.kind === 'group' && lyr.layers && lyr.layers.length) {
                        if (existsById(lyr.layers, id)) return true;
                    }
                }
                return false;
            };
            if (!existsById(doc.layers, layerId)) {
                // 录制过程中图层可能被删，静默跳过同步
                return;
            }

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
            // 录制中且常见“get 不可用/未找到”错误时静默处理，避免弹窗打断
            const msg = String(error?.message || '').toLowerCase();
            const shouldSilent = isRecordingRef?.current && (msg.includes('not available') || msg.includes('不可用') || msg.includes('not found') || msg.includes('get'));
            if (!shouldSilent) {
                const { showAlert } = require("photoshop").core;
                showAlert({ message: `同步调整图层失败: ${error.message}` });
            }
        }
    };

    const startRecording = async () => {
        const doc = app.activeDocument;
        if (!doc) return;
        
        const { executeAsModal, showAlert } = require("photoshop").core;
        const { batchPlay, addNotificationListener } = require("photoshop").action;
    
        try {
            // 新逻辑：生成当前时间戳，并优先查找已存在的带前缀的样本图层
            const newTs = formatTs()
            // 非录制状态下，优先沿用 previous -> current 的切换
            const preferTs = isRecording ? (currentSampleTs || newTs) : (previousSampleTs || currentSampleTs || newTs)
            let existingSampleLayer: any = null
            // 若上下文已有时间戳，先精确按该时间戳查找
            if (preferTs) {
                existingSampleLayer = await findSampleLayerBy({ exactTs: preferTs })
            }
            // 兜底：按前缀查找任意样本图层
            if (!existingSampleLayer) {
                existingSampleLayer = await findSampleLayerBy()
            }
            
            if (existingSampleLayer) {
                const layerId = (existingSampleLayer as any).id
                setSampleLayerId(layerId)
                
                // 提取旧时间戳并写入 previousSampleTs，再更新为新时间戳
                const oldTs = extractTsFromName((existingSampleLayer as any).name)
                setPreviousSampleTs(oldTs)
                setCurrentSampleTs(newTs)
                
                // 重命名为新时间戳
                await renameLayerById(layerId, buildSampleName(newTs))
                
                // 同步现有的智能滤镜
                await syncAdjustmentLayers(layerId)
            } else {
                // 不存在则清空步骤并创建新的样本图层（带时间戳的名称）
                clearAllSteps()
                try {
                    const smartObjId = await createSampleLayer(buildSampleName(newTs))
                    setSampleLayerId(smartObjId)
                    setPreviousSampleTs(currentSampleTs || null)
                    setCurrentSampleTs(newTs)
                } catch (error) {
                    showAlert({ message: `创建样本图层失败: ${error.message}` })
                    return
                }
            }

            setIsRecording(true)
            isRecordingRef.current = true
            
            // 监听常见会影响智能滤镜列表的事件，去除对已删除的 adjustmentMenuItems 的依赖
            const events = ['make', 'set', 'move', 'delete', 'transform']

            // 添加调整以及滤镜的监听器：在事件触发后同步智能滤镜，避免依赖 eventToNameMap
            const adjustmentListener = await addNotificationListener(
                events,
                async function(event, descriptor) {
                    if (!isRecordingRef.current) return
                    if (!sampleLayerId) return

                    // 使用轻量防抖，避免高频事件造成过度同步
                    if (syncTimeoutRef.current) {
                        clearTimeout(syncTimeoutRef.current)
                        syncTimeoutRef.current = null
                    }
                    syncTimeoutRef.current = setTimeout(async () => {
                        try {
                            await syncAdjustmentLayers(sampleLayerId)
                        } catch (err) {
                            console.error('监听同步失败:', err)
                        } finally {
                            syncTimeoutRef.current = null
                        }
                    }, 120)
                }
            )
    
            setNotificationListeners([adjustmentListener])
        } catch (error) {
            showAlert({ message: `开始录制失败: ${error?.message || '未知错误'}` })
            setIsRecording(false)
            isRecordingRef.current = false
        }
    };

    const stopRecording = async () => {
        try {
            setIsRecording(false)
            isRecordingRef.current = false
            notificationListeners.forEach(listener => {
                if (listener?.remove) {
                    listener.remove()
                }
            })
            setNotificationListeners([])
        } catch (error) {
            console.error('停止录制失败:', error)
        }
    };

    const applyAdjustment = async (adjustmentItem) => {
        try {
            const doc = app.activeDocument
            if (!doc) {
                throw new Error('没有活动文档')
            }

            const { executeAsModal, showAlert } = require('photoshop').core
            const { batchPlay } = require('photoshop').action

            if (!sampleLayerId) {
                try {
                    // 若无样本图层，使用当前时间戳或新建一个
                    const ts = currentSampleTs || formatTs()
                    if (!currentSampleTs) {
                        setPreviousSampleTs(previousSampleTs || null)
                        setCurrentSampleTs(ts)
                    }
                    const smartObjId = await createSampleLayer(buildSampleName(ts))
                    setSampleLayerId(smartObjId)
                } catch (error) {
                    throw new Error(`创建样本图层失败: ${error.message}`)
                }
            }

            await executeAsModal(async () => {
                await batchPlay(
                    [{
                        _obj: 'make',
                        _target: [{ _ref: 'adjustmentLayer' }],
                        using: {
                            _obj: 'adjustmentLayer',
                            type: {
                                _obj: adjustmentItem.command,
                                _target: { _ref: 'adjustment' }
                            }
                        },
                        _options: { dialogOptions: 'display' }
                    }],
                    {}
                )
            }, { 'commandName': `应用${adjustmentItem.name}调整` })

        } catch (error) {
            console.error('应用调整失败:', error)
            const { showAlert } = require('photoshop').core
            showAlert({ message: `应用调整失败: ${error.message}` })
        }
    };

    // 处理项目选择（支持多选）
    const handleItemSelect = (index, event) => {
        // 立即响应点击，无额外逻辑，提升响应速度
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
        // 开始拖拽时清空上一次的落点缓存，确保蓝线全程跟随最新位置
        lastDropRef.current = null;
    };

    // 拖拽悬停 - PS风格：靠近哪个上边缘，就高亮哪个
    const hoverRAF = useRef<number | null>(null);
    const hoverPending = useRef<any>(null);
    const lastDropRef = useRef<{ idx: number | null; pos: 'above' | 'below' | null } | null>(null);

    const flushHover = () => {
        const task = hoverPending.current;
        hoverPending.current = null;
        hoverRAF.current = null;
        if (!task) return;

        if (task.kind === 'li') {
            const { index, y, h, isLast } = task;
            setDragOverIndex(index);
            if (isLast) {
                const distTop = y;
                const distBottom = h - y;
                const next = distTop <= distBottom
                    ? { idx: index, pos: 'above' as const }
                    : { idx: index, pos: 'below' as const };
                const prev = lastDropRef.current;
                if (!prev || prev.idx !== next.idx || prev.pos !== next.pos) {
                    setDropTargetIndex(next.idx);
                    setDropPosition(next.pos);
                    lastDropRef.current = next;
                }
                return;
            }
            const distToCurrentTop = y;
            const distToNextTop = h - y;
            const next = distToCurrentTop <= distToNextTop
                ? { idx: index, pos: 'above' as const }
                : { idx: index + 1, pos: 'above' as const };
            const prev = lastDropRef.current;
            if (!prev || prev.idx !== next.idx || prev.pos !== next.pos) {
                setDropTargetIndex(next.idx);
                setDropPosition(next.pos);
                lastDropRef.current = next;
            }
        } else if (task.kind === 'container') {
            const { edges, y } = task;
            const n = edges.length - 1;
            let nearest = 0;
            let minDist = Math.abs(y - edges[0]);
            for (let i = 1; i <= n; i++) {
                const d = Math.abs(y - edges[i]);
                if (d < minDist) { minDist = d; nearest = i; }
            }
            const next = nearest === n
                ? { idx: n - 1, pos: 'below' as const }
                : { idx: nearest, pos: 'above' as const };
            const prev = lastDropRef.current;
            if (!prev || prev.idx !== next.idx || prev.pos !== next.pos) {
                setDropTargetIndex(next.idx);
                setDropPosition(next.pos);
                lastDropRef.current = next;
            }
        }
    };

    const scheduleHover = () => {
        // 改为立即刷新，确保毫无延迟的高亮反馈
        if (hoverRAF.current != null) {
            try { cancelAnimationFrame(hoverRAF.current as any); } catch {}
            hoverRAF.current = null;
        }
        flushHover();
    };

    // li 项目的拖拽悬停
    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (draggedIndex === null) return;

        // 进入新 li 时，取消任何待执行的清理定时器，保证高亮即时更新
        if (dragTimeoutRef.current) {
            clearTimeout(dragTimeoutRef.current);
            dragTimeoutRef.current = null;
        }

        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        const y = e.clientY - rect.top;

        hoverPending.current = { kind: 'li', index, y, h: rect.height, isLast: index === adjustmentSteps.length - 1 };
        scheduleHover();
    };

    // 容器层的拖拽悬停：用于处理顶部空白区域，将插入位置固定为最上方
    const handleContainerDragOver = (e) => {
        e.preventDefault();
        if (draggedIndex === null) return;

        if (dragTimeoutRef.current) {
            clearTimeout(dragTimeoutRef.current);
            dragTimeoutRef.current = null;
        }

        const ul = e.currentTarget as HTMLElement;
        const rect = ul.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const items = Array.from(ul.querySelectorAll('li')) as HTMLElement[];

        if (items.length === 0) {
            const next = { idx: 0, pos: 'above' as const };
            const prev = lastDropRef.current;
            if (!prev || prev.idx !== next.idx || prev.pos !== next.pos) {
                setDropTargetIndex(next.idx);
                setDropPosition(next.pos);
                lastDropRef.current = next;
            }
            return;
        }

        const n = items.length;
        const edges: number[] = new Array(n + 1);
        edges[0] = items[0].getBoundingClientRect().top - rect.top;
        for (let i = 1; i < n; i++) {
            edges[i] = items[i].getBoundingClientRect().top - rect.top;
        }
        edges[n] = items[n - 1].getBoundingClientRect().bottom - rect.top;

        hoverPending.current = { kind: 'container', edges, y };
        scheduleHover();
    };

    // 拖拽离开
    const handleDragLeave = () => {
        // 立刻清理悬停与高亮，避免延迟导致的残留高亮
        if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
        setDragOverIndex(null);
        setDropTargetIndex(null);
        setDropPosition(null);
        lastDropRef.current = null;
    };

    // 结束拖拽（来自 onDragEnd），做彻底清理
    const handleDragEnd = () => {
        if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
        clearAllDragStates();
    };

    // 全局 dragover 监听 + 看门狗，确保蓝线不再卡住且始终跟随鼠标
    useEffect(() => {
        if (draggedIndex === null) return;

        const onWindowDragOver = (e: DragEvent) => {
            lastHoverTsRef.current = Date.now();
            const ul = containerRef.current as HTMLElement | null;
            if (!ul) return;

            const rect = ul.getBoundingClientRect();
            const x = e.clientX;
            const y = e.clientY;

            // 不在容器区域内，立刻清理高亮
            if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                clearHoverStates();
                lastDropRef.current = null;
                return;
            }

            // 在容器内：根据鼠标位置计算最近的边界
            const items = Array.from(ul.querySelectorAll('li')) as HTMLElement[];
            if (items.length === 0) {
                const next = { idx: 0, pos: 'above' as const };
                const prev = lastDropRef.current;
                if (!prev || prev.idx !== next.idx || prev.pos !== next.pos) {
                    setDropTargetIndex(next.idx);
                    setDropPosition(next.pos);
                    lastDropRef.current = next;
                }
                return;
            }

            const n = items.length;
            const edges: number[] = new Array(n + 1);
            edges[0] = items[0].getBoundingClientRect().top - rect.top;
            for (let i = 1; i < n; i++) {
                edges[i] = items[i].getBoundingClientRect().top - rect.top;
            }
            edges[n] = items[n - 1].getBoundingClientRect().bottom - rect.top;

            const localY = y - rect.top;
            // 寻找最近边界
            let nearest = 0;
            let minDist = Math.abs(localY - edges[0]);
            for (let i = 1; i <= n; i++) {
                const d = Math.abs(localY - edges[i]);
                if (d < minDist) { minDist = d; nearest = i; }
            }
            const next = nearest === n
                ? { idx: n - 1, pos: 'below' as const }
                : { idx: nearest, pos: 'above' as const };
            const prev = lastDropRef.current;
            if (!prev || prev.idx !== next.idx || prev.pos !== next.pos) {
                setDropTargetIndex(next.idx);
                setDropPosition(next.pos);
                lastDropRef.current = next;
            }
        };

        const onWindowDropOrEnd = () => {
            clearAllDragStates();
        };

        window.addEventListener('dragover', onWindowDragOver as any, { passive: true } as any);
        window.addEventListener('drop', onWindowDropOrEnd as any);
        window.addEventListener('dragend', onWindowDropOrEnd as any);

        // 启动看门狗：若一段时间没有 dragover 刷新，则清理高亮，避免卡住
        if (hoverWatchdogRef.current) clearInterval(hoverWatchdogRef.current);
        hoverWatchdogRef.current = setInterval(() => {
            if (draggedIndex === null) return;
            const now = Date.now();
            if (now - lastHoverTsRef.current > 220) {
                clearHoverStates();
                lastDropRef.current = null;
            }
        }, 120);

        return () => {
            window.removeEventListener('dragover', onWindowDragOver as any);
            window.removeEventListener('drop', onWindowDropOrEnd as any);
            window.removeEventListener('dragend', onWindowDropOrEnd as any);
            if (hoverWatchdogRef.current) clearInterval(hoverWatchdogRef.current);
            hoverWatchdogRef.current = null;
        };
    }, [draggedIndex]);
            const handleDrop = async (e, index) => {
                e.preventDefault();
                e.stopPropagation();

                // 拖拽源已无效则直接清理退出
                if (draggedIndex === null) {
                    clearAllDragStates();
                    return;
                }

                // 计算实际插入索引，优先使用悬停状态，其次用事件坐标兜底，最后用传入索引兜底
                let actualDropIndex: number;
                const ul = containerRef.current as HTMLElement | null;
                if (dropTargetIndex !== null && dropPosition !== null) {
                    actualDropIndex = dropPosition === 'below' ? (dropTargetIndex + 1) : dropTargetIndex;
                } else if (ul) {
                    const rect = ul.getBoundingClientRect();
                    const items = Array.from(ul.querySelectorAll('li')) as HTMLElement[];
                    if (items.length === 0) {
                        actualDropIndex = 0;
                    } else {
                        const edges: number[] = new Array(items.length + 1);
                        edges[0] = items[0].getBoundingClientRect().top - rect.top;
                        for (let i = 1; i < items.length; i++) {
                            edges[i] = items[i].getBoundingClientRect().top - rect.top;
                        }
                        edges[items.length] = items[items.length - 1].getBoundingClientRect().bottom - rect.top;
                        const localY = e.clientY - rect.top;
                        let nearest = 0; let minDist = Math.abs(localY - edges[0]);
                        for (let i = 1; i <= items.length; i++) {
                            const d = Math.abs(localY - edges[i]);
                            if (d < minDist) { minDist = d; nearest = i; }
                        }
                        actualDropIndex = nearest; // nearest==n 表示插到最后一个之后
                    }
                } else {
                    actualDropIndex = typeof index === 'number' ? index : 0;
                }

                // 基于当前 UI 步骤进行操作，并透传现有显示名映射
                const newSteps = [...adjustmentSteps];
                const currentDisplayNames = displayNames;

                try {
            if (selectedIndices.size > 0) {
                // 获取所有选中的项目（按原始顺序）
                const selectedItems = Array.from(selectedIndices).sort((a, b) => a - b).map(index => ({
                    index,
                    step: newSteps[index]
                }));

                // 多选块边界归一化：如果落点在选中块内部，归一化到边界
                const selStart = selectedItems[0].index;
                const selEnd = selectedItems[selectedItems.length - 1].index;
                
                if (actualDropIndex > selStart && actualDropIndex <= selEnd) {
                    // 落点在选中块内部，根据dropPosition归一化
                    if (dropPosition === 'above') {
                        actualDropIndex = selStart;
                    } else {
                        actualDropIndex = selEnd + 1;
                    }
                }

                // ====== UI 数据结构更新 ======
                const selectedSteps = selectedItems.map(item => item.step);

                // 从后往前删除原位置，避免索引扰动
                for (let i = selectedItems.length - 1; i >= 0; i--) {
                    newSteps.splice(selectedItems[i].index, 1);
                }

                // 计算实际插入位置（考虑删除造成的左移）
                let actualInsertIndex = actualDropIndex;
                for (const item of selectedItems) {
                    if (item.index < actualDropIndex) actualInsertIndex--;
                }

                // 保持原相对顺序，按选中顺序整体插入
                newSteps.splice(actualInsertIndex, 0, ...selectedSteps);

                // 批量更新
                setAdjustmentSteps(newSteps, currentDisplayNames);

                // 选中状态保持为移动后的连续块
                const newSelectedIndices = new Set();
                for (let i = 0; i < selectedSteps.length; i++) newSelectedIndices.add(actualInsertIndex + i);
                setSelectedIndices(newSelectedIndices);
                setSelectedIndex(null);

                // ====== 多选拖拽：重构为"块冒泡移动"算法 ======
                // 思路：按移动方向，重复将块相邻的非选中项跨越到块的另一侧，共K次；稳定且不破坏块内顺序。
                if (sampleLayerId) {
                    try {
                        const { executeAsModal } = require("photoshop").core;
                        const { batchPlay } = require("photoshop").action;
                        await executeAsModal(async () => {
                            await batchPlay([{
                                _obj: "select",
                                _target: [{ _ref: "layer", _id: sampleLayerId }],
                                makeVisible: true,
                                _options: { dialogOptions: "dontDisplay" }
                            }], { synchronousExecution: true });

                            const result0 = await batchPlay([{
                                _obj: "get",
                                _target: [{ _ref: "layer", _id: sampleLayerId }],
                                _options: { dialogOptions: "dontDisplay" }
                            }], { synchronousExecution: true });
                            const L = (result0[0]?.smartObject?.filterFX || []).length;
                            if (L === 0) return;

                            // 当前 UI 队列从上到下 0..L-1
                            let arr: number[] = Array.from({ length: L }, (_, i) => i);

                            // 原始块范围
                            const originalSelStart = selectedItems[0].index;
                            const originalSelEnd = selectedItems[selectedItems.length - 1].index;

                            // 计算方向与步数 K（必须基于“原始坐标系”的落点 actualDropIndex，而不是删除左移后的 actualInsertIndex）
                            const moveUpK = Math.max(0, originalSelStart - actualDropIndex);
                            const moveDownK = Math.max(0, actualDropIndex - (originalSelEnd + 1));

                            // 如果不需要移动，直接返回
                            if (moveUpK === 0 && moveDownK === 0) return;

                            // 计算块在 arr 中的当前位置（初始即原始位置）
                            let startPos = originalSelStart;
                            let endPos = originalSelEnd;

                            const moveOnce = async (fromPos: number, toPos: number) => {
                                // 依据 arr 的 UI 位置换算到 PS 索引
                                const psSourceIndex = Math.min(L, Math.max(1, L - fromPos));
                                const psToBeforeIndex = Math.min(L + 1, Math.max(1, L - toPos + 1));
                                // 仅在完全相同时跳过；相邻时也需要执行移动（尤其是从上往下的一步步推进）
                                if (psSourceIndex === psToBeforeIndex) return;
                                await batchPlay([
                                    {
                                        _obj: "move",
                                        _target: [
                                            { _ref: "filterFX", _index: psSourceIndex },
                                            { _ref: "layer", _enum: "ordinal", _value: "targetEnum" }
                                        ],
                                        to: {
                                            _ref: [
                                                { _ref: "filterFX", _index: psToBeforeIndex },
                                                { _ref: "layer", _enum: "ordinal", _value: "targetEnum" }
                                            ]
                                        },
                                        _isCommand: false
                                    }
                                ], { synchronousExecution: true });
                            };

                            if (moveUpK > 0) {
                                // 向上移动：每次把 startPos-1 的元素挪到块后面（endPos 后）
                                for (let t = 0; t < moveUpK; t++) {
                                    const neighborPos = startPos - 1;
                                    // 执行一次移动：from neighborPos -> to endPos + 1（插到块后）
                                    await moveOnce(neighborPos, endPos + 1);
                                    // 更新 arr 与块位置
                                    const id = arr[neighborPos];
                                    arr.splice(neighborPos, 1);
                                    // 移除 neighbor 后，块整体向上移动一位：startPos--, endPos--
                                    startPos -= 1; endPos -= 1;
                                    arr.splice(endPos + 1, 0, id);
                                    // 插入到块后后，块位置不变
                                }
                            } else if (moveDownK > 0) {
                                // 向下移动：每次把 endPos+1 的元素挪到块前面（startPos 位置）
                                for (let t = 0; t < moveDownK; t++) {
                                    const neighborPos = endPos + 1;
                                    // 执行一次移动：from neighborPos -> to startPos（插到块前）
                                    await moveOnce(neighborPos, startPos);
                                    // 更新 arr 与块位置
                                    const id = arr[neighborPos];
                                    arr.splice(neighborPos, 1);
                                    // 移除 neighbor 后，块位置不变
                                    arr.splice(startPos, 0, id);
                                    // 插在块前后，块整体向后推一位：startPos++, endPos++
                                    startPos += 1; endPos += 1;
                                }
                            }
                        }, { "commandName": "多选移动智能滤镜(块移动)" });

                        try { await syncAdjustmentLayers(sampleLayerId); } catch {}
                    } catch (error) {
                        console.error('多选拖拽：块移动失败', error);
                        try { await syncAdjustmentLayers(sampleLayerId); } catch {}
                    }
                }
            } else {
                // ====== 单选拖拽：回退为"PS先移动，UI后同步"策略 ======
                
                // 计算正确的插入位置
                let insertIndex;
                if (draggedIndex < actualDropIndex) {
                    insertIndex = actualDropIndex - 1;
                } else {
                    insertIndex = actualDropIndex;
                }

                // 先在Photoshop中移动智能滤镜
                if (sampleLayerId && draggedIndex !== insertIndex) {
                    try {
                        const { executeAsModal } = require("photoshop").core;
                        const { batchPlay } = require("photoshop").action;
                        
                        await executeAsModal(async () => {
                            // 选择目标图层
                            await batchPlay([{
                                _obj: "select",
                                _target: [{ _ref: "layer", _id: sampleLayerId }],
                                makeVisible: true,
                                _options: { dialogOptions: "dontDisplay" }
                            }], { synchronousExecution: true });

                            // 获取当前智能滤镜数量
                            const result0 = await batchPlay([{
                                _obj: "get",
                                _target: [{ _ref: "layer", _id: sampleLayerId }],
                                _options: { dialogOptions: "dontDisplay" }
                            }], { synchronousExecution: true });
                            const L = (result0[0]?.smartObject?.filterFX || []).length;
                            
                            if (L > 0) {
                                // UI索引映射到PS索引：UI 0..L-1 对应 PS L..1
                                const psSourceIndex = L - draggedIndex;
                                const psToBeforeIndex = L - insertIndex + 1;
                                
                                // 如果实际需要移动
                                if (psSourceIndex !== psToBeforeIndex && psSourceIndex !== psToBeforeIndex - 1) {
                                    await batchPlay([{
                                        _obj: "move",
                                        _target: [
                                            { _ref: "filterFX", _index: psSourceIndex },
                                            { _ref: "layer", _enum: "ordinal", _value: "targetEnum" }
                                        ],
                                        to: {
                                            _ref: [
                                                { _ref: "filterFX", _index: psToBeforeIndex },
                                                { _ref: "layer", _enum: "ordinal", _value: "targetEnum" }
                                            ]
                                        },
                                        _isCommand: false
                                    }], { synchronousExecution: true });
                                    
                                    console.log(`单选拖拽：PS移动成功 UI ${draggedIndex}->${insertIndex}, PS ${psSourceIndex}->${psToBeforeIndex}`);
                                }
                            }
                        }, { "commandName": "单选移动智能滤镜" });

                        // PS移动成功后，同步UI状态
                        await syncAdjustmentLayers(sampleLayerId);
                        
                        // 更新选中状态到新位置
                        setSelectedIndex(insertIndex);
                        setSelectedIndices(new Set());
                        setLastClickedIndex(insertIndex);
                        
                    } catch (error) {
                        console.error('单选拖拽PS移动失败，回退到UI优先模式:', error);
                        
                        // 回退：如果PS移动失败，仍然更新UI并稍后同步
                        const draggedStep = newSteps[draggedIndex];
                        newSteps.splice(draggedIndex, 1);
                        newSteps.splice(insertIndex, 0, draggedStep);
                        setAdjustmentSteps(newSteps, currentDisplayNames);
                        setSelectedIndex(insertIndex);
                        setSelectedIndices(new Set());
                        setLastClickedIndex(insertIndex);
                        
                        // 延迟同步
                        setTimeout(async () => {
                            try {
                                await syncAdjustmentLayers(sampleLayerId);
                            } catch (syncError) {
                                console.error('单选拖拽延迟同步也失败:', syncError);
                            }
                        }, 200);
                    }
                } else {
                    // 没有sampleLayerId或不需要移动的情况，仅更新UI
                    const draggedStep = newSteps[draggedIndex];
                    newSteps.splice(draggedIndex, 1);
                    newSteps.splice(insertIndex, 0, draggedStep);
                    setAdjustmentSteps(newSteps, currentDisplayNames);
                    setSelectedIndex(insertIndex);
                    setSelectedIndices(new Set());
                    setLastClickedIndex(insertIndex);
                }
            }
            
        } catch (error) {
            console.error('拖拽移动失败:', error);
            try {
                const { showAlert } = require("photoshop").core;
                showAlert({ message: `拖拽移动失败: ${error.message}` });
            } catch {}
            
            // 发生错误时尝试同步矫正
            if (sampleLayerId) {
                try {
                    await syncAdjustmentLayers(sampleLayerId);
                } catch {}
            }
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

             const preferName = currentSampleTs ? `样本图层 ${currentSampleTs}` : null;
             const sampleLayer = doc.layers.find(layer => 
                 (preferName ? layer.name === preferName : (typeof layer.name === 'string' && layer.name.startsWith('样本图层'))) && 
                 layer.kind === 'smartObject'
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
             const preferName = currentSampleTs ? `样本图层 ${currentSampleTs}` : null;
             const sampleLayer = app.activeDocument.layers.find(layer => 
                 (preferName ? layer.name === preferName : (typeof layer.name === 'string' && layer.name.startsWith('样本图层'))) && 
                 layer.kind === 'smartObject' 
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
                 // 回退中则延迟处理
                 if ((window as any).__JW_isReverting) {
                     console.log('RecordArea检测到回退中，延迟处理history')
                     setTimeout(() => {
                         if (!isProcessing) {
                             handleDocumentChange()
                         }
                     }, 350)
                     return
                 }
                 if (!isProcessing) {  
                     // 添加防抖处理
                     const timeoutId = setTimeout(() => {
                         handleDocumentChange()
                     }, 100)
                     
                     return () => clearTimeout(timeoutId)
                 }
             }
         ),
         // 监听文档选择事件
        addNotificationListener(
            ['select'],
            (event, descriptor) => {
                // 回退中则延迟处理
                if ((window as any).__JW_isReverting) {
                    console.log('RecordArea检测到回退中，延迟处理select')
                    setTimeout(() => {
                        if (descriptor?._target?.[0]?._ref === 'document') {
                            handleDocumentChange()
                        }
                    }, 350)
                    return
                }
                if (descriptor?._target?.[0]?._ref === 'document') {
                    console.log('文档选择事件触发')
                    handleDocumentChange()
                }
            }
        ),
        // 监听文档打开和关闭事件
        addNotificationListener(
            ['open', 'close', 'newDocument'], 
            () => {
                // 回退中则延迟处理
                if ((window as any).__JW_isReverting) {
                    console.log('RecordArea检测到回退中，延迟处理open/close/newDocument')
                    setTimeout(() => { handleDocumentChange() }, 350)
                    return
                }
                console.log('文档已打开/关闭或新建')
                handleDocumentChange()
            }
        )
    ]
    
    // 新增：监听回退完成事件，确保上下文时间戳已更新后再同步
    const handleAfterRevert = () => {
        setTimeout(() => { handleDocumentChange() }, 120);
    };
    window.addEventListener('JW_AFTER_REVERT', handleAfterRevert as any);
    // 回退完成且上下文（样本图层等）同步后再次刷新
    window.addEventListener('JW_AFTER_REVERT_SYNCED', handleAfterRevert as any);
    
    // 组件卸载时清理监听器
    return () => {
        listeners.forEach(listener => {
            if (listener?.remove) {
                listener.remove()
            }
        });
        window.removeEventListener('JW_AFTER_REVERT', handleAfterRevert as any);
        window.removeEventListener('JW_AFTER_REVERT_SYNCED', handleAfterRevert as any);
    };
    }, []);

    // 组件挂载时同步样本图层状态
    useEffect(() => {
        const doc = app.activeDocument;
        if (!doc) return;

        const preferName = currentSampleTs ? `样本图层 ${currentSampleTs}` : null;
        const sampleLayer = doc.layers.find(layer => 
            (preferName ? layer.name === preferName : (typeof layer.name === 'string' && layer.name.startsWith('样本图层'))) && 
            layer.kind === 'smartObject'
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
                    typeof layer.name === 'string' && layer.name.startsWith('样本图层') && 
                    layer.kind === 'smartObject'
                );

                if (!sampleLayerExists) {
                    console.log('样本图层被删除，停止录制');
                    stopRecording();
                    clearAllSteps();
                }
            }, 500);

            return () => clearInterval(checkSampleLayer);
        }
    }, [isRecording, sampleLayerId, currentSampleTs]);

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
        dropPosition,
        // 新增导出：用于 li 的 onDragEnd 进行彻底清理
        handleDragEnd,
        // 新增导出：用于容器层处理顶部空白区域的悬停
        handleContainerDragOver,
        // 暴露给 MainContainer 作为 ul 的 ref
        containerRef
    };
};

// ... 本地辅助函数：时间戳、样本名、查找与重命名 =====
const formatTs = (d: Date = new Date()): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
};

const SAMPLE_PREFIX = '样本图层';
const buildSampleName = (ts: string): string => `${SAMPLE_PREFIX} ${ts}`;

const extractTsFromName = (name: any): string | null => {
    try {
        const n = (name ?? '').toString();
        if (!n.startsWith(SAMPLE_PREFIX)) return null;
        const rest = n.slice(SAMPLE_PREFIX.length).trim();
        return rest || null;
    } catch {
        return null;
    }
};

// 保持现有调用点不变的适配器：优先按精确时间戳匹配，否则按前缀匹配
const findSampleLayerBy = async (opts?: { exactTs?: string }) => {
    try {
        const preferName = opts?.exactTs ? buildSampleName(opts.exactTs) : undefined;
        const found = await findSampleLayer(preferName);
        if (found) {
            let name: string | undefined;
            try { name = (found as any).layer?.name; } catch { name = undefined; }
            return { id: (found as any).id, name, layer: (found as any).layer } as any;
        }
        return null;
    } catch {
        return null;
    }
};

const renameLayerById = async (layerId: number, newName: string) => {
    const { executeAsModal } = require('photoshop').core;
    const { batchPlay } = require('photoshop').action;
    await executeAsModal(async () => {
        await batchPlay([
            {
                _obj: 'set',
                _target: [{ _ref: 'layer', _id: layerId }],
                to: { _obj: 'layer', name: newName },
                _options: { dialogOptions: 'dontDisplay' },
            },
        ], { synchronousExecution: true });
    }, { commandName: '重命名图层' });
};
// ===== 辅助函数结束 =====