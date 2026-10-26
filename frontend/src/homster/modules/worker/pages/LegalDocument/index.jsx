import React, { useState, useEffect } from 'react';
import { FiShield, FiFileText } from 'react-icons/fi';
import Header from '../../components/layout/Header';
import workerService from '../../../../services/workerService';
import LogoLoader from '../../../../components/common/LogoLoader';

// Content is managed by admin (Workers → Privacy Policy). The static page in
// /public is only a fallback while the admin has not written any text yet.
const DOCS = {
  terms: {
    title: 'Terms & Conditions',
    field: 'termsAndConditions',
    placeholder: 'Terms and Conditions will appear here.',
    fallback: '/worker-terms.html',
    Icon: FiFileText,
  },
  privacy: {
    title: 'Privacy Policy',
    field: 'privacyPolicy',
    placeholder: 'Privacy Policy terms will appear here.',
    fallback: '/worker-privacy.html',
    Icon: FiShield,
  },
};

const LegalDocument = ({ type }) => {
  const doc = DOCS[type];
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    workerService
      .getPublicSettings()
      .then((res) => {
        const text = (res?.data?.[doc.field] || '').trim();
        if (mounted && res.success && text && text !== doc.placeholder) setContent(text);
      })
      .catch((error) => console.error(`Failed to fetch ${doc.title}:`, error))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [doc]);

  if (loading) return <LogoLoader />;

  if (!content) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <Header title={doc.title} />
        <iframe
          title={doc.title}
          src={doc.fallback}
          className="w-full border-0 bg-white"
          style={{ height: '100vh', paddingTop: '4.5rem' }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      <Header title={doc.title} />
      <div className="pt-24 px-4">
        <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 mx-auto shadow-inner">
            <doc.Icon className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-center text-[#1E3A8A] mb-8">{doc.title}</h3>
          <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap leading-relaxed">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalDocument;
