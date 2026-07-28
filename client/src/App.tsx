import LobbyScreen from "./components/LobbyScreen/LobbyScreen";

function App() {
    return (
        <>
            <LobbyScreen
                roomCode="ABCD"
                roomMembers={[
                    { id: "socket01abc", nickname: "valentyn", isReady: true },
                    {
                        id: "socket02def",
                        nickname: "player2nd",
                        isReady: false,
                    },
                    { id: "socket03ghi", nickname: "player3rd", isReady: true },
                    {
                        id: "socket04jkl",
                        nickname: "player4th",
                        isReady: false,
                    },
                ]}
            />
        </>
    );
}

export default App;
