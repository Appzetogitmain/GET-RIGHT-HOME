import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { legalService } from '../../services/apiService';

const DEFAULT_TERMS = {
  user: {
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
  partner: {
    title: 'Partner Terms & Conditions',
    content: `These Partner Terms govern the agreement between Get Right Home and registered property owners, brokers, builders, and commercial partners listing inventory or offering services on Get Right Home. Partners agree to list accurate property information and comply with RERA and applicable local laws.`
  }
};

const TermsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const audience = searchParams.get('audience') || 'user';
  const fallback = DEFAULT_TERMS[audience] || DEFAULT_TERMS.user;

  const [pageData, setPageData] = useState(fallback);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const res = await legalService.getPage(audience, 'terms');
        if (isMounted && res.success && res.page?.content) {
          setPageData(res.page);
        }
      } catch (e) {
        if (isMounted) {
          setPageData(DEFAULT_TERMS[audience] || DEFAULT_TERMS.user);
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
        <h2 className="text-2xl font-black">{audience === 'partner' ? 'Partner Agreement' : 'Terms & Conditions'}</h2>
      </div>

      {/* Content */}
      <div className="px-5 pt-4 pb-24 max-w-xl mx-auto">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 min-h-[400px]">
          <div className="flex items-center gap-3 mb-6 text-surface border-b border-gray-100 pb-3">
            <FileText size={24} />
            <span className="font-bold text-lg">
              {pageData?.title || (audience === 'partner' ? 'Partner Agreement' : 'Terms & Conditions')}
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

export default TermsPage;
