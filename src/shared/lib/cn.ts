/** Склеивает CSS-классы, пропуская пустые значения: `cn('btn', isActive && 'active')`. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
