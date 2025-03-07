import * as React from'react';
import { batchPlay } from 'photoshop';
import AdjustmentStepsContext from './AdjustmentStepsContext';

interface IAdjustState {
    selectedFolder: string | null;
    pixelLayers: any[];
}

const Adjust: React.FC = () => {
    const [selectedFolder, setSelectedFolder] = React.useState<string | null>(null);
    const [pixelLayers, setPixelLayers] = React.useState<any[]>([]);
    const context = React.useContext(AdjustmentStepsContext);

    const getPixelLayers = async (folder: string) => {
        // 这里可以使用batchPlay获取指定文件夹下的像素图层
        const layers = []; // 假设这里是获取到的像素图层数据
        setPixelLayers(layers);
    };

    const selectFolder = (folder: string) => {
        setSelectedFolder(folder);
        getPixelLayers(folder);
    };

    const playAdjustments = () => {
        if (context) {
            const steps = context.adjustmentSteps;
            console.log('播放调整，步骤如下：', steps);
            // 这里可以实现遍历像素图层并应用调整步骤的逻辑
        }
    };

    const stopAdjustments = () => {
        console.log('停止调整');
    };

    return (
        <div style={{ padding: 10 }}>
            <h1>Adjust</h1>
            <select
                onChange={(e) => selectFolder(e.target.value)}
                style={{
                    width: '100%',
                    marginBottom: 20,
                    border: '1px solid #333',
                    borderRadius: '4px',
                    background: '#222',
                    color: '#fff',
                    padding: '8px'
                }}
            >
                <option value="">选择文件夹</option>
                {/* 这里可以动态生成文件夹选项 */}
            </select>
            <div style={{ marginTop: 20 }}>
                {pixelLayers.map((layer) => (
                    <div key={layer.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                        <input type="checkbox" />
                        <img
                            src={layer.thumbnail}
                            width="50"
                            height="50"
                            style={{ marginRight: 10 }}
                        />
                        <span>{layer.name}</span>
                    </div>
                ))}
            </div>
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-start' }}>
                <button onClick={playAdjustments}>播放调整</button>
                <button onClick={stopAdjustments}>停止调整</button>
            </div>
        </div>
    );
};

export default Adjust;