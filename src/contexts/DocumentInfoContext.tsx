import React, { createContext, useState, useCallback, useEffect } from 'react';
import { app } from 'photoshop';
import { debounce } from 'lodash';

interface DocumentInfo {
    fileName: string;
    groupCount: number;
    pixelLayerCount: number;
}

interface DocumentInfoContextType {
    documentInfo: DocumentInfo;
    setDocumentInfo: React.Dispatch<React.SetStateAction<DocumentInfo>>; 
}

export const DocumentInfoContext = createContext<DocumentInfoContextType>({
    documentInfo: {
        fileName: '无活动文档',
        groupCount: 0,
        pixelLayerCount: 0
    },
    setDocumentInfo: () => {}  
});

export const DocumentInfoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [documentInfo, setDocumentInfo] = useState<DocumentInfo>({
        fileName: '无活动文档',
        groupCount: 0,
        pixelLayerCount: 0
    });

    const countPixelLayers = (layers) => {
        let count = 0;
        layers.forEach(layer => {
            if (layer.kind === 'pixel') {
                const hasContent = layer.bounds && 
                                 (layer.bounds.width > 0 && layer.bounds.height > 0);
                if (hasContent) {
                    count++;
                }
            } else if (layer.kind === 'group') {
                count += countPixelLayers(layer.layers);
            }
        });
        return count;
    };

    const updateDocumentInfo = useCallback(() => {
        const doc = app.activeDocument;
        if (!doc) {
            setDocumentInfo({
                fileName: '无活动文档',
                groupCount: 0,
                pixelLayerCount: 0
            });
            return;
        }

        const newInfo = {
            fileName: doc.name,
            groupCount: doc.layers.filter(layer => layer.kind === 'group').length,
            pixelLayerCount: countPixelLayers(doc.layers)
        };

        setDocumentInfo(newInfo);
    }, []);

    const debouncedUpdateDocumentInfo = debounce(updateDocumentInfo, 500);

    useEffect(() => {
        debouncedUpdateDocumentInfo();
        const interval = setInterval(debouncedUpdateDocumentInfo, 2000);
        return () => {
            clearInterval(interval);
            debouncedUpdateDocumentInfo.cancel();
        };
    }, [debouncedUpdateDocumentInfo]);

    return (
        <DocumentInfoContext.Provider value={{ documentInfo, setDocumentInfo }}> 
            {children}
        </DocumentInfoContext.Provider>
    );
};