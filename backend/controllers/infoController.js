import InfoPage from '../models/InfoPage.js';
import PlatformSettings from '../models/PlatformSettings.js';
import { resolveFreeAccessRule } from '../utils/listingEligibility.js';

const DEFAULT_LEGAL_PAGES = {
  user: {
    terms: {
      title: 'Terms & Conditions',
      content: `Welcome to Get Right Home. These Terms and Conditions govern your access to and use of Get Right Home's website, mobile applications, and online platforms ("Platform"). By registering, accessing, or using our services, you agree to comply with and be bound by these terms.

1. About Get Right Home
Get Right Home is a comprehensive technology platform providing real estate discovery (buy, rent, lease residential and commercial properties, PG/hostels, plots) and on-demand home services (cleaning, repair, maintenance, painting, packers & movers, and more). We connect customers directly with verified property owners, builders, brokers, and independent home service professionals.

2. Account Registration and Security
- You must be at least 18 years of age to register or use our services.
- You agree to provide accurate and complete personal details (name, valid phone number, address) during registration and OTP verification.
- You are responsible for safeguarding your login credentials and one-time passwords (OTP). Any activity conducted under your account is your responsibility.

3. Property Listings and Content
- Property listings, images, pricing, and descriptions are provided by owners, builders, and verified partners.
- While Get Right Home takes reasonable measures to screen listings, users are advised to conduct independent due diligence, physical verification of properties, and verification of title deeds before entering into rental agreements or financial commitments.
- Get Right Home does not act as a real estate broker or escrow agent for offline property transactions unless explicitly agreed upon in writing.

4. Home Services and Bookings
- All home service professionals operating through our Platform are verified independent contractors or service partners.
- Pricing, estimates, scope of work, and approximate timelines will be provided prior to booking confirmation.
- Users agree to provide reasonable access to their premises and a safe working environment for service professionals.
- Cancellation and rescheduling policies apply as displayed during booking checkout.

5. Payments, Wallet, and Billing
- Payments can be made online via supported payment methods (UPI, debit/credit cards, net banking) through authorized payment gateways, or cash upon service completion where permitted.
- Any wallet balance or promotional credits can be applied towards eligible bookings according to platform rules.
- Applicable goods and services taxes (GST) and platform fees are clearly itemized before order confirmation.

6. User Conduct and Restrictions
You agree not to:
- Post false, misleading, abusive, defamatory, or fraudulent property listings or reviews.
- Solicit service professionals or property owners off-platform to circumvent platform fees.
- Misuse personal contact numbers or harass other users, service professionals, or staff.
- Use automated bots, scrapers, or reverse-engineering tools on any part of our platform.

7. Account Deletion and Termination
- You have the absolute right to delete your account and personal data at any time directly through the app (Profile -> Delete Account) or by emailing support@getrighthome.com.
- Get Right Home reserves the right to suspend or terminate accounts that breach these terms, engage in fraud, or abuse platform features.

8. Limitation of Liability
Get Right Home provides its Platform on an "as is" and "as available" basis. To the maximum extent permitted by applicable Indian laws, Get Right Home and its affiliates shall not be liable for any indirect, incidental, punitive, or consequential damages resulting from user interactions, third-party services, or site downtime.

9. Governing Law and Jurisdiction
These Terms and Conditions are governed by and construed in accordance with the laws of the Republic of India. Any disputes arising hereunder shall be subject to the exclusive jurisdiction of the competent courts of India.

10. Contact and Customer Support
For inquiries, assistance, or grievance redressal, please contact our support team:
- Email: support@getrighthome.com
- In-App Support: Help & Support section
- Website: https://getrighthome.com`
    },
    privacy: {
      title: 'Privacy Policy',
      content: `Get Right Home ("we", "our", or "us") values your privacy and is committed to protecting your personal data. This Privacy Policy outlines our practices regarding the collection, use, disclosure, and protection of information when you use our website, mobile apps, and home services.

1. Information We Collect
- Profile & Authentication: Name, mobile phone number, email address, and OTP authentication details.
- Location Information: Device location (approximate or precise) to show nearby property listings, determine home service availability, and guide service professionals to your address.
- Booking & Inquiry Data: Service preferences, booking schedule, service addresses, and inquiries submitted to property owners or builders.
- Payment Information: Transaction references, invoice details, and payment statuses processed via RBI-authorized payment aggregators (e.g. Razorpay). We do not store your complete card numbers or CVV.
- Device & Usage Information: IP address, device type, operating system version, push notification tokens, and crash analytics to maintain application stability.

2. How We Use Your Information
We use your data solely for legitimate business purposes:
- To verify your identity and manage your account.
- To facilitate property inquiries and fulfill home service bookings.
- To send transactional notifications, booking confirmations, OTP messages, and service updates.
- To process secure payments and refunds.
- To provide responsive customer support and resolve disputes.
- To detect and prevent fraudulent activities, spam, and platform abuse.

3. Information Sharing and Disclosure
We do NOT sell or rent your personal information to third parties. We share data only with:
- Assigned Service Providers & Property Owners: Necessary details (such as your first name, phone number, and service address) are shared exclusively to perform the booked service or answer your property inquiry.
- Infrastructure Partners: Trusted third-party service providers (cloud hosting, SMS gateways, Google Maps API, and payment processors) under strict confidentiality agreements.
- Legal & Regulatory Compliance: Government authorities or law enforcement when required by applicable law, court order, or to protect the safety of users.

4. Data Security and Retention
- We implement industry-standard encryption protocols (SSL/TLS) for data transmission and maintain secure cloud infrastructure.
- We retain your personal data only as long as necessary to provide services, comply with accounting and statutory tax obligations, and resolve disputes.

5. Your Rights and Account Deletion
You have complete control over your data:
- Access & Edit: You can review and update your profile details anytime in the app.
- Delete Account: You can permanently delete your account and personal information directly via the app (Profile -> Delete Account) or by emailing support@getrighthome.com. Upon request, your account data will be permanently wiped or anonymized in compliance with applicable law.

6. Changes to This Privacy Policy
We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated revision date. Your continued use of the platform after updates indicates acceptance of the revised terms.

7. Grievance Redressal and Contact
If you have any questions, feedback, or grievances regarding this Privacy Policy or your personal information, please contact our Grievance Officer:
- Email: support@getrighthome.com
- Support Portal: https://getrighthome.com/support
- Address: Get Right Home, India`
    }
  },
  partner: {
    terms: {
      title: 'Partner Terms & Conditions',
      content: `These Partner Terms govern the agreement between Get Right Home and registered property owners, brokers, builders, and commercial partners listing inventory on Get Right Home. Partners agree to list accurate property information and comply with RERA and applicable local laws.`
    },
    privacy: {
      title: 'Partner Privacy Policy',
      content: `This Partner Privacy Policy outlines how Get Right Home handles partner business information, property listings, KYC documentation, and financial settlements.`
    }
  },
  worker: {
    terms: {
      title: 'Worker Terms & Conditions',
      content: `These Terms govern your use of the Get Right Home Worker app provided by Get Right Home. By registering or using the Worker App, you agree to these Terms as an independent service professional.`
    },
    privacy: {
      title: 'Worker Privacy Policy',
      content: `This Privacy Policy explains how Get Right Home collects, uses and protects information of service professionals using the Get Right Home Worker app.`
    }
  }
};

