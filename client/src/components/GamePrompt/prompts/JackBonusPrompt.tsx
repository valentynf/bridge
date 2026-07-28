type JackBonusPrompt = {
    onClickDouble: () => void;
    onClickMinus20: () => void;
};

function JackBonusPrompt({ onClickDouble, onClickMinus20 }: JackBonusPrompt) {
    return (
        <>
            <h1>Choose Jack finish bonus</h1>
            <div>
                <button onClick={onClickDouble}>Double all</button>
                <button onClick={onClickMinus20}>Minus 20</button>
            </div>
        </>
    );
}

export default JackBonusPrompt;
