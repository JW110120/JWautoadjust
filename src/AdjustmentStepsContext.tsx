import React from'react';

// 定义上下文的类型
interface AdjustmentStepsContextType {
    adjustmentSteps: string[];
    addAdjustmentStep: (step: string) => void;
    deleteAdjustmentStep: (index: number) => void;
}

// 创建上下文对象
const AdjustmentStepsContext = React.createContext<AdjustmentStepsContextType | undefined>(undefined);

export const AdjustmentStepsProvider = AdjustmentStepsContext.Provider;
export default AdjustmentStepsContext;