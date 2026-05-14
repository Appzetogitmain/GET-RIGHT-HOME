import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Users, MapPin, CreditCard,
  ShieldCheck, Lock, ChevronRight, Building, CheckCircle, Tag, Wallet
} from 'lucide-react';
import toast from 'react-hot-toast';
import { bookingService, paymentService } from '../../services/apiService';
import walletService from '../../services/walletService';

const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const BookingCheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Data passed from PropertyDetailsPage
  const {
    property,
    selectedRoom,
    dates,
    guests,
    priceBreakdown,
    taxRate
  } = location.state || {};

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('pay_at_hotel');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);

  useEffect(() => {
    if (!property || !dates) {
      toast.error("Invalid booking details");
      navigate('/');
      return;
    }
    fetchWalletBalance();
  }, [property, dates, navigate]);

  const fetchWalletBalance = async () => {
    try {
      const data = await walletService.getWallet({ viewAs: 'user' });
      if (data.success && data.wallet) {
        setWalletBalance(data.wallet.balance);
      }
    } catch (error) {
      console.error("Failed to fetch wallet:", error);
    }
  };

  if (!property || !dates) return null;

  const totalAmount = priceBreakdown?.grandTotal || 0;

  // Calculate payments
  let walletDeduction = 0;
  let remainingPayable = totalAmount;

  if (useWallet && paymentMethod === 'online') {
    walletDeduction = Math.min(walletBalance, totalAmount);
    remainingPayable = totalAmount - walletDeduction;
  }

  const handleConfirmBooking = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error("Please login to continue");
      navigate('/login', { state: { from: location } });
      return;
    }

    setLoading(true);

    const payload = {
      propertyId: property._id,
      roomTypeId: selectedRoom._id,
      checkInDate: dates.checkIn,
      checkOutDate: dates.checkOut,
      guests: {
        adults: guests.adults,
        children: guests.children,
        rooms: guests.rooms || 1,
        extraAdults: priceBreakdown?.extraAdultsCount || 0,
        extraChildren: priceBreakdown?.extraChildrenCount || 0
      },
      bookingUnit: selectedRoom.inventoryType || (['Hostel', 'PG'].includes(property.propertyType) ? 'bed' : 'room'),
      couponCode: priceBreakdown?.couponCode || null,
      paymentMethod: paymentMethod === 'online' ? 'razorpay' : 'pay_at_hotel',
      paymentStatus: 'pending',
      totalAmount: totalAmount,
      // Wallet Info
      useWallet: useWallet && paymentMethod === 'online', // Only clear if online
      walletDeduction: (useWallet && paymentMethod === 'online') ? walletDeduction : 0
    };

    try {
      if (paymentMethod === 'pay_at_hotel') {
        // --- PAY AT HOTEL FLOW ---
        const response = await bookingService.create(payload);
        if (response.success && response.booking) {
          toast.success("Booking Confirmed!");
          navigate(`/booking/${response.booking._id || response.booking.bookingId}`, { state: { booking: response.booking, animate: true } });
        } else {
          throw new Error(response.message || "Booking failed");
        }

      } else if (paymentMethod === 'online') {
        // --- ONLINE FLOW (Wallet + Razorpay) ---

        // Case A: Full Wallet Payment (remainingPayable <= 0)
        if (remainingPayable <= 0) {
          const response = await bookingService.create(payload);
          // If full wallet payment, backend should create booking directly and mark paid
          if (response.success && response.booking) {
            toast.success("Paid via Wallet! Booking Confirmed.");
            navigate(`/booking/${response.booking._id}`, { state: { booking: response.booking, animate: true } });
            return;
          } else {
            throw new Error(response.message || "Wallet payment failed");
          }
        }

        // Case B: Razorpay (with or without Wallet)
        const isLoaded = await loadRazorpay();
        if (!isLoaded) throw new Error("Razorpay SDK failed to load.");

        // Create Order (Backend will deduct wallet amount from order amount)
        const bookingRes = await bookingService.create(payload);

        if (!bookingRes.success) throw new Error(bookingRes.message || "Failed to initialize booking");

        if (bookingRes.paymentRequired && bookingRes.order) {
          const { order, key } = bookingRes;

          const options = {
            key: key,
            amount: order.amount, // Net amount after wallet deduction
            currency: order.currency,
            name: "HoomZo",
            description: `Booking Payment`,
            order_id: order.id,
            handler: async function (response) {
              try {
                const verifyPayload = {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  bookingId: bookingRes.booking._id // Booking created in previous step
                };
                const verifyRes = await paymentService.verifyPayment(verifyPayload);
                if (verifyRes.success) {
                  toast.success("Payment Successful!");
                  navigate(`/booking/${verifyRes.booking._id}`, { state: { booking: verifyRes.booking, animate: true } });
                } else {
                  toast.error("Payment Verification Failed");
                }
              } catch (err) {
                console.error("Payment Verification Error:", err);
                toast.error("Payment verification failed.");
              }
            },
            prefill: {
              name: user?.name || '',
              email: user?.email || '',
              contact: user?.phone || ''
            },
            theme: { color: "#000000" },
            // Enhanced Configuration for UPI Intent & App Redirects
            config: {
              display: {
                blocks: {
                  head: {
                    name: "Pay via UPI / Apps",
                    instruments: [
                      { method: "upi" }, // Prioritize UPI Intent (GPay, PhonePe, etc.)
                      { method: "wallet", wallets: ["paytm", "phonepe"] }
                    ]
                  },
                  cards: {
                    name: "Cards & Netbanking",
                    instruments: [
                      { method: "card" },
                      { method: "netbanking" }
                    ]
                  }
                },
                sequence: ["block.head", "block.cards"],
                preferences: {
                  show_default_blocks: true
                }
              }
            },
            retry: {
              enabled: true
            }
          };

          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', function (response) {
            toast.error(response.error.description || "Payment Failed");
          });
          rzp.open();
        }
      }
    } catch (error) {
      console.error("Booking Error:", error);
      toast.error(error.message || "Booking failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-10">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Review & Pay</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* 1. Property Summary */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-4">
          <div className="w-24 h-24 bg-gray-200 rounded-xl overflow-hidden shrink-0">
            <img
              src={property.images?.cover || property.coverImage || "https://via.placeholder.com/150"}
              alt={property.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{property.propertyType}</span>
            <h2 className="font-bold text-gray-900 leading-tight mb-1">{property.name}</h2>
            <p className="text-xs text-gray-500 mb-2">{property.address?.city || property.address}, {property.address?.state}</p>
            <div className="flex items-center gap-1">
              <span className="bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                {property.avgRating || 'New'} ★
              </span>
            </div>
          </div>
        </div>

        {/* 2. Trip Details */}
        {(() => {
          const isPgOrHostel = property?.propertyType?.toLowerCase() === 'pg' || property?.propertyType?.toLowerCase() === 'hostel';
          return (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 text-sm">Your Trip</h3>
              <div className="grid grid-cols-2 gap-y-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">Dates</p>
                  <p className="text-sm font-bold text-gray-800">
                    {isPgOrHostel ? '1 Month' : `${priceBreakdown?.nights} Nights`}
                  </p>
                  <p className="text-xs text-gray-600">{dates.checkIn} - {dates.checkOut}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">Guests</p>
                  {isPgOrHostel ? (
                    <p className="text-sm font-bold text-gray-800">{guests.rooms} Bed(s)</p>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-gray-800">{guests.adults} Adults, {guests.children} Children</p>
                      <p className="text-xs text-gray-600">{guests.rooms} Room(s)</p>
                    </>
                  )}
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 font-medium mb-1">{isPgOrHostel ? 'Bed Type' : 'Room Type'}</p>
                  <p className="text-sm font-bold text-gray-800">{selectedRoom.type || selectedRoom.name}</p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 3. Price Breakdown */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4 text-sm">Price Details</h3>
          <div className="space-y-3">
            {(() => {
              const isPgOrHostel = property?.propertyType?.toLowerCase() === 'pg' || property?.propertyType?.toLowerCase() === 'hostel';
              return (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Base Price ({isPgOrHostel ? '1 Month' : `${priceBreakdown?.nights} nights`})</span>
                  <span>₹{priceBreakdown?.totalBasePrice?.toLocaleString()}</span>
                </div>
              );
            })()}
            {(priceBreakdown?.totalExtraAdultCharge > 0) && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Extra Adults Charges</span>
                <span>₹{priceBreakdown.totalExtraAdultCharge.toLocaleString()}</span>
              </div>
            )}
            {(priceBreakdown?.totalExtraChildCharge > 0) && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Extra Children Charges</span>
                <span>₹{priceBreakdown.totalExtraChildCharge.toLocaleString()}</span>
              </div>
            )}
            {(priceBreakdown?.discountAmount > 0) && (
              <div className="flex justify-between text-sm text-green-700 font-medium">
                <span className="flex items-center gap-1"><Tag size={12} /> Coupon Discount</span>
                <span>- ₹{priceBreakdown.discountAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-600">
              <span>Taxes & Fees ({taxRate || 0}%)</span>
              <span>₹{priceBreakdown?.taxAmount?.toLocaleString()}</span>
            </div>
            {(useWallet && paymentMethod === 'online' && walletDeduction > 0) && (
              <div className="flex justify-between text-sm text-blue-700 font-medium">
                <span className="flex items-center gap-1"><Wallet size={12} /> Wallet Balance Used</span>
                <span>- ₹{walletDeduction.toLocaleString()}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
              <span className="font-bold text-gray-900">Total Payable</span>
              <span className="text-xl font-black text-gray-900">
                ₹{(paymentMethod === 'online' && useWallet ? remainingPayable : totalAmount).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Wallet Section */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <Wallet size={18} className="text-blue-600" />
              Use Wallet Balance
            </h3>
            <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded-md">
              Available: ₹{walletBalance.toLocaleString()}
            </span>
          </div>

          <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${useWallet && paymentMethod === 'online' ? 'border-blue-600 bg-blue-50/20' : 'border-gray-100'}`}>
            <div className="relative flex items-center">
              <input
                type="checkbox"
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300 pointer-events-none"
                checked={useWallet}
                disabled={walletBalance <= 0 || paymentMethod !== 'online'}
                onChange={() => { }} // Handled by parent div if needed, but safer on input change
              />
              {/* Overlay check for styling if needed, but standard checkbox is fine for now. 
                     We need to handle the click. The label wraps it so clicking anywhere works.
                     Wait, I need to modify 'useWallet' state.
                 */}
              <div
                className="absolute inset-0 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  if (paymentMethod !== 'online') {
                    toast.error("Wallet can only be used with Online Payment for now");
                    return;
                  }
                  if (walletBalance > 0) setUseWallet(!useWallet);
                }}
              ></div>
            </div>
            <div className="flex-1 opacity-100">
              <p className="text-sm font-semibold text-gray-800">Pay using Wallet</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {paymentMethod !== 'online'
                  ? "Select 'Pay Now' to use wallet balance."
                  : walletBalance > 0
                    ? `Use ₹${Math.min(walletBalance, totalAmount).toLocaleString()} from your wallet.`
                    : "Insufficient balance."}
              </p>
            </div>
          </label>
        </div>

        {/* 4. Payment Options */}
        {(() => {
          const isPgOrHostel = property?.propertyType?.toLowerCase() === 'pg' || property?.propertyType?.toLowerCase() === 'hostel';
          return (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 text-sm">Payment Method</h3>
              <div className="space-y-3">
                {/* Option 1: Pay at Move-In / Pay at Hotel */}
                <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'pay_at_hotel' ? 'border-surface bg-surface/5' : 'border-gray-100 hover:border-gray-200'}`}>
                  <input
                    type="radio"
                    name="payment"
                    className="mt-1 accent-surface"
                    checked={paymentMethod === 'pay_at_hotel'}
                    onChange={() => {
                      setPaymentMethod('pay_at_hotel');
                      setUseWallet(false);
                    }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-bold text-sm ${paymentMethod === 'pay_at_hotel' ? 'text-surface' : 'text-gray-900'}`}>
                        {isPgOrHostel ? 'Pay at Move-In' : 'Pay at Hotel'}
                      </span>
                      <Building size={16} className={`${paymentMethod === 'pay_at_hotel' ? 'text-surface' : 'text-gray-500'}`} />
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {isPgOrHostel
                        ? "Pay your first month's rent when you move in. Room will be reserved for you."
                        : 'Pay the full amount when you check-in at the property. No upfront payment required.'}
                    </p>
                  </div>
                </label>

                {/* Option 2: Pay Now */}
                <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'online' ? 'border-surface bg-surface/5' : 'border-gray-100 hover:border-gray-200'}`}>
                  <input
                    type="radio"
                    name="payment"
                    className="mt-1 accent-surface"
                    checked={paymentMethod === 'online'}
                    onChange={() => setPaymentMethod('online')}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-bold text-sm ${paymentMethod === 'online' ? 'text-surface' : 'text-gray-900'}`}>Pay Now</span>
                      <div className="flex gap-2">
                        <CreditCard size={16} className={`${paymentMethod === 'online' ? 'text-surface' : 'text-gray-500'}`} />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed mb-2">
                      {isPgOrHostel
                        ? 'Pay first month\'s rent online & get instant room reservation confirmation.'
                        : 'Secure online payment via UPI, Card, or Netbanking.'}
                    </p>
                    {/* Badges */}
                    <div className="flex gap-2">
                      <span className="bg-green-100 text-green-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                        {isPgOrHostel ? 'Instant Confirm' : 'Fast Checkout'}
                      </span>
                      <span className="bg-blue-100 text-blue-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded">Secure</span>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          );
        })()}

        {/* Confirm Button */}
        <div className="pt-2">
          <button
            onClick={handleConfirmBooking}
            disabled={loading}
            className="w-full bg-surface text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-surface/20 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-pulse">Processing...</span>
            ) : (() => {
              const isPgOrHostel = property?.propertyType?.toLowerCase() === 'pg' || property?.propertyType?.toLowerCase() === 'hostel';
              const label = paymentMethod === 'online'
                ? (isPgOrHostel ? 'Pay & Reserve' : 'Pay & Book')
                : (isPgOrHostel ? 'Confirm Reservation' : 'Confirm Booking');
              return <><span>{label}</span><ChevronRight size={20} /></>;
            })()}
          </button>
          <p className="text-center text-[10px] text-gray-400 mt-3 flex items-center justify-center gap-1">
            <Lock size={10} />
            Your data is secure. By booking, you agree to our Terms.
          </p>
        </div>

      </div>
    </div>
  );
};

export default BookingCheckoutPage;
