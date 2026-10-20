import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'md' | 'lg';

type ButtonStyle = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

const VARIANTS: Record<ButtonVariant, string> = {
  // Белый текст — только на leaf: на avocado контраст ниже нормы (docs/06-design.md).
  primary: 'border-transparent bg-leaf text-white hover:bg-graphite',
  secondary: 'border-graphite text-graphite hover:bg-graphite hover:text-white',
  ghost: 'border-transparent text-slate hover:bg-mist',
};

const SIZES: Record<ButtonSize, string> = {
  md: 'px-5 py-2 text-base',
  lg: 'px-7 py-3 text-lg',
};

/**
 * Классы кнопки. Нужны отдельно, чтобы так же оформить ссылку:
 * `<Link className={buttonClasses({ variant: 'secondary' })}>`.
 */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
}: ButtonStyle = {}) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-full border-2 font-semibold whitespace-nowrap no-underline transition-colors disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    fullWidth && 'w-full',
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonStyle;

export function Button({
  variant,
  size,
  fullWidth,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonClasses({ variant, size, fullWidth }), className)}
      {...props}
    />
  );
}
