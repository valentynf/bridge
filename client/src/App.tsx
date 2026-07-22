// import Menu from "./components/Menu/Menu";

import type { LobbyMember } from "../../shared/types";
import Lobby from "./components/Lobby/Lobby";

function App() {
    const testMembers: LobbyMember[] = [
        { id: "abc1", nickname: "player1", isReady: false },
        { id: "xyz2", nickname: "player2", isReady: false },
        { id: "lkm3", nickname: "player3", isReady: false },
        { id: "frb4", nickname: "player4", isReady: true },
    ];

    return (
        <>
            <Lobby roomMembers={testMembers} roomCode="a1b2c" />
        </>
    );
}

export default App;
