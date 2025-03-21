import React, { useState, createContext, useContext, useCallback, useEffect } from 'react';

// 定义上下文的类型
interface AdjustmentStepsContextType {
    adjustmentSteps: string[];
    displayNames: Record<string, string>; // 新增：存储显示名称的映射
    addAdjustmentStep: (step: string, displayName?: string) => void;
    deleteAdjustmentStep: (index: number) => void;
    clearAllSteps: () => void;
}

// 创建上下文对象，提供默认值避免未定义错误
export const AdjustmentStepsContext = createContext<AdjustmentStepsContextType>({
    adjustmentSteps: [],
    displayNames: {}, // 新增：默认空映射
    addAdjustmentStep: () => console.warn('AdjustmentStepsContext 未提供实现'),
    deleteAdjustmentStep: () => console.warn('AdjustmentStepsContext 未提供实现'),
    clearAllSteps: () => console.warn('AdjustmentStepsContext 未提供实现')
});

// 创建 Provider 组件
export const AdjustmentStepsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // 使用ref来跟踪最新的状态，避免闭包问题
    const [adjustmentSteps, setAdjustmentSteps] = useState<string[]>([]);
    const [displayNames, setDisplayNames] = useState<Record<string, string>>({}); // 新增：存储显示名称
    const stepsRef = React.useRef<string[]>([]);
    
    // 当状态更新时，同步更新ref
    useEffect(() => {
        stepsRef.current = adjustmentSteps;
        console.log('Provider中的adjustmentSteps更新:', adjustmentSteps);
    }, [adjustmentSteps]);

    // 添加调整步骤 - 使用ref确保访问最新状态
    const addAdjustmentStep = useCallback((step: string, displayName?: string) => {
        console.log('Provider - 添加步骤:', step, '显示名称:', displayName, '当前步骤:', stepsRef.current);
        
        // 如果提供了显示名称，更新显示名称映射
        if (displayName) {
            setDisplayNames(prev => ({
                ...prev,
                [step]: displayName
            }));
        }
        
        setAdjustmentSteps(prevSteps => {
            // 确保我们使用最新的状态
            const newSteps = [...prevSteps, step];
            return newSteps;
        });
    }, []);

    // 删除调整步骤
    const deleteAdjustmentStep = useCallback((index: number) => {
        console.log('Provider - 删除步骤索引:', index);
        
        setAdjustmentSteps(prevSteps => {
            const newSteps = [...prevSteps];
            const removedStep = newSteps.splice(index, 1)[0];
            
            // 从显示名称映射中移除
            if (removedStep) {
                setDisplayNames(prev => {
                    const newDisplayNames = {...prev};
                    delete newDisplayNames[removedStep];
                    return newDisplayNames;
                });
            }
            
            return newSteps;
        });
    }, []);

    // 清空所有步骤
    const clearAllSteps = useCallback(() => {
        console.log('Provider - 清空所有步骤');
        setAdjustmentSteps([]);
        setDisplayNames({}); // 清空显示名称映射
    }, []);

    // 创建一个稳定的上下文值对象
    const contextValue = React.useMemo(() => ({
        adjustmentSteps,
        displayNames,
        addAdjustmentStep,
        deleteAdjustmentStep,
        clearAllSteps
    }), [adjustmentSteps, displayNames, addAdjustmentStep, deleteAdjustmentStep, clearAllSteps]);

    return (
        <AdjustmentStepsContext.Provider value={contextValue}>
            {children}
        </AdjustmentStepsContext.Provider>
    );
};

// 自定义Hook
export const useAdjustmentSteps = () => useContext(AdjustmentStepsContext);

export default AdjustmentStepsContext;