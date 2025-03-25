import React, { createContext, useState, useContext, useEffect } from 'react';

// 创建上下文
export const AdjustmentStepsContext = createContext({
    adjustmentSteps: [],
    displayNames: {},
    selectedIndex: null, // 修改为 null
    addAdjustmentStep: (step: string, displayName?: string, addToStart?: boolean) => {},
    deleteAdjustmentStep: (index: number) => {},
    clearAllSteps: () => {},
    setSelectedIndex: (index: number) => {}
});

// 创建提供者组件
export const AdjustmentStepsProvider = ({ children }) => {
    const [adjustmentSteps, setAdjustmentSteps] = useState([]);
    const [displayNames, setDisplayNames] = useState({});
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null); // 修改为 null 并添加类型注解

    // 添加调试日志
    useEffect(() => {
    }, [adjustmentSteps]);

    const addAdjustmentStep = (step, displayName, addToStart = false) => {
        const stepNameMatch = step.match(/(.*) \(\d+\)/);
        const stepName = stepNameMatch ? stepNameMatch[1] : step;
        
        setAdjustmentSteps(prevSteps => {
            const now = Date.now();
            
            // 检查是否有重复
            const isDuplicate = prevSteps.some(existingStep => {
                const match = existingStep.match(/(.*) \((\d+)\)/);
                if (match) {
                    const existingName = match[1];
                    const existingTimestamp = parseInt(match[2]);
                    return existingName === stepName && (now - existingTimestamp < 100);
                }
                return false;
            });
            
            if (isDuplicate) {
                return prevSteps;
            }
            
            if (displayName) {
                setDisplayNames(prev => ({
                    ...prev,
                    [step]: displayName
                }));
            }
            
            // 简化插入逻辑，直接根据 addToStart 决定插入位置
            return addToStart ? [step, ...prevSteps] : [...prevSteps, step];
        });
    };

    // 删除步骤
    const deleteAdjustmentStep = (index) => {
        console.log('删除步骤，索引:', index);
        setAdjustmentSteps(prevSteps => {
            const newSteps = [...prevSteps];
            newSteps.splice(index, 1);
            return newSteps;
        });
    };

    // 清空所有步骤
    const clearAllSteps = () => {
        setAdjustmentSteps([]);
        setDisplayNames({});
    };

    return (
        <AdjustmentStepsContext.Provider 
            value={{ 
                adjustmentSteps, 
                displayNames,
                selectedIndex, 
                addAdjustmentStep, 
                deleteAdjustmentStep,
                clearAllSteps,
                setSelectedIndex 
            }}
        >
            {children}
        </AdjustmentStepsContext.Provider>
    );
};

// 创建自定义钩子
export const useAdjustmentSteps = () => {
    return useContext(AdjustmentStepsContext);
};