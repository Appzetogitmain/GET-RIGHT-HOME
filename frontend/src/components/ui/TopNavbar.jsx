import React from 'react';
import { User, Globe, Bell } from 'lucide-react';
import logo from '../../assets/grh-logo.png';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const TopNavbar = () => {
    // Get user from useAuth hook
    const { user } = useAuth();
    const userName = user?.name || 'User';

    return (
        <nav className="hidden lg:flex w-full h-20 bg-white/95 backdrop-blur-md border-b border-gray-100 px-6 justify-between items-center fixed top-0 z-50">

            {/* Left side: Logo */}
            <Link to="/" className="shrink-0">
                <div className="flex items-center gap-0 group">
                    <img src={logo} alt="GRH Logo" className="h-12 w-auto object-contain" />
                    <div className="flex flex-col leading-none">
                        <span className="text-xl font-black tracking-tighter text-gray-900 uppercase">
                            Get-Right<span className="text-orange-600">-Home</span>
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Real Estate Hub</span>
                    </div>
                </div>
            </Link>

            {/* Center: Desktop Links */}
            <div className="flex items-center gap-8 px-4 shrink-0">
                <Link to="/" className="text-gray-500 font-bold text-sm hover:text-emerald-600 transition tracking-tight">
                    Home
                </Link>
                <Link to="/search" className="text-gray-500 font-bold text-sm hover:text-emerald-600 transition tracking-tight">
                    Search
                </Link>
                <Link to="/reels" className="text-gray-500 font-bold text-sm hover:text-emerald-600 transition tracking-tight">
                    Reels
                </Link>
                <Link to="/my-enquiries" className="text-gray-500 font-bold text-sm hover:text-emerald-600 transition tracking-tight">
                    Enquiry
                </Link>
            </div>

            {/* Right side: Post property, Bell, User Actions */}
            <div className="flex items-center gap-3 shrink-0">
                <Link
                    to="/list-property"
                    className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
                >
                    <span className="text-[#005B9F] font-bold text-[14px]">Post property</span>
                    <span className="bg-[#10B981] text-white text-[10px] px-2 py-0.5 rounded uppercase font-black tracking-widest shadow-sm">Free</span>
                </Link>
                <Link to="/notifications" className="relative p-2 text-gray-500 hover:bg-gray-50 rounded-full transition-all active:scale-95">
                    <Bell size={20} strokeWidth={2} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </Link>

                {/* Divider */}
                <div className="h-6 w-px bg-gray-200"></div>

                {/* User Actions */}
                <div className="flex items-center gap-2">
                {user ? (
                    <>

                        <Link
                            to="/profile"
                            className="pl-3 pr-4 py-1.5 bg-white border border-gray-100 rounded-full flex items-center gap-3 hover:border-emerald-200 hover:bg-emerald-50/30 transition group shadow-sm"
                        >
                            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-emerald-200">
                                {userName.charAt(0)}
                            </div>
                            <span className="text-sm font-bold text-emerald-950 group-hover:text-emerald-700">
                                {userName.split(' ')[0]}
                            </span>
                        </Link>
                    </>
                ) : (
                    <Link
                        to="/login"
                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-full transition shadow-sm active:scale-95"
                    >
                        Login / Signup
                    </Link>
                )}
                </div>
            </div>

        </nav>
    );
};

export default TopNavbar;
