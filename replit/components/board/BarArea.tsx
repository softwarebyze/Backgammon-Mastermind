import { TouchableOpacity, View } from "react-native";
import type { Player } from "@/game/types";
import { CheckerToken } from "./CheckerToken";

interface Props {
  whiteCount: number;
  blackCount: number;
  currentPlayer: Player;
  selectedPoint: number | null;
  onPressBar: () => void;
  barWidth: number;
  boardHeight: number;
  middleHeight: number;
  checkerSize: number;
}

export function BarArea({
  whiteCount,
  blackCount,
  currentPlayer,
  selectedPoint,
  onPressBar,
  barWidth,
  boardHeight,
  middleHeight,
  checkerSize,
}: Props) {
  const isBarSelected = selectedPoint === 0;
  const halfHeight = (boardHeight - middleHeight) / 2;
  const small = checkerSize * 0.88;

  const renderStack = (
    count: number,
    player: Player,
    justify: "flex-start" | "flex-end",
  ) => (
    <View
      style={{
        height: halfHeight,
        alignItems: "center",
        justifyContent: justify,
        paddingVertical: 6,
        gap: 2,
      }}
    >
      {Array.from({ length: Math.min(count, 4) }, (_, i) => (
        <CheckerToken key={i} player={player} size={small} />
      ))}
    </View>
  );

  return (
    <TouchableOpacity
      onPress={onPressBar}
      activeOpacity={0.8}
      style={{
        width: barWidth,
        height: boardHeight,
        backgroundColor: "#2E1204",
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderWidth: isBarSelected ? 2 : 0,
        borderColor: isBarSelected ? "#FFD700" : "#6B3A1F",
        alignItems: "center",
      }}
    >
      {/* Black checkers on bar (top half) */}
      {renderStack(blackCount, "black", "flex-start")}

      {/* Middle strip */}
      <View
        style={{
          height: middleHeight,
          backgroundColor: "#2E1204",
          width: barWidth,
        }}
      />

      {/* White checkers on bar (bottom half) */}
      {renderStack(whiteCount, "white", "flex-end")}
    </TouchableOpacity>
  );
}
