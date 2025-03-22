// 在 MainContainer.tsx 中修改
import React, { useContext, useEffect, useState } from 'react';
import { AdjustmentStepsContext } from './AdjustmentStepsContext';
import { useRecord, RecordArea, AdjustmentMenu, DeleteButtonWrapper as DeleteButton } from './RecordArea';
import FileArea from './FileArea';  // 修改导入方式

const MainContainer: React.FC = () => {
    const { adjustmentSteps, displayNames, deleteAdjustmentStep } = useContext(AdjustmentStepsContext);
    const { isRecording, startRecording, stopRecording } = useRecord();
    const { LayerTreeComponent, handleCreateSnapshot, applyAdjustments } = FileArea();  // 修改使用方式
    const [selectedStepIndex, setSelectedStepIndex] = useState(-1);

    // 添加调试日志
    useEffect(() => {
        console.log('MainContainer中的adjustmentSteps:', adjustmentSteps);
    }, [adjustmentSteps]);

    // 删除这一行
    // const adjustInstance = Adjust();
    // 处理记录按钮点击
    const handleRecordClick = async () => {
        try {
            const { showAlert } = require("photoshop").core;  // 移到函数顶部
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

    // 处理删除步骤
    const handleDeleteStep = (index) => {
        deleteAdjustmentStep(index);
        // 如果删除的是当前选中项，重置选中状态
        if (index === selectedStepIndex) {
            setSelectedStepIndex(-1);
        } else if (index < selectedStepIndex) {
            // 如果删除的项在选中项之前，选中项索引需要减1
            setSelectedStepIndex(selectedStepIndex - 1);
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
            height: '100%'
        }}>
            <div className="left-section" style={{ 
                width: '50%',
                display: 'flex',
                flexDirection: 'column'
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
                    <AdjustmentMenu />
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
                    {/* 修改这里，传递必要的属性 */}
                    <DeleteButton 
                        isRecording={isRecording}
                        hasSteps={adjustmentSteps.length > 0}
                        onDelete={() => selectedStepIndex >= 0 ? handleDeleteStep(selectedStepIndex) : null}
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