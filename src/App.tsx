import React, { useState, useEffect } from 'react';
import { PlusCircle, Download } from 'lucide-react';
import RoomCard from './components/RoomCard';
import PowerGraph from './components/PowerGraph';
import AddRoomDialog from './components/AddRoomDialog';
import { Room, PowerEvent, RoomConfig } from './types';
import { fetchRoomData, addRoom, removeRoom, updateThreshold, resetPower, downloadEvents } from './utils/api';

function App() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [events, setEvents] = useState<PowerEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial data and set up polling
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchRoomData();
        setRooms(data);
        if (!selectedRoomId && data.length > 0) {
          setSelectedRoomId(data[0].id);
        }
      } catch (err) {
        setError('Failed to connect to ESP32. Please check the connection.');
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, []);

  // Event logging
  useEffect(() => {
    rooms.forEach(room => {
      const lastReading = room.powerReadings[room.powerReadings.length - 1];
      if (!lastReading) return;

      if (room.isCutoff && !events.some(e => 
        e.roomId === room.id && 
        e.eventType === 'cutoff' && 
        e.timestamp > Date.now() - 5000
      )) {
        setEvents(prev => [...prev, {
          timestamp: Date.now(),
          roomId: room.id,
          roomName: room.name,
          eventType: 'cutoff',
          powerValue: lastReading.value
        }]);
      }

      if (room.bypassDetected && !events.some(e => 
        e.roomId === room.id && 
        e.eventType === 'bypass' && 
        e.timestamp > Date.now() - 5000
      )) {
        setEvents(prev => [...prev, {
          timestamp: Date.now(),
          roomId: room.id,
          roomName: room.name,
          eventType: 'bypass',
          powerValue: lastReading.value
        }]);
      }
    });
  }, [rooms]);

  const handleAddRoom = async (config: RoomConfig) => {
    try {
      await addRoom(config);
      setShowAddDialog(false);
    } catch (err) {
      setError('Failed to add room');
    }
  };

  const handleDeleteRoom = async (id: string) => {
    if (rooms.length <= 1) {
      setError('Cannot delete the last room');
      return;
    }
    try {
      const room = rooms.find(r => r.id === id);
      if (room) {
        await removeRoom(room.name);
        if (selectedRoomId === id) {
          setSelectedRoomId(rooms.find(r => r.id !== id)?.id || '');
        }
      }
    } catch (err) {
      setError('Failed to delete room');
    }
  };

  const handleThresholdChange = async (id: string, threshold: number) => {
    try {
      const room = rooms.find(r => r.id === id);
      if (room) {
        await updateThreshold(room.name, threshold);
      }
    } catch (err) {
      setError('Failed to update threshold');
    }
  };

  const handleResetPower = async (id: string) => {
    try {
      const room = rooms.find(r => r.id === id);
      if (room) {
        await resetPower(room.name);
        setEvents(prev => [...prev, {
          timestamp: Date.now(),
          roomId: room.id,
          roomName: room.name,
          eventType: 'reset',
          powerValue: room.powerReadings[room.powerReadings.length - 1]?.value || 0
        }]);
      }
    } catch (err) {
      setError('Failed to reset power');
    }
  };

  const selectedRoom = rooms.find(room => room.id === selectedRoomId);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Power Monitoring Dashboard</h1>
          <div className="flex gap-4">
            <button
              onClick={() => downloadEvents(events)}
              className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
            >
              <Download size={20} />
              Export Events
            </button>
            <button
              onClick={() => setShowAddDialog(true)}
              className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              <PlusCircle size={20} />
              Add Room
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
            {error}
            <button
              onClick={() => setError(null)}
              className="float-right text-red-700 hover:text-red-900"
            >
              ×
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1 space-y-4">
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                isActive={room.id === selectedRoomId}
                onDelete={handleDeleteRoom}
                onSelect={setSelectedRoomId}
                onThresholdChange={handleThresholdChange}
                onResetPower={handleResetPower}
              />
            ))}
          </div>

          <div className="md:col-span-3 bg-white p-6 rounded-lg shadow-md">
            {selectedRoom ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-semibold">{selectedRoom.name} - Power Monitoring</h2>
                  <div className={`px-4 py-2 rounded-lg font-medium ${
                    selectedRoom.isCutoff ? 'bg-red-100 text-red-700' :
                    selectedRoom.bypassDetected ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    Status: {
                      selectedRoom.isCutoff ? 'Power Cut Off' :
                      selectedRoom.bypassDetected ? 'Bypass Detected' :
                      'Power On'
                    }
                  </div>
                </div>
                <PowerGraph
                  readings={selectedRoom.powerReadings}
                  threshold={selectedRoom.threshold}
                  isCutoff={selectedRoom.isCutoff}
                  bypassDetected={selectedRoom.bypassDetected}
                />
              </>
            ) : (
              <div className="text-center text-gray-500">
                No room selected
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddDialog && (
        <AddRoomDialog
          onAdd={handleAddRoom}
          onClose={() => setShowAddDialog(false)}
        />
      )}
    </div>
  );
}

export default App;