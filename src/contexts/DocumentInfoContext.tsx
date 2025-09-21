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

    // 防御式统计：只依赖 kind / layers，避免读取 bounds 等容易触发代理取值错误的属性
    const countPixelLayers = (layers: any[]): number => {
        if (!Array.isArray(layers)) return 0;
        let count = 0;
        for (const layer of layers) {
            try {
                const kind = (layer as any)?.kind;
                if (kind === 'pixel') {
                    // 为避免在回退/关闭时读取 bounds 抛错，这里不再检查是否有内容
                    count++;
                } else if (kind === 'group') {
                    const children = (layer as any)?.layers;
                    count += countPixelLayers(children);
                }
            } catch (e) {
                // 单个图层读取失败时跳过，保证整体不崩溃
                continue;
            }
        }
        return count;
    };

    const updateDocumentInfo = useCallback(() => {
        try {
            // 回退过程中跳过本次读取，稍后再尝试，避免访问无效代理
            const isReverting = (globalThis as any)?.__JW_isReverting;
            if (isReverting) {
                setTimeout(() => {
                    try { updateDocumentInfo(); } catch (_) {}
                }, 400);
                return;
            }

            const doc = app.activeDocument as any;
            if (!doc) {
                setDocumentInfo({
                    fileName: '无活动文档',
                    groupCount: 0,
                    pixelLayerCount: 0
                });
                return;
            }

            let groupCount = 0;
            try {
                const docLayers = doc.layers as any[];
                groupCount = Array.isArray(docLayers) ? docLayers.filter(l => {
                    try { return (l as any)?.kind === 'group'; } catch { return false; }
                }).length : 0;
            } catch {
                groupCount = 0;
            }

            let pixelLayerCount = 0;
            try {
                pixelLayerCount = countPixelLayers((doc as any).layers);
            } catch {
                pixelLayerCount = 0;
            }

            const name = (() => { try { return doc.name as string; } catch { return '未命名'; } })();

            setDocumentInfo({
                fileName: name || '无活动文档',
                groupCount,
                pixelLayerCount
            });
        } catch (e) {
            // 整体读取失败时的兜底，避免影响 UI 渲染
            try {
                const safeName = (() => { try { return (app as any)?.activeDocument?.name as string; } catch { return '无活动文档'; } })();
                setDocumentInfo(prev => ({
                    fileName: safeName || '无活动文档',
                    groupCount: 0,
                    pixelLayerCount: 0
                }));
            } catch (_) {
                setDocumentInfo({ fileName: '无活动文档', groupCount: 0, pixelLayerCount: 0 });
            }
        }
    }, []);

    const debouncedUpdateDocumentInfo = debounce(updateDocumentInfo, 500);

    useEffect(() => {
        // 初次与定时刷新均采用防抖版本，减轻频繁读取压力
        debouncedUpdateDocumentInfo();
        const interval = setInterval(debouncedUpdateDocumentInfo, 2000);
        return () => {
            clearInterval(interval);
            debouncedUpdateDocumentInfo.cancel();
        };
    }, [debouncedUpdateDocumentInfo]);

    // 监听回退完成事件，立即触发一次信息刷新，避免等待定时器
    useEffect(() => {
        const handler = () => {
            try {
                debouncedUpdateDocumentInfo();
            } catch (e) {
                // 忽略单次失败
            }
        };
        window.addEventListener('JW_AFTER_REVERT', handler as any);
        return () => window.removeEventListener('JW_AFTER_REVERT', handler as any);
    }, [debouncedUpdateDocumentInfo]);

    return (
        <DocumentInfoContext.Provider value={{ documentInfo, setDocumentInfo }}> 
            {children}
        </DocumentInfoContext.Provider>
    );
};