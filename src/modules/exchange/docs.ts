import type { ApiParameter } from './openapi';

type JsonSchema = {
  type?: string;
  format?: string;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  default?: unknown;
  example?: unknown;
};

/** Тип параметра для людей: «дата ГГГГ-ММ-ДД», «economy | business», «целое 1–100». */
export function typeLabel(schema: Record<string, unknown>): string {
  const json = schema as JsonSchema;
  if (json.enum) return json.enum.join(' | ');
  if (json.format === 'date') return 'дата ГГГГ-ММ-ДД';
  if (json.format === 'uuid') return 'UUID';
  if (json.type === 'integer') {
    const max = json.maximum !== undefined && json.maximum < 1e6 ? json.maximum : undefined;
    if (json.minimum !== undefined && max !== undefined) return `целое ${json.minimum}–${max}`;
    if (json.minimum !== undefined) return `целое от ${json.minimum}`;
    return 'целое';
  }
  return json.type === 'string' ? 'строка' : (json.type ?? 'значение');
}

/** Значение по умолчанию параметра, если оно есть. */
export function defaultOf(parameter: ApiParameter): string | undefined {
  const value = (parameter.schema as JsonSchema).default;
  return value === undefined ? undefined : String(value);
}
