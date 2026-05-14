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
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !subject || !message) {
      setError('Please fill all required fields.');
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
      setError(e?.message || 'Failed to send message. Please try again.');
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
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-surface/5 flex items-center justify-center text-surface">
              <Mail size={18} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">Email</p>
              <p className="text-xs text-gray-500">support@hoomzo.in</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-surface/5 flex items-center justify-center text-surface">
              <Phone size={18} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">Phone</p>
              <p className="text-xs text-gray-500">+91-6232314147</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-2">
            {error}
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
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-surface/60"
              placeholder="Enter your name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-surface/60"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-surface/60"
                placeholder="+91"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Subject *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-surface/60"
              placeholder="What do you need help with?"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Message *</label>
            <div className="relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-surface/60 resize-none"
                placeholder="Share details so we can assist you faster."
              />
              <MessageSquare size={16} className="absolute right-3 bottom-3 text-gray-300" />
            </div>
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

