import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	applyDiceRoll,
	applyMove,
	createInitialState,
	type GameMode,
	type GameState,
	getAIMove,
	getLegalMoves,
	type Move,
	type Player,
	rollDice,
} from "@/game";

interface GameContextType {
	state: GameState | null;
	startGame: (mode: GameMode) => void;
	resetGame: () => void;
	doRollDice: () => void;
	selectPoint: (point: number | null) => void;
	doMove: (move: Move) => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
	const [state, setState] = useState<GameState | null>(null);
	const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// ---------------------------------------------------------------------------
	// Helpers
	// ---------------------------------------------------------------------------

	const clearAITimeout = () => {
		if (aiTimeoutRef.current !== null) {
			clearTimeout(aiTimeoutRef.current);
			aiTimeoutRef.current = null;
		}
	};

	// ---------------------------------------------------------------------------
	// AI automation
	// ---------------------------------------------------------------------------

	useEffect(() => {
		if (!state) return;
		if (state.mode !== "vs-computer") return;
		if (state.currentPlayer !== "black") return;
		if (state.phase === "game-over") return;

		if (state.phase === "rolling") {
			aiTimeoutRef.current = setTimeout(() => {
				setState((prev) => {
					if (
						!prev ||
						prev.currentPlayer !== "black" ||
						prev.phase !== "rolling"
					)
						return prev;
					const dice = rollDice();
					return applyDiceRoll(prev, dice);
				});
			}, 1200);
			return () => clearAITimeout();
		}

		if (state.phase === "moving") {
			aiTimeoutRef.current = setTimeout(() => {
				setState((prev) => {
					if (
						!prev ||
						prev.currentPlayer !== "black" ||
						prev.phase !== "moving"
					)
						return prev;
					const move = getAIMove(prev);
					if (!move) {
						// Forced pass
						return {
							...prev,
							currentPlayer: "white" as Player,
							dice: [0, 0] as [number, number],
							remainingDice: [],
							phase: "rolling" as const,
							selectedPoint: null,
							legalMovesForSelected: [],
						};
					}
					return applyMove(prev, move);
				});
			}, 700);
			return () => clearAITimeout();
		}
	}, [
		state?.currentPlayer,
		state?.phase,
		state?.remainingDice?.length,
		state?.mode,
	]);

	// ---------------------------------------------------------------------------
	// Actions
	// ---------------------------------------------------------------------------

	const startGame = useCallback((mode: GameMode) => {
		clearAITimeout();
		setState(createInitialState(mode));
	}, []);

	const resetGame = useCallback(() => {
		clearAITimeout();
		setState((prev) => (prev ? createInitialState(prev.mode) : null));
	}, []);

	const doRollDice = useCallback(() => {
		setState((prev) => {
			if (!prev || prev.phase !== "rolling") return prev;
			if (prev.mode === "vs-computer" && prev.currentPlayer === "black")
				return prev;
			const dice = rollDice();
			return applyDiceRoll(prev, dice);
		});
	}, []);

	const selectPoint = useCallback((point: number | null) => {
		setState((prev) => {
			if (!prev || prev.phase !== "moving") return prev;
			if (point === null) {
				return { ...prev, selectedPoint: null, legalMovesForSelected: [] };
			}
			// Verify the point belongs to current player
			const isBar = point === 0 && prev.bar[prev.currentPlayer] > 0;
			const isOwnPoint =
				point > 0 &&
				prev.points[point].player === prev.currentPlayer &&
				prev.points[point].count > 0;
			if (!isBar && !isOwnPoint) {
				return { ...prev, selectedPoint: null, legalMovesForSelected: [] };
			}
			const legal = getLegalMoves({ ...prev, selectedPoint: point }).filter(
				(m) => m.from === point,
			);
			if (legal.length === 0) return prev;
			return { ...prev, selectedPoint: point, legalMovesForSelected: legal };
		});
	}, []);

	const doMove = useCallback((move: Move) => {
		setState((prev) => {
			if (!prev || prev.phase !== "moving") return prev;
			return applyMove(prev, move);
		});
	}, []);

	return (
		<GameContext.Provider
			value={{ state, startGame, resetGame, doRollDice, selectPoint, doMove }}
		>
			{children}
		</GameContext.Provider>
	);
}

export function useGame(): GameContextType {
	const ctx = useContext(GameContext);
	if (!ctx) throw new Error("useGame must be used within GameProvider");
	return ctx;
}
