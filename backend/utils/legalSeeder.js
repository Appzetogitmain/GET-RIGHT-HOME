import InfoPage from '../models/InfoPage.js';
import PlatformSettings from '../models/PlatformSettings.js';

export const DEFAULT_LEGAL_DATA = {
  user: {
    terms: {
      title: 'Terms & Conditions',
      content: `Welcome to Get Right Home ("Platform", "we", "us", or "our"). These Terms & Conditions govern your access to and use of our website, mobile application, and home services. By accessing or using Get Right Home, you agree to be bound by these terms.

1. ABOUT GET RIGHT HOME
Get Right Home is an integrated real estate and home services technology platform. We facilitate:
- Real Estate Services: Discovery, buying, selling, and renting of residential, commercial properties, plots, and PG/hostels, connecting property seekers directly with owners, builders, and verified brokers.
- On-Demand Home Services: Booking of vetted service professionals for household services including AC servicing, plumbing, electrical work, home cleaning, carpentry, painting, appliance repair, and packers & movers.

2. ELIGIBILITY & USER ACCOUNT
- You must be at least 18 years old to create an account and transact on the platform.
- You agree to provide accurate, current, and complete details (name, valid phone number, and address) during registration.
- You are responsible for safeguarding your login OTP and account access. You are liable for all actions performed through your account.

3. REAL ESTATE LISTINGS & PROPERTY SEARCH
- Property listings, images, pricing, and amenities are submitted by property owners, developers, and brokers.
- While Get Right Home verifies listing details to the best of its ability, users are strictly advised to independently inspect properties, verify ownership documents, and check RERA registrations before making any financial advance or signing agreements.
- Get Right Home is not a party to independent agreements or offline financial deals between property seekers and property owners/agents.

4. HOME SERVICE BOOKINGS & FULFILLMENT
- Home services booked through the platform are fulfilled by verified independent service professionals.
- Transparent price estimates and service scopes are provided prior to order confirmation. If additional work or spare parts are required on-site, charges must be approved by the customer before execution.
- Customers agree to provide reasonable and safe access to their premises for service completion.
- Cancellations and rescheduling must be performed in accordance with the cancellation policy shown during checkout.

5. PAYMENTS, PRICING & WALLET
- Payments can be made securely online via UPI, Credit/Debit cards, Net Banking, or Cash on Delivery (COD) where applicable.
- Platform fees, GST, and applicable service taxes are clearly itemized before checkout.
- Wallet balances or promotional credits may be redeemed against eligible bookings as per platform rules.
- Refunds for cancelled or defective services will be processed back to the original payment source or wallet within 5–7 business days upon review.

6. USER CODE OF CONDUCT
You agree not to:
- Post fraudulent, misleading, or abusive listings, comments, or reviews.
- Solicit service professionals or property owners off-platform to evade platform charges.
- Harass, abuse, or endanger service partners, property owners, or support representatives.
- Use automated scripts, scrapers, or reverse-engineer any portion of the platform.

7. ACCOUNT DELETION & TERMINATION
- You may permanently delete your account and personal data at any time directly through the app (Profile -> Delete Account) or by emailing support@getrighthome.com.
- Get Right Home reserves the right to suspend or terminate accounts that breach these terms, commit fraud, or disrupt platform security.

8. LIMITATION OF LIABILITY
Get Right Home provides its services on an "as is" and "as available" basis. To the maximum extent permitted by Indian law, Get Right Home shall not be liable for indirect, incidental, or consequential damages resulting from property disputes, third-party contractor actions, or temporary service interruptions.

9. GOVERNING LAW & DISPUTES
These Terms are governed by the laws of India. Any disputes arising out of these terms shall be subject to the exclusive jurisdiction of the competent courts in India.

10. CONTACT US
For customer support, questions, or grievances:
- Email: support@getrighthome.com
- Support Portal: https://getrighthome.com/support
- Phone: Available in-app under Help & Support`
    },
    privacy: {
      title: 'Privacy Policy',
      content: `Get Right Home ("we", "our", or "us") is dedicated to protecting your privacy and personal data. This Privacy Policy details how we collect, use, store, and disclose your information across our website, mobile application, and home services.

1. INFORMATION WE COLLECT
- Account & Profile Data: Full name, mobile phone number, email address, profile picture, and OTP authentication records.
- Location Information: Device GPS location (precise or approximate) to display nearby property listings, calculate local service availability, and guide assigned service workers to your location.
- Bookings & Inquiries: Property inquiry forms, saved properties, home service booking requests, preferred time slots, and service addresses.
- Payment Information: Transaction identifiers, payment methods, and invoice records processed through RBI-approved payment gateways (such as Razorpay). We never store sensitive card details or CVV.
- Technical & Device Data: IP address, device model, operating system, push notification tokens, and crash diagnostics to ensure application stability.

2. HOW WE USE YOUR INFORMATION
We collect and use your data solely for legitimate business operations:
- To verify your identity and manage your account via secure OTP.
- To connect you with property owners, builders, or assigned home service technicians.
- To process, track, and complete service bookings and generate tax invoices.
- To send transactional notifications, booking updates, and service reminders.
- To deliver responsive customer support and resolve user queries.
- To detect and prevent spam, fraud, and unauthorized platform activity.

3. SHARING OF INFORMATION
We do not sell, rent, or trade your personal data. We share necessary data only with:
- Assigned Service Providers & Property Owners: Only essential details (such as customer name, contact number, and service address) are shared to fulfill your booked job or property inquiry.
- Service Partners & Infrastructure: Trusted third-party vendors for SMS delivery, cloud hosting, push notifications, Google Maps navigation, and payment processing under strict non-disclosure obligations.
- Legal & Regulatory Authorities: When required by Indian law, court order, or governmental requests to ensure legal compliance and platform safety.

4. DATA SECURITY & STORAGE
- We implement robust security measures including SSL/TLS encryption for data in transit and encrypted databases in secure cloud facilities.
- Personal data is retained only for as long as necessary to provide platform services, maintain tax and financial records, and comply with regulatory requirements.

5. YOUR RIGHTS & ACCOUNT DELETION
You retain full control over your information:
- You may view and edit your profile details at any time from the account section.
- You can permanently delete your account and personal data directly from the app (Profile -> Delete Account) or by emailing support@getrighthome.com. Your data will be permanently wiped from our active databases upon request.

6. UPDATES TO THIS POLICY
We may revise this Privacy Policy periodically to reflect service enhancements or statutory updates. Any revisions will be published on this page with the updated revision date.

7. GRIEVANCE OFFICER & CONTACT
For any privacy queries, feedback, or grievance redressal, please contact:
Grievance Officer, Get Right Home
Email: support@getrighthome.com
Website: https://getrighthome.com`
    },
    about: {
      title: 'About Get Right Home',
      content: `Get Right Home is India's next-generation all-in-one platform for real estate discovery and on-demand home services. Our mission is to simplify housing for millions by providing verified property listings, transparent pricing, and trusted doorstep home maintenance services.`
    },
    contact: {
      title: 'Contact Us',
      content: `Get Right Home Customer Support
Email: support@getrighthome.com
Website: https://getrighthome.com
Support Hours: Monday to Saturday, 9:00 AM – 8:00 PM IST`
    }
  },
  partner: {
    terms: {
      title: 'Partner Terms & Conditions',
      content: `These Partner Terms govern the agreement between Get Right Home and registered property owners, brokers, builders, and commercial partners listing properties or offering services on Get Right Home. Partners agree to list accurate property information, comply with RERA regulations, maintain transparent communication, and adhere to platform standards.`
    },
    privacy: {
      title: 'Partner Privacy Policy',
      content: `This Partner Privacy Policy outlines how Get Right Home handles partner business credentials, property listings, KYC documentation, financial transactions, and payout accounts with strict confidentiality and security.`
    },
    about: {
      title: 'About Get Right Home Partners',
      content: `Get Right Home Partner network empowers property developers, brokers, and independent home service professionals with smart technology, qualified leads, and streamlined customer management.`
    },
    contact: {
      title: 'Partner Support Contact',
      content: `Get Right Home Partner Desk
Email: partner@getrighthome.com
Support Portal: https://getrighthome.com`
    }
  },
  worker: {
    terms: {
      title: 'Worker Terms & Conditions',
      content: `These Terms govern your use of the Get Right Home Worker app provided by Get Right Home. By registering or using the Worker App, you agree to these Terms:

1. INDEPENDENT PROFESSIONAL
You register and use the App as an independent service professional, not an employee or agent of the Company. You determine your availability and which service jobs to accept.

2. SERVICE QUALITY & CONDUCT
- Arrive punctually at customer premises, perform work with professional skill, and respect customer property.
- Maintain courteous and respectful behavior at all times.
- Do not solicit customers off-platform or take unauthorized cash payments.

3. EARNINGS & PAYOUTS
Earnings for completed jobs (less applicable platform commissions) are credited directly to your registered bank account or UPI according to the published payout schedule.

4. SAFETY & COMPLIANCE
You are responsible for your own safety tools and adherence to standard trade safety practices. Provide valid KYC and identity documents during onboarding.

5. ACCOUNT TERMINATION
You may close your account at any time through the app settings (Profile -> Delete Account) or by contacting worker support.`
    },
    privacy: {
      title: 'Worker Privacy Policy',
      content: `This Privacy Policy explains how Get Right Home collects and manages information from registered service professionals ("Workers") using the Get Right Home Worker app:

1. INFORMATION COLLECTED
- Personal & KYC Details: Name, mobile number, residential address, profile photo, government ID (Aadhaar/PAN/Driving License), and trade skill certificates.
- Bank & Payout Details: Bank account number, IFSC code, or UPI ID for direct payout settlements.
- Real-Time Location: Background and foreground GPS location while online or on active service jobs to dispatch nearby bookings, provide customer navigation, and verify arrival.
- Job History: Completed services, customer feedback, earnings records, and job proof photographs.

2. HOW WE USE WORKER DATA
- To verify worker credentials and maintain platform trust and customer safety.
- To assign nearby job requests based on location and trade category.
- To compute and disburse service earnings and payouts.
- To assist workers via customer and technical support.

3. WORKER DATA RIGHTS & ACCOUNT DELETION
Workers have the right to inspect their records and request account deletion directly from the Worker App (Profile -> Delete Account) or by emailing support@getrighthome.com.`
    },
    about: {
      title: 'About Get Right Home Worker App',
      content: `The Get Right Home Worker App empowers verified service technicians with instant job leads, real-time navigation, transparent earnings, and timely bank payouts.`
    },
    contact: {
      title: 'Worker Support Contact',
      content: `Get Right Home Worker Help Desk
Email: support@getrighthome.com
In-App: Worker Profile -> Help Center`
    }
  }
};

