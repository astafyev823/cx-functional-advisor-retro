import { COLORS } from "@/lib/colors";

type Density = "sparse" | "full";

type Shape =
  | { type: "circle"; size: number; top: string; left: string; color: string; opacity: number }
  | { type: "square"; size: number; top: string; left: string; color: string; opacity: number; rotate: number }
  | { type: "triangle"; top: string; left: string; color: string; opacity: number };

const SPARSE: Shape[] = [
  { type: "circle", size: 60, top: "10%", left: "85%", color: COLORS[3].hex, opacity: 0.4 },
  { type: "square", size: 40, top: "70%", left: "5%",  color: COLORS[0].hex, opacity: 0.5, rotate: 20 },
  { type: "circle", size: 30, top: "45%", left: "92%", color: COLORS[4].hex, opacity: 0.5 },
];

const FULL: Shape[] = [
  { type: "circle",   size: 110, top: "5%",  left: "82%", color: COLORS[3].hex, opacity: 0.9 },
  { type: "circle",   size: 50,  top: "18%", left: "70%", color: COLORS[0].hex, opacity: 0.85 },
  { type: "square",   size: 70,  top: "60%", left: "88%", color: COLORS[2].hex, opacity: 0.85, rotate: 15 },
  { type: "triangle",            top: "55%", left: "74%", color: COLORS[4].hex, opacity: 0.85 },
  { type: "circle",   size: 32,  top: "40%", left: "90%", color: COLORS[1].hex, opacity: 0.85 },
  { type: "circle",   size: 18,  top: "12%", left: "60%", color: COLORS[3].hex, opacity: 0.7 },
];

export function ShapesBg({ density = "full" }: { density?: Density }) {
  const shapes = density === "sparse" ? SPARSE : FULL;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {shapes.map((s, i) => {
        if (s.type === "circle") {
          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: s.size,
                height: s.size,
                top: s.top,
                left: s.left,
                background: s.color,
                opacity: s.opacity,
              }}
            />
          );
        }
        if (s.type === "square") {
          return (
            <div
              key={i}
              className="absolute rounded-[10px]"
              style={{
                width: s.size,
                height: s.size,
                top: s.top,
                left: s.left,
                background: s.color,
                opacity: s.opacity,
                transform: `rotate(${s.rotate}deg)`,
              }}
            />
          );
        }
        return (
          <div
            key={i}
            className="absolute"
            style={{
              top: s.top,
              left: s.left,
              width: 0,
              height: 0,
              borderLeft: "32px solid transparent",
              borderRight: "32px solid transparent",
              borderBottom: `56px solid ${s.color}`,
              opacity: s.opacity,
            }}
          />
        );
      })}
    </div>
  );
}
