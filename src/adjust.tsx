import React, { useState, useContext, useEffect } from'react';
import { app, Document, Layer, SmartObject, Snapshot } from 'photoshop';
import { AdjustmentStepsContext } from './AdjustmentStepsContext';

const Adjust = () => {
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

    // 获取像素图层
    const getPixelLayers = async () => {
        const doc: Document = app.activeDocument;
        if (doc) {
            const layers = doc.layers.filter(layer => layer.typename === "PixelLayer");
            setPixelLayers(layers);
        }
    };

    // 刷新像素图层列表
    const refreshLayers = () => {
        getPixelLayers();
    };

    // checkbox 状态改变处理
    const handleCheckboxChange = (layer, isChecked) => {
        if (isChecked) {
            setSelectedLayers([...selectedLayers, layer]);
        } else {
            const newSelectedLayers = selectedLayers.filter(l => l!== layer);
            setSelectedLayers(newSelectedLayers);
        }
    };

    // 处理盖印后的图层
    const processLayer = async (layer) => {
        // 现有代码保持不变
    };

    // 修改后的applyAdjustments函数
    const applyAdjustments = async () => {
        // 现有代码保持不变
    };

    // 从MainContainer移植过来的文件树相关功能
    useEffect(() => {
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

        const updateDocumentInfo = () => {
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
        };

        updateDocumentInfo();
        
        // 使用单一事件监听，通过定时器轮询更新
        const interval = setInterval(updateDocumentInfo, 1000); // 每秒检查一次

        return () => {
            clearInterval(interval);
        };
    }, []);

    const toggleGroup = (path: string) => {
        setCollapsedGroups(prev => ({
            ...prev,
            [path]: !prev[path]
        }));
    };

    const handleLayerCheckboxChange = (path: string, layer: Layer) => {
        setSelectedLayerPaths(prev => {
            const newState = {
                ...prev,
                [path]: !prev[path]
            };
            
            // 更新selectedLayers数组
            if (newState[path]) {
                setSelectedLayers(prev => [...prev, layer]);
            } else {
                setSelectedLayers(prev => prev.filter(l => l !== layer));
            }
            
            return newState;
        });
    };

    const renderLayerTree = (layers: Layer[], parentPath = '') => {
        return layers.map((layer, index) => {
            const currentPath = parentPath ? `${parentPath}/${layer.name}` : layer.name;
            
            if (layer.kind === 'group') {
                return (
                    <li className="group" key={currentPath} style={{ fontSize: '16px', margin: '8px 0' }}>
                        <div 
                            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                            onClick={() => toggleGroup(currentPath)}
                        >
                            <span style={{ marginRight: '8px' }}>
                                {collapsedGroups[currentPath] ? '▶' : '▼'}
                            </span>
                            {layer.name}
                        </div>
                        {!collapsedGroups[currentPath] && (
                            <ul style={{ marginLeft: '20px' }}>
                                {renderLayerTree(layer.layers, currentPath)}
                            </ul>
                        )}
                    </li>
                );
            } else if (layer.kind === 'pixel') {
                return (
                    <li key={currentPath} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        fontSize: '16px', 
                        margin: '8px 0' 
                    }}>
                        <input 
                            type="checkbox" 
                            checked={!!selectedLayerPaths[currentPath]}
                            onChange={() => handleLayerCheckboxChange(currentPath, layer)}
                            style={{ margin: '0 8px 0 0', verticalAlign: 'middle' }}
                        />
                        {layer.name}
                    </li>
                );
            }
            return null;
        });
    };

    // 创建快照功能
    const handleCreateSnapshot = async () => {
        try {
            if (app.activeDocument) {
                const { executeAsModal } = require("photoshop").core;
                const { batchPlay } = require("photoshop").action;

                await executeAsModal(async () => {
                    await batchPlay(
                        [
                            {
                                _obj: "make",
                                _target: [
                                    {
                                        _ref: "snapshotClass"
                                    }
                                ],
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
                showAlert({ message: '快照创建成功！' });
            } else {
                const { showAlert } = require("photoshop").core;
                showAlert({ message: '没有活动的文档，无法创建快照' });
            }
        } catch (error) {
            console.error('创建快照失败:', error);
            const { showAlert } = require("photoshop").core;
            showAlert({ message: `创建快照失败: ${error.message}` });
        }
    };

    // 渲染文件树组件
    const LayerTreeComponent = () => {
        const [documentInfo, setDocumentInfo] = useState({
            fileName: '无活动文档',
            groupCount: 0,
            pixelLayerCount: 0
        });
        useEffect(() => {
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
    
            let lastFileName = '';
            const updateDocumentInfo = () => {
                try {
                    const doc = app.activeDocument;
                    if (doc) {
                        // 只在文档确实改变时更新
                        if (lastFileName !== doc.name) {
                            lastFileName = doc.name;
                            const groups = doc.layers.filter(layer => layer.kind === 'group');
                            const pixelLayers = countPixelLayers(doc.layers);
                            setDocumentInfo({
                                fileName: doc.name,
                                groupCount: groups.length,
                                pixelLayerCount: pixelLayers
                            });
                        }
                    } else if (lastFileName !== '') {
                        lastFileName = '';
                        setDocumentInfo({
                            fileName: '无活动文档',
                            groupCount: 0,
                            pixelLayerCount: 0
                        });
                    }
                } catch (error) {
                    console.error('更新文档信息失败:', error);
                }
            };

            // 初始更新
            updateDocumentInfo();
            
            // 使用较长的间隔时间
            const interval = setInterval(updateDocumentInfo, 2000);
            return () => clearInterval(interval);
        }, []); // 不需要任何依赖

        const toggleGroup = (path: string) => {
            setCollapsedGroups(prev => ({
                ...prev,
                [path]: !prev[path]
            }));
        };

        const handleLayerCheckboxChange = (path: string, layer: Layer) => {
            setSelectedLayerPaths(prev => {
                const newState = {
                    ...prev,
                    [path]: !prev[path]
                };
                
                // 更新selectedLayers数组
                if (newState[path]) {
                    setSelectedLayers(prev => [...prev, layer]);
                } else {
                    setSelectedLayers(prev => prev.filter(l => l !== layer));
                }
                
                return newState;
            });
        };

        const renderLayerTree = (layers: Layer[], parentPath = '', indent = 0) => {
            return layers.map((layer, index) => {
                const currentPath = parentPath ? `${parentPath}/${layer.name}` : layer.name;
                
                if (layer.kind === 'group') {
                    return (
                        <div key={currentPath} className="group-container">
                            <div 
                                className="group-header"
                                style={{ 
                                    padding: '8px 0',
                                    backgroundColor: '#333',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                <div 
                                    style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        cursor: 'pointer',
                                        paddingLeft: '10px',
                                        width: '100%'
                                    }}
                                    onClick={() => toggleGroup(currentPath)}
                                >
                                    <img 
                                        src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0id2hpdGUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTggMUw2LjUgMi41TDExIDdINFY5SDExTDYuNSAxMy41TDggMTVMMTUgOEw4IDFaIi8+PC9zdmc+" 
                                        style={{ 
                                            width: '12px', 
                                            height: '12px', 
                                            marginRight: '8px',
                                            transform: collapsedGroups[currentPath] ? 'rotate(0deg)' : 'rotate(90deg)',
                                            transition: 'transform 0.2s'
                                        }} 
                                        alt="toggle"
                                    />
                                    <img 
                                        src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0id2hpdGUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTIgMkgyVjE0SDE0VjE0SDJWMlpNMiAySDE0VjE0SDJWMloiLz48L3N2Zz4=" 
                                        style={{ 
                                            width: '16px', 
                                            height: '16px', 
                                            marginRight: '8px' 
                                        }} 
                                        alt="folder"
                                    />
                                    <span style={{ color: '#fff' }}>{layer.name}</span>
                                </div>
                            </div>
                            {!collapsedGroups[currentPath] && (
                                <div className="group-children" style={{ marginLeft: '20px' }}>
                                    {renderLayerTree(layer.layers, currentPath, indent + 1)}
                                </div>
                            )}
                        </div>
                    );
                } else if (layer.kind === 'pixel') {
                    return (
                        <div 
                            key={currentPath} 
                            className="layer-item"
                            style={{ 
                                padding: '8px 0',
                                borderBottom: '1px solid #444',
                                display: 'flex',
                                alignItems: 'center',
                                paddingLeft: '10px'
                            }}
                        >
                            <input 
                                type="checkbox" 
                                checked={!!selectedLayerPaths[currentPath]}
                                onChange={() => handleLayerCheckboxChange(currentPath, layer)}
                                style={{ 
                                    margin: '0 8px 0 0', 
                                    width: '16px',
                                    height: '16px',
                                    accentColor: '#0078d7'
                                }}
                            />
                            <span style={{ 
                                marginLeft: '8px',
                                color: selectedLayerPaths[currentPath] ? '#fff' : '#ccc'
                            }}>
                                {layer.name}
                            </span>
                        </div>
                    );
                }
                return null;
            });
        };

        return (
            <div className="layer-section" style={{ 
                height: 'calc(100vh - 180px)',
                overflowY: 'auto',
                backgroundColor: '#222',
            }}>
                <div style={{ 
                    padding: '10px', 
                    backgroundColor: '#333',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    <p style={{ margin: '0', color: '#fff' }}>
                        当前文件: {documentInfo.fileName}
                        <span style={{ margin: '0 16px' }}>|</span>
                        {documentInfo.groupCount}个组，{documentInfo.pixelLayerCount}个像素图层
                    </p>
                </div>
                <div className="layer-list-container" style={{ backgroundColor: '#222' }}>
                    {app.activeDocument ? renderLayerTree(app.activeDocument.layers) : 
                        <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                            没有活动文档
                        </div>
                    }
                </div>
            </div>
        );
    };

    // 创建快照功能
    const handleCreateSnapshot = async () => {
        try {
            if (app.activeDocument) {
                const { executeAsModal } = require("photoshop").core;
                const { batchPlay } = require("photoshop").action;

                await executeAsModal(async () => {
                    await batchPlay(
                        [
                            {
                                _obj: "make",
                                _target: [
                                    {
                                        _ref: "snapshotClass"
                                    }
                                ],
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
                showAlert({ message: '快照创建成功！' });
            } else {
                const { showAlert } = require("photoshop").core;
                showAlert({ message: '没有活动的文档，无法创建快照' });
            }
        } catch (error) {
            console.error('创建快照失败:', error);
            const { showAlert } = require("photoshop").core;
            showAlert({ message: `创建快照失败: ${error.message}` });
        }
    };

    return {
        LayerTreeComponent,
        handleCreateSnapshot,
        applyAdjustments,
        selectedLayers,
        progress
    };
};

export default Adjust;