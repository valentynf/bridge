import PlayerInfoCard from "./components/PlayerInfoCard/PlayerInfoCard";

function App() {
    return (
        <>
            <PlayerInfoCard
                nickname="valentyn"
                id="socket01abc"
                score={45}
                handCount={5}
                isDealer={true}
                isCurrentPlayer={true}
            />
        </>
    );
}

export default App;
