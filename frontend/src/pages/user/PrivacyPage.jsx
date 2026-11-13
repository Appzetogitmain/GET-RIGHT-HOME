import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { legalService } from '../../services/apiService';

const DEFAULT_PRIVACY = {
  user: {
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
  },
  partner: {
    title: 'Partner Privacy Policy',
    content: `This Partner Privacy Policy outlines how Get Right Home handles partner business information, property listings, KYC documentation, and financial settlements.`
  }
};

const PrivacyPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const audience = searchParams.get('audience') || 'user';
  const fallback = DEFAULT_PRIVACY[audience] || DEFAULT_PRIVACY.user;

  const [pageData, setPageData] = useState(fallback);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const res = await legalService.getPage(audience, 'privacy');
        if (isMounted && res.success && res.page?.content) {
          setPageData(res.page);
        }
      } catch (e) {
        if (isMounted) {
          setPageData(DEFAULT_PRIVACY[audience] || DEFAULT_PRIVACY.user);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [audience]);

  const renderContent = (content) => {
    const paragraphs = typeof content === 'string' ? content.split('\n').filter(Boolean) : [];
    return (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed font-medium">
        {paragraphs.length > 0 ? (
          paragraphs.map((p, idx) => <p key={idx}>{p}</p>)
        ) : (
          <p>{content}</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-surface text-white px-6 pt-5 pb-7 rounded-b-[32px] shadow-md">
        <div className="flex items-center gap-4 mb-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 bg-white/15 rounded-full hover:bg-white/25 active:scale-95 transition"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold tracking-wide">Legal</h1>
        </div>
        <h2 className="text-2xl font-black">{audience === 'partner' ? 'Partner Privacy' : 'Privacy Policy'}</h2>
      </div>

      {/* Content */}
      <div className="px-5 pt-4 pb-24 max-w-xl mx-auto">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 min-h-[400px]">
          <div className="flex items-center gap-3 mb-6 text-surface border-b border-gray-100 pb-3">
            <Shield size={24} />
            <span className="font-bold text-lg">
              {pageData?.title || (audience === 'partner' ? 'Partner Privacy' : 'Privacy Policy')}
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-surface border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            renderContent(pageData?.content || fallback.content)
          )}
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
