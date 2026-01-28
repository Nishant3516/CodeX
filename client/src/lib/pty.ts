export function buildPtyUrl(labId?: string) {
  if (typeof window === 'undefined' || !labId) return '';
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${wsProtocol}://${labId}.devsarena.in/pty`;
}

export function sendPtyKillUserProcesses(ws: WebSocket | null | undefined) {
  if (!ws) return;
  if (ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(JSON.stringify({ type: 'kill_user_processes' }));
  } catch {
    // best-effort
  }
}
