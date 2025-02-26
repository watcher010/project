import { Room, RoomConfig, PowerEvent } from '../types';

const API_BASE = `http://${import.meta.env.VITE_ESP32_IP || 'esp32.local'}`;

export async function fetchRoomData(): Promise<Room[]> {
  const response = await fetch(`${API_BASE}/data`);
  if (!response.ok) throw new Error('Failed to fetch room data');
  return response.json();
}

export async function addRoom(config: RoomConfig): Promise<void> {
  const response = await fetch(`${API_BASE}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'add', ...config }),
  });
  if (!response.ok) throw new Error('Failed to add room');
}

export async function removeRoom(name: string): Promise<void> {
  const response = await fetch(`${API_BASE}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'remove', name }),
  });
  if (!response.ok) throw new Error('Failed to remove room');
}

export async function updateThreshold(name: string, threshold: number): Promise<void> {
  const response = await fetch(`${API_BASE}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update', name, threshold }),
  });
  if (!response.ok) throw new Error('Failed to update threshold');
}

export async function resetPower(name: string): Promise<void> {
  const response = await fetch(`${API_BASE}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'reconnect', name }),
  });
  if (!response.ok) throw new Error('Failed to reset power');
}

export function downloadEvents(events: PowerEvent[]): void {
  const csvContent = [
    'Timestamp,Room,Event Type,Power Value',
    ...events.map(event => 
      `${new Date(event.timestamp).toISOString()},${event.roomName},${event.eventType},${event.powerValue}`
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `power-events-${new Date().toISOString()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}