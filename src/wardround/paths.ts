export interface WardRoundPathConfig {
  icloudRoot?: string;
  wardRoundRoot?: string;
}

export const DEFAULT_ICLOUD_ROOT = '~/Library/Mobile Documents/com~apple~CloudDocs';
export const DEFAULT_WARD_ROUND_ROOT = 'Operator/WardRounds';

const trimSegment = (segment: string, isFirst: boolean): string => {
  if (!segment) return '';
  if (isFirst) return segment.replace(/\/+$/, '');
  return segment.replace(/^\/+|\/+$/g, '');
};

const joinPaths = (...parts: string[]): string => {
  const filtered = parts.filter(Boolean);
  if (filtered.length === 0) return '';
  const [first, ...rest] = filtered;
  return [trimSegment(first, true), ...rest.map(part => trimSegment(part, false))].join('/');
};

const resolveRoot = (input: string): string => {
  if (!input) return '';
  if (input.startsWith('~/') && typeof process !== 'undefined' && process.env?.HOME) {
    return joinPaths(process.env.HOME, input.slice(2));
  }
  if (input.startsWith('/')) return input;
  if (typeof process !== 'undefined' && typeof process.cwd === 'function') {
    return joinPaths(process.cwd(), input);
  }
  return input;
};

const resolveWardRoundsRoot = (config?: WardRoundPathConfig): string => {
  const icloudRoot = resolveRoot(config?.icloudRoot ?? DEFAULT_ICLOUD_ROOT);
  const wardRoot = config?.wardRoundRoot !== undefined ? config.wardRoundRoot : DEFAULT_WARD_ROUND_ROOT;
  if (!wardRoot) return icloudRoot;
  if (wardRoot.startsWith('~/')) return resolveRoot(wardRoot);
  if (wardRoot.startsWith('/')) return wardRoot;
  return joinPaths(icloudRoot, wardRoot);
};

export const getICloudRoot = (config?: WardRoundPathConfig): string => {
  return resolveRoot(config?.icloudRoot ?? DEFAULT_ICLOUD_ROOT);
};

export const getOperatorRoot = (config?: WardRoundPathConfig): string => {
  return joinPaths(getICloudRoot(config), 'Operator');
};

export const getWardRoundsRoot = (config?: WardRoundPathConfig): string => {
  return resolveWardRoundsRoot(config);
};

export const getWardExportsRoot = (roundId = '', config?: WardRoundPathConfig): string => {
  return joinPaths(resolveWardRoundsRoot(config), 'Exports', roundId);
};

export const getWardImportsRoot = (roundId = '', config?: WardRoundPathConfig): string => {
  return joinPaths(resolveWardRoundsRoot(config), 'Imports', roundId);
};

export const getWardArchiveRoot = (roundId = '', config?: WardRoundPathConfig): string => {
  return joinPaths(resolveWardRoundsRoot(config), 'Archive', roundId);
};

export const getWardLogsRoot = (config?: WardRoundPathConfig): string => {
  return joinPaths(resolveWardRoundsRoot(config), 'Logs');
};

export const getWardLayoutsRoot = (config?: WardRoundPathConfig): string => {
  return joinPaths(resolveWardRoundsRoot(config), 'Layouts');
};
