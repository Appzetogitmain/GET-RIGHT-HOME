import React from 'react';
import { motion } from 'framer-motion';
import { 
    PaintBucket, 
    Sparkles, 
    Wrench, 
    Zap, 
    Truck, 
    Bug, 
    ShieldCheck, 
    ChevronRight,
    Hammer,
    AirVent
} from 'lucide-react';

const SERVICES = [
    {
        id: 'cleaning',
        title: 'Full Home Cleaning',
        icon: Sparkles,
        color: 'bg-emerald-50 text-emerald-600',
        borderColor: 'hover:border-emerald-200',
        shadowColor: 'hover:shadow-emerald-50',
        description: 'Professional deep cleaning for every corner'
    },
    {
        id: 'painting',
        title: 'Home Painting',
        icon: PaintBucket,
        color: 'bg-blue-50 text-blue-600',
        borderColor: 'hover:border-blue-200',
        shadowColor: 'hover:shadow-blue-50',
        description: 'Express painting with expert color consultation'
    },
    {
        id: 'plumbing',
        title: 'Plumbing Services',
        icon: Wrench,
        color: 'bg-amber-50 text-amber-600',
        borderColor: 'hover:border-amber-200',
        shadowColor: 'hover:shadow-amber-50',
        description: 'Certified plumbers for all your repair needs'
    },
    {
        id: 'electrical',
        title: 'Electricians',
        icon: Zap,
        color: 'bg-purple-50 text-purple-600',
        borderColor: 'hover:border-purple-200',
        shadowColor: 'hover:shadow-purple-50',
        description: 'Safe and reliable electrical work'
    },
    {
        id: 'packers',
        title: 'Packers & Movers',
        icon: Truck,
        color: 'bg-rose-50 text-rose-600',
        borderColor: 'hover:border-rose-200',
        shadowColor: 'hover:shadow-rose-50',
        description: 'Safe moving solutions for your belongings'
    },
    {
        id: 'pest',
        title: 'Pest Control',
        icon: Bug,
        color: 'bg-orange-50 text-orange-600',
        borderColor: 'hover:border-orange-200',
        shadowColor: 'hover:shadow-orange-50',
        description: 'Eco-friendly pest management solutions'
    },
    {
        id: 'ac',
        title: 'AC Repair',
        icon: AirVent,
        color: 'bg-cyan-50 text-cyan-600',
        borderColor: 'hover:border-cyan-200',
        shadowColor: 'hover:shadow-cyan-50',
        description: 'Quick AC servicing and installation'
    },
    {
        id: 'carpentry',
        title: 'Carpentry',
        icon: Hammer,
        color: 'bg-stone-50 text-stone-600',
        borderColor: 'hover:border-stone-200',
        shadowColor: 'hover:shadow-stone-50',
        description: 'Custom furniture and wooden repairs'
    }
];

const HomeServices = () => {
    return (
        <section className="py-12 px-5 md:px-0">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-widest rounded-full">
                                Lifestyle
                            </span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Home Services</h2>
                        <p className="text-gray-500 mt-2 text-sm md:text-base">Hassle-free services by certified professionals</p>
                    </div>
                    <button className="hidden md:flex items-center gap-1 text-emerald-600 font-bold hover:underline transition-all group text-sm">
                        Explore All Services
                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {SERVICES.map((service, index) => {
                        const Icon = service.icon;
                        return (
                            <motion.div
                                key={service.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.05 }}
                                whileHover={{ y: -5 }}
                                className={`group relative p-5 bg-white border border-gray-100 rounded-[2rem] shadow-sm transition-all duration-300 ${service.borderColor} ${service.shadowColor} cursor-pointer overflow-hidden`}
                            >
                                {/* Decorative background element */}
                                <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-[0.03] group-hover:opacity-[0.08] transition-opacity ${service.color}`} />
                                
                                <div className={`w-12 h-12 rounded-2xl ${service.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                    <Icon size={24} />
                                </div>
                                
                                <h3 className="font-bold text-gray-900 group-hover:text-gray-800 transition-colors mb-1">
                                    {service.title}
                                </h3>
                                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                                    {service.description}
                                </p>

                                <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-gray-400 group-hover:text-emerald-600 uppercase tracking-wider transition-colors">
                                    Book Now
                                    <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Trust Banner */}
                <div className="mt-10 bg-gray-900 rounded-[2.5rem] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
                    </div>

                    <div className="flex items-center gap-5 relative z-10">
                        <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                            <ShieldCheck size={32} />
                        </div>
                        <div>
                            <h4 className="text-white font-bold text-lg">GRH Service Guarantee</h4>
                            <p className="text-gray-400 text-sm">Verified Professionals • Fixed Prices • 30 Day Warranty</p>
                        </div>
                    </div>

                    <button className="w-full md:w-auto bg-white text-gray-900 px-8 py-4 rounded-2xl font-bold hover:bg-emerald-50 transition-all active:scale-95 relative z-10 whitespace-nowrap shadow-xl shadow-black/20">
                        Get Free Quote
                    </button>
                </div>
            </div>
        </section>
    );
};

export default HomeServices;
