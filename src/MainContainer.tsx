import React, { useContext, useEffect, useState } from 'react';
import { app } from 'photoshop';
import { AdjustmentStepsContext } from './AdjustmentStepsContext';
import Record from './record';
import Adjust from './adjust';

const MainContainer: React.FC = () => {
    const { adjustmentSteps } = useContext(AdjustmentStepsContext);
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

    const [leftWidth, setLeftWidth] = useState('50%');
    const [isDragging, setIsDragging] = useState(false);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
            const container = document.querySelector('.main-container') as HTMLElement;
            const containerRect = container.getBoundingClientRect();
            const offsetX = e.clientX - containerRect.left;
            const newLeftWidth = (offsetX / containerRect.width) * 100;
            setLeftWidth(`${Math.max(20, Math.min(80, newLeftWidth))}%`);
            
            // 阻止默认行为，防止文本选择
            e.preventDefault();
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

    const toggleGroup = (path: string) => {
        setCollapsedGroups(prev => ({
            ...prev,
            [path]: !prev[path]
        }));
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
                            style={{ margin: '0 8px 0 0', verticalAlign: 'middle' }}
                        />
                        {layer.name}
                    </li>
                );
            }
            return null;
        });
    };

    // 创建Record实例
    const recordInstance = Record();

    // 处理记录按钮点击
    const handleRecordClick = async () => {
        try {
            const { showAlert } = require("photoshop").core;
            if (recordInstance.isRecording) {
                recordInstance.stopRecording();
                showAlert({ message: '录制已停止！' });
            } else {
                await recordInstance.startRecording();
            }
        } catch (error) {
            console.error('录制失败:', error);
            const { showAlert } = require("photoshop").core;
            showAlert({ message: `录制失败: ${error.message}` });
        }
    };

    return (
        <div className="main-container">
            <div className="left-section" style={{ width: leftWidth }}>
                <p style={{ margin: '8px 0', fontSize: '18px', fontWeight: 'bold' }}>记录操作信息</p>
                {/* 记录区域 */}
                <div className="operation-record" style={{
                    height: 'calc(100vh - 180px)', // 设置固定高度
                    overflowY: 'auto' // 添加垂直滚动条
                }}>
                    <ul className="operation-list">
                        {adjustmentSteps.map((step, index) => (
                            <li key={index}>{`${index + 1}. ${step}`}</li>
                        ))}
                    </ul>
                </div>
                {/* 按钮区域 */}
                <div className="bottom-buttons">
                    <button>+ 新增</button>
                    <button onClick={handleRecordClick}><i className="record-icon"></i> 记录</button>
                    <button><i className="delete-icon"></i> 删除</button>
                </div>
            </div>
            <div
                className="splitter"
                style={{ 
                    left: `calc(${leftWidth} - 3px)`, // 调整位置，使分割线居中
                    transform: 'translateX(-50%)' // 确保分割线在正确位置
                }}
                onMouseDown={handleMouseDown}
            />
            <div className="right-section" style={{ width: `calc(100% - ${leftWidth})` }}>
                <h2>待执行图层</h2>
                {/* 文件树区域 */}
                <div className="layer-section" style={{ 
                    height: 'calc(100vh - 180px)', // 设置固定高度
                    overflowY: 'auto' // 添加垂直滚动条
                }}>
                    <p>
                        当前文件: {documentInfo.fileName}
                        <span style={{ margin: '0 16px' }}>|</span>
                        {documentInfo.groupCount}个组，{documentInfo.pixelLayerCount}个像素图层
                    </p>
                    <ul className="layer-list">
                        {app.activeDocument ? renderLayerTree(app.activeDocument.layers) : null}
                    </ul>
                </div>
                {/* 按钮区域 */}
                <div className="right-bottom-buttons">
                    <button onClick={adjustInstance.handleCreateSnapshot}>
                        <i className="snapshot-icon"></i> 新建快照
                    </button>
                    <button><i className="apply-icon"></i> 应用</button>
                    <button><i className="stop-icon"></i> 停止</button>
                </div>
            </div>
        </div>
    );
};

export default MainContainer;