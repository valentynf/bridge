type BridgePromptProps = {
    onClickDeclareBridge: () => void;
    onClickSkipBridge: () => void;
};

function BridgePrompt({
    onClickDeclareBridge,
    onClickSkipBridge,
}: BridgePromptProps) {
    return (
        <>
            <h1>Would you like to bridge?</h1>
            <div>
                <button onClick={onClickDeclareBridge}>Declare Bridge</button>
                <button onClick={onClickSkipBridge}>Skip</button>
            </div>
        </>
    );
}

export default BridgePrompt;
