import React, { useContext } from 'react';
import { AdjustmentStepsContext } from './AdjustmentStepsContext';
import { useRecord } from './record';  // 确保这里使用命名导入
import Adjust from './adjust';

const MainContainer: React.FC = () => {
    const { adjustmentSteps } = useContext(AdjustmentStepsContext);
    const adjustInstance = Adjust();
    const { startRecording, stopRecording, isRecording } = useRecord();

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
                borderRight: '1px solid #444',
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
                {/* 记录区域 */}
                <div className="operation-record" style={{
                    flex: 1,
                    overflowY: 'auto',
                    backgroundColor: '#222'
                }}>
                    <ul className="operation-list" style={{ 
                        listStyle: 'none', 
                        padding: '0', 
                        margin: '0' 
                    }}>
                        {adjustmentSteps.map((step, index) => (
                            <li 
                                key={index}
                                style={{ 
                                    padding: '10px 15px',
                                    borderBottom: '1px solid #333',
                                    color: index === 2 ? '#fff' : '#ccc',
                                    backgroundColor: index === 2 ? '#0078d7' : 'transparent',
                                    cursor: 'pointer'
                                }}
                            >
                                {`${index + 1}.${step}`}
                            </li>
                        ))}
                    </ul>
                </div>
                {/* 按钮区域 */}
                <div className="bottom-buttons" style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '10px',
                    backgroundColor: '#333',
                    borderTop: '1px solid #444'
                }}>
                    <button style={{ 
                        backgroundColor: '#444',
                        border: 'none',
                        color: '#fff',
                        padding: '8px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}>
                        <span style={{ marginRight: '5px' }}>+</span> 新增
                    </button>
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
                        <span style={{ marginRight: '5px' }}>⏺</span> 记录
                    </button>
                    <button style={{ 
                        backgroundColor: '#444',
                        border: 'none',
                        color: '#fff',
                        padding: '8px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}>
                        <span style={{ marginRight: '5px' }}>🗑</span> 删除
                    </button>
                </div>
            </div>
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
                {/* 使用Adjust组件的LayerTreeComponent */}
                {adjustInstance.LayerTreeComponent && <adjustInstance.LayerTreeComponent />}
                <div className="right-bottom-buttons" style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '10px',
                    backgroundColor: '#333',
                    borderTop: '1px solid #444'
                }}>
                    <button 
                        onClick={adjustInstance.handleCreateSnapshot}
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
                        onClick={adjustInstance.applyAdjustments}
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