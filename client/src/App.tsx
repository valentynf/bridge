import PlayingCard from "./components/PlayingCard/PlayingCard";

function App() {
    return (
        <div style={{ display: "flex", flexDirection: "row", gap: "20px" }}>
            <PlayingCard faceUp={false} />
            <PlayingCard faceUp={true} rank="K" suit="diamonds" />
        </div>
    );
}

export default App;
