import { cn } from "@/lib/utils";

const colors = [
  "bg-rose-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-cyan-500",
  "bg-lime-500",
];

const pickColor = (name: string) => {
  const sum = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[sum % colors.length];
};

export const LetterAvatar = ({
  name,
  size = 40,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) => {
  const letter = name?.trim()?.[0]?.toUpperCase() || "?";
  const bg = pickColor(name || "?");

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full text-white font-semibold",
        bg,
        className,
      )}
      style={{ width: size, height: size }}
      aria-label={`${name} avatar`}
    >
      {letter}
    </div>
  );
};
