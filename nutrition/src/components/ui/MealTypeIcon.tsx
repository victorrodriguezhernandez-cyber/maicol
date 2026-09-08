const STROKE = { stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/**
 * One consistent-stroke mark per meal type — same viewBox, weight and cap
 * style as the bottom-nav icons, so the app reads as drawn by one hand
 * instead of borrowing a generic icon-font set. Used wherever a meal is
 * listed (Hoy's diary, /diario, MealComposer's type picker) instead of
 * relying on the label text alone to distinguish rows at a glance.
 */
export function MealTypeIcon({ type, className }: { type: string; className?: string }) {
  const props = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", className };
  switch (type) {
    case "breakfast":
      // Rising sun: breakfast is the day's first light.
      return (
        <svg {...props}>
          <path d="M4 15h16" {...STROKE} />
          <path d="M6.5 15a5.5 5.5 0 0 1 11 0" {...STROKE} />
          <path d="M12 5.5v2M5.5 9l1.4 1.4M18.5 9l-1.4 1.4" {...STROKE} />
        </svg>
      );
    case "lunch":
      // Crossed fork/knife: the midday main meal.
      return (
        <svg {...props}>
          <path d="M7 3v7a2 2 0 1 1-4 0V3M5 10v11" {...STROKE} />
          <path d="M17 3c-1.4 0-2.5 1.6-2.5 4.5S15.6 12 17 12v9" {...STROKE} />
        </svg>
      );
    case "dinner":
      // Crescent moon over a plate: evening.
      return (
        <svg {...props}>
          <path d="M15.5 4.5a5 5 0 1 0 4 6.7 4 4 0 0 1-4-6.7Z" {...STROKE} />
          <ellipse cx="10" cy="18" rx="7" ry="2.2" {...STROKE} />
        </svg>
      );
    case "snack":
      // Apple: the between-meals bite.
      return (
        <svg {...props}>
          <path d="M12 8.5c-2.8 0-5 2.2-5 5.3 0 3 2 6.7 4 6.7.8 0 1-.4 1.8-.4s1 .4 1.8.4c2 0 4-3.7 4-6.7 0-3.1-2.2-5.3-4.5-5.3-.6 0-1.1.1-1.6.3" {...STROKE} />
          <path d="M12 8.5c0-1.8.9-3 2.3-3.5" {...STROKE} />
        </svg>
      );
    default:
      // Bowl: anything else.
      return (
        <svg {...props}>
          <path d="M4 12h16a8 6 0 0 1-16 0Z" {...STROKE} />
          <path d="M9 12V8M12 12V6M15 12V8" {...STROKE} />
        </svg>
      );
  }
}
