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

    // 应用调整功能实现
    const applyAdjustments = async () => {
        const doc: Document = app.activeDocument;
        if (doc) {
            // 新建快照
            const snapshot: Snapshot = doc.createSnapshot();
            const totalLayers = selectedLayers.length;
            let currentLayerIndex = 0;
            for (const layer of selectedLayers) {
                // 转化为智能对象
                const smartObj: SmartObject = layer.convertToSmartObject();
                // 应用调整步骤
                for (const step of adjustmentSteps) {
                    // 这里需根据具体调整步骤实现应用逻辑
                }
                // 栅格化
                smartObj.rasterize();
                currentLayerIndex++;
                const newProgress = (currentLayerIndex / totalLayers) * 100;
                setProgress(newProgress);
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
                    <li key={layer.id} style={{ listStyle: 'none' }}> {/* 清除默认列表样式 */}
                        <input
                            type="checkbox"
                            onChange={(e) => handleCheckboxChange(layer, e.target.checked)}
                        />
                        {layer.name}
                    </li>
                ))}
            </ul>
            {/* 进度条容器添加外边距 */}
            <div style={{ marginTop: 15 }}>
                <progress value={progress} max="100" style={{ width: '100%' }} />
                <button onClick={applyAdjustments}>应用</button>
                <button onClick={() => {}}>停止</button>
            </div>
        </div>
    );
};

export default Adjust;