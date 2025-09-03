export function buildFsUrl(labId?: string) {
  if (typeof window === 'undefined' || !labId) return '';
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const override = (process as any)?.env?.NEXT_PUBLIC_FS_BASE as string | undefined;
  if (override) return `${override.replace(/\/$/, '')}/fs`;
  return `${wsProtocol}://${labId}.devsarena.in/fs`;
}
