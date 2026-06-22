import Svg, { Circle, Path } from "react-native-svg";

export default function ProfileIcon({
  color,
  size = 24,
}: {
  color: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth="2" />
      <Path
        d="M2,22 Q2,15 12,15 Q22,15 22,22"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
