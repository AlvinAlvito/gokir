import React from "react";

type ButtonSize = "xs" | "sm" | "md" | "lg";
type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success"
  | "warning"
  | "link";

export interface ButtonProps {
  children?: React.ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  className?: string;
  disabled?: boolean;
  isLoading?: boolean;
  type?: "button" | "submit" | "reset";
  fullWidth?: boolean;
  rounded?: "md" | "lg" | "full";
  // Optional as link
  as?: "button" | "a";
  href?: string;
  target?: string;
  rel?: string;
}

const sizeClasses: Record<ButtonSize, string> = {
  xs: "px-3 py-2 text-xs",
  sm: "px-4 py-3 text-sm",
  md: "px-5 py-3.5 text-sm",
  lg: "px-6 py-4 text-base",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300",
  secondary:
    "bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600",
  outline:
    "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/[0.03]",
  ghost:
    "bg-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.04]",
  danger:
    "bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300",
  success:
    "bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-emerald-300",
  warning:
    "bg-amber-500 text-white hover:bg-amber-600 disabled:bg-amber-300",
  link:
    "bg-transparent text-brand-500 hover:text-brand-600 underline-offset-4 hover:underline",
};

const roundedClasses: Record<NonNullable<ButtonProps["rounded"]>, string> = {
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

const base =
  "inline-flex items-center justify-center gap-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed";

const Spinner = () => (
  <svg
    className="animate-spin h-4 w-4"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
      fill="none"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
    />
  </svg>
);

const Button: React.FC<ButtonProps> = ({
  children,
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  onClick,
  className = "",
  disabled = false,
  isLoading = false,
  type = "button",
  fullWidth = false,
  rounded = "lg",
  as = "button",
  href,
  target,
  rel,
}) => {
  const classes = [
    base,
    sizeClasses[size],
    variantClasses[variant],
    roundedClasses[rounded],
    fullWidth ? "w-full" : "",
    disabled || isLoading ? "opacity-60" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // Konten di dalam tombol (handle loading)
  const content = (
    <>
      {isLoading && (
        <span className="flex items-center">
          <Spinner />
        </span>
      )}
      {!isLoading && startIcon && (
        <span className="flex items-center">{startIcon}</span>
      )}
      <span className="inline-flex items-center">
        {typeof children === "string" ? (
          <span className="truncate">{children}</span>
        ) : (
          children
        )}
      </span>
      {!isLoading && endIcon && (
        <span className="flex items-center">{endIcon}</span>
      )}
    </>
  );

  if (as === "a") {
    return (
      <a
        className={classes}
        href={href}
        target={target}
        rel={rel}
        onClick={onClick as any}
        aria-busy={isLoading || undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      className={classes}
      onClick={onClick as any}
      disabled={disabled || isLoading}
      type={type}
      aria-busy={isLoading || undefined}
    >
      {content}
    </button>
  );
};

export default Button;
