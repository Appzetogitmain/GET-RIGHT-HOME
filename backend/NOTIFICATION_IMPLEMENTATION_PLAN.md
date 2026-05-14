
# Implementation Plan: Notification & Email Logic

## Phase 1: Infrastructure Setup (Backend)
- [ ] Create `services/emailService.js` (Nodemailer with updated credentials).
- [ ] Update `services/notificationService.js` to handle different user types ('user', 'partner', 'admin') properly (currently handles User/Admin, need to ensure Partner uses proper model/logic).
- [ ] Update `utils/smsService.js` to have a generic `sendSMS` method beyond just `sendOTP`.

## Phase 2: User Module Implementation
- [ ] **Registration**: Update `authController.verifyOtp`
    - Send "Welcome" Email.
    - Send "Welcome" Push.
- [ ] **Booking Requested**: Update `bookingController.createBooking`
    - Send User Email ("Booking Confirmation").
    - Send User Push ("Booking Confirmed").
    - Send Partner Push ("New Booking Alert").
    - Send Partner SMS ("New Booking Alert").
- [ ] **Booking Cancelled**: Update `bookingController.cancelBooking`
    - Send User Email ("Cancellation").
    - Send Partner Push ("Booking Cancelled").

## Phase 3: Partner Module Implementation
- [ ] **Partner Registration**: Update `authController.verifyPartnerOtp` (or finalize registration step)
    - Send Partner Email ("Registration Received").
    - Send Admin Push ("New Partner Registration").
- [ ] **Partner Approval/Rejection**: Update `adminController.updatePartnerApprovalStatus`
    - If Approved: Send Partner Email ("Approved") + Push ("Approved").
    - If Rejected: Send Partner Email ("Account Application Update").
- [ ] **Property Verification**: Update `adminController.verifyPropertyDocuments`
    - Send Partner Push ("Property LIVE").
- [ ] **Wallet Credit**: Update `walletController` (or wherever credit happens)
    - Send Partner Push ("Wallet Credited").

## Phase 4: Admin Module Implementation
- [ ] **New Property**: Update `propertyController.createProperty`
    - Send Admin Email ("New Property List Request").
- [ ] **New Support Query**: Update `contactController.createContact`
    - Send Admin Email ("New Support Message").

## Phase 5: Frontend Updates
- [ ] Verify `App.jsx` and `firebase.js` handles token generation for all roles.
- [ ] Ensure `UserSignup`, `HotelSignup` components trigger the necessary backend headers/flows if needed (mostly backend logic, but ensuring tokens are synced).
