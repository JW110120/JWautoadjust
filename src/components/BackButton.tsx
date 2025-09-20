import React, { useState, useEffect } from 'react';
import { app } from 'photoshop';
import { getButtonStyle, handleMouseOver, handleMouseOut } from '../styles/buttonStyles';
import { BackIcon } from '../styles/Icons';

// 导入所需的 Photoshop API
const { action, core } = require("photoshop");
const { batchPlay, addNotificationListener } = action;
const { executeAsModal, showAlert } = core;

// 快照名称常量
const SNAPSHOT_NAME = "调整拆分前"; 

interface BackButtonProps {
    isRecording: boolean;
}

const BackButton: React.FC<BackButtonProps> = ({ isRecording }) => {
    const [hasSnapshot, setHasSnapshot] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    
    // 计算按钮是否禁用
    const isButtonDisabled = isRecording || !hasSnapshot || isChecking;

    const checkSnapshot = async () => {
        if (isChecking) return;

        setIsChecking(true);
        try {
            if (!app.activeDocument) {
                setHasSnapshot(false);
                return;
            }

            // 直接用 historyStates 检查快照
            const historyStates = app.activeDocument.historyStates;
            if (!historyStates || historyStates.length === 0) {
                setHasSnapshot(false);
                return;
            }
            let snapshotFound = false;
            const targetSnapshot = historyStates.find(
                state =>
                    (state.snapshot === true || state.type === "snapshot" || state.hasOwnProperty('snapshot')) &&
                    typeof state.name === 'string' &&
                    state.name.trim() === SNAPSHOT_NAME
            );
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
            const historyStates = app.activeDocument.historyStates;
            if (!historyStates || historyStates.length === 0) {
                showAlert({ message: '未找到"调整拆分前"快照' });
                return;
            }
            // 从后往前找第一个匹配的快照（即最新的）
            let targetSnapshot = null;
            for (let i = historyStates.length - 1; i >= 0; i--) {
                const state = historyStates[i];
                if (
                    (state.snapshot === true || state.type === "snapshot" || state.hasOwnProperty('snapshot')) &&
                    typeof state.name === 'string' &&
                    state.name.trim() === SNAPSHOT_NAME
                ) {
                    targetSnapshot = state;
                    break;
                }
            }

            if (targetSnapshot) {
                // 兼容 ID/id
                const snapshotId = targetSnapshot.ID ?? targetSnapshot.id;
                if (!snapshotId) {
                    showAlert({ message: '快照对象缺少ID，无法返回！' });
                    return;
                }
                // 标记正在回退，通知其他区域延迟响应历史事件
                (window as any).__JW_isReverting = true;
                await executeAsModal(async () => {
                    await batchPlay(
                        [
                            { _obj: "select", _target: [{ _ref: "historyState", _id: snapshotId }] }
                        ],
                        { synchronousExecution: true, modalBehavior: "execute" }
                    );
                }, { commandName: "返回到调整拆分前快照" });

                // 回退后刷新按钮可用状态
                await checkSnapshot();
            } else {
                showAlert({ message: '未找到"调整拆分前"快照' });
            }
        } catch (error) {
            showAlert({ message: `返回快照失败: ${error.message || '未知错误'}` });
        } finally {
            // 回退完成后，稍作延迟再清除回退标志，避免其他监听器在回退过程中访问失效的图层ID
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
        
        // 清理函数
        return () => {
            isMounted = false;
            listeners.forEach((listener: any) => {
                if (listener?.remove) {
                    listener.remove();
                }
            });
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
            disabled={isButtonDisabled as any}
            onClick={handleClick}
            title={getButtonTitle()}
            className={`bottom-button ${isButtonDisabled ? 'disabled' : ''}`}
            style={getButtonStyle(isButtonDisabled)}
            onMouseOver={(e) => handleMouseOver(e, isButtonDisabled)}
            onMouseOut={handleMouseOut}
        >
            <div slot="icon" className="icon">
                <BackIcon />
            </div>
            <span>回退</span>
        </sp-action-button>
    );
};

export default BackButton;