export const getPublicPage = async (req, res) => {
  try {
    const { audience, slug } = req.params;

    if (!['user', 'partner', 'worker'].includes(audience)) {
      return res.status(400).json({ success: false, message: 'Invalid audience' });
    }

    if (!['terms', 'privacy', 'about', 'contact', 'support'].includes(slug)) {
      return res.status(400).json({ success: false, message: 'Invalid page type' });
    }

    const page = await InfoPage.findOne({ audience, slug, isActive: true });

    if (!page) {
      const defaultPage = DEFAULT_LEGAL_PAGES[audience]?.[slug];
      if (defaultPage) {
        return res.status(200).json({
          success: true,
          page: {
            audience,
            slug,
            title: defaultPage.title,
            content: defaultPage.content,
            isActive: true
          }
        });
      }
      return res.status(404).json({ success: false, message: 'Page not configured yet' });
    }

    res.status(200).json({ success: true, page });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching page' });
  }
};

export const getPublicPlatformStatus = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    res.status(200).json({
      success: true,
      platformOpen: settings.platformOpen,
      maintenanceMode: settings.maintenanceMode,
      bookingDisabledMessage: settings.bookingDisabledMessage,
      maintenanceTitle: settings.maintenanceTitle,
      maintenanceMessage: settings.maintenanceMessage
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching platform status' });
  }
};

export const getFinancialSettings = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    // Only expose taxRate to public/users. defaultCommission is internal usually, 
    // but specific requirement asks for transparency or at least backend uses it.
    // Frontend only needs taxRate for breakdown.
    res.status(200).json({
      success: true,
      taxRate: settings.taxRate || 0
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching financial settings' });
  }
};

/**
 * @desc    Get free trial configuration (public endpoint for partner dashboard)
 * @route   GET /api/info/trial-settings
 * @access  Public
 */
export const getTrialSettings = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    const rule = resolveFreeAccessRule(settings, new Date(), 'builder');
    res.status(200).json({
      success: true,
      // Legacy fields (kept so older clients keep working).
      freeTrialListingLimit: rule.listingLimit,
      freeTrialDurationDays: rule.durationDays,
      // Admin-controlled free access.
      freeAccessEnabled: rule.enabled,
      freeAccessMode: rule.enabled ? rule.mode : 'none',
      freeAccessDurationDays: rule.durationDays,
      freeAccessListingLimit: rule.listingLimit,
      freeAccessRoles: rule.roles
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching trial settings' });
  }
};

export const getAdminContact = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    if (settings) {
      return res.status(200).json({ 
        success: true, 
        email: settings.supportEmail || 'getrighthome7@gmail.com', 
        phone: settings.supportPhone || '+91 63044 71791',
        whatsapp: settings.supportWhatsapp || '+916304471791'
      });
    }
    res.status(200).json({ success: true, email: 'getrighthome7@gmail.com', phone: '+91 63044 71791', whatsapp: '+916304471791' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching contact info' });
  }
};
