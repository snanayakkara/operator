export function toError(value: unknown, fallbackMessage = 'Unknown error'): Error {
  if (value instanceof Error) {
    return value;
  }

  if (typeof value === 'string') {
    return new Error(value);
  }

  try {
    return new Error(JSON.stringify(value));
  } catch (jsonError) {
    return new Error(jsonError instanceof Error ? jsonError.message : fallbackMessage);
  }
}

export function getErrorMessage(value: unknown, fallbackMessage = 'Unknown error'): string {
  if (value instanceof Error) {
    return value.message;
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return fallbackMessage;
  }
}
