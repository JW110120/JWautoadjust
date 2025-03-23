import React, { createContext, useState, useContext, useEffect } from 'react';

// 创建上下文
export const AdjustmentStepsContext = createContext({
    adjustmentSteps: [],
    displayNames: {},
    addAdjustmentStep: (step: string, displayName?: string, addToStart?: boolean) => {},
    deleteAdjustmentStep: (index: number) => {},
    clearAllSteps: () => {}
});

// 创建提供者组件
export const AdjustmentStepsProvider = ({ children }) => {
    const [adjustmentSteps, setAdjustmentSteps] = useState([]);
    const [displayNames, setDisplayNames] = useState({});
    
    // 添加调试日志
    useEffect(() => {
    }, [adjustmentSteps]);

    // 修改：添加防重复逻辑的 addAdjustmentStep 函数
    const addAdjustmentStep = (step, displayName, addToStart = false) => {
        
        // 提取步骤名称（不包含时间戳）
        const stepNameMatch = step.match(/(.*) \(\d+\)/);
        const stepName = stepNameMatch ? stepNameMatch[1] : step;
        
        // 检查是否在短时间内（2秒）添加了相同类型的步骤
        setAdjustmentSteps(prevSteps => {
            const now = Date.now();
            
            // 检查是否有重复
            const isDuplicate = prevSteps.some(existingStep => {
                // 提取现有步骤的名称和时间戳
                const match = existingStep.match(/(.*) \((\d+)\)/);
                if (match) {
                    const existingName = match[1];
                    const existingTimestamp = parseInt(match[2]);
                    
                    // 如果名称相同且时间戳在2秒内，认为是重复
                    return existingName === stepName && (now - existingTimestamp < 100);
                }
                return false;
            });
            
            // 如果是重复的，返回原数组，不做更改
            if (isDuplicate) {
                return prevSteps;
            }
            
            // 如果不是重复的，添加新步骤
            
            // 如果提供了显示名称，更新displayNames
            if (displayName) {
                setDisplayNames(prev => ({
                    ...prev,
                    [step]: displayName
                }));
            }
            
            // 根据 addToStart 参数决定添加位置
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
                addAdjustmentStep, 
                deleteAdjustmentStep,
                clearAllSteps
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