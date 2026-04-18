/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Heart, 
  MapPin, 
  Clock, 
  Plus, 
  History, 
  User, 
  Settings, 
  Home, 
  Package, 
  Bell, 
  ArrowRight,
  LogOut,
  Phone,
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Pizza,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Map as MapIcon,
  LayoutGrid,
  Star,
  Trash2,
  AlertTriangle,
  Sun,
  Moon,
  Store,
  Building2,
  Building,
  Utensils,
  Image as ImageIcon,
  Upload,
  X,
  Check,
  Filter
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  where,
  or,
  serverTimestamp,
  setDoc,
  getDoc,
  getDocFromServer,
  Timestamp,
  deleteField,
  deleteDoc,
  writeBatch
} from "firebase/firestore";
import { auth, db } from "./lib/firebase";
import { MapView } from "./components/MapView";
import "leaflet/dist/leaflet.css";

// --- Types ---

type Role = "Donor" | "Receiver";
type Status = "Available" | "Pending" | "Claimed" | "Expired";
type OrgType = "NGO" | "Hotel" | "Restaurant" | "Organization" | "Individual";

interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: Role;
  orgType?: OrgType;
  photoURL?: string;
  bio?: string;
}

interface Donation {
  id: string;
  donorId: string;
  donorName: string;
  donorPhone: string;
  donorAddress: string;
  pincode: string;
  foodName: string;
  quantity: string;
  location: string;
  expiry: string;
  expiresAt: any;
  dietaryType: "Veg" | "Non-Veg";
  imageUrls: string[];
  status: Status;
  claimedBy?: string;
  rating?: number;
  ratingMessage?: string;
  createdAt: any;
}

interface Notification {
  id: string;
  message: string;
  type: "info" | "success";
}

interface Claim {
  id: string;
  donationId: string;
  receiverId: string;
  receiverName: string;
  receiverPhone: string;
  status: "Pending" | "Accepted" | "Declined";
  createdAt: any;
}

// --- Constants ---

const LOCATIONS = ["Pune, Maharashtra", "Mumbai, Maharashtra", "Delhi, NCR", "Bangalore, Karnataka"];

// --- Mock Utils ---

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

const GalleryModal = ({ images, foodName, onCancel }: { images: string[]; foodName: string; onCancel: () => void }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="absolute inset-0 bg-black/95 backdrop-blur-xl"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-4xl relative z-10 flex flex-col gap-6"
      >
        <div className="flex justify-between items-center text-white px-2">
           <div>
             <h2 className="text-2xl font-bold font-display">{foodName}</h2>
             <p className="text-white/60 text-sm">Image {activeIndex + 1} of {images.length}</p>
           </div>
           <button 
             onClick={onCancel}
             className="bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors"
           >
             <X className="w-6 h-6" />
           </button>
        </div>

        <div className="relative group aspect-video md:aspect-[21/9] bg-white/5 rounded-[32px] overflow-hidden border border-white/10">
          <AnimatePresence mode="wait">
            <motion.img 
              key={activeIndex}
              src={images[activeIndex]}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </AnimatePresence>

          {images.length > 1 && (
            <>
              <button 
                onClick={() => setActiveIndex(prev => (prev === 0 ? images.length - 1 : prev - 1))}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 p-4 rounded-full text-white backdrop-blur-md transition-all opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button 
                onClick={() => setActiveIndex(prev => (prev === images.length - 1 ? 0 : prev + 1))}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 p-4 rounded-full text-white backdrop-blur-md transition-all opacity-0 group-hover:opacity-100"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar justify-center">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`relative w-20 aspect-video rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                activeIndex === idx ? "border-accent scale-110 shadow-lg shadow-accent/20" : "border-transparent opacity-50 hover:opacity-100"
              }`}
            >
              <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

// --- Components ---

const ProfileEditor = ({ user, onComplete, onCancel }: { user: UserProfile; onComplete: (data: Partial<UserProfile>) => void; onCancel?: () => void }) => {
  const [data, setData] = useState({ 
    name: user.name, 
    phone: user.phone, 
    role: user.role,
    orgType: user.orgType || "Individual" as OrgType,
    photoURL: user.photoURL || "",
    bio: user.bio || ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await updateDoc(doc(db, "users", user.id), data);
      onComplete(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to update profile. Please try again.");
    }
    setLoading(false);
  };

  const AVATARS = [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Toby",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Patches"
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-bg/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md glass-panel p-8 rounded-[40px] shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-display font-bold text-white">Update Profile</h2>
          <p className="text-text-secondary text-sm">Personalize your MealBridge experience</p>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">Choose Avatar</label>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map((url) => (
                <button
                  key={url}
                  onClick={() => setData({ ...data, photoURL: url })}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${data.photoURL === url ? "border-accent scale-110 shadow-lg" : "border-transparent opacity-60 hover:opacity-100"}`}
                >
                  <img src={url} alt="Avatar" className="w-full h-full rounded-full" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">Display Name</label>
              <input
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-accent/40 transition-all text-sm"
                value={data.name}
                onChange={e => setData({...data, name: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">Phone Number</label>
              <input
                required
                type="tel"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-accent/40 transition-all text-sm"
                value={data.phone}
                onChange={e => setData({...data, phone: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">Bio</label>
              <textarea
                placeholder="Share a bit about yourself..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-accent/40 transition-all text-sm min-h-[80px]"
                value={data.bio}
                onChange={e => setData({...data, bio: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">Role</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl">
                {(["Donor", "Receiver"] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setData({...data, role: r})}
                    className={`py-2 text-[11px] font-bold rounded-xl transition-all ${data.role === r ? "bg-accent text-white shadow-lg" : "text-text-secondary hover:text-text-primary"}`}
                  >
                    {r === "Donor" ? "Donate Food" : "Receive Food"}
                  </button>
                ))}
              </div>
            </div>

            {data.role === "Donor" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">Organization Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["NGO", "Hotel", "Restaurant", "Organization", "Individual"] as OrgType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setData({...data, orgType: t})}
                      className={`py-2 text-[10px] font-bold rounded-xl border transition-all ${data.orgType === t ? "bg-accent border-accent text-white shadow-lg" : "bg-white/5 border-white/10 text-text-secondary hover:text-text-primary"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex gap-3 pt-2">
              {onCancel && (
                <button 
                  type="button"
                  onClick={onCancel}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-2xl font-bold transition-colors"
                >
                  Cancel
                </button>
              )}
              <button 
                disabled={loading}
                className="flex-[2] btn-primary py-3 rounded-2xl font-bold flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

// --- Components ---

const Toast = ({ notification, onClear }: { notification: Notification; onClear: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 50, x: 50 }}
    animate={{ opacity: 1, y: 0, x: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="fixed bottom-8 right-8 z-50 flex items-center gap-4 bg-bg border border-accent shadow-[0_0_20px_rgba(255,107,43,0.3)] p-4 pr-6 rounded-2xl backdrop-blur-xl"
  >
    <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center text-white shrink-0">
      <Bell className="w-5 h-5" />
    </div>
    <div className="flex-1">
      <h4 className="text-sm font-semibold text-white">Alert</h4>
      <p className="text-xs text-text-secondary">{notification.message}</p>
    </div>
    <button onClick={onClear} className="text-text-secondary hover:text-white transition-colors">
      <Plus className="w-4 h-4 rotate-45" />
    </button>
  </motion.div>
);

// --- Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid || 'unauthenticated',
      email: auth.currentUser?.email || 'N/A',
      emailVerified: auth.currentUser?.emailVerified || false,
      isAnonymous: auth.currentUser?.isAnonymous || false,
      providerInfo: auth.currentUser?.providerData.map(p => ({
        providerId: p.providerId,
        displayName: p.displayName,
        email: p.email
      })) || []
    }
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Components ---

const CountdownTimer = ({ expiresAt, status, donationId }: { expiresAt: any, status: Status, donationId: string }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (status !== "Available" || !expiresAt) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expirationTime = expiresAt.toDate().getTime();
      const distance = expirationTime - now;

      if (distance < 0) {
        setTimeLeft("Expired");
        setIsExpired(true);
        clearInterval(interval);
        
        // We could trigger a DB update here, but for instant UI feedback 
        // local state is enough. In a logic-heavy app, we'd use a server function.
      } else {
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, status]);

  if (status !== "Available") return null;

  return (
    <div className={`flex items-center gap-1 text-[11px] font-medium ${isExpired ? "text-red-400" : "text-accent"}`}>
      <Clock className="w-3 h-3" /> {timeLeft || "Calculating..."}
    </div>
  );
};

const StarRating = ({ rating, onRate, readonly = false }: { rating?: number, onRate?: (rate: number) => void, readonly?: boolean }) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={(e) => {
            e.stopPropagation();
            if (!readonly && onRate) {
              onRate(star);
            }
          }}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={`group/star relative p-1.5 transition-all duration-300 ${readonly ? "cursor-default" : "cursor-pointer hover:scale-125 active:scale-90"}`}
          title={readonly ? (rating ? `Rated ${rating} stars` : "Rating disabled") : `Rate ${star} stars`}
        >
          <Star 
            className={`w-5 h-5 transition-all duration-300 ${
              (hover >= star || (rating || 0) >= star) 
                ? "fill-amber-400 text-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" 
                : "fill-transparent text-text-secondary opacity-30 group-hover/star:opacity-60"
            }`} 
          />
          {!readonly && hover === star && (
             <motion.div 
               layoutId="star-hint"
               className="absolute -top-8 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] py-1 px-2 rounded-md font-bold whitespace-nowrap"
             >
               {star} {star === 1 ? 'Star' : 'Stars'}
             </motion.div>
          )}
        </button>
      ))}
    </div>
  );
};

