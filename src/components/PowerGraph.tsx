import React, { useEffect, useRef } from 'react';
import { PowerReading } from '../types';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PowerGraphProps {
  readings: PowerReading[];
  threshold: number;
  isCutoff: boolean;
  bypassDetected: boolean;
}

const PowerGraph: React.FC<PowerGraphProps> = ({ readings, threshold, isCutoff, bypassDetected }) => {
  const chartRef = useRef<any>(null);

  const data = {
    labels: readings.map(reading => new Date(reading.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: 'Power (W)',
        data: readings.map(reading => reading.value),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
        fill: false
      },
      {
        label: 'Threshold',
        data: Array(readings.length).fill(threshold),
        borderColor: 'rgb(255, 99, 132)',
        borderDash: [5, 5],
        tension: 0,
        fill: false
      }
    ]
  };

  const options = {
    responsive: true,
    animation: {
      duration: 0 // Disable animation for real-time updates
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Power (Watts)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Time'
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Power Consumption Over Time'
      }
    }
  };

  return (
    <div className="w-full">
      <div className="h-[400px] relative">
        <Line data={data} options={options} />
      </div>
      {isCutoff && (
        <div className="mt-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
          ⚠️ This room has exceeded threshold limit and has been cut off
        </div>
      )}
      {bypassDetected && (
        <div className="mt-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
          ⚡ Warning: Potential bypass detected! Power readings detected after cutoff
        </div>
      )}
    </div>
  );
};

export default PowerGraph;