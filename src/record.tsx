import React, { useState, useContext } from 'react';
import { app, Document, Layer, SmartObject } from 'photoshop';
import { AdjustmentStepsContext } from './AdjustmentStepsContext';

const Record = () => {
    const { addAdjustmentStep } = useContext(AdjustmentStepsContext);
    const [isRecording, setIsRecording] = useState(false);
    const [adjustmentSteps, setAdjustmentSteps] = useState([]);
    const [mergedLayer, setMergedLayer] = useState(null);

    // 开始录制功能实现
    const startRecording = async () => {
        const doc: Document = app.activeDocument;
        if (doc) {
            // 合并可见图层
            const visibleLayers = doc.layers.filter(layer => layer.visible);
            const newLayer = doc.activeLayer.duplicate();
            newLayer.name = "MergedLayer";
            for (const layer of visibleLayers) {
                if (layer!== newLayer) {
                    layer.copy(newLayer);
                }
            } 
            // 转为智能对象
            const smartObj = newLayer.convertToSmartObject();
            setMergedLayer(smartObj);
            setIsRecording(true);
            // 监听调整操作（简单示例，实际需更完善）
            app.addEventListener('objectChanged', (event) => {
                if (event.target === smartObj) {
                    const step = `调整操作: ${event.property}`;
                    setAdjustmentSteps([...adjustmentSteps, step]);
                    addAdjustmentStep(step);
                }
            });
        }
    };

    // 移除 onDragEnd 函数

    return (
        // 移除 DndProvider 和 DndContext 包裹层
        <div style={{ 
            border: '1px solid #ccc',
            padding: 20,
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{ 
                flex: 1,
                overflow: 'auto',
                border: '1px solid #eee',
                padding: 11
            }}>
                {/* 列表项样式调整（移除拖拽相关逻辑） */}
            </div>
        </div>
    );
};

export default Record;