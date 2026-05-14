# User Frontend Documentation

## Overview
The User Frontend is a customer-facing web application for **AppZeto/Rukkoin**. It allows users to search, view, and book properties (Hotels, Villas, PGs, Resorts) and manage their bookings and wallet.

## Technology Stack
- **Framework**: React (Vite)
- **Styling**: TailwindCSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **State Management**: React `useState`, `useEffect`
- **Routing**: `react-router-dom`

---

## Page Documentation

### 1. Home Page (`Home.jsx`)
The landing page of the application.
- **Path**: `/` (inferred)
- **Key Features**:
  - **Hero Section**: Branding and initial call to action.
  - **Exclusive Offers**: Carousel or grid of special deals.
  - **Sticky Filter Bar**: Allows filtering by property type (All, Hotel, Villa, etc.).
  - **Property Feed**: Displays a list of available properties based on the selected filter.

### 2. Search Page (`SearchPage.jsx`)
A dedicated search interface for finding properties.
- **Path**: `/search` (inferred)
- **Key Features**:
  - **Search Input**: "Hero Style" input for entering destinations.
  - **Date Selection**: Scrollable horizontal list of next 14 days for check-in selection.
  - **Recent Searches**: Quick access to previously searched locations.
  - **Popular Cities**: Visual grid of popular destinations (Indore, Bhopal, Ujjain).
  - **Suggested Stays**: Recommendations based on user preference.
  - **Interactive Elements**: Glassmorphism header, smooth animations on entry.

### 3. Property Details Page (`PropertyDetailsPage.jsx`)
The core page for viewing specific property information.
- **Path**: `/hotel/:id` (inferred)
- **Key Features**:
  - **Dynamic Content**: Adapts layout based on `propertyType` (Hotel, PG, Villa, Resort, Homestay).
  - **Gallery**: Image slider with cover and gallery images.
  - **Pricing Logic**: Calculates per-night and total costs based on weekday/weekend pricing.
  - **Room/Inventory Selection**: For Hotels/Resorts, allows selecting specific room types.
  - **Guest Configuration**: Inputs for rooms, adults, and children with validation logic.
  - **Amenities & Policies**: Displays facilities and house rules (check-in/out, cancellation).
  - **Booking Action**: Sticky bottom bar with live price calculation and "Book Now" button.

### 4. Booking Confirmation Page (`BookingConfirmationPage.jsx`)
Post-booking success and management page.
- **Path**: `/booking/:id` (inferred)
- **Key Features**:
  - **Success Animation**: Confetti blast on successful booking.
  - **Booking Summary**: detailed breakdown of hotel, dates, guests, and pricing.
  - **Payment Integration**: Option to "Pay Now" or View Payment Breakdown.
  - **Action Grid**: Quick buttons for "Directions", "Call Hotel", "Need Help".
  - **WhatsApp Integration**: Toggle for WhatsApp updates.
  - **Modals**:
    - **Edit Guest**: Update guest name.
    - **Cancel Booking**: Confirmation flow for cancellation with fee warning.

### 5. Wallet Page (`WalletPage.jsx`)
User's digital wallet for payments and rewards.
- **Path**: `/wallet` (inferred)
- **Key Features**:
  - **Balance Display**: Current wallet balance.
  - **Tabs**:
    - **Home**: Recent activity and promo banner.
    - **History**: Full list of credit/debit transactions.
    - **Cards**: Saved payment methods (Credit Cards, UPI).
    - **Analytics**: Charts/Stats on total spent, total added, bookings count.
    - **Settings**: Security and notification preferences.
  - **Bottom Sheets**: Slide-up interfaces for "Add Money" and "Withdraw" functionality.

### 6. Authentication Pages
- **Login**: `UserLoginPage.jsx` / `UserLogin.jsx`
- **Signup**: `UserSignupPage.jsx` / `UserSignup.jsx`
- **Features**: Standard authentication flows for user access.

---

## Directory Structure (User Context)
```
src/pages/user/
├── Home.jsx                  # Landing Page
├── SearchPage.jsx            # Search Interface
├── PropertyDetailsPage.jsx   # Property Info & Booking Init
├── BookingConfirmationPage.jsx # Booking Success & Manage
├── WalletPage.jsx            # Wallet & Payments
├── BookingsPage.jsx          # My Bookings List
├── ProfileEdit.jsx           # User Profile Management
├── SavedPlacesPage.jsx       # Wishlist
├── AmenitiesPage.jsx         # Full Amenities List
├── OffersPage.jsx            # All Offers
├── NotificationsPage.jsx     # User Notifications
└── ... (Other support pages)
```

## Common Components
- **PropertyCard**: Used in Search and Home feeds to display property previews.
- **HeroSection**: Main visual component on Home.
- **ExclusiveOffers**: Banner component for deals.
