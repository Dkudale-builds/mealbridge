# System Architecture

## Overview
MealBridge Premium is a web application that connects food donors with recipients using a simple client-server model built on Firebase.

---

## Architecture Components

### 1. Frontend
- Built using React + TypeScript + Vite  
- Handles user interaction and UI rendering  
- Collects and displays donation data  

### 2. Backend (Firebase)
- Firestore: Stores donation and user data  
- Authentication: Manages user login  
- Hosting: Deploys the application  

### 3. External Services
- Google Maps / Location API (for location-based matching)

---

## System Workflow

1. User opens the application  
2. User logs in or registers  
3. Donor submits food details (type, quantity, location)  
4. Data is stored in Firestore  
5. System filters nearby recipients based on location  
6. Recipients can view and respond to available donations  
7. Status is updated in real-time  

---

## Data Flow

User Input → Frontend → Firebase Firestore → Query Processing → Results Displayed to Users

---

## Key Design Decisions

- Firebase used to reduce backend complexity  
- Real-time database for instant updates  
- Modular frontend structure for scalability  

---

## Future Improvements

- Add dedicated backend server for advanced logic  
- Optimize matching algorithm  
- Add notification system (SMS / push)
