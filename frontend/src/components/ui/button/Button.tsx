// components/ui/button/Button.tsx
import React from "react";

type ButtonOwnProps = {
  size?: "sm" | "md";
  variant?: "primary" | "outline" | "ghost" | "danger" | "success";
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  className?: string;
  loading?: boolean;
};

type ButtonProps = ButtonOwnProps &
  React.ButtonHTMLAttributes<HTMLButtonElement>; // <-- warisi props native

const Button: React.FC<ButtonProps> = ({
  children,
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  className = "",
  disabled = false,
  loading = false,
  type = "button", // <-- default button, bisa di-override
  ...rest
}) => {
  const sizeClasses = {
    sm: "px-4 py-3 text-sm",
    md: "px-5 py-3.5 text-sm",
  };

  const variantClasses = {
    primary:
      "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300",
    outline:
      "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300",
    ghost:
      "bg-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5",
    danger:
      "bg-red-500 text-white shadow-theme-xs hover:bg-red-600 disabled:bg-red-300",
    success:
      "bg-emerald-500 text-white shadow-theme-xs hover:bg-emerald-600 disabled:bg-emerald-300",
  } as const;

  return (
    <button
      type={type} // <-- penting
      className={`inline-flex items-center justify-center gap-2 rounded-lg transition ${className} ${
        sizeClasses[size]
      } ${variantClasses[variant]} ${
        disabled || loading ? "cursor-not-allowed opacity-50" : ""
      }`}
      disabled={disabled || loading}
      {...rest}
    >
      {startIcon && <span className="flex items-center">{startIcon}</span>}
      {loading ? "Processing..." : children}
      {endIcon && <span className="flex items-center">{endIcon}</span>}
    </button>
  );
};

export default Button;
