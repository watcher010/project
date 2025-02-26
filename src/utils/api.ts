import { Room, RoomConfig, PowerEvent } from '../types';

const API_BASE = `http://${import.meta.env.VITE_ESP32_IP || 'esp32.local'}`;

export async function fetchRoomData(): Promise<Room[]> {
    try {
        const response = await fetch(`${API_BASE}/data`, {
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching room data:', error);
        throw new Error('Failed to connect to ESP32. Please check the connection and ensure the correct IP is set in .env file');
    }
}

export async function addRoom(config: RoomConfig): Promise<void> {
    try {
        const response = await fetch(`${API_BASE}/config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ action: 'add', ...config }),
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error adding room:', error);
        throw new Error('Failed to add room. Please check the ESP32 connection.');
    }
}

export async function removeRoom(name: string): Promise<void> {
    try {
        const response = await fetch(`${API_BASE}/config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ action: 'remove', name }),
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error removing room:', error);
        throw new Error('Failed to remove room. Please check the ESP32 connection.');
    }
}

export async function updateThreshold(name: string, threshold: number): Promise<void> {
    try {
        const response = await fetch(`${API_BASE}/config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ action: 'update', name, threshold }),
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error updating threshold:', error);
        throw new Error('Failed to update threshold. Please check the ESP32 connection.');
    }
}

export async function resetPower(name: string): Promise<void> {
    try {
        const response = await fetch(`${API_BASE}/config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ action: 'reconnect', name }),
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error resetting power:', error);
        throw new Error('Failed to reset power. Please check the ESP32 connection.');
    }
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