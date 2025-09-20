import React, { useContext, useState, useRef, useEffect  } from 'react';
import { app } from 'photoshop';
import { AdjustmentStepsContext } from './contexts/AdjustmentStepsContext';
import { useRecord } from './RecordArea';
import FileArea from './FileArea';
import InfoPlane from './components/InfoPlane';
import { DeleteButton } from './components/DeleteButton';
import BackButton from './components/BackButton';
import RecordButton from './components/RecordButton';
import ApplyButton from './components/ApplyButton';
import { CheckmarkCircleIcon, CloseIcon, ErrorCircleIcon } from './styles/Icons';

const MainContainer: React.FC = () => {
    return <MainContainerContent />;
};

const MainContainerContent: React.FC = () => {
    const { LayerTreeComponent, applyAdjustments, progress, isProcessing } = FileArea();
    const { adjustmentSteps, displayNames, deleteAdjustmentStep } = useContext(AdjustmentStepsContext);

    // Toast 管理：监听全局事件并渲染可关闭的 Spectrum Web Components sp-toast
    type ToastMsg = { id: number; message: string; variant?: string; timeout?: number };
    const [toasts, setToasts] = useState<ToastMsg[]>([]);
    const removeToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

    const ToastView: React.FC<{ item: ToastMsg; onClose: (id: number) => void }> = ({ item, onClose }) => {
        const ref = useRef<any>(null);
        const [open, setOpen] = useState(true);
        useEffect(() => {
            const el = ref.current as any;
            if (!el) return;
            // 首次渲染确保打开
            el.open = true;
            const handleClose = () => onClose(item.id);
            el.addEventListener('close', handleClose);
            // 本地接管自动关闭：先合上，再延迟从列表移除
            const visibleMs = Math.max(item.timeout || 3000, 2000);
            const t1 = window.setTimeout(() => {
                setOpen(false);
                if (ref.current) (ref.current as any).open = false;
            }, visibleMs);
            const t2 = window.setTimeout(() => onClose(item.id), visibleMs + 350);
            return () => {
                el.removeEventListener('close', handleClose);
                clearTimeout(t1);
                clearTimeout(t2);
            };
        }, [item.id, item.timeout, onClose]);

        // 同步 open 状态到原生属性，避免 React 对自定义元素布尔属性的处理导致无法关闭
        useEffect(() => {
            const el = ref.current as any;
            if (!el) return;
            el.open = open;
        }, [open]);

        return (
            <sp-toast ref={ref} timeout={Math.max(item.timeout || 3000, 2000)} variant={item.variant as any}>
                {/* 左侧 icon：根据变体切换 */}
                <span slot="icon" aria-hidden="true" style={{ display: 'inline-flex' }}>
                    {item.variant === 'positive' ? <CheckmarkCircleIcon /> : null}
                    {item.variant === 'negative' ? <ErrorCircleIcon /> : null}
                </span>
                {/* 文本包裹，保留足够的左间距 */}
                <span className="toast-message-text">{item.message}</span>
                {/* 关闭分隔线 + 图标按钮，使用单一 action 槽包装器，避免布局错乱 */}
                <span slot="action" className="toast-action-wrap">
                    <span className="toast-divider" aria-hidden="true" />
                    <sp-button
                        static-color="white"
                        quiet
                        onClick={() => {
                            setOpen(false);
                            const el = ref.current as any;
                            if (el) el.open = false;
                            window.setTimeout(() => onClose(item.id), 250);
                        }}
                        aria-label="关闭"
                        title="关闭"
                    >
                        <CloseIcon />
                    </sp-button>
                </span>
            </sp-toast>
        );
    };

    useEffect(() => {
        const handler = (e: any) => {
            const detail = e?.detail || {};
            const id = Date.now() + Math.random();
            // 单例：新 Toast 到来时替换旧的，避免出现多个
            setToasts([
                {
                    id,
                    message: detail.message || '',
                    variant: detail.variant,
                    timeout: Math.max(detail.timeout || 3000, 2000),
                },
            ]);
        };
        window.addEventListener('show-toast', handler as EventListener);
        return () => window.removeEventListener('show-toast', handler as EventListener);
    }, []);

    const { 
        isRecording, 
        startRecording, 
        stopRecording,
        deleteAdjustmentAndLayer,
        applyAdjustment,
        applyDirectAdjustment,
        selectedIndices,
        selectedIndex,
        handleItemSelect,
        handleBlankAreaClick,
        handleDragStart,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        deleteSelectedItems,
        draggedIndex,
        dragOverIndex,
        getItemClass, // 新增导入
        handleDragEnd,
        handleContainerDragOver,
        containerRef,
        sampleLayerId
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
            const { showAlert } = require("photoshop").core;
            showAlert({ message: `录制失败: ${error.message}` });
        }
    };

    const handleDeleteStep = async (index) => {
        if (!isRecording && index >= 0) {
            try {
                await deleteAdjustmentAndLayer(index);
            } catch (error) {
                console.error('删除步骤失败:', error);
                const { showAlert } = require("photoshop").core;
                showAlert({ message: `删除步骤失败: ${error.message}` });
            }
        }
    };

    const handleStepClick = (index) => {
        // 立即响应点击，无额外逻辑，提升响应速度
        handleItemSelect(index, null);
    };

    const handleStepDoubleClick = async (index) => {
        if (!isRecording && index >= 0) {
            try {
                const { executeAsModal, showAlert } = require("photoshop").core;
                const { batchPlay } = require("photoshop").action;
                
                const doc = app.activeDocument;
                // 优先使用上下文中的样本图层ID，找不到再回退到名称递归查找
                const resolveSampleLayerId = () => {
                    if (sampleLayerId) return sampleLayerId;
                    const findByName = (layers, name) => {
                        for (const lyr of layers) {
                            if (lyr.name === name) return lyr.id;
                            if (lyr.kind === 'group' && lyr.layers) {
                                const child = findByName(lyr.layers, name);
                                if (child) return child;
                            }
                        }
                        return null;
                    };
                    return findByName(doc.layers, '样本图层');
                };
                const targetId = resolveSampleLayerId();
    
                if (targetId) {
                    await executeAsModal(async () => {
                        await batchPlay([{
                            _obj: "select",
                            _target: [{ _ref: "layer", _id: targetId }],
                            makeVisible: true,
                            _options: { dialogOptions: "dontDisplay" }
                        }], { synchronousExecution: true });
    
                        const result = await batchPlay([{
                            _obj: "get",
                            _target: [{ _ref: "layer", _id: targetId }],
                            _options: { dialogOptions: "dontDisplay" }
                        }], { synchronousExecution: true });
    
                        const filterFX = result[0]?.smartObject?.filterFX || [];
                        let filterIndex = filterFX.length - 1 - index;  // 修正索引换算
                          
                        if (filterIndex < 0) filterIndex = 0;
                        if (filterIndex >= filterFX.length) filterIndex = filterFX.length - 1;
    
                        if (filterIndex >= 0 && filterIndex < filterFX.length) {
                            await batchPlay([{
                                _obj: "set",
                                _target: [
                                    {
                                        _ref: "filterFX",
                                        _index: filterIndex + 1  // PS的filterFX索引从1开始
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
                const resolveSampleLayerId = () => {
                    if (sampleLayerId) return sampleLayerId;
                    const findByName = (layers, name) => {
                        for (const lyr of layers) {
                            if (lyr.name === name) return lyr.id;
                            if (lyr.kind === 'group' && lyr.layers) {
                                const child = findByName(lyr.layers, name);
                                if (child) return child;
                            }
                        }
                        return null;
                    };
                    return findByName(doc.layers, '样本图层');
                };
                const targetId = resolveSampleLayerId();
    
                if (targetId) {
                    await executeAsModal(async () => {
                        await batchPlay([{
                            _obj: "select",
                            _target: [{ _ref: "layer", _id: targetId }],
                            makeVisible: true,
                            _options: { dialogOptions: "dontDisplay" }
                        }], { synchronousExecution: true });
    
                        const result = await batchPlay([{
                            _obj: "get",
                            _target: [{ _ref: "layer", _id: targetId }],
                            _options: { dialogOptions: "dontDisplay" }
                        }], { synchronousExecution: true });
    
                        const filterFX = result[0]?.smartObject?.filterFX || [];
                        let filterIndex = filterFX.length - 1 - index;
                          
                        if (filterIndex < 0) filterIndex = 0;
                        if (filterIndex >= filterFX.length) filterIndex = filterFX.length - 1;
    
                        if (filterIndex >= 0 && filterIndex < filterFX.length) {
                            await batchPlay([{
                                _obj: "set",
                                _target: [
                                    {
                                        _ref: "filterFX",
                                        _index: filterIndex + 1
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
            {/* 顶部基于 Spectrum Web Components 的 Toast 区域 */}
            <div className="toast-region" role="region" aria-label="Toast Notifications">
                {toasts.map((t) => (
                    <ToastView key={t.id} item={t} onClose={removeToast} />
                ))}
            </div>
            
            {/* 左侧部分 */}
            <div className="section-common">
            <div className="header-section">
                <p className="header-section-text">记录操作信息</p>
            </div>
            <div className="table-content" onClick={(e) => {
                // 如果点击的不是li元素或li的子元素，则取消选择
                const clickedElement = (e.target as HTMLElement);
                const isListItem = clickedElement.tagName === 'LI' || clickedElement.closest('li');
                if (!isListItem) {
                    handleBlankAreaClick();
                }
            }}>
                    <ul className="operation-list"
                        ref={containerRef}
                        onDragOver={(e) => {
                            e.preventDefault();
                            if (e.target === e.currentTarget) {
                                handleContainerDragOver(e);
                            }
                        }}
                        onDrop={async (e) => {
                            // 顶部空白处释放：按照当前 dropTargetIndex 处理，默认按最上方插入
                            if (e.target === e.currentTarget) {
                                await handleDrop(e, 0);
                            }
                        }}
                        onClick={(e) => {
                            // 如果点击的是空白区域（不是列表项），取消选中
                            if (e.target === e.currentTarget) {
                                handleBlankAreaClick();
                            }
                        }}
                    >
                        {adjustmentSteps.map((step, index) => {
                            const isSelected = selectedIndices.size > 0 ? selectedIndices.has(index) : index === selectedIndex;
                            const isDraggedOver = dragOverIndex === index;
                            const isDragged = draggedIndex === index;
                            
                            return (
                            <li 
                                key={index}
                                draggable={true}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (e.ctrlKey || e.metaKey || e.shiftKey) {
                                        handleItemSelect(index, e);
                                    } else {
                                        handleStepClick(index);
                                    }
                                }}
                                onDoubleClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleStepDoubleClick(index);
                                }}
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragLeave={handleDragLeave}
                                onDragEnd={handleDragEnd}
                                onDrop={async (e) => await handleDrop(e, index)}
                                className={`${
                                    isSelected ? 'selected' : ''
                                } ${
                                    isDragged ? 'dragging' : ''
                                } ${getItemClass(index)}`}
                                style={{
                                    opacity: isDragged ? 0.5 : 1
                                }}
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
                            );
                        })}
                    </ul>
            </div>
            <div className="bottom-buttons-section">
                <RecordButton 
                    isRecording={isRecording}
                    onRecordClick={handleRecordClick}
                />
                <DeleteButton 
                    isRecording={isRecording}
                    hasSteps={adjustmentSteps.length > 0 && (selectedIndex >= 0 || selectedIndices.size > 0)}
                    onDelete={async () => {
                        if (selectedIndices.size === 0 && (selectedIndex === null || selectedIndex < 0)) {
                            return;
                        }
                        if (selectedIndices.size > 0) {
                            await deleteSelectedItems();
                        } else if (selectedIndex >= 0 && selectedIndex < adjustmentSteps.length) {
                            await handleDeleteStep(selectedIndex);
                        }
                    }}
                    index={selectedIndex ?? -1}
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