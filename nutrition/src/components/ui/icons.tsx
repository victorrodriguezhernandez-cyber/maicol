/**
 * The one icon set for the whole app — every icon shares stroke width,
 * cap/join style, and a 24×24 viewBox, so the app reads as drawn by one
 * hand instead of mixing emoji with ad-hoc SVGs. Replaces every emoji
 * used as UI chrome (📷 🎙️ ⚖️ ❤️ …) app-wide. Add new icons here, not
 * inline in a component, so the shared stroke/size stays enforced.
 */
import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Icon({ size = 20, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...props}>
      {children}
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 11.5 12 4l8 7.5" />
    <path d="M6 10v9a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1v-9" />
  </Icon>
);

export const CalendarIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
    <path d="M4 9.5h16M8 3.5v3M16 3.5v3" />
  </Icon>
);

export const TrendIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 19.5V4.5M4 19.5h16" />
    <path d="M7 16l3.5-4 3 2.5L18 8" />
  </Icon>
);

export const SparkleIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5c.4 2.6 1 4.1 2 5.1s2.5 1.6 5.1 2c-2.6.4-4.1 1-5.1 2s-1.6 2.5-2 5.1c-.4-2.6-1-4.1-2-5.1s-2.5-1.6-5.1-2c2.6-.4 4.1-1 5.1-2s1.6-2.5 2-5.1Z" />
  </Icon>
);

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const CameraIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1-2h7l1 2h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5Z" />
    <circle cx="12" cy="12.5" r="3.4" />
  </Icon>
);

export const StackedPhotosIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="6" y="6" width="14" height="14" rx="2" />
    <path d="M4 9v9.5A1.5 1.5 0 0 0 5.5 20H15" />
  </Icon>
);

export const TagIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M11.5 4h-5A2.5 2.5 0 0 0 4 6.5v5c0 .53.21 1.04.59 1.41l8 8a2 2 0 0 0 2.82 0l5-5a2 2 0 0 0 0-2.82l-8-8A2 2 0 0 0 11.5 4Z" />
    <circle cx="8.5" cy="8.5" r="1.25" fill="currentColor" stroke="none" />
  </Icon>
);

export const MicIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="9" y="3.5" width="6" height="11" rx="3" />
    <path d="M6 11a6 6 0 0 0 12 0M12 17v3.5M9 20.5h6" />
  </Icon>
);

export const TextIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 6.5h14M5 12h14M5 17.5h9" />
  </Icon>
);

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="m19 19-4-4" />
  </Icon>
);

export const BookIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 4.5h11a2 2 0 0 1 2 2V19a1 1 0 0 0-1-1H5" />
    <path d="M5 4.5A1.5 1.5 0 0 0 3.5 6v12A1.5 1.5 0 0 0 5 19.5h12" />
  </Icon>
);

export const StarIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4.2 14.4 9l5.3.8-3.85 3.75.9 5.25L12 16.3l-4.75 2.5.9-5.25L4.3 9.8l5.3-.8Z" />
  </Icon>
);

export const KeypadIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M8 9h.01M12 9h.01M16 9h.01M8 13h.01M12 13h.01M16 13h.01M8 17h8" />
  </Icon>
);

export const SettingsIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M17.7 6.3l-1.55 1.55M7.85 16.15 6.3 17.7M17.7 17.7l-1.55-1.55M7.85 7.85 6.3 6.3" />
  </Icon>
);

export const UserIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8.2" r="3.3" />
    <path d="M4.8 19.5a7.2 7.2 0 0 1 14.4 0" />
  </Icon>
);

export const LockIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5.5" y="10.5" width="13" height="9" rx="2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Icon>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9.5 5.5 7 6.5-7 6.5" />
  </Icon>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5.5 9.5 6.5 7 6.5-7" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Icon>
);

export const CheckCircleIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.3 12.4 2.6 2.6 4.8-5.3" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Icon>
);

export const EditIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20h4l10.5-10.5a2.3 2.3 0 0 0-3.25-3.25L4.75 16.75Z" />
    <path d="m13.75 7.75 2.5 2.5" />
  </Icon>
);

export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5.5 7h13M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2" />
    <path d="M7 7v11.5A1.5 1.5 0 0 0 8.5 20h7a1.5 1.5 0 0 0 1.5-1.5V7" />
    <path d="M10 11v5.5M14 11v5.5" />
  </Icon>
);

export const ScaleIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M8.5 15.5a3.5 3.5 0 1 1 7 0" />
    <circle cx="12" cy="10" r="1.1" fill="currentColor" stroke="none" />
  </Icon>
);

export const RulerIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="8.5" width="17" height="7" rx="1.5" transform="rotate(-45 12 12)" />
    <path d="m8.5 9.5 1.4 1.4M11 7l1.4 1.4M13.5 4.5l1.4 1.4" />
  </Icon>
);

export const HistoryIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 8v5l3 2" />
    <path d="M4.5 9A7.5 7.5 0 1 1 5 14.5" />
    <path d="M3 5.5V9h3.5" />
  </Icon>
);

export const SendIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12l16-7-6 7 6 7-16-7Z" />
  </Icon>
);

export const UndoIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 8H4V5" />
    <path d="M4 8a8 8 0 1 1-1.6 6" />
  </Icon>
);

export const UploadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 15.5V4.5M8 8.5 12 4.5 16 8.5" />
    <path d="M5 15.5v3A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-3" />
  </Icon>
);

export const AlertIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4 21 19.5H3Z" />
    <path d="M12 10v4M12 16.5h.01" />
  </Icon>
);

export const LogoutIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 8V6.5A1.5 1.5 0 0 0 12.5 5h-6A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19h6a1.5 1.5 0 0 0 1.5-1.5V16" />
    <path d="M10 12h10m0 0-3-3m3 3-3 3" />
  </Icon>
);

export const FoodIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12h16a8 6 0 0 1-16 0Z" />
    <path d="M9 12V8M12 12V6M15 12V8" />
  </Icon>
);

export const ImageIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m5 18 5-5 3.5 3.5L18 12l1.5 1.5" />
  </Icon>
);

export const PaperclipIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M17 8.5 9.7 15.8a3 3 0 0 1-4.2-4.2l7.8-7.8a4.5 4.5 0 1 1 6.4 6.4L11.9 18a6 6 0 0 1-8.5-8.5" />
  </Icon>
);
