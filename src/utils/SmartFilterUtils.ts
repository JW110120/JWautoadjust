import { app } from 'photoshop';

export const insertSmartFilter = async (layerId: number, cursorIndex: number) => {
    try {
        const { batchPlay } = require("photoshop").action;
        
        // 1. 在索引1（最上方）创建新滤镜
        await batchPlay([{
            _obj: "make",
            _target: [{ _ref: "filterFX", _index: 1 }],
            using: {
                _obj: "filterFX",
                filter: {
                    _obj: "filterFX",
                    presetKind: {
                        _enum: "presetKindType",
                        _value: "presetKindCustom"
                    }
                }
            },
            _options: { dialogOptions: "dontDisplay" }
        }], {});

        // 2. 获取当前所有滤镜
        const result = await batchPlay([{
            _obj: "get",
            _target: [{ _ref: "layer", _id: layerId }],
            _options: { dialogOptions: "dontDisplay" }
        }], { synchronousExecution: true });

        const filterFX = result[0]?.smartObject?.filterFX || [];
        
        // 3. 计算目标位置
        // PS滤镜索引从1开始，1是最下方，所以需要转换
        const targetIndex = filterFX.length - cursorIndex + 1;

        // 4. 移动滤镜到目标位置
        if (targetIndex > 1) {
            await batchPlay([{
                _obj: "move",
                _target: [{ _ref: "filterFX", _index: 1 }],
                to: { _ref: "filterFX", _index: targetIndex },
                _options: { dialogOptions: "dontDisplay" }
            }], { synchronousExecution: true });
        }

        // 5. 选中移动后的滤镜
        await batchPlay([{
            _obj: "select",
            _target: [{ _ref: "filterFX", _index: targetIndex }],
            _options: { dialogOptions: "dontDisplay" }
        }], { synchronousExecution: true });

        return targetIndex;
    } catch (error) {
        console.error('插入智能滤镜失败:', error);
        throw error;
    }
};