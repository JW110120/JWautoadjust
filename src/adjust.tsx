import React, { useState, useContext } from'react';
import { app, Document, Layer, SmartObject, Snapshot } from 'photoshop';
import { AdjustmentStepsContext } from './AdjustmentStepsContext';

const Adjust = () => {
    const { adjustmentSteps } = useContext(AdjustmentStepsContext);
    const [pixelLayers, setPixelLayers] = useState([]);
    const [selectedLayers, setSelectedLayers] = useState([]);
    const [progress, setProgress] = useState(0);

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
        try {
            const { executeAsModal, batchPlay } = require("photoshop").action;

            // 1. 重命名图层
            await executeAsModal(async () => {
                await batchPlay(
                    [
                        {
                           _obj: "set",
                           _target: [
                              {
                                 _ref: "layer",
                                 _enum: "ordinal",
                                 _value: "targetEnum"
                              }
                           ],
                           to: {
                              _obj: "layer",
                              name: "样本图层"
                           },
                           _options: {
                              dialogOptions: "dontDisplay"
                           }
                        }
                     ],
                    {}
                );
            }, {"commandName": "重命名图层"});

            // 2. 转换为智能对象
            const smartObj = await executeAsModal(async () => {
                await batchPlay(
                    [
                        {
                            _obj: "newPlacedLayer",
                            _options: {
                                dialogOptions: "dontDisplay"
                            }
                        }
                    ],
                    {}
                );
                return layer; // 返回转换后的图层
            }, {"commandName": "转换为智能对象"});

            // 3. 监听调整操作
            app.addEventListener('objectChanged', (event) => {
                if (event.target === smartObj) {
                    const step = `调整操作: ${event.property}`;
                    // 这里需要将调整步骤添加到调整步骤列表中
                    // 你可能需要从context中获取添加步骤的方法
                }
            });

            return smartObj;
        } catch (error) {
            console.error('处理图层失败:', error);
            throw error;
        }
    };

    // 修改后的applyAdjustments函数
    const applyAdjustments = async () => {
        const doc: Document = app.activeDocument;
        if (doc) {
            // 新建快照
            const snapshot: Snapshot = doc.createSnapshot();
            const totalLayers = selectedLayers.length;
            let currentLayerIndex = 0;
            
            for (const layer of selectedLayers) {
                try {
                    // 处理图层
                    const smartObj = await processLayer(layer);
                    
                    // 应用调整步骤
                    for (const step of adjustmentSteps) {
                        // 这里需根据具体调整步骤实现应用逻辑
                    }
                    
                    // 栅格化
                    smartObj.rasterize();
                    
                    currentLayerIndex++;
                    const newProgress = (currentLayerIndex / totalLayers) * 100;
                    setProgress(newProgress);
                } catch (error) {
                    console.error(`处理图层 ${layer.name} 失败:`, error);
                }
            }
        }
    };

    return (
        <div style={{ 
            border: '1px solid #ccc',
            padding: '20px',
            height: '100%',
            overflow: 'auto',
            display: 'flex', // 添加弹性布局
            flexDirection: 'column' // 垂直排列
        }}>
            <div style={{ marginBottom: 10 }}> {/* 按钮容器 */}
                <h2>待执行图层</h2>
                <button onClick={refreshLayers}>刷新</button>
            </div>
            <ul style={{ 
                flex: 1, // 占据剩余空间
                maxHeight: 'none', // 移除固定高度
                overflowY: 'auto'
            }}>
                {pixelLayers.map((layer) => (
                    <li key={layer.id} style={{ listStyle: 'none' }}> 
                        <input
                            type="checkbox"
                            onChange={(e) => handleCheckboxChange(layer, e.target.checked)}
                        />
                        {layer.name}
                    </li>
                ))}
            </ul>
            <div style={{ marginTop: 15 }}>
                <progress value={progress} max="100" style={{ width: '100%' }} />
                <button onClick={applyAdjustments}>应用</button>
                <button onClick={() => {}}>停止</button>
            </div>
        </div>
    );
};

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
    // ... existing exports ...
    handleCreateSnapshot
};
};

export default Adjust;