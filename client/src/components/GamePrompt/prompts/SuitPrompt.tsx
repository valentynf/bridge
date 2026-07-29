type SuitePromptProps = {
    onClickHearts: () => void;
    onClickDiamonds: () => void;
    onClickSpades: () => void;
    onClickClubs: () => void;
};

function SuitPrompt({
    onClickHearts,
    onClickClubs,
    onClickDiamonds,
    onClickSpades,
}: SuitePromptProps) {
    return (
        <>
            <h1>Choose Jack suit</h1>
            <div>
                <button
                    style={{ color: "var(--color-card-red" }}
                    onClick={onClickHearts}
                >
                    ♥
                </button>
                <button
                    style={{ color: "var(--color-card-red" }}
                    onClick={onClickDiamonds}
                >
                    ♦
                </button>
                <button onClick={onClickSpades}>♠</button>
                <button onClick={onClickClubs}>♣</button>
            </div>
        </>
    );
}

export default SuitPrompt;
