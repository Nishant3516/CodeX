export function buildPtyUrl(labId?: string) {
  if (typeof window === 'undefined' || !labId) return '';
  const protocol = 'ws';
  return `${protocol}://${labId}.quest.arenas.devsarena.in/pty`;
}
