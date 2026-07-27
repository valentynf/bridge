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
        <div>
            <button onClick={onClickHearts}>♥</button>
            <button onClick={onClickDiamonds}>♦</button>
            <button onClick={onClickSpades}>♠</button>
            <button onClick={onClickClubs}>♣</button>
        </div>
    );
}

export default SuitPrompt;
