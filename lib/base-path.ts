export const BASE_PATH = '/prompt-lab';

export function withBasePath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_PATH}${normalizedPath}`;
}

export function apiPath(path: string): string {
  return withBasePath(path);
}
