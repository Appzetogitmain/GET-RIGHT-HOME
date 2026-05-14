import React from 'react';
import { User, Globe } from 'lucide-react';
import logo from '../../assets/rokologin-removebg-preview.png';
import { Link } from 'react-router-dom';

const TopNavbar = () => {
    // Get user from local storage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userName = user.name || 'User';

    return (
        <nav className="hidden md:flex w-full h-24 bg-white/95 backdrop-blur-md border-b border-gray-100 px-8 justify-between items-center fixed top-0 z-50">

            {/* Logo */}
            <Link to="/">
                <div className="flex flex-col items-start leading-tight group">
                    <span className="text-2xl font-black tracking-tighter text-gray-900">
                        HOOM<span className="text-emerald-600">ZO</span>
                    </span>
                    <div className="h-0.5 w-6 bg-emerald-500 rounded-full group-hover:w-full transition-all duration-300"></div>
                </div>
            </Link>

            {/* Desktop Links */}
            <div className="flex items-center gap-8">
                <Link to="/" className="text-gray-500 font-bold text-sm hover:text-emerald-600 transition tracking-tight">
                    Home
                </Link>
                <Link to="/search" className="text-gray-500 font-bold text-sm hover:text-emerald-600 transition tracking-tight">
                    Search
                </Link>
                <Link to="/reels" className="text-gray-500 font-bold text-sm hover:text-emerald-600 transition tracking-tight">
                    Reels
                </Link>
                <Link to="/bookings" className="text-gray-500 font-bold text-sm hover:text-emerald-600 transition tracking-tight">
                    Bookings
                </Link>

                <Link to="/refer" className="text-gray-500 font-bold text-sm hover:text-emerald-600 transition tracking-tight">
                    Refer & Earn
                </Link>
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-4">
                <Link
                    to="/saved-places"
                    className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 transition border border-transparent hover:border-emerald-100"
                >
                    <Globe size={18} className="text-gray-500 hover:text-emerald-600" />
                </Link>

                <Link
                    to="/settings"
                    className="pl-3 pr-4 py-1.5 bg-white border border-gray-100 rounded-full flex items-center gap-3 hover:border-emerald-200 hover:bg-emerald-50/30 transition group shadow-sm"
                >
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-emerald-200">
                        {userName.charAt(0)}
                    </div>
                    <span className="text-sm font-bold text-emerald-950 group-hover:text-emerald-700">
                        {userName.split(' ')[0]}
                    </span>
                </Link>
            </div>

        </nav>
    );
};

export default TopNavbar;
