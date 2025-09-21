import React, { useState, useEffect } from 'react';
import { app } from 'photoshop';
import { getButtonStyle, handleMouseOver, handleMouseOut } from '../styles/buttonStyles';
import { BackIcon } from '../styles/Icons';
import { useRecordContext } from '../contexts/RecordContext';
import { findSampleLayer, selectLayer } from '../utils/layerUtils';

// 导入所需的 Photoshop API
const { action, core } = require("photoshop");
const { batchPlay, addNotificationListener } = action;
const { executeAsModal, showAlert } = core;

// 快照名称常量
const SNAPSHOT_PREFIX = "调整拆分前"; 

interface BackButtonProps {
    isRecording: boolean;
}

const BackButton: React.FC<BackButtonProps> = ({ isRecording }) => {
    const [hasSnapshot, setHasSnapshot] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const { previousSampleTs, currentSampleTs, setCurrentSampleTs, setPreviousSampleTs } = useRecordContext();

    // 计算按钮是否禁用
    const isButtonDisabled = isRecording || !hasSnapshot || isChecking;

    const buildSnapshotName = (ts?: string | null) => ts ? `${SNAPSHOT_PREFIX} ${ts}` : SNAPSHOT_PREFIX;
    const isSnapshotEntry = (state: any) => (
        (state?.snapshot === true || state?.type === "snapshot" || Object.prototype.hasOwnProperty.call(state || {}, 'snapshot')) &&
        typeof state?.name === 'string'
    );
    const findLatestSnapshotByExact = (historyStates: any[], ts: string) => {
        const targetName = buildSnapshotName(ts);
        for (let i = historyStates.length - 1; i >= 0; i--) {
            const s = historyStates[i];
            if (isSnapshotEntry(s) && s.name.trim() === targetName) return s;
        }
        return null;
    };
    const findLatestSnapshotByPrefix = (historyStates: any[]) => {
        for (let i = historyStates.length - 1; i >= 0; i--) {
            const s = historyStates[i];
            if (isSnapshotEntry(s) && s.name.trim().startsWith(SNAPSHOT_PREFIX)) return s;
        }
        return null;
    };

    const checkSnapshot = async () => {
        if (isChecking) return;

        setIsChecking(true);
        try {
            if (!app.activeDocument) {
                setHasSnapshot(false);
                return;
            }

            const historyStates = app.activeDocument.historyStates;
            if (!historyStates || historyStates.length === 0) {
                setHasSnapshot(false);
                return;
            }
            let snapshotFound = false;
            let targetSnapshot: any = null;
            if (previousSampleTs) {
                targetSnapshot = findLatestSnapshotByExact(historyStates as any[], previousSampleTs);
            }
            if (!targetSnapshot && currentSampleTs) {
                targetSnapshot = findLatestSnapshotByExact(historyStates as any[], currentSampleTs);
            }
            if (!targetSnapshot) {
                targetSnapshot = findLatestSnapshotByPrefix(historyStates as any[]);
            }
            snapshotFound = !!targetSnapshot;
            setHasSnapshot(snapshotFound);
        } catch (error) {
            console.error('checkSnapshot 外层异常:', error);
            setHasSnapshot(false);
        } finally {
            setIsChecking(false);
        }
    };

    const handleBack = async () => {
        console.log(`按钮状态: isRecording=${isRecording}, hasSnapshot=${hasSnapshot}, isChecking=${isChecking}`);
        if (isRecording || !hasSnapshot) {
            return;
        }

        try {
            const historyStates = app.activeDocument.historyStates as any[];
            if (!historyStates || historyStates.length === 0) {
                showAlert({ message: '未找到“调整拆分前”相关快照' });
                return;
            }
            // 优先使用 previousSampleTs -> currentSampleTs 的精确命中，再兜底按前缀匹配最新快照
            let targetSnapshot: any = null;
            if (previousSampleTs) {
                targetSnapshot = findLatestSnapshotByExact(historyStates, previousSampleTs);
            }
            if (!targetSnapshot && currentSampleTs) {
                targetSnapshot = findLatestSnapshotByExact(historyStates, currentSampleTs);
            }
            if (!targetSnapshot) {
                targetSnapshot = findLatestSnapshotByPrefix(historyStates);
            }

            if (targetSnapshot) {
                const snapshotId = targetSnapshot.ID ?? targetSnapshot.id;
                if (!snapshotId) {
                    showAlert({ message: '快照对象缺少ID，无法返回！' });
                    return;
                }
                (window as any).__JW_isReverting = true;
                const { addNotificationListener } = require("photoshop").action;
                let __jwCleared = false;
                const __jwTempListener = addNotificationListener(["historyStateChanged"], () => {
                    if (__jwCleared) return;
                    __jwCleared = true;
                    (window as any).__JW_isReverting = false;
                    try { window.dispatchEvent(new CustomEvent('JW_AFTER_REVERT')); } catch {}
                    if (__jwTempListener?.remove) { __jwTempListener.remove(); }
                });
                setTimeout(() => {
                    if (!__jwCleared) {
                        (window as any).__JW_isReverting = false;
                        try { window.dispatchEvent(new CustomEvent('JW_AFTER_REVERT')); } catch {}
                        if (__jwTempListener?.remove) { __jwTempListener.remove(); }
                    }
                }, 1000);
                await executeAsModal(async () => {
                    await batchPlay(
                        [
                            { _obj: "select", _target: [{ _ref: "historyState", _id: snapshotId }] }
                        ],
                        { synchronousExecution: true, modalBehavior: "execute" }
                    );
                }, { commandName: "返回到调整拆分前快照" });

                // 回退后：尝试从快照名提取时间戳并同步上下文（若存在）
                try {
                    const nameStr = (targetSnapshot?.name || '').toString().trim();
                    let tsUsed: string | null = null;
                    if (nameStr.startsWith(SNAPSHOT_PREFIX)) {
                        const rest = nameStr.slice(SNAPSHOT_PREFIX.length).trim();
                        tsUsed = rest || null;
                    }
                    if (tsUsed) {
                        setCurrentSampleTs(tsUsed);
                        setPreviousSampleTs(null);
                        // 新增：按名称优先精确匹配选择对应样本图层
                        try {
                            const preferName = `样本图层 ${tsUsed}`;
                            const found = await findSampleLayer(preferName);
                            if (found?.id) {
                                await selectLayer(found.id);
                            }
                        } catch (e) {
                            console.warn('回退后选择样本图层失败:', e);
                        }
                        // 新增：在上下文与图层同步完成后再次广播，触发记录面板等刷新
                        try { window.dispatchEvent(new CustomEvent('JW_AFTER_REVERT_SYNCED')); } catch {}
                    }
                } catch (e) {
                    console.warn('回退后同步样本时间戳失败:', e);
                }

                // 回退后刷新按钮可用状态
                await checkSnapshot();
            } else {
                showAlert({ message: '未找到“调整拆分前”相关快照' });
            }
        } catch (error) {
            showAlert({ message: `返回快照失败: ${error.message || '未知错误'}` });
        } finally {
            setTimeout(() => { (window as any).__JW_isReverting = false; }, 300);
        }
    };

    // 新增：点击时先清理 hover 状态与焦点，避免禁用后 mouseout 不触发导致悬停样式残留
    const handleClick = (e: React.MouseEvent<HTMLElement>) => {
        if (isButtonDisabled) return;
        handleMouseOut(e);
        (e.currentTarget as HTMLElement).blur();
        handleBack();
    };

    // 监听文档变化
    useEffect(() => {
        let isMounted = true;
        
        const checkSnapshotOnDocChange = async () => {
            if (!isMounted) return;
            await checkSnapshot();
        };

        // 初始检查
        checkSnapshotOnDocChange();

        // 使用防抖函数减少频繁调用
        const debouncedCheck = (delay = 100) => {
            let timeoutId: any;
            return () => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    if (isMounted) {
                        checkSnapshotOnDocChange();
                    }
                }, delay);
            };
        };

        const debouncedCheckFn = debouncedCheck();

        const listeners = [
            // 监听文档选择事件
            addNotificationListener(
                ["select"], 
                (event: any, descriptor: any) => {
                    if (descriptor?._target?.[0]?._ref === "document") {
                        debouncedCheckFn();
                    }
                }
            ),
            // 监听文档打开和关闭事件
            addNotificationListener(
                ["open", "close", "newDocument"], 
                () => {
                    debouncedCheckFn();
                }
            ),
            // 监听历史记录变化
            addNotificationListener(
                ["historyStateChanged"], 
                () => {
                    debouncedCheckFn();
                }
            ),
            // 监听快照创建（make）
            addNotificationListener(
                ["make"], 
                (event: any, descriptor: any) => {
                    if (descriptor?._target?.[0]?._ref === "snapshotClass") {
                        debouncedCheckFn();
                    }
                }
            )
        ];
        
        // 新增：监听自定义事件，文件区创建/刷新快照后立即自检
        const handleCustomRefresh = () => debouncedCheckFn();
        window.addEventListener('JW_REFRESH_SNAPSHOT', handleCustomRefresh as any);
        
        // 清理函数
        return () => {
            isMounted = false;
            listeners.forEach((listener: any) => {
                if (listener?.remove) {
                    listener.remove();
                }
            });
            window.removeEventListener('JW_REFRESH_SNAPSHOT', handleCustomRefresh as any);
        };
    }, []);

    // 获取按钮提示文本
    const getButtonTitle = () => {
        if (isRecording) return '录制时无法返回';
        if (isChecking) return '正在检查快照...';
        if (!hasSnapshot) return '没有可返回的快照';
        return '返回到调整拆分前';
    };

    return (
        <sp-action-button
            aria-disabled={isButtonDisabled}
            role="button"
            onClick={handleClick}
            title={getButtonTitle()}
            className={`bottom-button ${isButtonDisabled ? 'disabled' : ''}`}
            style={getButtonStyle(isButtonDisabled)}
            onMouseOver={(e) => handleMouseOver(e, isButtonDisabled)}
            onMouseOut={handleMouseOut}
        >
            <div slot="icon" className="icon">
                <BackIcon disabled={isButtonDisabled} />
            </div>
            <span>回退</span>
        </sp-action-button>
    );
};

export default BackButton;