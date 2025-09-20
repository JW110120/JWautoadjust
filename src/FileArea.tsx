import React, { useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { useScrollPosition } from './utils/scrollUtils';
import { app, Layer} from 'photoshop';
import { AdjustmentStepsContext } from './contexts/AdjustmentStepsContext';
import { ToastQueue } from '@adobe/react-spectrum';
import { DocumentInfoContext } from './contexts/DocumentInfoContext';
import { useProcessing } from './contexts/ProcessingContext';
import { VisibilityOffIcon, VisibilityOnIcon, TransparencyLockIcon, MoveLockIcon, LockClosedIcon, LockOpenIcon, ExpandRightIcon, ExpandDownIcon, FolderClosedIcon, FolderOpenIcon, BackgroundLockIcon } from './styles/Icons';

   // 渲染文件树
   const LayerTreeComponent = React.memo(({ 
    layers, 
    collapsedGroups, 
    selectedLayerPaths, 
    toggleGroup, 
    handleLayerCheckboxChange,
    handleBlankAreaClick,
    layerStates,
    onToggleVisibility,
    onToggleTransparencyLock,
    onTogglePositionLock,
    onToggleAllLock,
    onUnlockBackground,
}) => {
    // 悬停图层追踪：用于“非悬停仅显示蓝色状态，悬停显示全部”
    const [hoveredLayerId, setHoveredLayerId] = useState<number | null>(null);

    // 渲染图层树
    const renderLayerTree = (layers: Layer[], parentPath = '', indent = 0) => {
        // 创建一个映射来跟踪同名图层
        const visibleLayerCount = {} as Record<string, number>;
        
        // 第一次遍历，统计可见的同名图层数量
        layers.forEach(layer => {
            // 检查图层是否为像素图层且有内容
            const isVisible = layer.kind === 'pixel' && 
                            layer.bounds && 
                            (layer.bounds.width > 0 && layer.bounds.height > 0);
            
            if (isVisible) {
                if (visibleLayerCount[layer.name]) {
                    visibleLayerCount[layer.name]++;
                } else {
                    visibleLayerCount[layer.name] = 1;
                }
            }
        });
        
        // 创建一个映射来跟踪每个名称已经处理的数量
        const processedCount = {} as Record<string, number>;
        
        return layers.map((layer, index) => {
            const currentPath = parentPath ? `${parentPath}/${layer.name}` : layer.name;
            const uniqueKey = `${currentPath}_${index}`;
            
            // 处理同名图层标记
            let displayName = layer.name;
            // 只有当可见的同名图层数量大于1时才添加序号
            if (visibleLayerCount[layer.name] > 1) {
                if (!processedCount[layer.name]) {
                    processedCount[layer.name] = visibleLayerCount[layer.name];
                } else {
                    processedCount[layer.name]--;
                }
                displayName = `${layer.name} (${processedCount[layer.name]})`;
            }
            
            if (layer.kind === 'group') {
                return (
                    <div key={uniqueKey} className="group-button">
                        <div 
                            className="group-header"
                            onClick={() => toggleGroup(currentPath)}
                        >
                            {/* 折叠/展开图标 */}
                            <span className={`toggle-icon ${collapsedGroups[currentPath] ? 'collapsed' : 'expanded'}`}>
                                <span className="icon">{collapsedGroups[currentPath] ? <ExpandRightIcon /> : <ExpandDownIcon />}</span>
                            </span>
                            {/* 文件夹图标 */}
                            <span className="folder-icon">
                                <span className="icon">{collapsedGroups[currentPath] ? <FolderClosedIcon /> : <FolderOpenIcon />}</span>
                            </span>
                            <span className="layer-name">{displayName}</span>
                            </div>
                            {!collapsedGroups[currentPath] && (
                            <ul>
                            {renderLayerTree(layer.layers, currentPath, indent + 20)}
                            </ul>
                            )}
                            </div>
                 );
            } else if (layer.kind === 'pixel') {
                // 检查像素图层是否为空
                const hasContent = layer.bounds && 
                                  (layer.bounds.width > 0 && layer.bounds.height > 0);
                
                // 如果是空图层，不渲染
                if (!hasContent) return null;

                const state = layerStates?.[layer._id] || {} as any;
                const isHidden = state.visible === false;
                const isLockedAny = !!(state.protectAll || state.protectPosition || state.protectTransparency);
                const hiddenOnly = isHidden && !isLockedAny;
                // 当为背景图层时，不叠加 locked/hidden/hidden-only，避免颜色规则被覆盖
                const nameClass = `layer-name ${selectedLayerPaths[`${currentPath}_${index}`] ? 'selected' : ''} ${state.isBackground ? '' : (isHidden ? 'hidden' : '')} ${state.isBackground ? '' : (isLockedAny ? 'locked' : '')} ${state.isBackground ? '' : (hiddenOnly ? 'hidden-only' : '')} ${state.isBackground ? 'background' : ''}`;
                const isHoveringThis = hoveredLayerId === layer._id;
                
                // 检查是否为背景图层（优先使用状态中的标记）
                const isBackground = !!state.isBackground;
                
                return (
                    <li  
                        key={uniqueKey}
                        className="layer-item"
                        onMouseEnter={() => setHoveredLayerId(layer._id)}
                        onMouseLeave={() => setHoveredLayerId(null)}
                    >
                        <input 
                            type="checkbox" 
                            checked={selectedLayerPaths[`${currentPath}_${index}`] === true}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleLayerCheckboxChange(layer, currentPath, index, e, true);
                            }}
                            className="layer-checkbox"
                        />
                        <span 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleLayerCheckboxChange(layer, currentPath, index, e);
                            }}
                            className={nameClass}
                        >
                            {displayName}
                        </span>
                        <div className={`layer-status-icons ${(isHidden || isLockedAny || isBackground) ? 'show' : ''}`}>
                            {isBackground ? (
                                // 背景图层：仅显示特殊的紫色锁定按钮
                                <sp-action-button
                                    className="icon-button background-lock active"
                                    quiet
                                    size="s"
                                    title="解锁背景图层"
                                    onClick={(e: any) => { e.stopPropagation(); onUnlockBackground(layer._id); }}
                                    aria-label="解锁背景图层"
                                >
                                    <div slot="icon" className="icon"><BackgroundLockIcon active /></div>
                                </sp-action-button>
                            ) : (
                                // 普通图层：四个按钮，但非悬停时仅显示激活的
                                <>
                                    {/* 隐藏/显示（固定第1位）*/}
                                    <sp-action-button
                                        className={`icon-button visibility-button ${isHidden ? 'active' : ''}`}
                                        quiet
                                        size="s"
                                        title={isHidden ? '显示图层' : '隐藏图层'}
                                        onClick={(e: any) => { e.stopPropagation(); onToggleVisibility(layer._id); }}
                                        aria-label={isHidden ? '显示图层' : '隐藏图层'}
                                        style={{ display: isHoveringThis || isHidden ? 'inline-flex' : 'none' }}
                                    >
                                        <div slot="icon" className="icon">{isHidden ? <VisibilityOffIcon active /> : <VisibilityOnIcon />}</div>
                                    </sp-action-button>
                                    {/* 不透明度锁定（固定第2位） */}
                                    <sp-action-button
                                        className={`icon-button transparency-lock ${state.protectTransparency ? 'active' : ''}`}
                                        quiet
                                        size="s"
                                        title={state.protectTransparency ? '取消不透明度锁定' : '不透明度锁定'}
                                        onClick={(e: any) => { e.stopPropagation(); onToggleTransparencyLock(layer._id); }}
                                        aria-label={state.protectTransparency ? '取消不透明度锁定' : '不透明度锁定'}
                                        style={{ display: isHoveringThis || state.protectTransparency ? 'inline-flex' : 'none' }}
                                    >
                                        <div slot="icon" className="icon"><TransparencyLockIcon active={!!state.protectTransparency} /></div>
                                    </sp-action-button>
                                    {/* 移动锁定（固定第3位） */}
                                    <sp-action-button
                                        className={`icon-button position-lock ${state.protectPosition ? 'active' : ''}`}
                                        quiet
                                        size="s"
                                        title={state.protectPosition ? '取消移动锁定' : '移动锁定'}
                                        onClick={(e: any) => { e.stopPropagation(); onTogglePositionLock(layer._id); }}
                                        aria-label={state.protectPosition ? '取消移动锁定' : '移动锁定'}
                                        style={{ display: isHoveringThis || state.protectPosition ? 'inline-flex' : 'none' }}
                                    >
                                        <div slot="icon" className="icon"><MoveLockIcon active={!!state.protectPosition} /></div>
                                    </sp-action-button>
                                    {/* 全锁定（固定第4位） */}
                                    <sp-action-button
                                        className={`icon-button lock-all ${state.protectAll ? 'active' : ''}`}
                                        quiet
                                        size="s"
                                        title={state.protectAll ? '取消全锁定' : '全锁定'}
                                        onClick={(e: any) => { e.stopPropagation(); onToggleAllLock(layer._id); }}
                                        aria-label={state.protectAll ? '取消全锁定' : '全锁定'}
                                        style={{ display: isHoveringThis || state.protectAll ? 'inline-flex' : 'none' }}
                                    >
                                        <div slot="icon" className="icon">{state.protectAll ? <LockClosedIcon active /> : <LockOpenIcon />}</div>
                                    </sp-action-button>
                                </>
                            )}
                        </div>
                    </li>
                );
            }
            return null;
        });
    };

    return (
        <div className="layer-list" onClick={handleBlankAreaClick}> 
            {layers ? (
                <ul onClick={(e) => e.stopPropagation()}> 
                    {renderLayerTree(layers)}
                </ul>
            ) : (
                <div className="no-document">
                    没有活动文档
                </div>
            )}
        </div>
    );
}); 

