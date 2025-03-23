import React, { useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useScrollPosition } from './utils/scrollUtils';
import { app, Document, Layer, SmartObject, Snapshot } from 'photoshop';
import { AdjustmentStepsContext } from './contexts/AdjustmentStepsContext';
import { FaChevronDown, FaFolder } from 'react-icons/fa'; // 使用 react-icons 库

const FileArea = () => {
    const { adjustmentSteps } = useContext(AdjustmentStepsContext);
    const [pixelLayers, setPixelLayers] = useState([]);
    const [selectedLayers, setSelectedLayers] = useState([]);
    const [progress, setProgress] = useState(0);
    const [documentInfo, setDocumentInfo] = useState({
        fileName: '无活动文档',
        groupCount: 0,
        pixelLayerCount: 0
    });
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
    const [selectedLayerPaths, setSelectedLayerPaths] = useState<Record<string, boolean>>({});

    const { ref: layerListRef } = useScrollPosition(); // 使用工具函数

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

    // 刷新像素图层列表
    const refreshLayers = useCallback(() => {
        getPixelLayers();
    }, [getPixelLayers]);

    // 处理盖印后的图层
    const processLayer = useCallback(async (layer) => {
        try {
            const { executeAsModal } = require("photoshop").core;
            const { batchPlay } = require("photoshop").action;

            await executeAsModal(async () => {
                // 1. 选中并转换为智能对象
                await batchPlay([
                    {
                        _obj: "select",
                        _target: [{_ref: "layer", _id: layer.id}],
                        makeVisible: false
                    }
                ], { synchronousExecution: true });

                // 获取样本图层（文档顶部第一个图层）的ID
                const sampleLayerResult = await batchPlay([
                    {
                        _obj: "get",
                        _target: [
                            {
                                _ref: "layer",
                                _index: 0
                            }
                        ],
                        _options: {
                            dialogOptions: "dontDisplay"
                        }
                    }
                ], { synchronousExecution: true });

                const sampleLayerId = sampleLayerResult[0].layerID;

                // 2. 转换为智能对象
                await batchPlay([
                    {
                        _obj: "newPlacedLayer"
                    }
                ], { synchronousExecution: true });

                // 3. 获取新创建的智能对象图层ID
                const result = await batchPlay([
                    {
                        _obj: "get",
                        _target: [
                            {
                                _ref: "layer",
                                _enum: "ordinal",
                                _value: "targetEnum"
                            }
                        ],
                        _options: {
                            dialogOptions: "dontDisplay"
                        }
                    }
                ], { synchronousExecution: true });

                if (result && result[0] && result[0].layerID) {
                    const smartObjectId = result[0].layerID;

                    // 4. 一次性复制所有滤镜，不使用循环
                    console.log('从样本图层ID:', sampleLayerId, '到目标图层ID:', smartObjectId);
                    
                    // 使用 adjustmentSteps 获取滤镜数量
                    const filterCount = adjustmentSteps.length;
                    
                    // 循环复制每个滤镜
                    for (let i = 1; i <= filterCount; i++) {
                        await batchPlay([
                            {
                                _obj: "duplicate",
                                _target: [
                                    {
                                        _ref: "filterFX",
                                        _index: i
                                    },
                                    {
                                        _ref: "layer",
                                        _name:"样本图层"
                                    }
                                ],
                                to: {
                                    _ref: [
                                        {
                                            _ref: "filterFX",
                                            _index: i
                                        },
                                        {
                                            _ref: "layer",
                                            _id: smartObjectId  // 到目标智能对象图层
                                        }
                                    ]
                                },
                                _options: {
                                    dialogOptions: "dontDisplay"
                                }
                            }
                        ], { synchronousExecution: true });
                    }
                    
                    // 5. 栅格化
                    await batchPlay([
                        {
                            _obj: "rasterizeLayer",
                            _target: [
                                {
                                    _ref: "layer",
                                    _id: smartObjectId
                                }
                            ],
                            rasterizeLayer: "entire"
                        }
                    ], { synchronousExecution: true });
                } else {
                    console.error('未能获取到智能对象图层');
                    throw new Error('转换为智能对象失败');
                }

            }, { commandName: "处理图层" });

        } catch (error) {
            console.error('处理图层失败:', error, layer.name);
            const { showAlert } = require("photoshop").core;
            showAlert({ message: `处理图层 ${layer.name} 失败: ${error.message}` });
        }
    }, [adjustmentSteps]);

    // 修改后的applyAdjustments函数
    const applyAdjustments = useCallback(async () => {
        try {
            if (selectedLayers.length === 0) {
                const { showAlert } = require("photoshop").core;
                showAlert({ message: '请先选择要处理的图层' });
                return;
            }

            setProgress(0);
            
            // 创建一个本地副本，避免状态更新影响处理
            const layersToProcess = [...selectedLayers];
            
            // 按照文档中的顺序排序选中的图层
            const sortedLayers = layersToProcess.sort((a, b) => {
                const aIndex = app.activeDocument.layers.findIndex(l => l.id === a.id);
                const bIndex = app.activeDocument.layers.findIndex(l => l.id === b.id);
                return aIndex - bIndex;
            });

            for (let i = 0; i < sortedLayers.length; i++) {
                await processLayer(sortedLayers[i]);
                setProgress(Math.floor((i + 1) / sortedLayers.length * 100));
            }

            // 处理完成后清空选择
            setSelectedLayers([]);
            setSelectedLayerPaths({});

            const { showAlert } = require("photoshop").core;
            showAlert({ message: '所有图层处理完成' });
            
        } catch (error) {
            console.error('应用调整失败:', error);
            const { showAlert } = require("photoshop").core;
            showAlert({ message: `应用调整失败: ${error.message}` });
        }
    }, [selectedLayers, processLayer]);

    // 切换组的展开/折叠状态
    const toggleGroup = useCallback((path: string) => {
        setCollapsedGroups(prev => ({
            ...prev,
            [path]: !prev[path]
        }));
    }, []);

    // 处理图层选择状态变化
    const handleLayerCheckboxChange = useCallback((layer: Layer) => {
        const isSelected = !selectedLayerPaths[layer.id];
        
        setSelectedLayerPaths(prev => ({
            ...prev,
            [layer.id]: isSelected
        }));
        
        setSelectedLayers(prev => 
            isSelected 
                ? [...prev, layer]
                : prev.filter(l => l.id !== layer.id)
        );
    }, [selectedLayerPaths]);

    // 创建快照功能
    const handleCreateSnapshot = useCallback(async () => {
        try {
            if (app.activeDocument) {
                const { executeAsModal } = require("photoshop").core;
                const { batchPlay } = require("photoshop").action;

                await executeAsModal(async () => {
                    await batchPlay(
                        [
                            {
                                _obj: "make",
                                _target: [{ _ref: "snapshotClass" }],
                                from: {
                                    _ref: "historyState",
                                    _property: "currentHistoryState"
                                },
                                name: "拆分调整前",
                                using: {
                                    _enum: "historyState",
                                    _value: "fullDocument"
                                },
                                _options: {
                                    dialogOptions: "dontDisplay"
                                }
                            }
                        ],
                        {}
                    );
                }, {"commandName": "创建快照"});
                const { showAlert } = require("photoshop").core;
            } else {
                const { showAlert } = require("photoshop").core;
                showAlert({ message: '没有活动的文档，无法创建快照' });
            }
        } catch (error) {
            console.error('创建快照失败:', error);
            const { showAlert } = require("photoshop").core;
            showAlert({ message: `创建快照失败: ${error.message}` });
        }
    }, []);

    // 文档信息更新函数
    const updateDocumentInfo = useCallback(() => {
        const countPixelLayers = (layers) => {
            let count = 0;
            layers.forEach(layer => {
                if (layer.kind === 'pixel') {
                    count++;
                } else if (layer.kind === 'group') {
                    count += countPixelLayers(layer.layers);
                }
            });
            return count;
        };

        try {
            const doc = app.activeDocument;
            if (doc) {
                const groups = doc.layers.filter(layer => layer.kind === 'group');
                const pixelLayers = countPixelLayers(doc.layers);
                setDocumentInfo({
                    fileName: doc.name,
                    groupCount: groups.length,
                    pixelLayerCount: pixelLayers
                });
            } else {
                setDocumentInfo({
                    fileName: '无活动文档',
                    groupCount: 0,
                    pixelLayerCount: 0
                });
            }
        } catch (error) {
            console.error('更新文档信息失败:', error);
        }
    }, []);

    // 初始化和监听文档变化
    useEffect(() => {
        // 初始更新
        updateDocumentInfo();
        
        // 设置定时器
        const interval = setInterval(updateDocumentInfo, 2000);
        
        // 清理函数
        return () => clearInterval(interval);
    }, [updateDocumentInfo]);

    // 渲染文件树组件
    const LayerTreeComponent = () => {
        // 渲染图层树
        const renderLayerTree = (layers: Layer[], parentPath = '', indent = 0) => {
            return layers.map((layer, index) => {
                const currentPath = parentPath ? `${parentPath}/${layer.name}` : layer.name;
                const uniqueKey = `${currentPath}_${layer.id}`;
                
                if (layer.kind === 'group') {
                    return (
                        <div key={uniqueKey} className="group-container">
                            <div 
                                className="group-header"
                                onClick={() => toggleGroup(currentPath)}
                            >
                                <FaChevronDown 
                                    className={`toggle-icon ${collapsedGroups[currentPath] ? 'collapsed' : 'expanded'}`}
                                    aria-label="toggle"
                                    style={{ color: 'white' }} // 设置图标颜色为白色
                                />
                                <FaFolder 
                                    className="folder-icon"
                                    aria-label="folder"
                                    style={{ color: 'white' }} // 设置图标颜色为白色
                                />
                                <span className="layer-name">{layer.name}</span>
                            </div>
                            {!collapsedGroups[currentPath] && (
                                <div className="group-children" style={{ marginLeft: `${indent + 20}px` }}>
                                    {renderLayerTree(layer.layers, currentPath, indent + 20)}
                                </div>
                            )}
                        </div>
                    );
                } else if (layer.kind === 'pixel') {
                    return (
                        <div 
                            key={uniqueKey}
                            className="layer-item"
                            style={{ paddingLeft: `${indent + 20}px` }}
                        >
                            <input 
                                type="checkbox" 
                                checked={!!selectedLayerPaths[layer.id]}
                                onChange={() => handleLayerCheckboxChange(layer)}
                                className="layer-checkbox"
                            />
                            <span 
                                onClick={() => handleLayerCheckboxChange(layer)}
                                className={`layer-name ${selectedLayerPaths[layer.id] ? 'selected' : ''}`}
                            >
                                {layer.name}
                            </span>
                        </div>
                    );
                }
                return null;
            });
        };

        return (
            <div className="layer-section">
                <div className="layer-header">
                    <p className="layer-title">待执行图层</p>
                </div>
                <div className="layer-list-container" ref={layerListRef}>
                    {app.activeDocument ? renderLayerTree(app.activeDocument.layers) : 
                        <div className="no-document">
                            没有活动文档
                        </div>
                    }
                </div>
            </div>
        );
    };

    return {
        LayerTreeComponent,
        handleCreateSnapshot,
        applyAdjustments,
        selectedLayers,
        progress
    };
};

export default FileArea;