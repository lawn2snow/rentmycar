# RentMyCar - Client Testing Guide

## Platform Overview

RentMyCar is a peer-to-peer car rental platform that connects car owners with renters. The platform features real-time booking, vehicle management, and a comprehensive dashboard for both owners and renters.

---

## Live URLs

| Page | URL |
|------|-----|
| **Homepage** | https://rentmycar-demo.netlify.app |
| **Owner Dashboard** | https://rentmycar-demo.netlify.app/dashboard.html |
| **Renter Dashboard** | https://rentmycar-demo.netlify.app/renter-dashboard.html |

---

## Test Accounts

### Demo Owner Account
Use this account to test the **Owner Dashboard** features:

| Field | Value |
|-------|-------|
| Email | `demo@rentmycar.com` |
| Password | `demo123` |
| Role | Owner |

**Owner Features to Test:**
- View earnings and analytics
- Manage vehicle fleet (add, edit, delete vehicles)
- Approve/decline booking requests
- Track maintenance schedules
- View customer reviews
- Update profile settings

---

### Demo Renter Account
Use this account to test the **Renter Dashboard** features:

| Field | Value |
|-------|-------|
| Email | `renter@rentmycar.com` |
| Password | `demo123` |
| Role | Renter |

**Renter Features to Test:**
- Browse available cars
- Book vehicles
- View booking history
- Track active rentals
- Leave reviews

---

## Creating New Test Accounts

You can create new accounts directly on the platform:

1. Go to https://rentmycar-demo.netlify.app
2. Click **"Sign In"** button
3. Click **"Sign Up"** link at the bottom of the modal
4. Fill in the registration form:
   - First Name
   - Last Name
   - Email
   - Password
   - Phone Number
   - **Role Selection**: Choose "Renter" or "Owner"
5. Click **"Create Account"**

---

## Feature Testing Checklist

### Homepage
- [ ] Cars display correctly with images, prices, and ratings
- [ ] Filter buttons work (All, Sedan, SUV, Sports, etc.)
- [ ] Price range slider filters cars
- [ ] "Book Now" buttons are clickable
- [ ] Sign In/Sign Up modals work

### Owner Dashboard
- [ ] **Overview**: Stats cards display (Earnings, Active Rentals, Bookings, Rating)
- [ ] **Fleet Manager**: Add new vehicle with full registration form
- [ ] **Fleet Manager**: Edit existing vehicles
- [ ] **Fleet Manager**: Vehicle cards display correctly
- [ ] **Bookings**: View and approve/decline booking requests
- [ ] **Earnings**: View transaction history and payout info
- [ ] **Analytics**: Charts and statistics display
- [ ] **Maintenance**: Schedule and track vehicle maintenance
- [ ] **Reviews**: View customer reviews
- [ ] **Settings**: Update profile, notifications, payment settings

### Vehicle Registration (Owner)
When adding a new vehicle, the following information is required:
- Vehicle Details (Make, Model, Year, Type, Color, VIN)
- Registration (License Plate, State, Expiry Date)
- Insurance (Provider, Policy Number, Expiry Date)
- Document Uploads (Driver's License, Registration, Insurance Card, Photos)

### Renter Dashboard
- [ ] View available cars
- [ ] Book a vehicle
- [ ] View booking history
- [ ] Track current rentals

---

## Technical Information

### Backend
- **Database**: Google Sheets
- **API**: Google Apps Script (REST API)
- **Authentication**: Session-based with token storage

### Frontend
- **Hosting**: Netlify
- **Framework**: Vanilla JavaScript
- **Styling**: Custom CSS with responsive design

---

## Known Limitations (Demo Environment)

1. **File Uploads**: Document uploads store file names only (production would use cloud storage)
2. **Payments**: Stripe integration is configured but in test mode
3. **Real-time Updates**: Some features use simulated data for demonstration

---

## Browser Compatibility

Tested and working on:
- Google Chrome (recommended)
- Microsoft Edge
- Firefox
- Safari

**Note**: If using privacy-focused browsers or extensions, you may need to allow cookies/storage for the site to function properly.

---

## Support & Feedback

For issues or feedback during testing, please note:
- Browser used
- Steps to reproduce any issues
- Screenshots if applicable

---

## Quick Start Guide

1. **Visit**: https://rentmycar-demo.netlify.app
2. **Login**: Click "Sign In" and use demo credentials above
3. **Explore**: Navigate through the dashboard sections
4. **Test**: Try adding a vehicle, viewing bookings, etc.

---

*Document Version: 1.0*
*Last Updated: January 2026*
