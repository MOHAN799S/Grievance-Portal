"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const MAP_CENTER = [17.0400, 82.1600];

const AREA_COORDS = {
  "Bhanugudi": [16.9891, 82.2475],
  "Sarpavaram": [17.0150, 82.2400],
  "Main Road": [16.9604, 82.2381],
  "Jagannaickpur": [16.9463, 82.2323],
  "Gandhi Nagar": [16.9740, 82.2280],
  "Indrapalem": [16.9830, 82.2190],
  "Thimmapuram": [17.0280, 82.2510],
  "Achampeta": [17.0350, 82.1950],
  "Samalkot": [17.0474, 82.1695],
  "Peddapuram": [17.0757, 82.1363],
  "Surampalem": [17.0980, 82.0620],
  "Gandepalli": [17.1580, 81.9980]
};

const fixLeafletIcons = () => {
  // Fix for missing marker icons in React Leaflet
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
};

const createSimpleIcon = (priority, status) => {
    let colorVar = '#eab308'; // Yellow (Low/Default)

    if (status === 'Resolved') {
        colorVar = '#22c55e'; // Green
    } else if (priority === 'Immediate') {
        colorVar = '#9333ea'; // Purple
    } else if (priority === 'High') {
        colorVar = '#ef4444'; // Red
    } else if (priority === 'Medium') {
        colorVar = '#f97316'; // Orange
    }

    return L.divIcon({
      className: 'custom-marker', 
      html: `
        <div style="
          background-color: ${colorVar};
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>
      `,
      iconSize: [16, 16], 
      iconAnchor: [8, 8], 
      popupAnchor: [0, -10] 
    });
};

export default function GrievanceMap({ grievances }) {
  
  useEffect(() => {
    fixLeafletIcons();
  }, []);

  return (
    <div className="h-[450px] w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200 relative z-0 bg-slate-50">
      <MapContainer 
        key="simple-map" 
        center={MAP_CENTER} 
        zoom={11} 
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {grievances.map((g) => {
          const coords = AREA_COORDS[g.area];
          if (!coords) return null;

          // Jitter to prevent overlap
          const jitterLat = coords[0] + (Math.random() * 0.003 - 0.0015);
          const jitterLng = coords[1] + (Math.random() * 0.003 - 0.0015);
          const position = [jitterLat, jitterLng];

          return (
            <Marker 
                key={g._id} 
                position={position} 
                icon={createSimpleIcon(g.priority, g.status)}
            >
              <Popup>
                <div className="p-1 min-w-[150px]">
                  <div className="flex justify-between items-center mb-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white ${
                          g.status === 'Resolved' ? 'bg-green-600' :
                          g.priority === 'Immediate' ? 'bg-purple-600' :
                          g.priority === 'High' ? 'bg-red-600' : 
                          g.priority === 'Medium' ? 'bg-orange-600' :
                          'bg-yellow-600'
                      }`}>
                        {g.status === 'Resolved' ? 'Resolved' : g.priority}
                      </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-800 leading-tight mb-1">{g.category} Issue</h3>
                  <p className="text-xs text-slate-500">{g.area}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}