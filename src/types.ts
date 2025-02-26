export interface PowerReading {
  timestamp: number;
  value: number;
}

export interface Room {
  id: string;
  name: string;
  powerReadings: PowerReading[];
  threshold: number;
  isCutoff: boolean;
  lastActiveTime: number;
  bypassDetected: boolean;
  measPin: number;
  cutoffPin: number;
}

export interface PowerEvent {
  timestamp: number;
  roomId: string;
  roomName: string;
  eventType: 'cutoff' | 'bypass' | 'reset';
  powerValue: number;
}

export interface RoomConfig {
  name: string;
  measPin: number;
  cutoffPin: number;
  threshold: number;
}