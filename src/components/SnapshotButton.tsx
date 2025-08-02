import React from 'react';
import { app } from 'photoshop';
import { getButtonStyle, handleMouseOver, handleMouseOut } from '../styles/buttonStyles';

interface SnapshotButtonProps {
    isRecording: boolean;
}

const SnapshotButton: React.FC<SnapshotButtonProps> = ({ isRecording }) => {
    const isButtonDisabled = isRecording;
    const handleCreateSnapshot = async () => { 
        try {
            if (app.activeDocument) {
                const { executeAsModal } = require("photoshop").core;
                const { batchPlay } = require("photoshop").action;

                await executeAsModal(async () => {
                    await batchPlay(
                        [{
                            _obj: "make",
                            _target: [{ _ref: "snapshotClass" }],
                            from: {
                                _ref: "historyState",
                                _property: "currentHistoryState"
                            },
                            name: "调整拆分前",
                            using: {
                                _enum: "historyState",
                                _value: "fullDocument"
                            },
                            _options: {
                                dialogOptions: "dontDisplay"
                            }
                        }],
                        {}
                    );
                }, {"commandName": "创建快照"});
            } else {
                const { showAlert } = require("photoshop").core;
                showAlert({ message: '没有活动的文档，无法创建快照' });
            }
        } catch (error) {
            console.error('创建快照失败:', error);
            const { showAlert } = require("photoshop").core;
            showAlert({ message: `创建快照失败: ${error.message}` });
        }
    };

    return (
        <sp-action-button
            onClick={handleCreateSnapshot}
            title={isRecording ? "录制时无法创建快照" : "创建新的快照"}
            className={`bottom-button ${isButtonDisabled ? 'disabled' : ''}`}
            style={getButtonStyle(isButtonDisabled)}
            onMouseOver={(e) => handleMouseOver(e, isButtonDisabled)}
            onMouseOut={handleMouseOut}
        >
            <div slot="icon" className="icon">
                <svg 
                    viewBox="0 0 18 18"
                    focusable="false"
                    aria-hidden="true"
                    role="img"
                >
                    <path d="M16.5,4H13V2.5a.5.5,0,0,0-.5-.5h-7a.5.5,0,0,0-.5.5V4H1.5a.5.5,0,0,0-.5.5v11a.5.5,0,0,0,.5.5h15a.5.5,0,0,0,.5-.5V4.5A.5.5,0,0,0,16.5,4ZM6,3h6V4H6ZM9,14.1A3.6,3.6,0,1,1,12.6,10.5,3.6,3.6,0,0,1,9,14.1Z"/>
                </svg>
            </div>
            <span>快照</span> 
        </sp-action-button>
    );
};

export default SnapshotButton;