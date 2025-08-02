import React, { createContext, useContext, useState } from 'react';

interface ProcessingContextType {
    isProcessing: boolean;
    setIsProcessing: (value: boolean) => void;
}

const ProcessingContext = createContext<ProcessingContextType | undefined>(undefined);

export const ProcessingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isProcessing, setIsProcessing] = useState(false);

    return (
        <ProcessingContext.Provider value={{ isProcessing, setIsProcessing }}>
            {children}
        </ProcessingContext.Provider>
    );
};

export const useProcessing = () => {
    const context = useContext(ProcessingContext);
    if (context === undefined) {
        throw new Error('useProcessing must be used within a ProcessingProvider');
    }
    return context;
};