import React, { createContext, useState, useContext, useEffect } from 'react';

// 创建上下文
export const AdjustmentStepsContext = createContext({
    adjustmentSteps: [],
    displayNames: {},
    selectedIndex: -1, 
    addAdjustmentStep: (step: string, displayName?: string, addToStart?: boolean) => {},
    deleteAdjustmentStep: (index: number) => {},
    clearAllSteps: () => {},
    setSelectedIndex: (index: number) => {} 
});

// 创建提供者组件
export const AdjustmentStepsProvider = ({ children }) => {
    const [adjustmentSteps, setAdjustmentSteps] = useState([]);
    const [displayNames, setDisplayNames] = useState({});
    const [selectedIndex, setSelectedIndex] = useState(-1);

    // 添加调试日志
    useEffect(() => {
    }, [adjustmentSteps]);

    const addAdjustmentStep = (step, displayName, addToStart = false) => {
        const stepNameMatch = step.match(/(.*) \(\d+\)/);
        const stepName = stepNameMatch ? stepNameMatch[1] : step;
        
        setAdjustmentSteps(prevSteps => {
            const now = Date.now();
            
            // 检查是否有重复，只在非录制模式下检查
            if (!addToStart) {
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
            }
            
            if (displayName) {
                setDisplayNames(prev => ({
                    ...prev,
                    [step]: displayName
                }));
            }
            
            let newSteps;
            
            if (addToStart) {
                // 录制模式：添加到数组开头
                newSteps = [step, ...prevSteps];
                // 更新选中索引
                setSelectedIndex(0);
            } else if (selectedIndex >= 0) {
                // 非录制模式且有选中位置：插入到选中位置后面
                newSteps = [...prevSteps];
                newSteps.splice(selectedIndex + 1, 0, step);
                // 更新选中索引到新添加的步骤
                setSelectedIndex(selectedIndex + 1);
            } else { 
                // 非录制模式且无选中位置：添加到数组末尾
                newSteps = [...prevSteps, step];
                // 更新选中索引到新添加的步骤
                setSelectedIndex(newSteps.length - 1);
            }
            
            return newSteps;
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