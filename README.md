# MealBridge Premium:

A smart Food Waste Redistribution Platform that connects food donors (individuals, restaurants, NGOs) with receivers in need reducing food waste and supporting communities.

# Overview:

MealBridge Premium is a full-stack web application designed to solve the real-world problem of food wastage.

## It enables users to
Donate excess food
Discover nearby available meals in real-time
Claim and manage food pickups
Track contributions and environmental impact
The platform focuses on efficiency, transparency, and sustainability.

# Key Features:                                                                                                              
User Roles
Donor Mode
Add food donations
Upload images
Set expiry time & quantity
Provide pickup location & details
Receiver Mode
Browse available food
Filter by type (Veg / Non-Veg)
Claim meals
Track reserved food
Role Switching
Users can seamlessly switch between Donor and Receiver
Location-Based Discovery
Live location tagging (e.g., Pune, Mumbai, Delhi, Bangalore)
Map-based UI showing nearby food donations
Smart filtering based on selected city
Interactive Map Integration
Real-time food availability markers

## Clickable markers showing
Food name
Quantity
Expiry time
Location
Quick "Claim Meal" action directly from map popup
Donation Management

## Add new donations via modal form Fields include
Food name
Dietary preference (Veg / Non-Veg)
Quantity
Expiry time
Pickup address
Pincode
Food images (multiple allowed)

## Smart Matching System Connects receivers with nearby donors Shows
Active dishes
Availability status
Expiry countdown
Prevents expired or already claimed items
Status Tracking

## Food states
Available
Claimed
Reserved
Real-time updates on food availability
User Dashboard & Analytics

## Track personal contributions
Total meals shared
Active listings
CO₂ emissions saved 
Climate impact visualization with progress bar
History & Feedback System
View past donations
Rate and provide feedback
Track completed transactions Modern UI/UX
Dark mode / Light mode toggle
Premium dashboard-style interface
Smooth transitions and card based layout
Mobile-responsive design

# Technologies Used:

## Frontend
React (Vite)
Tailwind CSS / Custom UI

## Backend
Firebase / Supabase (Auth + DB)
Database
Real-time database (Firestore / Supabase)
Maps
Mapbox / Leaflet / Google Maps API
Storage
Firebase Storage / Cloud Storage

# Core Workflow: 
Donor adds food donation
Data stored in backend (with location + expiry)
Receivers view nearby food via dashboard/map
Receiver claims meal
Status updates in real-time
Donation is completed and logged in history
Authentication (Optional Feature)
User login/signup
Role based access
Profile management

# Project Structure:
/src
 ├── components
 ├── pages
 ├── hooks
 ├── services (API / Firebase)
 ├── assets
 └── App.jsx

## Screens Included:

Dashboard (Nearby Meals)
Map View
Contributions Page
Add Donation Modal
History Page
Profile & Analytics

# Problem Solved:

Reduces food wastage
Helps people in need
Improves resource distribution
Encourages community participation
Promotes sustainability awareness

# Future Enhancements:

AI-based food matching
Route optimization for pickup
NGO integration
Push notifications
Expiry alerts
Payment / reward system
Multi-language support

