import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "@/components/ui/Icons";

type ButtonVariant = "primary" | "secondary" | "ghost" | "quiet" | "danger";
type ButtonSize = "sm" | "md" | "lg";

/**
 * `primary` and `secondary` carry a hard bottom edge that compresses on press,
 * so the control reads as a physical thing to push. `ghost` and `quiet` stay
 * flat — depth is reserved for actions that actually commit something.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "btn-depth bg-flame text-white [--btn-depth-color:var(--color-flame-deep)] hover:bg-[#ff7a34] disabled:bg-line-strong disabled:text-ink-faint",
  secondary:
    "btn-depth bg-surface text-ink border-[1.5px] border-ink [--btn-depth-color:var(--color-ink)] hover:bg-sunk disabled:border-line-strong disabled:text-ink-faint",
  ghost:
    "bg-transparent text-ink border-[1.5px] border-line-strong hover:border-ink hover:bg-surface transition-colors duration-200",
  quiet:
    "bg-transparent text-ink-muted hover:text-ink hover:bg-sunk transition-colors duration-200",
  danger:
    "bg-transparent text-danger border-[1.5px] border-transparent hover:bg-danger-soft hover:border-[color:color-mix(in_srgb,var(--color-danger)_25%,transparent)] transition-colors duration-200",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5 rounded-[10px]",
  md: "h-11 px-5 text-[14px] gap-2 rounded-[12px]",
  lg: "h-[52px] px-7 text-[15px] gap-2.5 rounded-[14px]",
};

const BASE =
  "relative inline-flex select-none items-center justify-center font-medium leading-none whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-70";

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className = "",
) {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
}

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Replaces the label while `loading` is true. */
  loadingText?: string;
  icon?: ReactNode;
  children?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingText,
  icon,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner className="text-[1.15em]" /> : icon}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}

interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  children?: ReactNode;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  icon,
  className = "",
  children,
  ...props
}: ButtonLinkProps) {
  const isExternal = href.startsWith("http") || href.startsWith("#");
  const classes = buttonClass(variant, size, className);

  if (isExternal) {
    return (
      <a href={href} className={classes} {...props}>
        {icon}
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...props}>
      {icon}
      {children}
    </Link>
  );
}
