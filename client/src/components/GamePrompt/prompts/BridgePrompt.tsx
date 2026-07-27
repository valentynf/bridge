type BridgePromptProps = {
    onClickDeclareBridge: () => void;
    onClickSkipBridge: () => void;
};

function BridgePrompt({
    onClickDeclareBridge,
    onClickSkipBridge,
}: BridgePromptProps) {
    return (
        <div>
            <button onClick={onClickDeclareBridge}>Declare Bridge</button>
            <button onClick={onClickSkipBridge}>Skip</button>
        </div>
    );
}

export default BridgePrompt;
