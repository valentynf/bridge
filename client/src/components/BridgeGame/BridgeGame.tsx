import { type AuthUser, type GameEndData, type ScreenType } from "../../types";
import { useEffect, useRef, useState } from "react";
import { type LobbyMember, type RoundPlayer } from "../../../../shared/types";
import MenuScreen from "../MenuScreen/MenuScreen";
import LobbyScreen from "../LobbyScreen/LobbyScreen";
import GameScreen from "../GameScreen/GameScreen";
import GameOverScreen from "../GameOverScreen/GameOverScreen";
import { useSocket } from "../../hooks/useSocket";
import AuthScreen from "../AuthScreen/AuthScreen";
import apiClient from "../../api/apiClient";

function BridgeGame() {
    const [currentView, setCurrentView] = useState<ScreenType>("auth");
    const [roomCode, setRoomCode] = useState<string>("");
    const [roomMembers, setRoomMembers] = useState<LobbyMember[]>([]);
    const [gameOverData, setGameOverData] = useState<GameEndData | null>(null);
    const [players, setPlayers] = useState<RoundPlayer[]>([]);
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const socket = useSocket();

    const playersRef = useRef<RoundPlayer[]>(players);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await apiClient.get("/auth/me");
                setCurrentUser(response.data);
                setCurrentView("menu");
            } catch {
                setCurrentView("auth");
            }
        };
        checkAuth();
    }, []);

    useEffect(() => {
        playersRef.current = players;
    }, [players]);

    useEffect(() => {
        socket.on("round_started", ({ players }) => {
            setPlayers(players);
        });
        socket.on("room_created", ({ roomCode }) => {
            setRoomCode(roomCode);
            setCurrentView("lobby");
        });
        socket.on("room_joined", ({ roomMembers }) => {
            setRoomMembers(roomMembers);
            setCurrentView("lobby");
        });
        socket.on("game_started", () => {
            setCurrentView("game");
        });
        socket.on("game_over", ({ finalScores, winnerIndex }) => {
            setGameOverData({
                winnerName: playersRef.current[winnerIndex].nickname,
                finalPlayerScores: finalScores.map((score, index) => ({
                    nickname: playersRef.current[index].nickname,
                    score,
                })),
            });
            setCurrentView("game-over");
        });

        return () => {
            socket.off("round_started");
            socket.off("room_created");
            socket.off("room_joined");
            socket.off("game_started");
            socket.off("game_over");
        };
    }, [socket]);

    return (
        <>
            {currentView === "auth" && (
                <AuthScreen
                    onAuthSuccess={(user) => {
                        setCurrentUser(user);
                        setCurrentView("menu");
                    }}
                />
            )}
            {currentView === "menu" && <MenuScreen />}
            {currentView === "lobby" && (
                <LobbyScreen roomMembers={roomMembers} roomCode={roomCode} />
            )}
            {currentView === "game" && currentUser && (
                <GameScreen currentUser={currentUser} />
            )}
            {currentView === "game-over" && gameOverData !== null && (
                <GameOverScreen
                    onBackToMenuClick={() => {
                        setRoomCode("");
                        setRoomMembers([]);
                        setGameOverData(null);
                        setPlayers([]);
                        setCurrentView("menu");
                    }}
                    {...gameOverData}
                />
            )}
        </>
    );
}

export default BridgeGame;
