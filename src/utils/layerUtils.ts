import { app } from 'photoshop';

/**
 * 创建样本图层
 * @returns {Promise<number>} 返回创建的智能对象图层ID
 */
export const createSampleLayer = async (): Promise<number> => {
    const doc = app.activeDocument;
    if (!doc) {
        throw new Error('没有活动文档');
    }

    const { executeAsModal } = require("photoshop").core;
    const { batchPlay } = require("photoshop").action;
    
    let newLayerId = null;
    
    await executeAsModal(async () => {
        try {
            // 1. 合并可见图层
            await batchPlay(
                [
                    {
                        _obj: "mergeVisible",
                        duplicate: true,
                        _options: {
                            dialogOptions: "dontDisplay"
                        }
                    }
                ],
                { synchronousExecution: true }
            );

            // 2. 重命名图层
            await batchPlay(
                [
                    {
                        _obj: "set",
                        _target: [
                            {
                                _ref: "layer",
                                _enum: "ordinal",
                                _value: "targetEnum"
                            }
                        ],
                        to: {
                            _obj: "layer",
                            name: "样本图层"
                        },
                        _options: {
                            dialogOptions: "dontDisplay"
                        }
                    }
                ],
                { synchronousExecution: true }
            );

            // 3. 置顶图层
            const currentLayers = doc.layers;
            const targetLayer = doc.activeLayers[0];
            const isAlreadyOnTop = targetLayer && currentLayers.length > 0 && targetLayer.id === currentLayers[0].id;
            
            if (!isAlreadyOnTop) {
                await batchPlay(
                    [
                        {
                            _obj: "move",
                            _target: [
                                {
                                    _ref: "layer",
                                    _enum: "ordinal",
                                    _value: "targetEnum"
                                }
                            ],
                            to: {
                                _ref: "layer",
                                _enum: "ordinal",
                                _value: "front"
                            },
                            _options: {
                                dialogOptions: "dontDisplay"
                            }
                        }
                    ],
                    { synchronousExecution: true }
                );
            }

            // 4. 转换为智能对象
            await batchPlay(
                [
                    {
                        _obj: "newPlacedLayer",
                        _options: {
                            dialogOptions: "dontDisplay"
                        }
                    }
                ],
                { synchronousExecution: true }
            );

            // 获取智能对象图层ID
            const activeLayer = doc.activeLayers[0];
            if (!activeLayer) {
                throw new Error('无法获取智能对象图层');
            }
            const smartObjId = activeLayer.id;
            if (typeof smartObjId === 'undefined') {
                throw new Error('无法获取智能对象ID');
            }
            
            newLayerId = smartObjId;
            
        } catch (error) {
            throw error;
        }
    }, {"commandName": "创建样本图层"});
    
    return newLayerId;
};

/**
 * 查找样本图层
 * @returns {Promise<{id: number, layer: any} | null>} 返回样本图层信息或null
 */
export const findSampleLayer = async () => {
    const doc = app.activeDocument;
    if (!doc) {
        return null;
    }

    for (let i = 0; i < doc.layers.length; i++) {
        const layer = doc.layers[i];
        if (layer.name === "样本图层" && layer.kind === "smartObject") {
            return {
                id: layer.id,
                layer: layer
            };
        }
    }

    return null;
};

/**
 * 选择指定图层
 * @param {number} layerId 图层ID
 */
export const selectLayer = async (layerId: number) => {
    const { executeAsModal } = require("photoshop").core;
    const { batchPlay } = require("photoshop").action;

    await executeAsModal(async () => {
        await batchPlay(
            [
                {
                    _obj: "select",
                    _target: [
                        {
                            _ref: "layer",
                            _id: layerId
                        }
                    ],
                    makeVisible: true,
                    _options: {
                        dialogOptions: "dontDisplay"
                    }
                }
            ],
            { synchronousExecution: true }
        );
    }, {"commandName": "选择图层"});
};