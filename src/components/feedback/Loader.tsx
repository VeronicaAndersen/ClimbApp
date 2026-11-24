const SPOKES = 8;

const SIZES = {
  sm: "h-5 w-5",
  md: "h-8 w-8",
} as const;

interface LoaderProps {
  /** Read by screen readers only; the loader itself shows no text. */
  label?: string;
  size?: keyof typeof SIZES;
}

/**
 * Activity indicator: eight rounded spokes fading around a circle.
 * Fades in after a short delay so fast loads never flash it.
 */
export default function Loader({ label = "Laddar", size = "md" }: LoaderProps) {
  return (
    <div role="status" aria-live="polite" className="inline-flex text-muted-foreground">
      <svg viewBox="0 0 24 24" className={`loader ${SIZES[size]}`} aria-hidden="true">
        {Array.from({ length: SPOKES }, (_, i) => (
          <rect
            key={i}
            x="11"
            y="2"
            width="2"
            height="6"
            rx="1"
            fill="currentColor"
            opacity={1 - (i / SPOKES) * 0.85}
            transform={`rotate(${(-i * 360) / SPOKES} 12 12)`}
          />
        ))}
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}
