import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Loader2, Shield, Eye, EyeOff, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '../../../assets/grh-logo.png';
import useManagerStore, { axiosInstance } from '../store/managerStore';
import toast from 'react-hot-toast';
import { requestNotificationPermission } from '../../../utils/firebase';

const ManagerLogin = () => {
    const navigate = useNavigate();
    const login = useManagerStore(state => state.login);
    const checkAuth = useManagerStore(state => state.checkAuth);
    const isAuthenticated = useManagerStore(state => state.isAuthenticated);

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/manager/dashboard');
        }
    }, [isAuthenticated, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.email.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        const result = await login(formData.email, formData.password);
        setLoading(false);

        if (result.success) {
            toast.success('Manager login successful!');

            // Update FCM Token for Manager
            try {
                const fcmToken = await requestNotificationPermission();
                if (fcmToken) {
                    await axiosInstance.put('/users/fcm-token', { fcmToken, platform: 'web' });
                }
            } catch (fcmError) {
                console.warn('Manager FCM update failed', fcmError);
            }

            navigate('/manager/dashboard');
        } else {
            setError(result.message);
            toast.error(result.message);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-zinc-950 to-teal-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated Grid Background */}
            <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:40px_40px]"></div>

            {/* Glowing Orbs */}
            <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative w-full max-w-md z-10"
            >
                {/* Logo & Header */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", delay: 0.2 }}
                        className="inline-block mb-4"
                    >
                        <div className="flex flex-col items-center leading-tight">
                            <span className="text-4xl font-black tracking-tighter text-white flex items-center gap-2">
                                GET RIGHT <span className="text-teal-400">HOME</span>
                            </span>
                            <div className="h-1 w-12 bg-teal-400 rounded-full mt-1.5"></div>
                        </div>
                    </motion.div>
                    <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Manager Portal</h1>
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mt-1">Granular access control for operations & sales staff</p>
                </div>

                {/* Main Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/[0.03] backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/10"
                >
                    <h2 className="text-lg font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
                        <UserCheck className="text-teal-400" size={20} /> Sign In
                    </h2>

                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="yourname@getrighthome.in"
                                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 text-white placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-teal-500/50 focus:border-transparent outline-none transition-all text-xs"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 text-white placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-teal-500/50 focus:border-transparent outline-none transition-all text-xs"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl text-xs font-semibold"
                            >
                                {error}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-teal-500 text-black py-3 rounded-xl font-bold hover:bg-teal-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-6 uppercase text-[11px] tracking-wider shadow-lg shadow-teal-500/20"
                        >
                            {loading ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <>
                                    Verify & Log In
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>
                </motion.div>

                {/* Security Notice */}
                <div className="mt-8 text-center">
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest flex items-center justify-center gap-2">
                        <Shield size={12} className="text-teal-500" />
                        Access Scoped by Admin Permissions
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default ManagerLogin;
