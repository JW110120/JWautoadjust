import { app } from 'photoshop';

/**
 * 创建样本图层
 * @returns {Promise<number>} 返回创建的智能对象图层ID
 */
export const createSampleLayer = async (name: string = "样本图层"): Promise<number> => {
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
                            name
                        },
                        _options: {
                            dialogOptions: "dontDisplay"
                        }
                    }
                ],
                { synchronousExecution: true }
            );

            // 3. 置顶图层（多次“置顶”逐级上移，直至文档最顶层）
            const targetLayer = doc.activeLayers[0];
            if (targetLayer) {
                // 计算当前图层所处的组层级深度，以及是否已经在其直接父容器的最上方
                const getDepthAndTopStatus = (lyr: any) => {
                    let depth = 0;
                    let isTop = false;
                    let parent: any = lyr.parent;

                    if (parent && parent.kind === 'group') {
                        isTop = parent.layers && parent.layers.length > 0 && parent.layers[0].id === lyr.id;
                        while (parent && parent.kind === 'group') {
                            depth += 1;
                            parent = parent.parent;
                        }
                    } else {
                        // 父级为文档根
                        isTop = doc.layers && doc.layers.length > 0 && doc.layers[0].id === lyr.id;
                    }
                    return { depth, isTop };
                };

                const { depth, isTop } = getDepthAndTopStatus(targetLayer);
                const moveTimes = depth + (isTop ? 0 : 1);

                for (let i = 0; i < moveTimes; i++) {
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
                                    _ref: [
                                        {
                                            _ref: "layer",
                                            _enum: "ordinal",
                                            _value: "front"
                                        }
                                    ]
                                },
                                _options: {
                                    dialogOptions: "dontDisplay"
                                }
                            }
                        ],
                        { synchronousExecution: true }
                    );
                }
            }

            // 4. 转换为智能对象
            await batchPlay(
                [
                    {
                        _obj: "newPlacedLayer",
                        _options: {
                            dialogOptions: "dontDisplay"
                        }
                    },
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
                            name
                        },
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
 * 查找样本图层（支持带时间戳的名称）
 * 优先：精确匹配 preferName；其次：匹配前缀“样本图层”
 * @param preferName 可选的精确名称（如："样本图层 2023-10-01 12:00:00"）
 * @returns {Promise<{id: number, layer: any} | null>} 返回样本图层信息或null
 */
export const findSampleLayer = async (preferName?: string) => {
    const doc = app.activeDocument as any;
    if (!doc) {
        return null;
    }

    const safeChildren = (lyr: any) => {
        try { return (lyr as any)?.layers || []; } catch { return []; }
    };
    const isSmart = (lyr: any) => {
        try { return (lyr as any)?.kind === 'smartObject'; } catch { return true; }
    };

    const findByPredicate = (layers: any[], predicate: (name: string, lyr: any) => boolean): any => {
        for (const lyr of layers) {
            try {
                const name = (lyr as any)?.name || '';
                const id = (lyr as any)?.id ?? (lyr as any)?._id ?? null;
                if (id && isSmart(lyr) && predicate(name, lyr)) {
                    return { id, layer: lyr };
                }
                const children = safeChildren(lyr);
                if (children && children.length) {
                    const child = findByPredicate(children, predicate);
                    if (child) return child;
                }
            } catch {}
        }
        return null;
    };

    // 先按 preferName 精确匹配
    if (preferName) {
        const exact = findByPredicate((doc as any).layers as any[], (n) => n === preferName);
        if (exact) return exact;
    }
    // 再按前缀匹配（兼容旧名）
    const prefixHit = findByPredicate((doc as any).layers as any[], (n) => typeof n === 'string' && n.startsWith('样本图层'));
    if (prefixHit) return prefixHit;

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

// 新增：回退后强制刷新智能滤镜堆栈（添加临时高斯模糊再删除）
export const forceRefreshSmartFilters = async (opts?: { layerId?: number; preferName?: string }): Promise<boolean> => {
    try {
        const doc = app.activeDocument as any;
        if (!doc) return false;

        let targetId: number | null | undefined = opts?.layerId;
        if (!targetId) {
            const found = await findSampleLayer(opts?.preferName);
            targetId = found?.id;
        }
        if (!targetId) return false;

        const { executeAsModal } = require("photoshop").core;
        const { batchPlay } = require("photoshop").action;

        await executeAsModal(async () => {
            // 选中目标图层
            await batchPlay([
                {
                    _obj: "select",
                    _target: [{ _ref: "layer", _id: targetId }],
                    makeVisible: true,
                    _options: { dialogOptions: "dontDisplay" }
                }
            ], { synchronousExecution: true });

            // 记录添加前滤镜数量
            const before = await batchPlay([
                { _obj: "get", _target: [{ _ref: "layer", _id: targetId }], _options: { dialogOptions: "dontDisplay" } }
            ], { synchronousExecution: true });
            const beforeLen = (before?.[0]?.smartObject?.filterFX || []).length || 0;

            // 添加一个极小半径的高斯模糊作为临时智能滤镜
            try {
                await batchPlay([
                    {
                        _obj: "gaussianBlur",
                        radius: { _unit: "pixelsUnit", _value: 0.1 },
                        _options: { dialogOptions: "dontDisplay" }
                    }
                ], { synchronousExecution: true });
            } catch (e) {
                // 忽略添加失败
            }

            // 再次获取滤镜数量
            const after = await batchPlay([
                { _obj: "get", _target: [{ _ref: "layer", _id: targetId }], _options: { dialogOptions: "dontDisplay" } }
            ], { synchronousExecution: true });
            const afterLen = (after?.[0]?.smartObject?.filterFX || []).length || 0;

            // 若成功新增，则删除新增的那个（位于栈顶，索引为 afterLen）
            if (afterLen > beforeLen) {
                try {
                    await batchPlay([
                        {
                            _obj: "delete",
                            _target: [ { _ref: "filterFX", _index: afterLen } ],
                            _options: { dialogOptions: "dontDisplay" }
                        }
                    ], { synchronousExecution: true });
                } catch (_) { /* 忽略删除失败 */ }
            }
        }, { commandName: "刷新智能滤镜堆栈" });

        return true;
    } catch (e) {
        // 整体失败则返回 false，不影响主流程
        return false;
    }
};