const DeleteConfirmationModal = ({ onConfirm, onCancel, donationName }: { onConfirm: () => void, onCancel: () => void, donationName: string }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-sm glass-panel p-8 rounded-[32px] relative z-10 shadow-3xl text-center"
      >
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold mb-2">Delete listing?</h2>
        <p className="text-text-secondary text-sm mb-8">
          Are you sure you want to remove <span className="text-white font-semibold">"{donationName}"</span>? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-sm font-semibold"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 py-3 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors text-sm font-semibold shadow-lg shadow-red-500/20"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [donations, setDonations] = useState<Donation[]>([]);
  const [donors, setDonors] = useState<UserProfile[]>([]);
  const [selectedDonorId, setSelectedDonorId] = useState<string | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedLocation, setSelectedLocation] = useState(LOCATIONS[0]);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [dietaryFilter, setDietaryFilter] = useState<"All" | "Veg" | "Non-Veg">("All");
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Settings State
  const [pushEnabled, setPushEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const hasMounted = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hasMounted.current) return;
    const id = Math.random().toString(36).substr(2, 9);
    const message = pushEnabled ? "Push notifications enabled" : "Push notifications disabled";
    setNotifications(prev => [...prev, { id, message, type: "info" }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
  }, [pushEnabled]);

  useEffect(() => {
    if (!darkMode) {
      document.body.classList.add('light-theme');
      document.body.style.colorScheme = 'light';
    } else {
      document.body.classList.remove('light-theme');
      document.body.style.colorScheme = 'dark';
    }
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    const id = Math.random().toString(36).substr(2, 9);
    const message = darkMode ? "Dark mode activated" : "Light mode activated";
    setNotifications(prev => [...prev, { id, message, type: "info" }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
  }, [darkMode]);
  
  // Registration Form
  // (authData removed as only Google login is kept)

  // Donation Form
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState<{ images: string[]; foodName: string } | null>(null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [contactDonor, setContactDonor] = useState<Donation | null>(null);
  const [newDonation, setNewDonation] = useState({ 
    foodName: "", 
    quantity: "", 
    location: LOCATIONS[0], 
    donorAddress: "",
    pincode: "",
    expiry: "4h",
    dietaryType: "Veg" as const,
    imageUrls: [] as string[]
  });

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'donations', 'test-connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('insufficient permissions')) {
          console.warn("Permission check failed during connection test - this is normal if testing an empty collection.");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setFbUser(authUser);
      if (authUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", authUser.uid));
          if (userDoc.exists()) {
            setUser({ id: authUser.uid, ...userDoc.data() } as UserProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${authUser.uid}`);
        }
      } else {
        setUser(null);
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user) return;

    const q = query(collection(db, "donations"), orderBy("createdAt", "desc"));
    let isInitialLoad = true;
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Donation));
      
      // Real-time notifications for newly added food
      if (!isInitialLoad) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const newDoc = change.doc.data();
            const id = Math.random().toString(36).substr(2, 9);
            setNotifications(prev => [...prev, { 
              id, 
              message: `New food available: ${newDoc.foodName} in ${newDoc.location}`, 
              type: "success" 
            }]);
            setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
          }
        });
      }
      
      setDonations(data);
      isInitialLoad = false;
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "donations");
    });

    return () => unsubscribe();
  }, [isAuthReady, user]);

  useEffect(() => {
    if (!isAuthReady || !user) return;

    const q = query(
      collection(db, "claims"), 
      or(where("receiverId", "==", user.id), where("donorId", "==", user.id)),
      orderBy("createdAt", "desc")
    );
    let isInitialLoad = true;
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Claim));
      
      if (!isInitialLoad && user.role === "Donor") {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const newClaim = change.doc.data() as Claim;
            // Check if this claim is for any of the current user's donations
            const donationFound = donations.find(d => d.id === newClaim.donationId && d.donorId === user.id);
            if (donationFound) {
              const id = Math.random().toString(36).substr(2, 9);
              setNotifications(prev => [...prev, { 
                id, 
                message: `New request from ${newClaim.receiverName} for ${donationFound.foodName}`, 
                type: "info" 
              }]);
              setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
            }
          }
        });
      }

      setClaims(data);
      isInitialLoad = false;
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "claims");
    });

    return () => unsubscribe();
  }, [isAuthReady, user, donations]);

  useEffect(() => {
    if (!isAuthReady || !user) return;
    const q = query(collection(db, "users"), where("role", "==", "Donor"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
      setDonors(data);
    }, (error) => {
      // We don't want to show a scary error for listing users if it's not strictly allowed
      // But for this app, donors should be listable by signed-in users.
      console.warn("Could not fetch donors list:", error);
    });
    return () => unsubscribe();
  }, [isAuthReady, user]);

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const { user: gUser } = await signInWithPopup(auth, provider);
      
      // Check if user profile already exists
      const userDoc = await getDoc(doc(db, "users", gUser.uid));
      if (!userDoc.exists()) {
        const userProfile = {
          name: gUser.displayName || "New User",
          phone: "",
          email: gUser.email || "",
          role: "Receiver" as Role,
          orgType: "Individual" as OrgType
        };
        await setDoc(doc(db, "users", gUser.uid), userProfile);
        setUser({ id: gUser.uid, ...userProfile } as UserProfile);
      }
    } catch (err: any) {
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications(prev => [...prev, { id, message: err.message, type: "info" }]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
    }
    setIsLoading(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500000) { // Lowered to 500KB for Base64 safety (Firestore 1MB limit)
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications(prev => [...prev, { id, message: "Image too large. Please select a file smaller than 500KB.", type: "info" }]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewDonation(prev => ({ 
        ...prev, 
        imageUrls: [...prev.imageUrls, reader.result as string] 
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleAddDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);
    try {
      const hours = parseInt(newDonation.expiry);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + hours);

      await addDoc(collection(db, "donations"), {
        ...newDonation,
        donorId: user.id,
        donorName: user.name,
        donorPhone: user.phone,
        status: "Available",
        expiresAt: Timestamp.fromDate(expiresAt),
        createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      setNewDonation({ 
        foodName: "", 
        quantity: "", 
        location: LOCATIONS[0], 
        donorAddress: "",
        pincode: "",
        expiry: "4h",
        dietaryType: "Veg" as const,
        imageUrls: []
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "donations");
    }
    setIsLoading(false);
  };

  const handleClaim = async (donationId: string) => {
    if (!user) return;
    
    const donation = donations.find(d => d.id === donationId);
    if (!donation) return;

    if (donation.status !== "Available") {
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications(prev => [...prev, { id, message: "This meal is no longer available.", type: "info" }]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
      return;
    }
    
    // Prevent multiple claims by the same user for the same donation
    const existingClaim = claims.find(c => c.donationId === donationId && c.receiverId === user.id);
    if (existingClaim) {
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications(prev => [...prev, { id, message: "You have already requested this meal.", type: "info" }]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
      return;
    }

    setIsLoading(true);
    try {
      await addDoc(collection(db, "claims"), {
        donationId,
        receiverId: user.id,
        donorId: donation.donorId,
        receiverName: user.name,
        receiverPhone: user.phone,
        status: "Pending",
        createdAt: serverTimestamp()
      });
      
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications(prev => [...prev, { id, message: "Request sent to donor!", type: "info" }]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, "claims");
    }
    setIsLoading(false);
  };

  const handleAcceptClaim = async (claimId: string, donationId: string) => {
    try {
      const claimToAccept = claims.find(c => c.id === claimId);
      if (!claimToAccept) {
        throw new Error("Claim not found in local state. Please refresh.");
      }

      const batch = writeBatch(db);
      
      // 1. Accept the specific claim
      batch.update(doc(db, "claims", claimId), {
        status: "Accepted"
      });
      
      // 2. Mark the donation as Claimed
      batch.update(doc(db, "donations", donationId), {
        status: "Claimed",
        claimedBy: claimToAccept.receiverId 
      });
      
      // 3. Decline other pending claims for this donation
      const otherClaims = claims.filter(c => c.donationId === donationId && c.id !== claimId && c.status === "Pending");
      otherClaims.forEach(other => {
        batch.update(doc(db, "claims", other.id), {
          status: "Declined"
        });
      });

      await batch.commit();

      const id = Math.random().toString(36).substr(2, 9);
      setNotifications(prev => [...prev, { id, message: "Request accepted and others declined!", type: "success" }]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
    } catch (err: any) {
      console.error("Accept Claim Error:", err);
      if (err.message && err.message.includes("permissions")) {
        handleFirestoreError(err, OperationType.UPDATE, `claims/${claimId} / donations/${donationId}`);
      } else {
        const id = Math.random().toString(36).substr(2, 9);
        setNotifications(prev => [...prev, { id, message: err.message || "Failed to accept claim", type: "info" }]);
        setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
      }
    }
  };

  const handleDeclineClaim = async (claimId: string) => {
    try {
      await updateDoc(doc(db, "claims", claimId), {
        status: "Declined"
      });
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications(prev => [...prev, { id, message: "Request declined.", type: "info" }]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `claims/${claimId}`);
    }
  };

  const handleRate = async (donationId: string, rating: number) => {
    try {
      await updateDoc(doc(db, "donations", donationId), {
        rating
      });
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications(prev => [...prev, { id, message: "Thank you for the rating!", type: "info" }]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `donations/${donationId}`);
    }
  };

  const handleDeleteDonation = async (donationId: string) => {
    try {
      await deleteDoc(doc(db, "donations", donationId));
      setShowDeleteModal(null);
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications(prev => [...prev, { id, message: "Listing deleted successfully.", type: "info" }]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `donations/${donationId}`);
    }
  };

  const filteredDonations = useMemo(() => {
    if (!user) return [];
    
    let list = donations;

    if (activeTab === "Dashboard") {
      list = list.filter(d => d.location === selectedLocation);
      if (user.role === "Receiver" && selectedDonorId) {
        list = list.filter(d => d.donorId === selectedDonorId);
      }
    } else if (activeTab === "My Claims") {
      // Show donations where user has a claim (Pending or Accepted)
      const userClaimDonationIds = claims
        .filter(c => c.receiverId === user.id && (c.status === "Pending" || c.status === "Accepted"))
        .map(c => c.donationId);
      list = list.filter(d => userClaimDonationIds.includes(d.id));
    } else if (activeTab === "History") {
      list = list.filter(d => d.donorId === user.id || d.claimedBy === user.id);
    }

    // Apply dietary filter
    list = list.filter(d => dietaryFilter !== "All" ? d.dietaryType === dietaryFilter : true);

    if (showAvailableOnly && user.role === "Receiver") {
      const now = new Date();
      list = list.filter(d => d.status === "Available" && d.expiresAt.toDate() > now);
    }

    return list;
  }, [donations, claims, selectedLocation, activeTab, user, showAvailableOnly, dietaryFilter]);

  const userStats = useMemo(() => {
    if (!user) return { totalShared: 0, active: 0, totalReceived: 0, savings: 0, impact: 0 };
    if (user.role === "Donor") {
      const myDonations = donations.filter(d => d.donorId === user.id);
      return {
        totalShared: myDonations.length,
        active: myDonations.filter(d => d.status === "Available").length,
        impact: myDonations.length * 2.5, // Mock CO2 saved in KG
        totalReceived: 0,
        savings: 0
      };
    } else {
      const myClaims = donations.filter(d => d.claimedBy === user.id);
      return {
        totalReceived: myClaims.length,
        savings: myClaims.length * 150, // Mock money saved in INR
        impact: myClaims.length * 2.5, // Mock CO2 saved in KG
        totalShared: 0,
        active: 0
      };
    }
  }, [donations, user]);

  if (!isAuthReady) {
    return (
      <div className="h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-accent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen bg-bg relative overflow-y-auto overflow-x-hidden font-sans tracking-tight">
        {/* Background Decorative Elements */}
        <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="min-h-screen flex items-center justify-center py-20">
          <div className="container max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
            {/* Left Side: Hero Info */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8 text-center lg:text-left"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold tracking-widest uppercase">
                <Heart className="w-3 h-3" />
                Revolutionizing Food Sharing
              </div>
              <h1 className="text-6xl md:text-8xl font-display font-black leading-[0.9] tracking-tighter text-text-primary">
                Savor the <span className="text-accent underline decoration-white/10">Goodness</span>, Share the Rest.
              </h1>
              <p className="text-lg text-text-secondary max-w-xl mx-auto lg:mx-0 font-medium leading-relaxed">
                MealBridge connects surplus food from hearts that have enough to homes that need a meal. Join our premium real-time ecosystem of abundance.
              </p>
              
              <div className="grid grid-cols-3 gap-6 pt-6">
                {[
                  { label: "Active Donors", val: "2.4k+" },
                  { label: "Meals Served", val: "48k+" },
                  { label: "Cities Live", val: "12" }
                ].map(stat => (
                  <div key={stat.label} className="text-center lg:text-left">
                    <p className="text-2xl font-display font-bold text-text-primary">{stat.val}</p>
                    <p className="text-[10px] text-text-secondary uppercase font-bold tracking-widest">{stat.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right Side: Auth Form */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              className="w-full max-w-md mx-auto"
            >
              <div className="glass-panel p-10 rounded-[40px] shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-accent/20 group-hover:bg-accent/40 transition-colors" />
                <div className="text-center mb-10">
                  <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto text-accent transform -rotate-6 mb-4">
                    <Pizza className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-display font-bold text-text-primary">Join the Movement</h2>
                  <p className="text-text-secondary text-sm">Securely sign in with your Google account</p>
                </div>

                <div className="space-y-6">
                  <button 
                    onClick={handleGoogleAuth}
                    disabled={isLoading}
                    className="w-full py-5 rounded-2xl bg-accent text-white hover:bg-accent/90 transition-all flex items-center justify-center gap-4 font-bold text-lg shadow-[0_10px_30px_rgba(255,107,43,0.3)] group"
                  >
                    {isLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6 bg-white rounded-full p-0.5" alt="Google" referrerPolicy="no-referrer" />
                        Continue with Google
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>

                  <p className="text-center text-[10px] text-text-secondary uppercase tracking-[0.2em] font-bold">
                    Abidance by Premium Terms of Service
                  </p>
                </div>

                <div className="mt-10 p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                   <p className="text-xs text-text-secondary leading-relaxed">
                     Your privacy is our priority. We only use your Google profile to verify your identity and facilitate trusted food sharing.
                   </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Features Section */}
        <section className="py-32 relative z-10">
          <div className="container max-w-6xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
              <h2 className="text-4xl font-display font-bold text-text-primary tracking-tight">Everything you need to make an impact.</h2>
              <p className="text-text-secondary">Explore the powerful features built to streamline luxury food redistribution.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { 
                  title: "Real-time Tracking", 
                  desc: "Instantly see surplus food on our live interactive map. Connect within minutes.",
                  icon: MapPin 
                },
                { 
                  title: "Smart Notifications", 
                  desc: "Get notified the second a donor within 5km lists fresh food for distribution.",
                  icon: Bell 
                },
                { 
                  title: "Sustainability Stats", 
                  desc: "Track your personal carbon footprint reduction and meals shared over time.",
                  icon: Package 
                }
              ].map((f, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  key={f.title} 
                  className="glass-panel p-10 rounded-[40px] space-y-4 group hover:bg-white/[0.06] transition-all"
                >
                  <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                    <f.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-text-primary">{f.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-32 relative z-10 bg-surface">
          <div className="container max-w-4xl mx-auto px-6 text-center space-y-12">
            <h2 className="text-5xl font-display font-bold text-text-primary leading-tight">We are on a mission to end <span className="text-accent">hunger-by-waste</span>.</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left">
              <div className="space-y-4">
                <p className="text-text-secondary leading-relaxed italic border-l-2 border-accent pl-6">
                  "MealBridge started with a simple observation: restaurants throw away perfect food while neighbors go hungry. We built the bridge."
                </p>
                <div className="flex items-center gap-4 pl-6">
                  <div className="w-10 h-10 rounded-full bg-accent/20" />
                  <div>
                    <p className="text-sm font-bold text-text-primary">Shubham L.</p>
                    <p className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">Founder</p>
                  </div>
                </div>
              </div>
              <p className="text-lg text-text-secondary leading-relaxed">
                Our technology platform removes the friction of logistics, making food donation as simple as taking a photo. We believe in dignity, transparency, and a future where no edible meal is discarded.
              </p>
            </div>
          </div>
        </section>
        
        {/* Footer info */}
        <div className="py-20 text-center relative z-10">
          <div className="container max-w-6xl mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-10 border-t border-white/5">
              <div className="flex items-center gap-3 text-accent transition-opacity hover:opacity-80">
                <Pizza className="w-6 h-6" />
                <span className="text-xl font-display font-bold text-text-primary tracking-tight">MealBridge</span>
              </div>
              <div className="text-[10px] text-text-secondary font-bold uppercase tracking-widest flex items-center gap-6">
                <span>Trusted by Non-profits</span>
                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                <span>Real-time Sync</span>
                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                <span>Community First</span>
              </div>
            </div>
            <p className="text-[10px] text-text-secondary/40 mt-10 uppercase tracking-[0.2em] font-bold">© 2026 MealBridge Premium Operations. All rights reserved.</p>
          </div>
        </div>

        <AnimatePresence>
          {notifications.map(n => (
            <div key={n.id} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-6">
               <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-red-500/10 border border-red-500/30 backdrop-blur-xl p-4 rounded-2xl text-red-400 text-xs text-center border-l-4 border-l-red-500 shadow-2xl"
               >
                  <p className="font-bold mb-1">Error Occurred</p>
                  <p className="opacity-80">{n.message}</p>
               </motion.div>
            </div>
          ))}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-bg font-sans tracking-tight">
      {user.phone === "" && (
        <ProfileEditor 
          user={user} 
          onComplete={(updates) => setUser({...user, ...updates})} 
        />
      )}
      {showProfileEditor && (
        <ProfileEditor 
          user={user} 
          onComplete={(updates) => {
            setUser({ ...user, ...updates });
            setShowProfileEditor(false);
          }}
          onCancel={() => setShowProfileEditor(false)}
        />
      )}
      {/* Sidebar */}
      <aside className="w-[260px] h-full border-r border-border-theme flex flex-col p-8 bg-[linear-gradient(180deg,rgba(255,255,255,0.02)_0%,transparent_100%)]">
        <div className="flex items-center gap-3 text-accent mb-12">
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
            <Pizza className="w-6 h-6" />
          </div>
          <span className="text-xl font-display font-bold tracking-tight text-text-primary">MealBridge</span>
        </div>

        <div className="flex bg-white/5 rounded-2xl border border-white/5 p-1 mb-6">
          <button 
            onClick={() => setDarkMode(true)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold transition-all ${darkMode ? "bg-accent text-white shadow-lg" : "text-text-secondary hover:text-text-primary"}`}
          >
            <Moon className="w-3.5 h-3.5" />
            DARK
          </button>
          <button 
            onClick={() => setDarkMode(false)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold transition-all ${!darkMode ? "bg-accent text-white shadow-lg" : "text-text-secondary hover:text-text-primary"}`}
          >
            <Sun className="w-3.5 h-3.5" />
            LIGHT
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { name: "Dashboard", Icon: Home },
            { name: "My Claims", Icon: Package },
            { name: "History", Icon: History },
            { name: "Profile", Icon: User },
            { name: "Settings", Icon: Settings },
          ].map(({ name, Icon }) => (
            <button
              key={name}
              onClick={() => {
                setActiveTab(name);
                if (name === "Dashboard") setSelectedDonorId(null);
              }}
              className={`nav-item w-full ${activeTab === name ? "nav-item-active" : ""}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{name}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto p-5 bg-white/5 rounded-2xl border border-dashed border-accent flex flex-col items-center gap-3">
          <p className="text-[11px] text-text-secondary">You are a {user.role}</p>
          <button 
            onClick={() => setUser({...user, role: user.role === "Donor" ? "Receiver" : "Donor"})}
            className="w-full btn-primary py-2 text-xs"
          >
            Switch to {user.role === "Donor" ? "Receiver" : "Donor"}
          </button>
          <button 
            onClick={async () => { 
              await signOut(auth);
              window.location.reload(); 
            }}
            className="flex items-center gap-2 text-text-secondary hover:text-red-400 text-[11px] transition-colors mt-2"
          >
            <LogOut className="w-3 h-3" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-10 space-y-8 relative">
        {(activeTab === "Dashboard" || activeTab === "History" || activeTab === "My Claims") && (
          <>
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  {selectedDonorId && user.role === "Receiver" && activeTab === "Dashboard" && (
                     <button 
                       onClick={() => setSelectedDonorId(null)}
                       className="p-2 hover:bg-white/5 rounded-xl transition-colors text-text-secondary"
                     >
                       <ArrowLeft className="w-5 h-5" />
                     </button>
                  )}
                  <h1 className="text-3xl font-semibold">
                    {activeTab === "History" ? "Transaction History" : 
                     activeTab === "My Claims" ? "Your Reserved Meals" :
                     user.role === "Donor" ? "Your Contributions" : 
                     selectedDonorId ? donors.find(d => d.id === selectedDonorId)?.name : "Fresh Meals Near You"}
                  </h1>
                </div>
                <p className="text-text-secondary text-sm flex items-center gap-2">
                  Welcome back, {user.name}! 
                  {user.role === "Receiver" && activeTab === "Dashboard" ? ` ${donations.filter(d => d.location === selectedLocation && d.status === "Available").length} donations available in your area.` : ""}
                  {selectedLocation === "Pune, Maharashtra" && (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 text-green-400 text-[10px] font-bold rounded-full border border-green-500/20">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Live in Pune
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-4">
                {user.role === "Receiver" && activeTab === "Dashboard" && (
                  <div className="flex bg-surface border border-border-theme p-1 rounded-xl gap-1">
                    {(["All", "Veg", "Non-Veg"] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setDietaryFilter(type)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          dietaryFilter === type 
                            ? "bg-accent text-white shadow-lg" 
                            : "text-text-secondary hover:text-text-primary"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}

                {user.role === "Receiver" && activeTab === "Dashboard" && (
                  <button
                    onClick={() => setShowAvailableOnly(!showAvailableOnly)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium ${
                      showAvailableOnly 
                        ? "bg-accent/10 border-accent text-accent shadow-[0_0_15px_rgba(255,107,43,0.2)]" 
                        : "bg-surface border-border-theme text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    Available & Not Expired
                  </button>
                )}
                
                {activeTab === "Dashboard" && (
                  <select 
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="bg-white border border-white/20 text-green-600 font-bold px-4 py-2.5 rounded-xl outline-none text-sm min-w-[180px] focus:ring-2 focus:ring-green-500/20"
                  >
                    {LOCATIONS.map(loc => (
                      <option key={loc} value={loc} className="bg-white text-green-600">
                        {loc}
                      </option>
                    ))}
                  </select>
                )}

                {activeTab === "Dashboard" && user.role === "Receiver" && (
                  <div className="flex bg-surface p-1 rounded-xl border border-border-theme">
                    <button 
                      onClick={() => setViewMode("grid")}
                      className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-accent text-white" : "text-text-secondary hover:text-white"}`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setViewMode("map")}
                      className={`p-2 rounded-lg transition-all ${viewMode === "map" ? "bg-accent text-white" : "text-text-secondary hover:text-white"}`}
                    >
                      <MapIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {user.role === "Donor" && activeTab === "Dashboard" && (
                  <button 
                    onClick={() => setShowAddModal(true)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" /> Add Donation
                  </button>
                )}
              </div>
            </div>

            {/* Content Grid */}
            {activeTab === "Dashboard" && user.role === "Receiver" && viewMode === "map" ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full"
              >
                <MapView 
                  donations={filteredDonations} 
                  onClaim={handleClaim} 
                  onContact={setContactDonor}
                  userRole={user.role} 
                  selectedLocation={selectedLocation}
                />
              </motion.div>
            ) : activeTab === "Dashboard" && user.role === "Receiver" && !selectedDonorId ? (
              <div className="space-y-8">
                 <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold">Trusted Food Partners</h2>
                    <div className="h-px bg-white/10 flex-1" />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {donors.map(donor => {
                       const donorDonations = donations.filter(d => d.donorId === donor.id && d.status === "Available");
                       return (
                          <motion.div 
                             key={donor.id}
                             whileHover={{ y: -5 }}
                             onClick={() => setSelectedDonorId(donor.id)}
                             className="glass-panel p-6 rounded-[32px] cursor-pointer group"
                          >
                             <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                {donor.orgType === "NGO" ? <Building2 className="w-8 h-8 text-accent" /> :
                                 donor.orgType === "Hotel" ? <Store className="w-8 h-8 text-accent" /> :
                                 donor.orgType === "Restaurant" ? <Utensils className="w-8 h-8 text-accent" /> :
                                 donor.orgType === "Organization" ? <Building className="w-8 h-8 text-accent" /> :
                                 <User className="w-8 h-8 text-accent" />}
                             </div>
                             <div className="text-center space-y-1">
                                <h3 className="font-bold text-lg leading-tight">{donor.name}</h3>
                                <div className="flex items-center justify-center gap-2">
                                   <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary bg-white/5 px-2 py-0.5 rounded border border-white/5">{donor.orgType || "Individual"}</span>
                                </div>
                                <p className="text-xs text-text-secondary mt-3 line-clamp-2">{donor.bio || "Partner dedicated to community food sharing and waste reduction."}</p>
                             </div>
                             <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                                <span>Active Dishes</span>
                                <span className="text-accent">{donorDonations.length} items</span>
                             </div>
                          </motion.div>
                       )
                    })}
                 </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {filteredDonations.length > 0 ? filteredDonations.map((d) => (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    layout
                    className="glass-card p-5 group flex flex-col"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex gap-2">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${
                          d.status === "Available" ? "bg-green-500/10 text-green-400" : 
                          d.status === "Pending" ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                          d.status === "Expired" ? "bg-red-500/20 text-red-400" : 
                          "bg-blue-500/10 text-blue-400 opacity-70"
                        }`}>
                          {d.status}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${
                          d.dietaryType === "Veg" ? "bg-green-500/20 text-green-200" : "bg-red-500/20 text-red-200"
                        }`}>
                          {d.dietaryType}
                        </span>
                      </div>
                      <CountdownTimer expiresAt={d.expiresAt} status={d.status} donationId={d.id} />
                    </div>

                    <div 
                       onClick={() => d.imageUrls && d.imageUrls.length > 0 && setShowGallery({ images: d.imageUrls, foodName: d.foodName })}
                       className="aspect-[16/9] rounded-xl bg-[linear-gradient(45deg,#1a1a20,#25252e)] flex items-center justify-center text-5xl mb-4 relative overflow-hidden cursor-pointer"
                     >
                       <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/5 transition-colors z-[2]" />
                       
                       <img 
                         src={d.imageUrls && d.imageUrls.length > 0 ? d.imageUrls[0] : getPlaceholderImage(d.foodName)} 
                         className="w-full h-full object-cover relative z-[1]" 
                         alt={d.foodName} 
                         referrerPolicy="no-referrer" 
                         loading="lazy"
                         onError={(e) => {
                           // Fallback to a super-generic placeholder if even the seed one fails
                           (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800";
                         }}
                       />
                       
                       {/* Multiple Images Indicator */}
                       {d.imageUrls && d.imageUrls.length > 1 && (
                         <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold text-white z-[3] flex items-center gap-1 group-hover:bg-accent group-hover:translate-y-[-2px] transition-all">
                            <ImageIcon className="w-3 h-3" />
                            View {d.imageUrls.length} Photos
                         </div>
                       )}
                       
                       {/* Emoji Overlay for extra flair if it's a placeholder */}
                       {(!d.imageUrls || d.imageUrls.length === 0) && (
                         <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-[2] pointer-events-none">
                            <span className="drop-shadow-2xl">{getMockEmoji(d.foodName)}</span>
                         </div>
                       )}
                    </div>

                    <div className="space-y-1 lex-1">
                      <h3 className="text-lg font-semibold">{d.foodName}</h3>
                      <p className="text-text-secondary text-xs mb-1">Quantity: {d.quantity}. {d.location}.</p>
                      
                      {/* Donor Location details for receivers and donors */}
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1 my-3">
                        <p className="text-[10px] text-text-secondary uppercase font-bold flex items-center gap-1 opacity-60">
                          <MapPin className="w-2.5 h-2.5" /> Pickup Point
                        </p>
                        <p className="text-xs text-text-primary font-medium leading-relaxed">
                          {d.donorAddress}
                        </p>
                        <p className="text-xs text-accent font-bold">
                          PIN: {d.pincode}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-border-theme flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                          <User className="w-4 h-4 text-text-secondary" />
                        </div>
                        <div>
                           <p className="text-[10px] text-text-secondary font-medium uppercase leading-tight">Donor</p>
                           <p className="text-xs font-semibold leading-tight">{d.donorName}</p>
                        </div>
                      </div>

                      {user.role === "Receiver" && d.status === "Available" ? (
                        <div className="flex flex-col gap-3 w-full">
                          {claims.some(c => c.donationId === d.id && c.receiverId === user.id && c.status === "Pending") ? (
                             <div className="flex items-center justify-center gap-2 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 py-2.5 px-4 rounded-xl text-sm font-bold w-full">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Request Pending</span>
                             </div>
                          ) : (
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setContactDonor(d)}
                                className="bg-white/5 hover:bg-white/10 border border-white/10 p-2 rounded-xl text-text-secondary hover:text-text-primary transition-colors h-[42px] aspect-square flex items-center justify-center"
                                title="Contact Donor"
                              >
                                <Phone className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleClaim(d.id); }}
                                className="btn-secondary py-2.5 px-6 text-sm flex-1 font-bold"
                              >
                                Request Meal
                              </button>
                            </div>
                          )}
                          
                          {claims.filter(c => c.donationId === d.id && c.status === "Pending").length > 0 && (
                            <p className="text-[10px] text-text-secondary italic text-center">
                               {claims.filter(c => c.donationId === d.id && c.status === "Pending").length} others have expressed interest
                            </p>
                          )}
                        </div>
                      ) : d.status === "Claimed" && (d.claimedBy === user.id || d.donorId === user.id) ? (
                        <div className="flex flex-col items-end gap-2 p-2 bg-white/5 rounded-xl border border-white/5 w-full">
                          <p className="text-[10px] text-text-secondary uppercase font-black tracking-[0.1em] mb-1">Share Feedback</p>
                          <StarRating 
                            rating={d.rating} 
                            readonly={d.rating !== undefined || d.donorId === user.id} 
                            onRate={(rating) => handleRate(d.id, rating)}
                          />
                        </div>
                      ) : d.donorId === user.id ? (
                        <div className="flex flex-col gap-4 w-full">
                          {d.status === "Available" && claims.filter(c => c.donationId === d.id && c.status === "Pending").length > 0 && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black uppercase tracking-widest text-accent">Pending Requests ({claims.filter(c => c.donationId === d.id && c.status === "Pending").length})</p>
                                <div className="h-px bg-accent/20 flex-1 ml-4" />
                              </div>
                              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                {claims.filter(c => c.donationId === d.id && c.status === "Pending").map(claim => (
                                  <div key={claim.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between group/claim">
                                    <div className="space-y-0.5">
                                      <p className="text-xs font-bold">{claim.receiverName}</p>
                                      <p className="text-[10px] text-text-secondary">{claim.receiverPhone || "Contact for phone"}</p>
                                    </div>
                                    <div className="flex gap-1.5">
                                      <button 
                                        onClick={() => handleDeclineClaim(claim.id)}
                                        className="p-1.5 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all opacity-40 group-hover/claim:opacity-100"
                                      >
                                        <Plus className="w-4 h-4 rotate-45" />
                                      </button>
                                      <button 
                                        onClick={() => handleAcceptClaim(claim.id, d.id)}
                                        className="bg-accent/10 hover:bg-accent text-accent hover:text-white p-1.5 rounded-lg transition-all shadow-lg shadow-accent/20"
                                      >
                                        <CheckCircle2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="flex gap-2 items-center justify-between border-t border-white/5 pt-4">
                            <div className="text-[10px] text-text-secondary italic bg-white/5 px-3 py-1 rounded-full border border-white/5">Your listing</div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setShowDeleteModal(d.id); }}
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-lg transition-colors border border-red-500/10"
                              title="Delete Listing"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : d.status === "Claimed" ? (
                        <button disabled className="bg-surface text-text-secondary py-2.5 px-6 rounded-xl text-sm cursor-not-allowed border border-white/5 opacity-50 w-full font-bold">
                           Reserved
                        </button>
                      ) : null}
                    </div>
                  </motion.div>
                )) : (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center space-y-4 opacity-40">
                    <div className="w-20 h-20 rounded-full border border-dashed border-white/20 flex items-center justify-center">
                      <Pizza className="w-10 h-10" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-medium">No food found here</p>
                      <p className="text-sm">Try changing your location or check back later!</p>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>
            )}
          </>
        )}

        {activeTab === "Profile" && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-4xl mx-auto space-y-10"
          >
            {/* Profile Header */}
            <div className="flex flex-col md:flex-row items-center gap-8 glass-panel p-10 rounded-[40px] relative overflow-hidden">
               <div className="absolute top-0 right-0 p-6">
                 <button 
                  onClick={() => setShowProfileEditor(true)}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-2xl text-text-secondary hover:text-text-primary transition-all flex items-center gap-2 text-xs font-bold"
                 >
                   <Settings className="w-4 h-4" />
                   Edit Profile
                 </button>
               </div>

              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl relative group">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-[linear-gradient(45deg,#ff6b2b,#ffb020)] flex items-center justify-center text-5xl">
                    {user.role === "Donor" ? "🎁" : "😋"}
                  </div>
                )}
                <div 
                  onClick={() => setShowProfileEditor(true)}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Plus className="w-6 h-6 text-white" />
                </div>
              </div>

              <div className="space-y-4 text-center md:text-left">
                <div>
                  <h1 className="text-4xl font-bold">{user.name}</h1>
                  <p className="text-text-secondary flex items-center justify-center md:justify-start gap-2 mt-1">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    Verified {user.role} member
                  </p>
                </div>
                {user.bio && (
                  <p className="text-sm text-text-secondary max-w-md leading-relaxed">
                    {user.bio}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-6">
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Phone className="w-4 h-4" /> {user.phone}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Mail className="w-4 h-4" /> {user.email}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { 
                  label: user.role === "Donor" ? "Total Meals Shared" : "Meals Reserved", 
                  value: user.role === "Donor" ? userStats.totalShared : userStats.totalReceived, 
                  Icon: Package,
                  color: "blue" 
                },
                { 
                  label: "CO2 Emissions Saved", 
                  value: `${userStats.impact} kg`, 
                  Icon: Heart,
                  color: "red" 
                },
                { 
                  label: user.role === "Donor" ? "Active Listings" : "Approx. Savings", 
                  value: user.role === "Donor" ? userStats.active : `₹${userStats.savings}`, 
                  Icon: CheckCircle2,
                  color: "green" 
                },
              ].map((stat, i) => (
                <div key={i} className="glass-card p-6 space-y-4">
                  <div className={`w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center`}>
                    <stat.Icon className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{stat.value}</h3>
                    <p className="text-text-secondary text-sm">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Impact Section */}
            <div className="glass-panel p-8 rounded-[32px] bg-[radial-gradient(circle_at_top_right,rgba(255,107,43,0.1),transparent)] border-accent/20">
              <div className="flex items-center justify-between mb-6">
                 <div className="space-y-1">
                    <h2 className="text-xl font-bold">Your Climate Impact</h2>
                    <p className="text-sm text-text-secondary">You're making a real difference in the world.</p>
                 </div>
                 <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center text-white text-2xl animate-pulse">
                    🌍
                 </div>
              </div>
              <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                 <div className="h-full bg-accent" style={{ width: '65%' }}></div>
              </div>
              <p className="mt-4 text-xs text-text-secondary italic">Keep donating to reach your next milestone: "Environmental Guardian"</p>
            </div>

            {/* Donor Specific Sections */}
            {user.role === "Donor" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold px-2">Contribution Insights</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Recent Activity */}
                  <div className="glass-panel p-6 rounded-[32px] space-y-4">
                    <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                       <Clock className="w-4 h-4" /> Recent Donations
                    </h3>
                    <div className="space-y-3">
                      {donations.filter(d => d.donorId === user.id).slice(0, 3).map((d, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{getMockEmoji(d.foodName)}</span>
                            <div>
                               <p className="text-sm font-semibold leading-tight">{d.foodName}</p>
                               <p className="text-[10px] text-text-secondary uppercase">{d.location}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md ${d.status === "Available" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                            {d.status}
                          </span>
                        </div>
                      ))}
                      {donations.filter(d => d.donorId === user.id).length === 0 && (
                        <p className="text-sm text-text-secondary italic text-center py-4">No recent donations yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Badges/Milestones */}
                  <div className="glass-panel p-6 rounded-[32px] space-y-4">
                    <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                       <CheckCircle2 className="w-4 h-4" /> Donor Milestones
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { icon: "🌱", label: "Seed", active: userStats.totalShared >= 1 },
                        { icon: "🌻", label: "Sprout", active: userStats.totalShared >= 5 },
                        { icon: "🌳", label: "Tree", active: userStats.totalShared >= 10 },
                      ].map((badge, i) => (
                        <div key={i} className={`flex flex-col items-center gap-2 p-3 rounded-2xl border ${badge.active ? "bg-accent/10 border-accent/20" : "bg-white/5 border-white/5 opacity-30"}`}>
                          <span className="text-2xl">{badge.icon}</span>
                          <span className="text-[10px] font-bold uppercase">{badge.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "Settings" && (
           <div className="max-w-2xl mx-auto space-y-6">
              <h1 className="text-3xl font-bold">Preferences</h1>
              <div className="glass-panel p-8 rounded-[32px] space-y-8">
                 <div className="flex items-center justify-between">
                    <div>
                       <h3 className="font-semibold text-lg">Push Notifications</h3>
                       <p className="text-sm text-text-secondary">Get alerted for new meals in your area.</p>
                    </div>
                    <button 
                      onClick={() => setPushEnabled(!pushEnabled)}
                      className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${pushEnabled ? 'bg-accent' : 'bg-white/10'}`}
                    >
                       <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${pushEnabled ? 'right-1' : 'left-1'}`}></div>
                    </button>
                 </div>
                 <div className="flex items-center justify-between border-t border-white/5 pt-8">
                    <div>
                       <h3 className="font-semibold text-lg">Dark Mode</h3>
                       <p className="text-sm text-text-secondary">Toggle between light and dark themes.</p>
                    </div>
                    <button 
                      onClick={() => setDarkMode(!darkMode)}
                      className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${darkMode ? 'bg-accent' : 'bg-white/10'}`}
                    >
                       <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${darkMode ? 'right-1' : 'left-1'}`}></div>
                    </button>
                 </div>
              </div>
           </div>
        )}

        {/* Floating Toasts */}
        <AnimatePresence>
          {notifications.map(n => (
            <div key={n.id}>
              <Toast notification={n} onClear={() => setNotifications(prev => prev.filter(nn => nn.id !== n.id))} />
            </div>
          ))}
        </AnimatePresence>

        {/* Add Modal */}
        <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAddModal(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-lg glass-panel p-8 rounded-[32px] relative z-10 shadow-3xl max-h-[90vh] overflow-y-auto custom-scrollbar scroll-smooth"
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-semibold">Share Food</h2>
                  <button onClick={() => setShowAddModal(false)} className="bg-white/5 p-2 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                    <Plus className="w-5 h-5 rotate-45" />
                  </button>
                </div>

                <form onSubmit={handleAddDonation} className="space-y-6">
                   <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary uppercase mb-2 ml-1">What's on the menu?</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. 5x Veg Sandwiches"
                        value={newDonation.foodName}
                        onChange={(e) => setNewDonation(prev => ({ ...prev, foodName: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-accent/50 group"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary uppercase mb-2 ml-1">Dietary Preference</label>
                      <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl gap-1">
                        {(["Veg", "Non-Veg"] as const).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setNewDonation(prev => ({ ...prev, dietaryType: type }))}
                            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                              newDonation.dietaryType === type 
                                ? "bg-accent text-white shadow-lg" 
                                : "text-text-secondary hover:text-text-primary"
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div>
                        <label className="block text-xs font-semibold text-text-secondary uppercase mb-2 ml-1">Quantity Details</label>
                        <input
                          required
                          type="text"
                          placeholder="e.g. 4 Portions"
                          value={newDonation.quantity}
                          onChange={(e) => setNewDonation(prev => ({ ...prev, quantity: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-accent/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary uppercase mb-2 ml-1">Expiry Estimation</label>
                        <select
                          value={newDonation.expiry}
                          onChange={(e) => setNewDonation(prev => ({ ...prev, expiry: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-accent/50 appearance-none text-text-primary"
                        >
                          <option className="bg-bg text-text-primary" value="2h">2h</option>
                          <option className="bg-bg text-text-primary" value="4h">4h</option>
                          <option className="bg-bg text-text-primary" value="6h">6h</option>
                          <option className="bg-bg text-text-primary" value="12h">12h</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary uppercase mb-2 ml-1">Pickup Location</label>
                      <select
                        value={newDonation.location}
                        onChange={(e) => setNewDonation(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full bg-white border border-white/20 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500/20 appearance-none text-green-600 font-bold"
                      >
                         {LOCATIONS.map(loc => (
                           <option key={loc} className="bg-white text-green-600 font-semibold" value={loc}>
                             {loc}
                           </option>
                         ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary uppercase mb-2 ml-1">Full Pickup Address</label>
                      <textarea
                        required
                        placeholder="e.g. Flat 402, Sunshine Apts, Near Golden Gate"
                        value={newDonation.donorAddress}
                        onChange={(e) => setNewDonation(prev => ({ ...prev, donorAddress: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-accent/50 min-h-[80px]"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2 ml-1">
                        <label className="block text-xs font-semibold text-text-secondary uppercase">Food Images (Multiple Allowed)</label>
                        {newDonation.imageUrls.length > 0 && (
                          <button 
                            type="button"
                            onClick={() => setNewDonation(prev => ({ ...prev, imageUrls: [] }))}
                            className="text-[10px] font-bold text-accent hover:underline flex items-center gap-1"
                          >
                            <X className="w-3 h-3" /> Clear All
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar snap-x">
                          {newDonation.imageUrls.length > 0 ? (
                            newDonation.imageUrls.map((url, idx) => (
                              <div key={idx} className="relative min-w-[200px] aspect-video rounded-2xl overflow-hidden border border-white/10 bg-white/5 group snap-center">
                                <img 
                                  src={url} 
                                  alt={`Preview ${idx + 1}`} 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                <button
                                  type="button"
                                  onClick={() => setNewDonation(prev => ({ ...prev, imageUrls: prev.imageUrls.filter((_, i) => i !== idx) }))}
                                  className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                                <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded-md text-[8px] text-white">
                                  Image {idx + 1}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-white/5 group">
                              <img 
                                src={getPlaceholderImage(newDonation.foodName || "Food")} 
                                alt="Preview" 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5">
                                <div className="flex items-center gap-2">
                                   <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-sm shadow-lg">
                                     {getMockEmoji(newDonation.foodName || "Food")}
                                   </div>
                                   <div>
                                     <p className="text-white text-xs font-bold uppercase tracking-wider">Auto-Generated Preview</p>
                                     <p className="text-white/60 text-[10px]">{newDonation.foodName || "Enter food name..."}</p>
                                   </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <div className="relative group flex-1">
                            <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary group-focus-within:text-accent transition-colors" />
                            <input
                              key="url-input"
                              type="url"
                              placeholder="Paste Image URL..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const target = e.target as HTMLInputElement;
                                  if (target.value.trim()) {
                                    setNewDonation(prev => ({ ...prev, imageUrls: [...prev.imageUrls, target.value.trim()] }));
                                    target.value = '';
                                  }
                                }
                              }}
                              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-accent/40 focus:bg-white/[0.07] transition-all text-sm"
                            />
                          </div>
                          
                          <input 
                            type="file"
                            className="hidden"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            multiple
                          />
                          
                          <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-accent/10 hover:bg-accent/20 border border-accent/20 text-accent p-3 rounded-xl transition-all flex items-center gap-2 text-sm font-bold"
                          >
                            <Upload className="w-4 h-4" />
                            <span className="hidden sm:inline">Upload</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-text-secondary italic ml-1">
                           Tip: Local uploads are converted to data strings (~800KB max).
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary uppercase mb-2 ml-1">Pincode</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. 411001"
                        value={newDonation.pincode}
                        onChange={(e) => setNewDonation(prev => ({ ...prev, pincode: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-accent/50"
                      />
                    </div>
                  </div>

                  <button disabled={isLoading} className="w-full btn-primary py-4 flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Post Donation <Plus className="w-4 h-4" /></>}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Contact Modal */}
        <AnimatePresence>
          {contactDonor && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setContactDonor(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-sm glass-panel p-8 rounded-[32px] relative z-10 shadow-3xl text-center"
              >
                <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6 text-accent">
                   <Phone className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Contact Donor</h2>
                <p className="text-text-secondary text-sm mb-8">Reach out to coordinate the pickup for <span className="text-text-primary font-semibold">{contactDonor.foodName}</span></p>
                
                <div className="space-y-4 mb-8">
                   <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center">
                      <p className="text-[10px] text-text-secondary uppercase font-bold tracking-widest mb-1">Donor Name</p>
                      <p className="text-lg font-semibold">{contactDonor.donorName}</p>
                   </div>
                   <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center group cursor-pointer hover:border-accent/30 transition-colors">
                      <p className="text-[10px] text-text-secondary uppercase font-bold tracking-widest mb-1">Phone Number</p>
                      <p className="text-lg font-semibold text-accent">{contactDonor.donorPhone || "+91 98765 43210"}</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <button 
                     onClick={() => setContactDonor(null)}
                     className="py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-colors"
                   >
                      Cancel
                   </button>
                   <button 
                     onClick={() => setContactDonor(null)}
                     className="btn-primary py-3 rounded-xl text-sm font-medium"
                   >
                      Call Now
                   </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        
        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteModal && (
            <DeleteConfirmationModal 
              donationName={donations.find(d => d.id === showDeleteModal)?.foodName || "this listing"}
              onCancel={() => setShowDeleteModal(null)}
              onConfirm={() => handleDeleteDonation(showDeleteModal)}
            />
          )}
        </AnimatePresence>
        {/* Gallery Modal */}
        <AnimatePresence>
          {showGallery && (
            <GalleryModal 
              images={showGallery.images}
              foodName={showGallery.foodName}
              onCancel={() => setShowGallery(null)}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
