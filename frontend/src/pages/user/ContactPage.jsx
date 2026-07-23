import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MessageSquare, Send } from 'lucide-react';
import { legalService } from '../../services/apiService';

const ContactPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Support details state
  const [supportEmail, setSupportEmail] = useState('getrighthome7@gmail.com');
  const [supportPhone, setSupportPhone] = useState('+91-6304471791');

  React.useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const res = await legalService.getAdminContact();
        if (res && res.success) {
          setSupportEmail(res.email || 'getrighthome7@gmail.com');
          // Format phone
          const digits = res.phone.replace(/\D/g, '');
          if (digits.length === 12 && digits.startsWith('91')) {
            setSupportPhone(`+91-${digits.slice(2, 7)}${digits.slice(7)}`);
          } else if (digits.length === 10) {
            setSupportPhone(`+91-${digits.slice(0, 5)}${digits.slice(5)}`);
          } else {
            setSupportPhone(res.phone);
          }
        }
      } catch (err) {
        console.error('Failed to fetch contact details:', err);
      }
    };
    fetchContactInfo();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setSuccess('');

    let errors = {};

    if (!name.trim()) errors.name = 'Full name is required';
    if (!subject.trim()) errors.subject = 'Subject is required';
    if (!message.trim()) errors.message = 'Message is required';

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!phone) {
      errors.phone = 'Mobile number is required';
    } else if (!/^[6-9]\d{9}$/.test(phone)) {
      errors.phone = 'Mobile must be 10 digits starting with 6-9';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      await legalService.submitContact('user', {
        name,
        email,
        phone,
        subject,
        message
      });
      setSuccess('Your message has been sent. Our team will reach out soon.');
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
    } catch (e) {
      setFieldErrors({ submit: e?.message || 'Failed to send message. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-surface text-white p-6 pb-10 rounded-b-[30px] shadow-lg sticky top-0 z-20">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">Contact Us</h1>
        </div>
        <p className="text-xs text-white/70 max-w-xs">
          Have questions or need help with a booking? Share your query with us.
        </p>
      </div>

      <div className="px-5 -mt-6 relative z-10 pb-28 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <a href={`mailto:${supportEmail}`} className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 overflow-hidden hover:bg-gray-50 transition cursor-pointer">
            <div className="w-9 h-9 shrink-0 rounded-full bg-surface/5 flex items-center justify-center text-surface">
              <Mail size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">Email</p>
              <p className="text-xs text-gray-500 truncate" title={supportEmail}>{supportEmail}</p>
            </div>
          </a>
          <a href={`tel:${supportPhone.replace(/\D/g, '')}`} className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 overflow-hidden hover:bg-gray-50 transition cursor-pointer">
            <div className="w-9 h-9 shrink-0 rounded-full bg-surface/5 flex items-center justify-center text-surface">
              <Phone size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">Phone</p>
              <p className="text-xs text-gray-500 truncate" title={supportPhone}>{supportPhone}</p>
            </div>
          </a>
        </div>

        {fieldErrors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-2">
            {fieldErrors.submit}
          </div>
        )}
        {success && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl px-4 py-2">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Full Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-surface/60 ${fieldErrors.name ? 'border-red-500' : 'border-gray-200'}`}
              placeholder="Enter your name"
            />
            {fieldErrors.name && <p className="text-red-500 text-[10px] mt-1 font-bold">{fieldErrors.name}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-surface/60 ${fieldErrors.email ? 'border-red-500' : 'border-gray-200'}`}
                placeholder="you@example.com"
              />
              {fieldErrors.email && <p className="text-red-500 text-[10px] mt-1 font-bold">{fieldErrors.email}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Phone *</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 border border-r-0 border-gray-200 rounded-l-xl bg-gray-50 text-gray-500 text-sm font-bold">
                    +91
                </span>
                <input
                  type="tel"
                  maxLength="10"
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPhone(val);
                  }}
                  className={`w-full px-3 py-2.5 border rounded-r-xl text-sm outline-none focus:ring-2 focus:ring-surface/60 ${fieldErrors.phone ? 'border-red-500' : 'border-gray-200'}`}
                  placeholder="Enter 10-digit number"
                />
              </div>
              {fieldErrors.phone && <p className="text-red-500 text-[10px] mt-1 font-bold">{fieldErrors.phone}</p>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Subject *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-surface/60 ${fieldErrors.subject ? 'border-red-500' : 'border-gray-200'}`}
              placeholder="What do you need help with?"
            />
            {fieldErrors.subject && <p className="text-red-500 text-[10px] mt-1 font-bold">{fieldErrors.subject}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Message *</label>
            <div className="relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-surface/60 resize-none ${fieldErrors.message ? 'border-red-500' : 'border-gray-200'}`}
                placeholder="Share details so we can assist you faster."
              />
              <MessageSquare size={16} className={`absolute right-3 bottom-3 ${fieldErrors.message ? 'text-red-300' : 'text-gray-300'}`} />
            </div>
            {fieldErrors.message && <p className="text-red-500 text-[10px] mt-1 font-bold">{fieldErrors.message}</p>}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 mt-2 bg-surface text-white py-3 rounded-xl text-sm font-bold active:scale-95 disabled:opacity-60 disabled:active:scale-100 transition-transform"
          >
            <Send size={16} />
            {submitting ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ContactPage;

