import * as React from'react';
import { batchPlay } from 'photoshop';
import { AdjustmentStepsProvider } from './AdjustmentStepsContext';

interface IRecordState {
    adjustmentSteps: string[];
    isRecording: boolean;
}

const Record: React.FC = () => {
    const [adjustmentSteps, setAdjustmentSteps] = React.useState<string[]>([]);
    const [isRecording, setIsRecording] = React.useState(false);

    const getPSVersion = async () => {
        const psVersion = await batchPlay([{
            _obj: 'get',
            _target: [{ _ref: 'application', _enum: 'ordinal', _value: 'targetEnum' }],
            _options: { dialogOptions: 'dontDisplay' }
        }], {});
        const version = psVersion[0].appVersion;
        const versionElement = document.getElementById('ps-version');
        if (versionElement) {
            versionElement.textContent = `PS版本号: ${version}`;
        }
    };

    React.useEffect(() => {
        getPSVersion();
    }, []);

    const startRecording = () => {
        setIsRecording(true);
        console.log('开始录制');
    };

    const stopRecording = () => {
        setIsRecording(false);
        console.log('停止录制');
    };

    const insertAdjustment = () => {
        const newStep = '新的调整步骤'; // 这里可以根据实际情况获取调整步骤
        setAdjustmentSteps([...adjustmentSteps, newStep]);
        console.log('插入调整');
    };

    const insertFilter = () => {
        const newStep = '新的滤镜步骤'; // 这里可以根据实际情况获取滤镜步骤
        setAdjustmentSteps([...adjustmentSteps, newStep]);
        console.log('插入滤镜');
    };

    const deleteStep = (index: number) => {
        const newSteps = adjustmentSteps.filter((_, i) => i!== index);
        setAdjustmentSteps(newSteps);
    };

    return (
        <AdjustmentStepsProvider
            value={{
                adjustmentSteps,
                addAdjustmentStep: (step) => setAdjustmentSteps([...adjustmentSteps, step]),
                deleteAdjustmentStep: deleteStep
            }}
        >
            <div style={{ padding: 10 }}>
                <h1>Record</h1>
                <div style={{ marginTop: 20 }}>
                    <h2>调整</h2>
                    <div style={{ maxHeight: 200, overflowY: 'auto', padding: 10 }}>
                        {adjustmentSteps.slice(0, 10).map((step, index) => (
                            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                                <span>{index + 1}. {step}</span>
                                <button
                                    onClick={() => deleteStep(index)}
                                >
                                    删除
                                </button>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-start' }}>
                        <button
                            style={{ color: isRecording? 'red' : '#fff' }}
                            onClick={isRecording? stopRecording : startRecording}
                        >
                            {isRecording? '停止录制' : '开始录制'}
                        </button>
                        <button onClick={insertAdjustment}>插入调整</button>
                        <button onClick={insertFilter}>插入滤镜</button>
                    </div>
                    {/* 新增圆角矩形的 Spectrum 卡片 */}
                    <div className="spectrum-Card spectrum-Card--quiet" style={{ marginTop: 20, borderRadius: 8 }}>
                        <div className="spectrum-Card-body">
                            <div className="spectrum-Card-content">
                                <h3 className="spectrum-Card-title">录制的调整步骤</h3>
                                <ul className="spectrum-List">
                                    {adjustmentSteps.map((step, index) => (
                                        <li key={index} className="spectrum-ListItem">{index + 1}. {step}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdjustmentStepsProvider>
    );
};

export default Record;