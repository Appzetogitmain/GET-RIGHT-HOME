import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InfoPage from './models/InfoPage.js';

dotenv.config();

const uri = process.env.MONGODB_URL;

if (!uri) {
  console.error('MONGODB_URL is not set');
  process.exit(1);
}

const docs = [
  {
    audience: 'user',
    slug: 'terms',
    title: 'Terms & Conditions',
    content: 'By using Rukko, you agree to follow our booking, cancellation and usage rules. Bookings depend on availability, and each property may have its own check-in, ID and house rules that must be respected.'
  },
  {
    audience: 'user',
    slug: 'privacy',
    title: 'Privacy Policy',
    content: 'We collect basic profile data and booking history to run the app, improve recommendations and communicate about your trips. Your data is stored securely and is not sold to third parties.'
  },
  {
    audience: 'user',
    slug: 'about',
    title: 'About Rukko',
    content: 'Rukko is a mobile-first platform to discover, compare and book stays across hotels, PGs, homestays and villas. Our goal is to make city stays simple and transparent for young travellers and working professionals.'
  },
  {
    audience: 'user',
    slug: 'contact',
    title: 'Contact Us',
    content: 'For support related to bookings, payments or account access, you can write to support@rukko.in or call our helpdesk during business hours.'
  },
  {
    audience: 'partner',
    slug: 'terms',
    title: 'Partner Agreement',
    content: 'By listing your property on Rukko, you agree to keep availability, pricing and guest details accurate, honour confirmed bookings and follow our payout and commission rules shared during onboarding.'
  },
  {
    audience: 'partner',
    slug: 'privacy',
    title: 'Partner Data Policy',
    content: 'We store your property, booking and payout information to run reports, process payments and help you manage performance. Access to this data is restricted to authorised systems and team members.'
  },
  {
    audience: 'partner',
    slug: 'about',
    title: 'About Rukko Partner',
    content: 'Rukko Partner is a dashboard for hotels, PGs and homestays to manage listings, track bookings and view payouts in a mobile-first way.'
  },
  {
    audience: 'partner',
    slug: 'contact',
    title: 'Contact Rukko Team',
    content: 'For questions about onboarding, payouts or property performance, you can reach our partner support team at partners@rukko.in.'
  }
];

const run = async () => {
  try {
    await mongoose.connect(uri);

    for (const doc of docs) {
      await InfoPage.findOneAndUpdate(
        { audience: doc.audience, slug: doc.slug },
        doc,
        { upsert: true, new: true }
      );
    }

    console.log('InfoPage seed completed');
    process.exit(0);
  } catch (error) {
    console.error('InfoPage seed failed', error);
    process.exit(1);
  }
};

run();

