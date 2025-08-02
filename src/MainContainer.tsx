import React, { useContext, useState, useRef, useEffect  } from 'react';
import { app } from 'photoshop';
import { AdjustmentStepsContext } from './contexts/AdjustmentStepsContext';
import { useRecord, AdjustmentMenu } from './RecordArea';
import FileArea from './FileArea';
import InfoPlane from './components/InfoPlane';
import { DeleteButton } from './components/DeleteButton';
import { ToastContainer, ToastQueue } from '@adobe/react-spectrum';
import SnapshotButton from './components/SnapshotButton';
import BackButton from './components/BackButton';
import RecordButton from './components/RecordButton';
import ApplyButton from './components/ApplyButton';

const MainContainer: React.FC = () => {
    return <MainContainerContent />;
};

const MainContainerContent: React.FC = () => {
    const { LayerTreeComponent, applyAdjustments, progress, isProcessing } = FileArea();
    const { adjustmentSteps, displayNames, deleteAdjustmentStep } = useContext(AdjustmentStepsContext);
    const [selectedStepIndex, setSelectedStepIndex] = useState(-1);
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
                        let filterIndex = filterFX.length - index;  // 改为 let 声明
                          
                        if (filterIndex < 1) filterIndex = 1;
                        if (filterIndex >= filterFX.length) filterIndex = filterFX.length;
    
                        if (filterIndex >= 1 && filterIndex <= filterFX.length) {
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
                                        _obj: filterFX[filterIndex-1].filter._obj,
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
                        
                        if (filterIndex < 1) filterIndex = 1;
                        if (filterIndex >= filterFX.length) filterIndex = filterFX.length;
    
                        if (filterIndex >= 1 && filterIndex <= filterFX.length) {
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
        <div className="main-container">
            <ToastContainer placement="bottom" />
            
            {/* 左侧部分 */}
            <div className="section-common">
            <div className="header-section">
                <p className="header-section-text">记录操作信息</p>
            </div>
            <div className="table-content">
                    <ul className="operation-list">
                        {adjustmentSteps.map((step, index) => (
                            <li 
                                key={index}
                                onClick={() => handleStepClick(index)}
                                onDoubleClick={() => handleStepDoubleClick(index)}
                                className={`${index === selectedStepIndex ? 'selected' : ''}`}
                            >

                                <div>
                                    <span className="step-number">
                                        {adjustmentSteps.length - index}.
                                    </span>
                                    <span className="step-name">{displayNames[step] || step}</span>
                                </div>
                                <sp-action-button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditBlendOptions(index);
                                    }}
                                    quiet className="blend-options-button"
                                    title="编辑混合选项"
                                >
                                    <div slot="icon" className="icon-gear">
                                        <svg 
                                            viewBox="0 0 18 18"
                                            focusable="false"
                                            aria-hidden="true"
                                            role="img"
                                            style={{ fill: 'currentColor' }}
                                        >
                                            <path d="M16.45,7.8965H14.8945a5.97644,5.97644,0,0,0-.921-2.2535L15.076,4.54a.55.55,0,0,0,.00219-.77781L15.076,3.76l-.8365-.836a.55.55,0,0,0-.77781-.00219L13.4595,2.924,12.357,4.0265a5.96235,5.96235,0,0,0-2.2535-.9205V1.55a.55.55,0,0,0-.55-.55H8.45a.55.55,0,0,0-.55.55V3.106a5.96235,5.96235,0,0,0-2.2535.9205l-1.1-1.1025a.55.55,0,0,0-.77781-.00219L3.7665,2.924,2.924,3.76a.55.55,0,0,0-.00219.77781L2.924,4.54,4.0265,5.643a5.97644,5.97644,0,0,0-.921,2.2535H1.55a.55.55,0,0,0-.55.55V9.55a.55.55,0,0,0,.55.55H3.1055a5.967,5.967,0,0,0,.921,2.2535L2.924,13.4595a.55.55,0,0,0-.00219.77782l.00219.00218.8365.8365a.55.55,0,0,0,.77781.00219L4.5405,15.076,5.643,13.9735a5.96235,5.96235,0,0,0,2.2535.9205V16.45a.55.55,0,0,0,.55.55H9.55a.55.55,0,0,0,.55-.55V14.894a5.96235,5.96235,0,0,0,2.2535-.9205L13.456,15.076a.55.55,0,0,0,.77782.00219L14.236,15.076l.8365-.8365a.55.55,0,0,0,.00219-.77781l-.00219-.00219L13.97,12.357a5.967,5.967,0,0,0,.921-2.2535H16.45a.55.55,0,0,0,.55-.55V8.45a.55.55,0,0,0-.54649-.55349ZM11.207,9A2.207,2.207,0,1,1,9,6.793H9A2.207,2.207,0,0,1,11.207,9Z" />
                                        </svg>
                                    </div>
                                </sp-action-button>
                            </li>
                        ))}
                    </ul>
            </div>
            <div className="bottom-buttons-section">
                <RecordButton 
                    isRecording={isRecording}
                    onRecordClick={handleRecordClick}
                />
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

            {/* 右侧部分 */}
            <div className="section-common">
            <div className="header-section">
                <p className="header-section-text">待执行图层</p>
            </div>
            <div className="table-content">
            {LayerTreeComponent && LayerTreeComponent()}
            </div>
            <div className="bottom-buttons-section">
                    <BackButton isRecording={isRecording} />
                    <SnapshotButton isRecording={isRecording} />
                    <ApplyButton 
                        onClick={applyAdjustments}
                        isRecording={isRecording}
                        disabled={adjustmentSteps.length === 0}
                        progress={progress}
                        isProcessing={isProcessing}  // 现在这个值会正确传递
                    />
            </div>
            </div>
            {/* 底部信息区 */}
            <InfoPlane adjustmentStepsCount={adjustmentSteps.length} />
        </div>
    );
};

export default MainContainer;