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
            // 记录合并前的活动图层ID，用于判断合并是否真正产生了新图层
            const beforeActive = doc.activeLayers && doc.activeLayers.length > 0 ? doc.activeLayers[0] : null;
            const beforeActiveId = beforeActive ? beforeActive.id : undefined;
            //0.新建过渡图层
            await batchPlay(
                [
                    {
                        _obj: "make",
                        _target: [
                            {
                                _ref: "layer"
                            }
                        ],
                        using: {
                        _obj: "layer",
                        name: "临时"
                    },
                    }
                ],
                { synchronousExecution: true }
            );

            // 1. 合并可见图层（到新图层）
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

            // 合并后校验：若没有产生新图层（如命令不可用），则直接中断，避免误把当前选中图层改名并转为智能对象
            const afterActive = doc.activeLayers && doc.activeLayers.length > 0 ? doc.activeLayers[0] : null;
            const afterActiveId = afterActive ? afterActive.id : undefined;
            const afterIsGroup = (afterActive as any)?.kind === 'group';
            if (!afterActive || beforeActiveId === afterActiveId || afterIsGroup) {
                throw new Error('合并可见图层不可用：请确保文档中至少有一个可见的非组图层且未被完全锁定');
            }

            // 2. 重命名图层（此时目标应为刚生成的像素图层）
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