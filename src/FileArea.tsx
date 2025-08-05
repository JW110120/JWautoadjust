import React, { useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { useScrollPosition } from './utils/scrollUtils';
import { app, Layer} from 'photoshop';
import { AdjustmentStepsContext } from './contexts/AdjustmentStepsContext';
import { ToastQueue } from '@adobe/react-spectrum';
import { DocumentInfoContext } from './contexts/DocumentInfoContext';
import { useProcessing } from './contexts/ProcessingContext';

   // 渲染文件树
   const LayerTreeComponent = React.memo(({ 
    layers, 
    collapsedGroups, 
    selectedLayerPaths, 
    toggleGroup, 
    handleLayerCheckboxChange,
    handleBlankAreaClick,
}) => {
    // 渲染图层树
    const renderLayerTree = (layers: Layer[], parentPath = '', indent = 0) => {
        // 创建一个映射来跟踪同名图层
        const visibleLayerCount = {};
        
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
        const processedCount = {};
        
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
                            <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                height="18" 
                                viewBox="0 0 18 18" 
                                width="18"
                                className={`toggle-icon ${collapsedGroups[currentPath] ? 'collapsed' : 'expanded'}`}
                                style={{ fill: 'currentColor' }}
                            >
                                {collapsedGroups[currentPath] ? (
                                    <path d="M12,9a.994.994,0,0,1-.2925.7045l-3.9915,3.99a1,1,0,1,1-1.4355-1.386l.0245-.0245L9.5905,9,6.3045,5.715A1,1,0,0,1,7.691,4.28l.0245.0245,3.9915,3.99A.994.994,0,0,1,12,9Z" />
                                ) : (
                                    <path d="M4,7.01a1,1,0,0,1,1.7055-.7055l3.289,3.286,3.289-3.286a1,1,0,0,1,1.437,1.3865l-.0245.0245L9.7,11.7075a1,1,0,0,1-1.4125,0L4.293,7.716A.9945.9945,0,0,1,4,7.01Z" />
                                )}
                            </svg>
                            <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                height="18" 
                                viewBox="0 0 18 18" 
                                width="18"
                                className="folder-icon"
                                style={{ fill: 'currentColor' }}
                            >
                                {collapsedGroups[currentPath] ? (
                                    <path d="M16.5,4l-7.166.004-1.65-1.7A1,1,0,0,0,6.9645,2H2A1,1,0,0,0,1,3V14.5a.5.5,0,0,0,.5.5h15a.5.5,0,0,0,.5-.5V4.5A.5.5,0,0,0,16.5,4ZM2,3H6.9645L8.908,5H2Z" />
                                ) : (
                                    <path d="M15,7V4.5a.5.5,0,0,0-.5-.5l-6.166.004-1.65-1.7A1,1,0,0,0,5.9645,2H2A1,1,0,0,0,1,3V14.5a.5.5,0,0,0,.5.5H14.6535a.5.5,0,0,0,.468-.3245l2.625-7A.5.5,0,0,0,17.2785,7ZM2,3H5.9645L7.617,4.7l.295.3035h.4225L14,5V7H4.3465a.5.5,0,0,0-.468.3245L2,12.3335Z" />
                                )}
                            </svg>
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
                
                return (
                    <li  
                        key={uniqueKey}
                        className="layer-item"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <input 
                            type="checkbox" 
                            checked={selectedLayerPaths[`${currentPath}_${index}`] === true}
                            onChange={(e) => handleLayerCheckboxChange(layer, currentPath, index, e)}
                            className="layer-checkbox"
                        />
                        <span 
                            onClick={(e) => handleLayerCheckboxChange(layer, currentPath, index, e)}
                            className={`layer-name ${selectedLayerPaths[`${currentPath}_${index}`] ? 'selected' : ''}`}
                        >
                            {displayName}
                        </span>
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
                await batchPlay([{
                    _obj: "newPlacedLayer"
                }], { synchronousExecution: true });

                // 3. 获取当前选中图层
                const result = await batchPlay([{
                    _obj: "get",
                    _target: [{
                        _ref: "layer",
                        _enum: "ordinal",
                        _value: "targetEnum"
                    }]
                }], { synchronousExecution: true });

                const newLayer = result[0];

                if (!newLayer) {
                    throw new Error('转换为智能对象失败：无法获取新图层');
                }

                // 4. 循环复制所有滤镜
                const filterCount = adjustmentSteps.length;
                for (let f = 1; f <= filterCount; f++) {
                    await batchPlay([{
                        _obj: "duplicate",
                        _target: [{
                            _ref: "filterFX",
                            _index: f
                        }, {
                            _ref: "layer",
                            _name: "样本图层"
                        }],
                        to: {
                            _ref: [{
                                _ref: "filterFX",
                                _index: f
                            }, {
                                _ref: "layer",
                                _enum: "ordinal",
                                _value: "targetEnum"
                            }]
                        },
                        _options: {
                            dialogOptions: "dontDisplay"
                        }
                    }], { synchronousExecution: true });
                }
                
                // 5. 栅格化
                await batchPlay([{
                    _obj: "rasterizeLayer",
                    _target: [{
                        _ref: "layer",
                        _enum: "ordinal",
                        _value: "targetEnum"
                    }],
                    rasterizeLayer: "entire"
                }], { synchronousExecution: true });

                // 6. 取消选择所有图层
                await batchPlay([
                    {
                        _obj: "selectNoLayers",
                        _target: [{
                            _ref: "layer",
                            _enum: "ordinal",
                            _value: "targetEnum"
                        }],
                        _options: {
                            dialogOptions: "dontDisplay"
                        }
                    }
                ], { synchronousExecution: true });

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
    const handleLayerCheckboxChange = useCallback((layer: Layer, currentPath: string, index: number, event?: React.MouseEvent) => {
        const layerIdentifier = `${currentPath}_${index}`;
        
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
            const allVisibleLayers = [];
            const collectVisibleLayers = (layers, parentPath = '') => {
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
                collectVisibleLayers(documentLayers);
            }
            
            for (let i = start; i <= end && i < allVisibleLayers.length; i++) {
                const layerData = allVisibleLayers[i];
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
                    };
                    
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
                };
                setSelectedLayers([layerInfo]);
                setLastClickedLayerIndex(index);
            } else {
                // 单选状态的普通点击
                const isSelected = !selectedLayerPaths[layerIdentifier];
                
                if (isSelected) {
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
                    };
                    setSelectedLayers([layerInfo]);
                } else {
                    setSelectedLayerIndex(null);
                    setSelectedLayerPaths({});
                    setSelectedLayers([]);
                }
                setLastClickedLayerIndex(index);
            }
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
            />
        ), [documentLayers, collapsedGroups, selectedLayerPaths, toggleGroup, handleLayerCheckboxChange, handleBlankAreaClick, layerListRef]),
        applyAdjustments,
        selectedLayers,
        progress,
        isProcessing  // 添加这一行
    };
};

export default FileArea;