import React, { useContext, useEffect, useState, useRef } from 'react';
import { app } from 'photoshop';
import { AdjustmentStepsContext } from './contexts/AdjustmentStepsContext';
import { useRecord, RecordArea, AdjustmentMenu, DeleteButtonWrapper as DeleteButton } from './RecordArea';
import FileArea from './components/FileArea';
import { RecordProvider } from './contexts/RecordContext';
import InfoPlane from './components/InfoPlane';
import LayerTreeComponent from './components/LayerTreeComponent';

const MainContainer: React.FC = () => {
    return (
        <RecordProvider>
            <MainContainerContent />
        </RecordProvider>
    );
};

const MainContainerContent: React.FC = () => {
    const { adjustmentSteps, displayNames, deleteAdjustmentStep } = useContext(AdjustmentStepsContext);
    const { handleCreateSnapshot, applyAdjustments } = useContext(AdjustmentStepsContext);
    const FileAreaComponent = <FileArea />;
    const [selectedStepIndex, setSelectedStepIndex] = useState(-1);

    // 确保在组件函数体内使用 useRef
    const someRef = useRef(null);

    const { 
        isRecording, 
        startRecording, 
        stopRecording,
        deleteAdjustmentAndLayer,
        applyAdjustment,
        applyDirectAdjustment
    } = useRecord();

    const handleRecordClick = async () => {
        try {
            const { showAlert } = require("photoshop").core;
            if (isRecording) {
                await stopRecording();
            } else {
                await startRecording();
            }
        } catch (error) {
            console.error('录制失败:', error);
            showAlert({ message: `录制失败: ${error.message}` });
        }
    };

    const handleDeleteStep = async (index) => {
        if (!isRecording && index >= 0) {
            try {
                const newLength = adjustmentSteps.length - 1;
                const newIndex = index === adjustmentSteps.length - 1 ? newLength - 1 : index;
                
                await deleteAdjustmentAndLayer(index);
                
                if (newLength > 0) {
                    setSelectedStepIndex(newIndex);
                } else {
                    setSelectedStepIndex(-1);
                }
            } catch (error) {
                console.error('删除步骤失败:', error);
                const { showAlert } = require("photoshop").core;
                showAlert({ message: `删除步骤失败: ${error.message}` });
            }
        }
    };

    const handleStepClick = (index) => {
        setSelectedStepIndex(index);
    };

    const handleStepDoubleClick = async (index) => {
        if (!isRecording && index >= 0) {
            try {
                const { executeAsModal, showAlert } = require("photoshop").core;
                const { batchPlay } = require("photoshop").action;
                
                const doc = app.activeDocument;
                const sampleLayer = doc.layers.find(layer => 
                    layer.name === "样本图层" && 
                    layer.kind === "smartObject"
                );
    
                if (sampleLayer) {
                    await executeAsModal(async () => {
                        await batchPlay([{
                            _obj: "select",
                            _target: [{ _ref: "layer", _id: sampleLayer.id }],
                            makeVisible: true,
                            _options: { dialogOptions: "dontDisplay" }
                        }], { synchronousExecution: true });
    
                        const result = await batchPlay([{
                            _obj: "get",
                            _target: [{ _ref: "layer", _id: sampleLayer.id }],
                            _options: { dialogOptions: "dontDisplay" }
                        }], { synchronousExecution: true });
    
                        const filterFX = result[0]?.smartObject?.filterFX || [];
                        const filterIndex = filterFX.length - index - 1;
    
                        if (filterIndex >= 0 && filterIndex < filterFX.length) {
                            await batchPlay([{
                                _obj: "set",
                                _target: [
                                    {
                                        _ref: "filterFX",
                                        _index: filterIndex
                                    },
                                    {
                                        _ref: "layer",
                                        _enum: "ordinal",
                                        _value: "targetEnum"
                                    }
                                ],
                                filterFX: {
                                    _obj: "filterFX",
                                    filter: {
                                        _obj: filterFX[filterIndex].filter._obj,
                                        presetKind: {
                                            _enum: "presetKindType",
                                            _value: "presetKindCustom"
                                        }
                                    }
                                },
                                _options: {
                                    dialogOptions: "display"
                                }
                            }], { synchronousExecution: true });
                        }
                    }, { "commandName": "编辑智能滤镜" });
                }
            } catch (error) {
                console.error('编辑滤镜失败:', error);
                const { showAlert } = require("photoshop").core;
                showAlert({ message: `编辑滤镜失败: ${error.message}` });
            }
        }
    };

    const handleEditBlendOptions = async (index) => {
        if (!isRecording && index >= 0) {
            try {
                const { executeAsModal, showAlert } = require("photoshop").core;
                const { batchPlay } = require("photoshop").action;
                
                const doc = app.activeDocument;
                const sampleLayer = doc.layers.find(layer => 
                    layer.name === "样本图层" && 
                    layer.kind === "smartObject"
                );
    
                if (sampleLayer) {
                    await executeAsModal(async () => {
                        await batchPlay([{
                            _obj: "select",
                            _target: [{ _ref: "layer", _id: sampleLayer.id }],
                            makeVisible: true,
                            _options: { dialogOptions: "dontDisplay" }
                        }], { synchronousExecution: true });
    
                        const result = await batchPlay([{
                            _obj: "get",
                            _target: [{ _ref: "layer", _id: sampleLayer.id }],
                            _options: { dialogOptions: "dontDisplay" }
                        }], { synchronousExecution: true });
    
                        const filterFX = result[0]?.smartObject?.filterFX || [];
                        
                        let filterIndex = filterFX.length - index;
                        
                        if (filterIndex < 0) filterIndex = 0;
                        if (filterIndex >= filterFX.length) filterIndex = filterFX.length;
    
                        if (filterIndex >= 0 && filterIndex <= filterFX.length) {
                            await batchPlay([{
                                _obj: "set",
                                _target: [
                                    {
                                        _ref: "filterFX",
                                        _index: filterIndex
                                    },
                                    {
                                        _ref: "layer",
                                        _enum: "ordinal",
                                        _value: "targetEnum"
                                    }
                                ],
                                filterFX: {
                                    _obj: "filterFX",
                                    blendOptions: {
                                        _obj: "blendOptions"
                                    }
                                },
                                _options: {
                                    dialogOptions: "display"
                                }
                            }], { synchronousExecution: true });
                        }
                    }, { "commandName": "编辑混合选项" });
                }
            } catch (error) {
                console.error('编辑混合选项失败:', error);
                const { showAlert } = require("photoshop").core;
                showAlert({ message: `编辑混合选项失败: ${error.message}` });
            }
        }
    };

    return (
        <div className="main-container" style={{ 
            backgroundColor: '#222', 
            color: '#fff',
            display: 'flex',
            width: '100%',
            height: '100vh'
        }}>
            {/* 左侧部分 */}
            <div className="left-section" style={{ 
                width: '50%',
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
            }}>
                <div style={{ 
                    padding: '10px', 
                    backgroundColor: '#333',
                    borderBottom: '1px solid #444'
                }}>
                    <p style={{ margin: '0', fontSize: '16px', fontWeight: 'bold' }}>记录操作信息</p>
                </div>
                <div className="operation-record" style={{
                    flex: 1,
                    overflowY: 'auto',
                    backgroundColor: '#222'
                }}>
                    <ul className="operation-list">
                        {adjustmentSteps.map((step, index) => (
                            <li 
                                key={index}
                                onClick={() => handleStepClick(index)}
                                onDoubleClick={() => handleStepDoubleClick(index)}
                                className={index === selectedStepIndex ? 'selected' : ''}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            >
                                <div>
                                    <span className="step-number">
                                        {adjustmentSteps.length - index}.
                                    </span>
                                    <span className="step-name">{displayNames[step] || step}</span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditBlendOptions(index);
                                    }}
                                    style={{
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        color: '#999',
                                        cursor: 'pointer',
                                        padding: '4px 8px',
                                        fontSize: '12px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="编辑混合选项"
                                >
                                    <span>B</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
                <div style={{display: 'flex', flexDirection: 'column'}}>
                    <div className="bottom-buttons" style={{ 
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '10px',
                        backgroundColor: '#333',
                        borderTop: '1px solid #444'
                    }}>
                    <button 
                        onClick={handleRecordClick}
                        style={{ 
                            backgroundColor: isRecording ? '#d32f2f' : '#444',
                            border: 'none',
                            color: '#fff',
                            padding: '8px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        <span style={{ marginRight: '5px' }}>⏺</span> {isRecording ? '停止' : '记录'}
                    </button>
                    <AdjustmentMenu 
                        onAdjustmentClick={applyAdjustment}
                        onDirectAdjustment={applyDirectAdjustment}
                    />
                    <DeleteButton 
                        isRecording={isRecording}
                        hasSteps={adjustmentSteps.length > 0 && selectedStepIndex >= 0}
                        onDelete={() => handleDeleteStep(selectedStepIndex)}
                        index={selectedStepIndex}
                    />
                    </div>
                </div>
            </div>

            {/* 右侧部分 */}
            <div className="right-section" style={{ 
                width: '50%',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100%'
            }}>
                <div style={{ 
                    padding: '10px', 
                    backgroundColor: '#333',
                    borderBottom: '1px solid #444'
                }}>
                    <p style={{ margin: '0', fontSize: '16px', fontWeight: 'bold' }}>待执行图层</p>
                </div>
                
                <LayerTreeComponent />
                
                <div className="right-bottom-buttons" style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '10px',
                    backgroundColor: '#333',
                    borderTop: '1px solid #444'
                }}>
                    <button 
                        onClick={handleCreateSnapshot}
                        style={{ 
                            backgroundColor: '#444',
                            border: 'none',
                            color: '#fff',
                            padding: '8px 15px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        <span style={{ marginRight: '5px' }}>📷</span> 新建快照
                    </button>
                    <button 
                        onClick={applyAdjustments}
                        style={{ 
                            backgroundColor: '#444',
                            border: 'none',
                            color: '#fff',
                            padding: '8px 15px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        <span style={{ marginRight: '5px' }}>▶</span> 应用
                    </button>
                </div>
            </div>

            {/* 底部信息区 */}
            <InfoPlane adjustmentStepsCount={adjustmentSteps.length} />
        </div>
    );
};

export default MainContainer;