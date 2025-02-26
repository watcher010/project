import React, { useState } from 'react';
import { RoomConfig } from '../types';

interface AddRoomDialogProps {
  onAdd: (config: RoomConfig) => void;
  onClose: () => void;
}

const AddRoomDialog: React.FC<AddRoomDialogProps> = ({ onAdd, onClose }) => {
  const [config, setConfig] = useState<RoomConfig>({
    name: '',
    measPin: 25,
    cutoffPin: 26,
    threshold: 2500,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(config);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-96">
        <h2 className="text-xl font-bold mb-4">Add New Room</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Room Name</label>
            <input
              type="text"
              value={config.name}
              onChange={e => setConfig({ ...config, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">PZEM Reading Pin (GPIO)</label>
            <input
              type="number"
              value={config.measPin}
              onChange={e => setConfig({ ...config, measPin: parseInt(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              min="0"
              max="39"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Power Cutoff Pin (GPIO)</label>
            <input
              type="number"
              value={config.cutoffPin}
              onChange={e => setConfig({ ...config, cutoffPin: parseInt(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              min="0"
              max="39"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Power Threshold (W)</label>
            <input
              type="number"
              value={config.threshold}
              onChange={e => setConfig({ ...config, threshold: parseFloat(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              min="100"
              max="10000"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Add Room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRoomDialog;