import React, { useContext, useEffect, useState } from 'react';
import { AdjustmentStepsContext } from './AdjustmentStepsContext';
import { useRecord, RecordArea, AdjustmentMenu, DeleteButtonWrapper as DeleteButton } from './RecordArea';
import FileArea from './FileArea';  // 修改导入方式
import { RecordProvider } from './contexts/RecordContext';

const MainContainer: React.FC = () => {
    return (
        <RecordProvider>
            <MainContainerContent />
        </RecordProvider>
    );
};

// 将主要内容移到单独的组件中
const MainContainerContent: React.FC = () => {
    const { adjustmentSteps, displayNames, deleteAdjustmentStep } = useContext(AdjustmentStepsContext);
    const { LayerTreeComponent, handleCreateSnapshot, applyAdjustments } = FileArea();  // 修改使用方式
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

    // 修改处理删除的函数
    const handleDeleteStep = async (index) => {
        if (!isRecording && index >= 0) {
            try {
                // 在删除之前计算新的索引
                const newLength = adjustmentSteps.length - 1;
                const newIndex = index === adjustmentSteps.length - 1 ? newLength - 1 : index;
                
                await deleteAdjustmentAndLayer(index);
                
                // 删除后，如果还有记录
                if (newLength > 0) {
                    setSelectedStepIndex(newIndex);
                } else {
                    // 如果没有记录了，重置选择
                    setSelectedStepIndex(-1);
                }
            } catch (error) {
                console.error('删除步骤失败:', error);
                const { showAlert } = require("photoshop").core;
                showAlert({ message: `删除步骤失败: ${error.message}` });
            }
        }
    };

    // 处理点击步骤项
    const handleStepClick = (index) => {
        setSelectedStepIndex(index);
    };

    return (
        <div className="main-container" style={{ 
            backgroundColor: '#222', 
            color: '#fff',
            display: 'flex',
            width: '100%',
            height: '100vh'  // 修改这里，使用视口高度
        }}>
            <div className="left-section" style={{ 
                width: '50%',
                display: 'flex',
                flexDirection: 'column',
                height: '100%'  // 添加这行确保左侧区域填充满高度
            }}>
                <div style={{ 
                    padding: '10px', 
                    backgroundColor: '#333',
                    borderBottom: '1px solid #444'
                }}>
                    <p style={{ margin: '0', fontSize: '16px', fontWeight: 'bold' }}>记录操作信息</p>
                </div>
                {/* 记录区域 - 修改这里使用displayNames显示步骤名称，并根据selectedStepIndex高亮 */}
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
                                className={index === selectedStepIndex ? 'selected' : ''}
                            >
                                <span className="step-number">
                                    {adjustmentSteps.length - index}.
                                </span>
                                <span className="step-name">{displayNames[step] || step}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                {/* 按钮区域 - 使用新的 DeleteButton 组件 */}
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
            {/* 右侧部分保持不变 */}
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
                {/* 更新组件使用方式 */}
                {LayerTreeComponent && <LayerTreeComponent />}
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
        </div>
    );
};

export default MainContainer;