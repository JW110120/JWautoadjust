import React, { createContext, useState, useContext, useEffect } from 'react';

// 创建上下文
export const AdjustmentStepsContext = createContext({
    adjustmentSteps: [],
    displayNames: {},
    selectedIndex: -1, // 添加这一行
    addAdjustmentStep: (step: string, displayName?: string, addToStart?: boolean) => {},
    deleteAdjustmentStep: (index: number) => {},
    clearAllSteps: () => {},
    setSelectedIndex: (index: number) => {} // 添加这一行
});

// 创建提供者组件
export const AdjustmentStepsProvider = ({ children }) => {
    const [adjustmentSteps, setAdjustmentSteps] = useState([]);
    const [displayNames, setDisplayNames] = useState({});
    const [selectedIndex, setSelectedIndex] = useState(-1); // 添加这一行

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
            
            return [step, ...prevSteps];
        });
    };

    // 删除步骤
    const deleteAdjustmentStep = (index: number) => {
        console.log('删除步骤，索引:', index);
        setAdjustmentSteps(prevSteps => {
            const newSteps = [...prevSteps];
            const deletedStep = newSteps[index];
            newSteps.splice(index, 1);
            
            // 删除对应的 displayName
            if (deletedStep) {
                setDisplayNames(prev => {
                    const newDisplayNames = { ...prev };
                    delete newDisplayNames[deletedStep];
                    return newDisplayNames;
                });
            }

            // 更新 selectedIndex
            if (index === selectedIndex) {
                setSelectedIndex(-1);
            } else if (index < selectedIndex) {
                setSelectedIndex(selectedIndex - 1);
            }

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
                selectedIndex, // 添加这一行
                addAdjustmentStep, 
                deleteAdjustmentStep,
                clearAllSteps,
                setSelectedIndex // 添加这一行
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