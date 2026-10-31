import { translate } from '@/lib/i18n';
import { PositionFormatError } from '@/lib/positions/position';

export function positionError(error: unknown): string {
  const code = error instanceof PositionFormatError ? error.code : 'format';
  return translate(`positions.error_${code}`);
}
