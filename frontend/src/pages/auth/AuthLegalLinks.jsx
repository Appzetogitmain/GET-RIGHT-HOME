import React from 'react';
import { Link } from 'react-router-dom';

const linkCls = 'text-amber-600 font-bold hover:underline';

const AuthLegalLinks = () => (
    <p className="text-center text-[11px] text-gray-400 leading-relaxed mt-3">
        By continuing, you agree to our{' '}
        <Link to="/legal#terms" className={linkCls}>Terms &amp; Conditions</Link>
        {' '}and{' '}
        <Link to="/legal#privacy" className={linkCls}>Privacy Policy</Link>.
        <br />
        Need help?{' '}
        <Link to="/contact" className={linkCls}>Contact Support</Link>
    </p>
);

export default AuthLegalLinks;
