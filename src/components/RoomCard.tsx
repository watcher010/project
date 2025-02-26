import React, { useState } from 'react';
import { Settings, Trash2, Power, Download } from 'lucide-react';
import { Room } from '../types';

interface RoomCardProps {
  room: Room;
  isActive: boolean;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  onThresholdChange: (id: string, threshold: number) => void;
  onResetPower: (id: string) => void;
}

const RoomCard: React.FC<RoomCardProps> = ({
  room,
  isActive,
  onDelete,
  onSelect,
  onThresholdChange,
  onResetPower,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newThreshold, setNewThreshold] = useState(room.threshold.toString());

  const handleThresholdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(newThreshold);
    if (!isNaN(value) && value > 0) {
      onThresholdChange(room.id, value);
      setIsEditing(false);
    }
  };

  const latestReading = room.powerReadings[room.powerReadings.length - 1]?.value || 0;

  const getStatusColor = () => {
    if (room.isCutoff) return 'text-red-500';
    if (room.bypassDetected) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusText = () => {
    if (room.isCutoff) return 'Power Cut Off';
    if (room.bypassDetected) return 'Bypass Detected';
    return 'Power On';
  };

  return (
    <div
      className={`p-4 rounded-lg shadow-md cursor-pointer transition-all ${
        isActive ? 'bg-blue-50 border-2 border-blue-500' : 'bg-white'
      } ${room.isCutoff ? 'border-2 border-red-500' : ''}`}
      onClick={() => onSelect(room.id)}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">{room.name}</h3>
        <div className="flex gap-2">
          {(room.isCutoff || room.bypassDetected) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onResetPower(room.id);
              }}
              className="p-1 hover:bg-green-100 rounded text-green-500"
              title="Reset Power"
            >
              <Power size={18} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(!isEditing);
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <Settings size={18} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(room.id);
            }}
            className="p-1 hover:bg-gray-100 rounded text-red-500"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <p>Current Power: {latestReading.toFixed(2)} W</p>
        <p>Threshold: {room.threshold} W</p>
        <p className={`font-medium ${getStatusColor()}`}>
          Status: {getStatusText()}
        </p>
        {isActive && <p className="text-blue-500">Currently Monitoring</p>}
        <p className="text-sm text-gray-500">
          GPIO Pins: PZEM {room.measPin}, Cutoff {room.cutoffPin}
        </p>
      </div>

      {isEditing && (
        <form onSubmit={handleThresholdSubmit} onClick={e => e.stopPropagation()} className="mt-2">
          <input
            type="number"
            value={newThreshold}
            onChange={(e) => setNewThreshold(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="New threshold (W)"
          />
          <button
            type="submit"
            className="mt-2 w-full bg-blue-500 text-white py-1 px-2 rounded hover:bg-blue-600"
          >
            Update Threshold
          </button>
        </form>
      )}
    </div>
  );
}

export default RoomCard;