export const seedLegalPagesOnStartup = async () => {
  try {
    const audiences = ['user', 'partner', 'worker'];
    let seededCount = 0;

    for (const aud of audiences) {
      const audienceData = DEFAULT_LEGAL_DATA[aud] || {};
      for (const [slug, item] of Object.entries(audienceData)) {
        const existing = await InfoPage.findOne({ audience: aud, slug });
        if (!existing || !existing.content || existing.content.trim().length === 0) {
          await InfoPage.findOneAndUpdate(
            { audience: aud, slug },
            {
              audience: aud,
              slug,
              title: item.title,
              content: item.content,
              isActive: true
            },
            { upsert: true, new: true }
          );
          seededCount++;
        }
      }
    }

    // Also populate PlatformSettings worker legal fields if empty
    try {
      const platformSettings = await PlatformSettings.getSettings();
      let updatedSettings = false;
      if (!platformSettings.termsAndConditions || platformSettings.termsAndConditions.trim().length === 0) {
        platformSettings.termsAndConditions = DEFAULT_LEGAL_DATA.worker.terms.content;
        updatedSettings = true;
      }
      if (!platformSettings.privacyPolicy || platformSettings.privacyPolicy.trim().length === 0) {
        platformSettings.privacyPolicy = DEFAULT_LEGAL_DATA.worker.privacy.content;
        updatedSettings = true;
      }
      if (updatedSettings) {
        await platformSettings.save();
      }
    } catch (err) {
      // Non-blocking
    }

    if (seededCount > 0) {
      console.log(`✅ Legal Pages seeded into database: ${seededCount} pages updated`);
    } else {
      console.log('✅ Legal Pages already up-to-date in database');
    }
  } catch (error) {
    console.warn('⚠️ Legal pages auto-seeding error:', error.message);
  }
};

