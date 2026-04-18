import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Pizza, MapPin, Phone, Clock, Package } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

interface Donation {
  id: string;
  donorId: string;
  donorName: string;
  donorPhone: string;
  foodName: string;
  quantity: string;
  location: string;
  expiry: string;
  dietaryType: "Veg" | "Non-Veg";
  status: "Available" | "Claimed" | "Pending" | "Expired";
  createdAt: string;
  imageUrls: string[];
}

interface MapViewProps {
  donations: Donation[];
  onClaim: (id: string) => void;
  onContact: (donation: Donation) => void;
  userRole: string;
  selectedLocation: string;
}

const LOCATION_COORDS: Record<string, [number, number]> = {
  "Pune, Maharashtra": [18.5204, 73.8567],
  "Mumbai, Maharashtra": [19.0760, 72.8777],
  "Delhi, NCR": [28.6139, 77.2090],
  "Bangalore, Karnataka": [12.9716, 77.5946]
};

// Custom Icon Creator
const createCustomIcon = (emoji: string) => {
  const iconHtml = renderToStaticMarkup(
    <div className="relative flex items-center justify-center">
      <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center shadow-lg border-2 border-white/20 transform -translate-y-2">
        <span className="text-xl">{emoji}</span>
      </div>
      <div className="absolute -bottom-1 w-2 h-2 bg-accent rotate-45 border-r border-b border-white/20"></div>
    </div>
  );

  return L.divIcon({
    html: iconHtml,
    className: 'custom-div-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });
};

const getMockEmoji = (foodName: string) => {
  const name = foodName.toLowerCase();
  if (name.includes("pizza")) return "🍕";
  if (name.includes("sandwich")) return "🥪";
  if (name.includes("fruit")) return "🍎";
  if (name.includes("milk")) return "🥛";
  if (name.includes("thali") || name.includes("rice")) return "🍲";
  return "🍱";
};

const getPlaceholderImage = (foodName: string) => {
  return `https://picsum.photos/seed/${encodeURIComponent(foodName)}/800/600`;
};

// Internal component to handle view changes via useMap hook
const SetViewOnLocationChange = ({ coords }: { coords: [number, number] }) => {
  const map = useMap();
  React.useEffect(() => {
    map.setView(coords, 13, {
      animate: true,
      duration: 1.5
    });
  }, [coords, map]);
  return null;
};

export const MapView: React.FC<MapViewProps> = ({ donations, onClaim, onContact, userRole, selectedLocation }) => {
  const availableDonations = donations.filter(d => d.status === "Available");
  
  const currentCenter = LOCATION_COORDS[selectedLocation] || [20.5937, 78.9629];
  
  React.useEffect(() => {
    // Classic Leaflet fix for maps rendered in tabs/modals or with animations
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Group donations by location to avoid overlapping markers
  const groupedDonations = availableDonations.reduce((acc, curr) => {
    if (!acc[curr.location]) acc[curr.location] = [];
    acc[curr.location].push(curr);
    return acc;
  }, {} as Record<string, Donation[]>);

  return (
    <div className="w-full h-[600px] rounded-[32px] overflow-hidden border border-border-theme z-0 relative shadow-2xl">
      <MapContainer 
        center={currentCenter} 
        zoom={13} 
        style={{ height: '100%', width: '100%', background: '#050507' }}
        scrollWheelZoom={true}
      >
        <SetViewOnLocationChange coords={currentCenter} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {Object.entries(groupedDonations).map(([location, docs]: [string, Donation[]]) => {
          const coords = LOCATION_COORDS[location];
          if (!coords) return null;

          // Jitter coordinates slightly if multiple markers at same location
          return docs.map((d: Donation) => {
            // Stable jitter based on ID hash
            const seed = d.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const jitterCoords: [number, number] = [
              coords[0] + ((seed % 100) / 100 - 0.5) * 0.02,
              coords[1] + (((seed * 7) % 100) / 100 - 0.5) * 0.02
            ];

            return (
              <Marker 
                key={d.id} 
                position={jitterCoords} 
                icon={createCustomIcon(getMockEmoji(d.foodName))}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="min-w-[200px] bg-bg text-text-primary rounded-xl overflow-hidden">
                    <div className="h-32 w-full relative overflow-hidden mb-2 bg-accent/5">
                      <img 
                        src={d.imageUrls && d.imageUrls.length > 0 ? d.imageUrls[0] : getPlaceholderImage(d.foodName)} 
                        className="w-full h-full object-cover relative z-[1]" 
                        alt={d.foodName} 
                        referrerPolicy="no-referrer" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800";
                        }}
                      />
                      
                      {(!d.imageUrls || d.imageUrls.length === 0) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-[2] pointer-events-none">
                           <span className="text-4xl drop-shadow-2xl">{getMockEmoji(d.foodName)}</span>
                        </div>
                      )}
                      
                      {d.imageUrls && d.imageUrls.length > 1 && (
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-bold text-white z-[3]">
                          +{d.imageUrls.length - 1} photos
                        </div>
                      )}
                    </div>
                    
                    <div className="p-3 pt-1">
                      <div className="flex items-center gap-2 mb-2">
                         <h3 className="font-bold text-sm text-white">{d.foodName}</h3>
                      </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-[11px] text-text-secondary">
                        <Package className="w-3 h-3 text-accent" />
                        <span>Qty: {d.quantity}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-text-secondary">
                        <Clock className="w-3 h-3 text-accent" />
                        <span>Expires in {d.expiry}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-text-secondary">
                        <MapPin className="w-3 h-3 text-accent" />
                        <span>{d.location}</span>
                      </div>
                    </div>

                    {userRole === "Receiver" && (
                      <div className="flex gap-2">
                         <button 
                            onClick={() => onContact(d)}
                            className="bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-colors border border-white/10"
                         >
                            <Phone className="w-3 h-3 text-white" />
                         </button>
                         <button 
                            onClick={() => onClaim(d.id)}
                            className="flex-1 bg-accent text-white py-2 rounded-lg text-[11px] font-bold hover:opacity-90 transition-all"
                         >
                            Claim Meal
                         </button>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
              </Marker>
            );
          });
        })}
      </MapContainer>
      
      {/* Floating Legend */}
      <div className="absolute bottom-6 left-6 z-[1000] glass-panel p-4 rounded-2xl flex flex-col gap-2">
         <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Live Markers</p>
         <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-accent shadow-[0_0_10px_rgba(255,107,43,0.5)]"></div>
            <span className="text-xs font-semibold text-white">Available Food</span>
         </div>
      </div>
    </div>
  );
};
