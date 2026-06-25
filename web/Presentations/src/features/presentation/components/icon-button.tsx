import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type IconButtonProps = {
  label: string
  icon: LucideIcon
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  className?: string
}

export function IconButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  active,
  className,
}: IconButtonProps) {
  return (
    <Button
      aria-label={label}
      title={label}
      type="button"
      size="icon-sm"
      variant={active ? "secondary" : "ghost"}
      disabled={disabled}
      onClick={onClick}
      className={cn("shrink-0", className)}
    >
      <Icon className="size-4" />
    </Button>
  )
}
