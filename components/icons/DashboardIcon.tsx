import Svg, { Line, Rect } from "react-native-svg";

export default function DashboardIcon({
  color,
  size = 24,
}: {
  color: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="2"
        y="14"
        width="5"
        height="8"
        rx="1.5"
        stroke={color}
        strokeWidth="2"
      />
      <Rect
        x="9.5"
        y="9"
        width="5"
        height="13"
        rx="1.5"
        stroke={color}
        strokeWidth="2"
      />
      <Rect
        x="17"
        y="4"
        width="5"
        height="18"
        rx="1.5"
        stroke={color}
        strokeWidth="2"
      />
      <Line
        x1="1"
        y1="22"
        x2="23"
        y2="22"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}
