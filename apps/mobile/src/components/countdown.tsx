import { useEffect, useState } from "react";
import { Text } from "react-native";

function diffParts(targetMs: number, nowMs: number) {
  const total = Math.max(0, targetMs - nowMs);
  const days = Math.floor(total / 86_400_000);
  const hours = Math.floor((total % 86_400_000) / 3_600_000);
  const minutes = Math.floor((total % 3_600_000) / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  return { total, days, hours, minutes, seconds };
}

/**
 * Live ticking countdown (spec: "when is it?" answered instantly).
 * Pauses the interval while unmounted; renders static date when far out.
 */
export function Countdown({ targetIso, compact = false }: { targetIso: string; compact?: boolean }) {
  const target = new Date(targetIso).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { total, days, hours, minutes, seconds } = diffParts(target, now);

  if (total <= 0) return <Text className="text-accent-live font-bold">In progress</Text>;

  if (days > 7) {
    return <Text className="text-ink-dim">{new Date(targetIso).toLocaleDateString()}</Text>;
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const text = days > 0 ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  if (compact) return <Text className="text-ink font-semibold tabular-nums">{text}</Text>;
  return (
    <Text className="text-ink text-2xl font-bold tabular-nums tracking-wide">
      {days > 0 ? `${days}d ` : ""}
      {pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </Text>
  );
}