// 修改组件声明方式
const FileArea: React.FC = () => {
    const { adjustmentSteps } = useContext(AdjustmentStepsContext);
    const { documentInfo } = useContext(DocumentInfoContext); 
    const { isProcessing, setIsProcessing } = useProcessing();  // 获取处理状态
    const [updateTrigger, setUpdateTrigger] = useState(0);
    const [listenerEnabled, setListenerEnabled] = useState(true);
    const [pixelLayers, setPixelLayers] = useState([]);
    const [selectedLayers, setSelectedLayers] = useState([]);
    const [progress, setProgress] = useState(0);
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
    const [selectedLayerPaths, setSelectedLayerPaths] = useState<Record<string, boolean>>({});
    // 多选状态管理
    const [selectedLayerIndices, setSelectedLayerIndices] = useState(new Set());
    const [lastClickedLayerIndex, setLastClickedLayerIndex] = useState(null);
    const [selectedLayerIndex, setSelectedLayerIndex] = useState(null);
    const { ref: layerListRef } = useScrollPosition();
    const [layerStates, setLayerStates] = useState<Record<number, { visible: boolean; protectTransparency?: boolean; protectPosition?: boolean; protectAll?: boolean; isBackground?: boolean }>>({});

    // 获取所有图层的显示/锁定状态
    const fetchLayerStates = useCallback(async () => {
        try {
            const doc = app.activeDocument;
            if (!doc) return;

            const { batchPlay } = require("photoshop").action;

            const collectAllLayers = (arr: any[], acc: any[] = []): any[] => {
                arr.forEach((l) => {
                    acc.push(l);
                    if (l.layers && l.layers.length) {
                        collectAllLayers(l.layers, acc);
                    }
                });
                return acc;
            };

            const allLayers = collectAllLayers(doc.layers.slice());
            if (!allLayers || allLayers.length === 0) {
                setLayerStates({});
                return;
            }

            const requests = allLayers.map((l: any) => ({
                _obj: "get",
                _target: [{ _ref: "layer", _id: l._id }],
                _options: { dialogOptions: "dontDisplay" }
            }));

            const result = await batchPlay(requests, { synchronousExecution: true });
            const newStates: Record<number, { visible: boolean; protectTransparency?: boolean; protectPosition?: boolean; protectAll?: boolean; isBackground?: boolean }> = {};
            result.forEach((desc: any, i: number) => {
                const id = allLayers[i]._id;
                const locking = desc?.layerLocking || {};
                newStates[id] = {
                    visible: !!desc?.visible,
                    protectTransparency: !!locking?.protectTransparency,
                    protectPosition: !!locking?.protectPosition,
                    protectAll: !!locking?.protectAll,
                    isBackground: !!desc?.background,
                };
            });
            setLayerStates(newStates);
        } catch (e) {
            console.error('获取图层状态失败:', e);
        }
    }, []);

    // 在 updateTrigger 改变时刷新图层状态
    useEffect(() => {
        fetchLayerStates();
    }, [fetchLayerStates, updateTrigger]);

    // 切换图层可见性
    const onToggleVisibility = useCallback(
        async (layerId: number) => {
            try {
                const state = layerStates?.[layerId];
                const willHide = state?.visible !== false; // 当前可见则隐藏
                const { executeAsModal } = require('photoshop').core;
                const { batchPlay } = require('photoshop').action;
                await executeAsModal(
                    async () => {
                        await batchPlay(
                            [
                                {
                                    _obj: willHide ? 'hide' : 'show',
                                    null: [{ _ref: 'layer', _id: layerId }],
                                    _options: { dialogOptions: 'dontDisplay' },
                                },
                            ],
                            { synchronousExecution: true }
                        );
                    },
                    { commandName: willHide ? '隐藏图层' : '显示图层' }
                );
    
                setLayerStates((prev) => ({
                    ...prev,
                    [layerId]: {
                        ...prev[layerId],
                        visible: !willHide,
                    },
                }));
            } catch (e) {
                console.error('切换可见性失败:', e);
            }
        },
        [layerStates]
    );
    
    // 切换不透明度锁定
    const onToggleTransparencyLock = useCallback(
        async (layerId: number) => {
            try {
                const s = (layerStates?.[layerId] || {}) as any;
                const next = {
                    protectTransparency: !s.protectTransparency,
                    protectPosition: !!s.protectPosition,
                    protectAll: false, // 切换子锁时取消全锁
                };
                const { executeAsModal } = require('photoshop').core;
                const { batchPlay } = require('photoshop').action;
                await executeAsModal(
                    async () => {
                        await batchPlay(
                            [
                                {
                                    _obj: 'applyLocking',
                                    _target: [{ _ref: 'layer', _id: layerId }],
                                    layerLocking: {
                                        _obj: 'layerLocking',
                                        protectAll: next.protectAll,
                                        protectPosition: next.protectPosition,
                                        protectTransparency: next.protectTransparency,
                                    },
                                    _options: { dialogOptions: 'dontDisplay' },
                                },
                            ],
                            { synchronousExecution: true }
                        );
                    },
                    { commandName: '切换不透明度锁定' }
                );
    
                setLayerStates((prev) => ({
                    ...prev,
                    [layerId]: {
                        ...prev[layerId],
                        protectTransparency: next.protectTransparency,
                        protectPosition: next.protectPosition,
                        protectAll: next.protectAll,
                    },
                }));
            } catch (e) {
                console.error('切换不透明度锁定失败:', e);
            }
        },
        [layerStates]
    );
    
    // 切换位置锁定
    const onTogglePositionLock = useCallback(
        async (layerId: number) => {
            try {
                const s = (layerStates?.[layerId] || {}) as any;
                const next = {
                    protectTransparency: !!s.protectTransparency,
                    protectPosition: !s.protectPosition,
                    protectAll: false, // 切换子锁时取消全锁
                };
                const { executeAsModal } = require('photoshop').core;
                const { batchPlay } = require('photoshop').action;
                await executeAsModal(
                    async () => {
                        await batchPlay(
                            [
                                {
                                    _obj: 'applyLocking',
                                    _target: [{ _ref: 'layer', _id: layerId }],
                                    layerLocking: {
                                        _obj: 'layerLocking',
                                        protectAll: next.protectAll,
                                        protectPosition: next.protectPosition,
                                        protectTransparency: next.protectTransparency,
                                    },
                                    _options: { dialogOptions: 'dontDisplay' },
                                },
                            ],
                            { synchronousExecution: true }
                        );
                    },
                    { commandName: '切换位置锁定' }
                );
    
                setLayerStates((prev) => ({
                    ...prev,
                    [layerId]: {
                        ...prev[layerId],
                        protectTransparency: next.protectTransparency,
                        protectPosition: next.protectPosition,
                        protectAll: next.protectAll,
                    },
                }));
            } catch (e) {
                console.error('切换位置锁定失败:', e);
            }
        },
        [layerStates]
    );
    
    // 切换全锁定
    const onToggleAllLock = useCallback(
        async (layerId: number) => {
            try {
                const s = (layerStates?.[layerId] || {}) as any;
                // 仅切换 protectAll，其它两个锁保持原状，互不影响
                const next = {
                    protectAll: !s.protectAll,
                    protectTransparency: !!s.protectTransparency,
                    protectPosition: !!s.protectPosition,
                };
                const { executeAsModal } = require('photoshop').core;
                const { batchPlay } = require('photoshop').action;
                await executeAsModal(
                    async () => {
                        await batchPlay(
                            [
                                {
                                    _obj: 'applyLocking',
                                    _target: [{ _ref: 'layer', _id: layerId }],
                                    layerLocking: {
                                        _obj: 'layerLocking',
                                        protectAll: next.protectAll,
                                        protectPosition: next.protectPosition,
                                        protectTransparency: next.protectTransparency,
                                    },
                                    _options: { dialogOptions: 'dontDisplay' },
                                },
                            ],
                            { synchronousExecution: true }
                        );
                    },
                    { commandName: '切换全锁定' }
                );

                setLayerStates((prev) => ({
                    ...prev,
                    [layerId]: {
                        ...prev[layerId],
                        protectAll: next.protectAll,
                        protectTransparency: next.protectTransparency,
                        protectPosition: next.protectPosition,
                    },
                }));
            } catch (e) {
                console.error('切换全锁定失败:', e);
            }
        },
        [layerStates]
    );

    // 解锁背景图层（将背景转换为普通图层，使用用户提供的描述）
    const onUnlockBackground = useCallback(async (layerId: number) => {
        try {
            const { executeAsModal } = require('photoshop').core;
            const { batchPlay } = require('photoshop').action;
            await executeAsModal(
                async () => {
                    await batchPlay([
                        {
                            _obj: 'select',
                            _target: [{ _ref: 'layer', _id: layerId }],
                            makeVisible: true,
                            _options: { dialogOptions: 'dontDisplay' }
                        },
                        {
                            _obj: 'set',
                            _target: [
                                {
                                    _ref: 'layer',
                                    _property: 'background'
                                }
                            ],
                            to: {
                                _obj: 'layer',
                                opacity: { _unit: 'percentUnit', _value: 100 },
                                mode: { _enum: 'blendMode', _value: 'normal' }
                            },
                            _isCommand: false
                        }
                    ], { synchronousExecution: true });
                },
                { commandName: '解锁背景图层' }
            );

            // 本地状态更新：该图层不再是背景
            setLayerStates(prev => ({
                ...prev,
                [layerId]: {
                    ...prev[layerId],
                    isBackground: false
                }
            }));
            // 重新拉取一次，保证与 PS 状态一致
            fetchLayerStates();
            // 刷新文件树，保证名称（如“背景”→“图层 0”）立即更新
            refreshLayers();
        } catch (e) {
            console.error('解锁背景图层失败:', e);
        }
    }, [fetchLayerStates, refreshLayers]);

    // 获取像素图层
    const getPixelLayers = useCallback(async () => {
        try {
            const doc = app.activeDocument;
            if (doc) {
                const layers = doc.layers.filter(layer => layer.typename === "PixelLayer");
                setPixelLayers(layers);
            }
        } catch (error) {
            console.error('获取像素图层失败:', error); 
        }
    }, []);

    // 添加图层状态监听器
    useEffect(() => {
        const { addNotificationListener } = require("photoshop").action;
        
        // 需要监听的图层相关事件  
        const layerListeners = [
            // 监听历史记录变化
            addNotificationListener(
                ["historyStateChanged"], 
                () => {
                    if (listenerEnabled) {  // 只在启用时执行
                        console.log('FileArea历史记录变化事件触发');
                        refreshLayers();
                    }
                }
            ),
            // 新增：监听文档选择事件
            addNotificationListener(
                ["select"], 
                (event, descriptor) => {
                    if (listenerEnabled && descriptor?._target?.[0]?._ref === "document") {
                        console.log('FileArea文档选择事件触发');
                        refreshLayers();
                    }
                }
            ),
            // 新增：监听文档打开、关闭、新建事件
            addNotificationListener(
                ["open", "close", "newDocument"], 
                () => {
                    if (listenerEnabled) {
                        console.log('FileArea文档打开/关闭/新建事件触发');
                        refreshLayers();
                    }
                }
            ),
        ];

       // 清理监听器
       return () => {
        layerListeners.forEach(listener => {
            if (listener?.remove) {
                listener.remove();
            }
        });
    };
}, [refreshLayers, listenerEnabled]);  


    // 将样本图层的智能滤镜复制给每一个选中图层的函数
    const processLayer = useCallback(async (layer) => {
        try {
            const { executeAsModal } = require("photoshop").core;
            const { batchPlay } = require("photoshop").action;

            await executeAsModal(async () => {
                // 1. 递归展开所有父级组
                const expandParentGroups = async (currentLayer) => {
                    if (currentLayer.parent && currentLayer.parent.typename === "LayerSet") {
                        await expandParentGroups(currentLayer.parent);
                        await batchPlay([
                            {
                                _obj: "select",
                                _target: [
                                    {
                                        _ref: "layer",
                                        _id: currentLayer.parent._id
                                    }
                                ],
                                makeVisible: true,
                                expand: true,
                                _options: { dialogOptions: "dontDisplay" }
                            }
                        ], { synchronousExecution: true });
                    }
                };

                // 先展开父组
                await expandParentGroups(layer);

                // 2. 选中目标图层
                await batchPlay([
                    {
                        _obj: "select",
                        _target: [
                            {
                                _ref: "layer",
                                _id: layer._id
                            }
                        ],
                        makeVisible: true,
                        _options: { dialogOptions: "dontDisplay" }
                    }
                ], { synchronousExecution: true });

                // 3. 转换为智能对象
                await batchPlay([{_obj: "newPlacedLayer"}], { synchronousExecution: true });

                // 3. 获取当前选中图层
                const result = await batchPlay([{_obj: "get", _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }]}], { synchronousExecution: true });

                const newLayer = result[0];

                if (!newLayer) {
                    throw new Error('转换为智能对象失败：无法获取新图层');
                }

                // 4. 循环复制所有滤镜
                const filterCount = adjustmentSteps.length;
                for (let f = 1; f <= filterCount; f++) {
                    await batchPlay([{
                        _obj: "duplicate",
                        _target: [{ _ref: "filterFX", _index: f }, { _ref: "layer", _name: "样本图层" }],
                        to: { _ref: [{ _ref: "filterFX", _index: f }, { _ref: "layer", _enum: "ordinal", _value: "targetEnum" }] },
                        _options: { dialogOptions: "dontDisplay" }
                    }], { synchronousExecution: true });
                }
                
                // 5. 栅格化
                await batchPlay([{ _obj: "rasterizeLayer", _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }], rasterizeLayer: "entire" }], { synchronousExecution: true });

                // 6. 取消选择所有图层
                await batchPlay([{ _obj: "selectNoLayers", _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }], _options: { dialogOptions: "dontDisplay" } }], { synchronousExecution: true });

            }, { commandName: "处理图层" });

        } catch (error) {
            console.error('处理图层失败:', error, layer.name);
            const { showAlert } = require("photoshop").core;
            showAlert({ message: `处理图层 ${layer.name} 失败: ${error.message}` });
            throw error;  // 向上传递错误
        }
    }, [adjustmentSteps]);

    // 应用按钮的函数
    const applyAdjustments = useCallback(async () => {
        try {
            if (selectedLayers.length === 0) {
                const { showAlert } = require("photoshop").core;
                showAlert({ message: '请先选择要处理的图层' });
                return;
            }

            setListenerEnabled(false);
            setIsProcessing(true);  // 开始处理
            setProgress(0);
            
            // 创建一个本地副本，避免状态更新影响处理
            const layersToProcess = [...selectedLayers];
            
            // 按照文档中的顺序排序选中的图层
            const sortedLayers = layersToProcess.sort((a, b) => {
                const aIndex = app.activeDocument.layers.findIndex(l => l._id === a._id);
                const bIndex = app.activeDocument.layers.findIndex(l => l._id === b._id);
                return bIndex - aIndex;
            });

            for (let i = 0; i < sortedLayers.length; i++) {
                const currentLayer = sortedLayers[i];
                await processLayer(currentLayer);
                setProgress(Math.floor((i + 1) / sortedLayers.length * 100));
                
                // 每处理完一个图层后等待一小段时间
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // 处理完成后延迟刷新
            setTimeout(() => {
                refreshLayers();
                setSelectedLayers([]);
                setSelectedLayerPaths({});
                setProgress(0);
                setIsProcessing(false);
                setListenerEnabled(true);
            }, 500);
            
            // 删除样本图层
            try { 
                const { executeAsModal } = require("photoshop").core;
                const { batchPlay } = require("photoshop").action;
                
                await executeAsModal(async () => {
                    await batchPlay([
                        {
                            _obj: "delete",
                            _target: [
                                {
                                    _ref: "layer",
                                    _name: "样本图层"
                                }
                            ],
                            _options: { dialogOptions: "dontDisplay" }
                        }
                    ], { synchronousExecution: true });
                }, { commandName: "删除样本图层" });
            } catch (error) {
                console.error('删除样本图层失败:', error);
            } 
            
            // 使用 ToastQueue 显示成功通知
            ToastQueue.positive('处理完成', {
                timeout: 3000
            });
            
        } catch (error) {
            console.error('应用调整失败:', error);
            const { showAlert } = require("photoshop").core;
            showAlert({ message: `应用调整失败: ${error.message}` });
            setListenerEnabled(true);
            setIsProcessing(false);  // 确保错误时也重置状态
        }
    }, [selectedLayers, processLayer]);

    // 切换组的展开/折叠状态
    const toggleGroup = useCallback((path: string) => {
        setCollapsedGroups(prev => ({
            ...prev,
            [path]: !prev[path]
        }));
    }, []);

    // 处理图层选择状态变化（支持多选）
    const handleLayerCheckboxChange = useCallback((layer: Layer, currentPath: string, index: number, event?: React.MouseEvent, isCheckbox?: boolean) => {
        const layerIdentifier = `${currentPath}_${index}`;

        // 情况A：来自checkbox且没有按住任何修饰键 => 仅切换该项勾选，不清空其它勾选
        if (isCheckbox && event && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
            const newSelectedIndices = new Set(selectedLayerIndices);

            // 如果当前是单选状态，先把单选加入多选集合（保持已有选择不丢失）
            if (selectedLayerIndex !== null && selectedLayerIndices.size === 0 && selectedLayerIndex !== index) {
                newSelectedIndices.add(selectedLayerIndex);
            }

            const isCurrentlySelected = !!selectedLayerPaths[layerIdentifier];
            if (isCurrentlySelected) {
                // 取消该项
                newSelectedIndices.delete(index);
                setSelectedLayerPaths(prev => ({ ...prev, [layerIdentifier]: false }));
                setSelectedLayers(prev => prev.filter(l => l.identifier !== layerIdentifier));
            } else {
                // 勾选该项
                newSelectedIndices.add(index);
                setSelectedLayerPaths(prev => ({ ...prev, [layerIdentifier]: true }));
                const layerInfo = {
                    ...layer,
                    identifier: layerIdentifier,
                    name: layer.name,
                    _id: layer._id,
                    id: layer.id,
                    bounds: layer.bounds,
                    parent: layer.parent
                } as any;
                setSelectedLayers(prev => {
                    const exists = prev.find(l => l.identifier === layerIdentifier);
                    return exists ? prev : [...prev, layerInfo];
                });
            }

            setSelectedLayerIndices(newSelectedIndices);
            setLastClickedLayerIndex(index);
            // 根据集合大小与单选状态进行收敛
            if (newSelectedIndices.size === 0) {
                setSelectedLayerIndex(null);
            } else if (newSelectedIndices.size === 1) {
                const remaining = Array.from(newSelectedIndices)[0];
                setSelectedLayerIndex(remaining);
                setSelectedLayerIndices(new Set());
            } else {
                setSelectedLayerIndex(null);
            }
            return;
        }

        if (event && (event.ctrlKey || event.metaKey)) {
            // Ctrl+点击：切换选中状态
            if (selectedLayerIndex === index && selectedLayerIndices.size === 0) {
                setSelectedLayerIndex(null);
                setLastClickedLayerIndex(null);
                setSelectedLayerPaths(prev => ({
                    ...prev,
                    [layerIdentifier]: false
                }));
                setSelectedLayers(prev => prev.filter(l => l.identifier !== layerIdentifier));
                return;
            }
            
            const newSelectedIndices = new Set(selectedLayerIndices);
            
            // 如果当前是单选状态，先将单选项加入多选集合
            if (selectedLayerIndex !== null && selectedLayerIndices.size === 0) {
                newSelectedIndices.add(selectedLayerIndex);
            }
            
            const isCurrentlySelected = selectedLayerPaths[layerIdentifier];
            
            if (isCurrentlySelected) {
                newSelectedIndices.delete(index);
                setSelectedLayerPaths(prev => ({
                    ...prev,
                    [layerIdentifier]: false
                }));
                setSelectedLayers(prev => prev.filter(l => l.identifier !== layerIdentifier));
            } else {
                newSelectedIndices.add(index);
                setSelectedLayerPaths(prev => ({
                    ...prev,
                    [layerIdentifier]: true
                }));
                const layerInfo = {
                    ...layer,
                    identifier: layerIdentifier,
                    name: layer.name,
                    _id: layer._id,
                    id: layer.id,
                    bounds: layer.bounds,
                    parent: layer.parent
                };
                setSelectedLayers(prev => [...prev, layerInfo]);
            }
            
            setSelectedLayerIndices(newSelectedIndices);
            setLastClickedLayerIndex(index);
            
            // 如果多选集合为空，清空所有选中状态
            if (newSelectedIndices.size === 0) {
                setSelectedLayerIndex(null);
            } else if (newSelectedIndices.size === 1) {
                // 如果只剩一个，转为单选状态
                const remainingIndex = Array.from(newSelectedIndices)[0];
                setSelectedLayerIndex(remainingIndex);
                setSelectedLayerIndices(new Set());
            } else {
                // 多选时清空单选状态
                setSelectedLayerIndex(null);
            }
        } else if (event && event.shiftKey && lastClickedLayerIndex !== null) {
            // Shift+点击：范围选择
            const newSelectedIndices = new Set(selectedLayerIndices);
            
            // 如果当前是单选状态，先将单选项加入多选集合
            if (selectedLayerIndex !== null && selectedLayerIndices.size === 0) {
                newSelectedIndices.add(selectedLayerIndex);
            }
            
            const start = Math.min(lastClickedLayerIndex, index);
            const end = Math.max(lastClickedLayerIndex, index);
            
            // 需要获取所有可见图层的索引映射
            const allVisibleLayers: Array<{ layer: Layer; path: string; index: number }> = [] as any;
            const collectVisibleLayers = (layers: any[], parentPath = '') => {
                layers.forEach((layer, idx) => {
                    const currentPath = parentPath ? `${parentPath}/${layer.name}` : layer.name;
                    if (layer.kind === 'pixel') {
                        const hasContent = layer.bounds && (layer.bounds.width > 0 && layer.bounds.height > 0);
                        if (hasContent) {
                            allVisibleLayers.push({ layer, path: currentPath, index: idx });
                        }
                    } else if (layer.kind === 'group' && layer.layers) {
                        collectVisibleLayers(layer.layers, currentPath);
                    }
                });
            };
            
            if (documentLayers) {
                collectVisibleLayers(documentLayers as any);
            }
            
            for (let i = start; i <= end && i < (allVisibleLayers as any).length; i++) {
                const layerData = (allVisibleLayers as any)[i];
                if (layerData) {
                    const layerId = `${layerData.path}_${layerData.index}`;
                    newSelectedIndices.add(i);
                    setSelectedLayerPaths(prev => ({
                        ...prev,
                        [layerId]: true
                    }));
                    
                    const layerInfo = {
                        ...layerData.layer,
                        identifier: layerId,
                        name: layerData.layer.name,
                        _id: layerData.layer._id,
                        id: layerData.layer.id,
                        bounds: layerData.layer.bounds,
                        parent: layerData.layer.parent
                    } as any;
                    
                    setSelectedLayers(prev => {
                        const exists = prev.find(l => l.identifier === layerId);
                        return exists ? prev : [...prev, layerInfo];
                    });
                }
            }
            
            setSelectedLayerIndices(newSelectedIndices);
            setSelectedLayerIndex(null); // 多选时清空单选状态
        } else {
            // 普通点击：根据当前状态决定行为
            if (selectedLayerIndices.size > 0) {
                // 如果当前是多选状态，点击任何项目都转为单选该项目
                // 清空所有选中状态
                setSelectedLayerPaths({});
                setSelectedLayers([]);
                setSelectedLayerIndices(new Set());
                
                // 选中当前项目
                setSelectedLayerIndex(index);
                setSelectedLayerPaths({ [layerIdentifier]: true });
                const layerInfo = {
                    ...layer,
                    identifier: layerIdentifier,
                    name: layer.name,
                    _id: layer._id,
                    id: layer.id,
                    bounds: layer.bounds,
                    parent: layer.parent
                } as any;
                setSelectedLayers([layerInfo]);
            } else {
                // 当前是单选或未选：切换到该项
                const isCurrentlySelected = selectedLayerIndex === index;
                if (isCurrentlySelected) {
                    // 取消选择
                    setSelectedLayerIndex(null);
                    setSelectedLayerPaths(prev => ({ ...prev, [layerIdentifier]: false }));
                    setSelectedLayers(prev => prev.filter(l => l.identifier !== layerIdentifier));
                } else {
                    // 切换为该项
                    setSelectedLayerIndex(index);
                    setSelectedLayerPaths({ [layerIdentifier]: true });
                    const layerInfo = {
                        ...layer,
                        identifier: layerIdentifier,
                        name: layer.name,
                        _id: layer._id,
                        id: layer.id,
                        bounds: layer.bounds,
                        parent: layer.parent
                    } as any;
                    setSelectedLayers([layerInfo]);
                }
            }
            setLastClickedLayerIndex(index);
        }
    }, [selectedLayerPaths, selectedLayerIndices, selectedLayerIndex, lastClickedLayerIndex, documentLayers]);

    // 处理空白区域点击，取消选择
    const handleBlankAreaClick = useCallback(() => {
        setSelectedLayerIndex(null);
        setSelectedLayerIndices(new Set());
        setLastClickedLayerIndex(null);
        setSelectedLayerPaths({});
        setSelectedLayers([]);
    }, []);

    // 使用 useMemo 缓存文档图层，但只依赖updateTrigger
    const documentLayers = useMemo(() => {
        try {
            const doc = app.activeDocument;
            if (!doc) return null;
            
            // 获取图层时进行基本验证
            return doc.layers.map(layer => {
                // 确保返回的图层对象具有必要的属性
                return {
                    ...layer,
                    name: layer.name || '',
                    kind: layer.kind || '',
                    bounds: layer.bounds || null,
                    layers: layer.layers || []
                };
            });
        } catch (error) {
            console.error('获取文档图层失败:', error);
            return null;
        }
    }, [updateTrigger]);

    // 刷新文件树
    const refreshLayers = useCallback(() => {
        // 通过改变 updateTrigger 来强制重新渲染 
        setUpdateTrigger(prev => prev + 1);
    }, []);

    // 修改返回值部分，需要包含 isProcessing
    return {
        LayerTreeComponent: useCallback(() => (
            <LayerTreeComponent
                layers={documentLayers}
                collapsedGroups={collapsedGroups}
                selectedLayerPaths={selectedLayerPaths}
                toggleGroup={toggleGroup}
                handleLayerCheckboxChange={handleLayerCheckboxChange}
                handleBlankAreaClick={handleBlankAreaClick}
                layerListRef={layerListRef}
                layerStates={layerStates}
                onToggleVisibility={onToggleVisibility}
                onToggleTransparencyLock={onToggleTransparencyLock}
                onTogglePositionLock={onTogglePositionLock}
                onToggleAllLock={onToggleAllLock}
                onUnlockBackground={onUnlockBackground}
            />
        ), [documentLayers, collapsedGroups, selectedLayerPaths, toggleGroup, handleLayerCheckboxChange, handleBlankAreaClick, layerListRef, layerStates, onToggleVisibility, onToggleTransparencyLock, onTogglePositionLock, onToggleAllLock, onUnlockBackground]),
        applyAdjustments,
        selectedLayers,
        progress,
        isProcessing  // 添加这一行
    };
};

export default FileArea;