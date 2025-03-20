import React, { useState, createContext, useContext, useCallback } from 'react';

// 定义上下文的类型
interface AdjustmentStepsContextType {
    adjustmentSteps: string[];
    addAdjustmentStep: (step: string) => void;
    deleteAdjustmentStep: (index: number) => void;
}

// 创建上下文对象，提供默认值避免未定义错误
export const AdjustmentStepsContext = createContext<AdjustmentStepsContextType>({
    adjustmentSteps: [],
    addAdjustmentStep: () => console.warn('AdjustmentStepsContext 未提供实现'),
    deleteAdjustmentStep: () => console.warn('AdjustmentStepsContext 未提供实现')
});

// 创建 Provider 组件
export const AdjustmentStepsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [adjustmentSteps, setAdjustmentSteps] = useState<string[]>([]);

    // 使用 useCallback 确保函数引用稳定
    const addAdjustmentStep = useCallback((step: string) => {
        console.log('添加步骤:', step);
        // 使用函数式更新确保状态正确更新
        setAdjustmentSteps(prev => {
            if (!prev.includes(step)) {
                const newSteps = [...prev, step];
                console.log('更新后的步骤:', newSteps);
                return newSteps;
            }
            return prev;
        });
    }, []);

    const deleteAdjustmentStep = useCallback((index: number) => {
        setAdjustmentSteps(prev => {
            const newSteps = [...prev];
            newSteps.splice(index, 1);
            return newSteps;
        });
    }, []);

    // 创建稳定的 context 值
    const contextValue = React.useMemo(() => ({
        adjustmentSteps,
        addAdjustmentStep,
        deleteAdjustmentStep
    }), [adjustmentSteps, addAdjustmentStep, deleteAdjustmentStep]);

    return (
        <AdjustmentStepsContext.Provider value={contextValue}>
            {children}
        </AdjustmentStepsContext.Provider>
    );
};

// 创建自定义 Hook
export const useAdjustmentSteps = () => {
    const context = useContext(AdjustmentStepsContext);
    if (!context) {
        throw new Error('useAdjustmentSteps must be used within an AdjustmentStepsProvider');
    }
    return context;
};

export default AdjustmentStepsContext;