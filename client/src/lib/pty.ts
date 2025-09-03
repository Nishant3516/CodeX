export function buildPtyUrl(labId?: string) {
  if (typeof window === 'undefined' || !labId) return '';
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${wsProtocol}://${labId}.devsarena.in/pty`;
}
