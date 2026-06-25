import { cn } from "@/lib/utils";

type EssenceLogoMarkProps = {
  className?: string;
};

export function EssenceLogoMark({ className }: EssenceLogoMarkProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 512 512"
      className={cn(
        "shrink-0 rounded-md shadow-[0_0_28px_rgba(52,211,153,0.2)]",
        className,
      )}
    >
      <rect width="512" height="512" rx="112" fill="#020617" />
      <rect
        x="42"
        y="42"
        width="428"
        height="428"
        rx="88"
        fill="none"
        stroke="#34d399"
        strokeOpacity="0.28"
        strokeWidth="18"
      />
      <path
        d="M184 372 C166 312 166 202 184 140"
        fill="none"
        stroke="#ecfdf5"
        strokeLinecap="round"
        strokeWidth="34"
      />
      <path
        d="M200 155 C250 130 326 132 366 160"
        fill="none"
        stroke="#ecfdf5"
        strokeLinecap="round"
        strokeWidth="36"
      />
      <path
        d="M188 256 C242 238 312 242 352 264"
        fill="none"
        stroke="#a7f3d0"
        strokeLinecap="round"
        strokeWidth="34"
      />
      <path
        d="M202 356 C254 382 326 382 370 354"
        fill="none"
        stroke="#ecfdf5"
        strokeLinecap="round"
        strokeWidth="36"
      />
    </svg>
  );
}
