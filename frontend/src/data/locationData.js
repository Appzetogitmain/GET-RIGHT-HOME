/**
 * Location Data — India › Karnataka › Bengaluru
 * Structure: Country → State → District → City/Area/Taluk
 *
 * For now scoped to Karnataka (Bengaluru focus).
 * Expand this file as more cities are added.
 */

export const COUNTRY = 'India';

// Full Karnataka districts list
export const karnatakaDistricts = [
  'Bagalkot',
  'Ballari',
  'Belagavi',
  'Bengaluru Rural',
  'Bengaluru Urban',
  'Bidar',
  'Chamarajanagar',
  'Chikballapur',
  'Chikkamagaluru',
  'Chitradurga',
  'Dakshina Kannada',
  'Davanagere',
  'Dharwad',
  'Gadag',
  'Hassan',
  'Haveri',
  'Kalaburagi',
  'Kodagu',
  'Kolar',
  'Koppal',
  'Mandya',
  'Mysuru',
  'Raichur',
  'Ramanagara',
  'Shivamogga',
  'Tumakuru',
  'Udupi',
  'Uttara Kannada',
  'Vijayapura',
  'Yadgir',
  'Vijayanagara'
];

// Full location hierarchy
export const locationData = {
  India: {
    Karnataka: {
      'Bengaluru Urban': [
        'Bengaluru North',
        'Bengaluru South',
        'Bengaluru East',
        'Anekal',
        'Yelahanka'
      ],
      'Bengaluru Rural': [
        'Devanahalli',
        'Doddaballapura',
        'Hosakote',
        'Nelamangala'
      ]
    }
  }
};

// All Bengaluru areas flattened (for quick searches / tags)
export const bengaluruAreas = [
  'Karnataka',
  'Bengaluru Urban',
  'Bengaluru Rural',
  'Bengaluru North',
  'Bengaluru South',
  'Bengaluru East',
  'Anekal',
  'Yelahanka',
  'Devanahalli',
  'Doddaballapura',
  'Hosakote',
  'Nelamangala'
];

/**
 * Helper: get districts for a given country+state
 * @param {string} country
 * @param {string} state
 * @returns {string[]}
 */
export const getDistricts = (country, state) => {
  const stateData = locationData[country]?.[state];
  return stateData ? Object.keys(stateData) : [];
};

/**
 * Helper: get cities/areas for a given district
 * @param {string} country
 * @param {string} state
 * @param {string} district
 * @returns {string[]}
 */
export const getCities = (country, state, district) => {
  return locationData[country]?.[state]?.[district] || [];
};

/** Supported countries */
export const COUNTRIES = ['India'];

/** Supported states per country */
export const STATES = {
  India: ['Karnataka', 'Telangana', 'Maharashtra', 'Delhi', 'Tamil Nadu', 'West Bengal', 'Gujarat', 'Andhra Pradesh', 'Rajasthan', 'Kerala', 'Madhya Pradesh', 'Punjab', 'Goa']
};

/** Popular Operating Cities in India for GetRightHome */
export const POPULAR_OPERATING_CITIES = [
  { city: 'Noida', state: 'Uttar Pradesh', isPopular: true, tier: 1 },
  { city: 'Delhi', state: 'Delhi', isPopular: true, tier: 1 },
  { city: 'Indore', state: 'Madhya Pradesh', isPopular: true, tier: 1 },
  { city: 'Mumbai', state: 'Maharashtra', isPopular: true, tier: 1 },
  { city: 'Hyderabad', state: 'Telangana', isPopular: true, tier: 1 },
  { city: 'Bengaluru', state: 'Karnataka', isPopular: true, tier: 1 },
  { city: 'Pune', state: 'Maharashtra', isPopular: true, tier: 1 },
  { city: 'Gurgaon', state: 'Haryana', isPopular: true, tier: 1 },
  { city: 'Delhi NCR', state: 'Delhi NCR', isPopular: true, tier: 1 },
  { city: 'Ahmedabad', state: 'Gujarat', isPopular: true, tier: 1 },
  { city: 'Kolkata', state: 'West Bengal', isPopular: true, tier: 1 },
  { city: 'Chennai', state: 'Tamil Nadu', isPopular: true, tier: 1 },
  { city: 'Jaipur', state: 'Rajasthan', isPopular: true, tier: 2 },
  { city: 'Lucknow', state: 'Uttar Pradesh', isPopular: true, tier: 2 },
  { city: 'Chandigarh', state: 'Punjab', isPopular: true, tier: 2 },
  { city: 'Bhopal', state: 'Madhya Pradesh', isPopular: true, tier: 2 },
  { city: 'Surat', state: 'Gujarat', isPopular: true, tier: 2 },
  { city: 'Patna', state: 'Bihar', isPopular: true, tier: 2 },
  { city: 'Nagpur', state: 'Maharashtra', isPopular: true, tier: 2 },
  { city: 'Goa', state: 'Goa', isPopular: true, tier: 2 },
  { city: 'Kochi', state: 'Kerala', isPopular: true, tier: 2 },
  { city: 'Visakhapatnam', state: 'Andhra Pradesh', isPopular: true, tier: 2 },
  { city: 'Coimbatore', state: 'Tamil Nadu', isPopular: true, tier: 2 },
  { city: 'Anantapur', state: 'Andhra Pradesh', isPopular: true, tier: 2 }
];

/** Popular Localities / Areas by City */
export const POPULAR_AREAS_BY_CITY = {
  noida: ['Sector 62', 'Sector 150', 'Sector 137', 'Greater Noida West', 'Sector 75', 'Sector 18', 'Sector 76', 'Sector 128', 'Sector 44', 'Sector 50', 'Sector 143', 'Noida Expressway'],
  delhi: ['Dwarka', 'South Delhi', 'Vasant Kunj', 'Saket', 'Rohini', 'Hauz Khas', 'Janakpuri', 'Pitampura', 'Lajpat Nagar', 'Connaught Place', 'Uttam Nagar', 'Greater Kailash', 'Mayur Vihar'],
  'delhi ncr': ['Gurgaon Sector 56', 'Golf Course Road', 'Cyber City', 'Noida Sector 62', 'Noida Sector 150', 'Greater Noida West', 'Dwarka', 'South Delhi', 'Vasant Kunj', 'Saket', 'Rohini', 'Indirapuram', 'Faridabad'],
  gurgaon: ['Golf Course Road', 'Cyber City', 'Sector 56', 'Sohna Road', 'DLF Phase 5', 'Golf Course Extension', 'Sector 57', 'Sector 82', 'MG Road', 'Sector 48', 'Sector 65', 'Dwarka Expressway'],
  indore: ['Vijay Nagar', 'Super Corridor', 'AB Road', 'Palasia', 'Bicholi Mardana', 'Rau', 'Nipania', 'Mahalaxmi Nagar', 'Scheme 78', 'Bhawarkua', 'Kanadia Road', 'Chandan Nagar', 'LIG Colony'],
  mumbai: ['Andheri West', 'Andheri East', 'Bandra West', 'Powai', 'Thane West', 'Navi Mumbai', 'Borivali West', 'Goregaon West', 'Worli', 'Malad West', 'Kandivali West', 'Juhu', 'Dadar', 'Chembur', 'Ghatkopar', 'Kharghar', 'Mira Road'],
  hyderabad: ['Gachibowli', 'Hitec City', 'Madhapur', 'Kondapur', 'Kukatpally', 'Banjara Hills', 'Jubilee Hills', 'Manikonda', 'Miyapur', 'Nallagandla', 'Tellapur', 'Kokapet', 'Financial District', 'Begumpet', 'Ameerpet', 'Secunderabad', 'Uppal'],
  bengaluru: ['Whitefield', 'Marathahalli', 'HSR Layout', 'Electronic City', 'Indiranagar', 'Koramangala', 'Bellandur', 'Sarjapur Road', 'Hebbal', 'Yelahanka', 'BTM Layout', 'Bannerghatta Road', 'Jayanagar', 'Rajajinagar', 'Devanahalli', 'Thanisandra', 'Varthur', 'Kanakapura Road'],
  bangalore: ['Whitefield', 'Marathahalli', 'HSR Layout', 'Electronic City', 'Indiranagar', 'Koramangala', 'Bellandur', 'Sarjapur Road', 'Hebbal', 'Yelahanka', 'BTM Layout', 'Bannerghatta Road', 'Jayanagar', 'Rajajinagar', 'Devanahalli', 'Thanisandra', 'Varthur', 'Kanakapura Road'],
  pune: ['Hinjewadi', 'Wakad', 'Baner', 'Kharadi', 'Viman Nagar', 'Kothrud', 'Aundh', 'Hadapsar', 'Bavdhan', 'Pimple Saudagar', 'Magarpatta', 'Ravet', 'Kalyani Nagar', 'Balewadi', 'Pashan', 'Undri'],
  ahmedabad: ['SG Highway', 'Bopal', 'Satellite', 'Prahlad Nagar', 'Vastrapur', 'Bodakdev', 'Gota', 'Thaltej', 'Shela', 'Chandkheda', 'Navrangpura', 'Maninagar'],
  kolkata: ['New Town', 'Salt Lake', 'Rajarhat', 'Ballygunge', 'Alipore', 'Garia', 'EM Bypass', 'Dum Dum', 'Behala', 'Tollygunge', 'Howrah', 'Park Street'],
  chennai: ['OMR', 'Velachery', 'Anna Nagar', 'Adyar', 'T Nagar', 'Porur', 'Guindy', 'Medavakkam', 'Perungudi', 'Thoraipakkam', 'Sholinganallur', 'Tambaram'],
  jaipur: ['Vaishali Nagar', 'Mansarovar', 'Jagatpura', 'Malviya Nagar', 'Tonk Road', 'C Scheme', 'Ajmer Road', 'Raja Park', 'Jhotwara', 'Durgapura'],
  lucknow: ['Gomti Nagar', 'Hazratganj', 'Aliganj', 'Indira Nagar', 'Mahanagar', 'Jankipuram', 'Ashiyana', 'Vibhuti Khand', 'Sushant Golf City', 'Amar Shaheed Path'],
  chandigarh: ['Sector 17', 'Sector 35', 'Sector 22', 'Zirakpur', 'Mohali Sector 70', 'Panchkula Sector 20', 'New Chandigarh', 'Aerocity Mohali'],
  bhopal: ['Arera Colony', 'MP Nagar', 'Hoshangabad Road', 'Kolar Road', 'Ayodhya Bypass', 'Bawadiya Kalan', 'Shahpura', 'Gulmohar'],
  surat: ['Vesu', 'Adajan', 'Pal', 'Piplod', 'Ghod Dod Road', 'Varachha', 'Dindoli', 'Althan'],
  patna: ['Boring Road', 'Kankarbagh', 'Bailey Road', 'Danapur', 'Saguna More', 'Ashok Nagar', 'Patliputra Colony', 'Rajendra Nagar'],
  nagpur: ['Dharampeth', 'Wardha Road', 'Manish Nagar', 'Civil Lines', 'Ramdaspeth', 'Pratap Nagar', 'Besur', 'Trimurti Nagar'],
  goa: ['Panaji', 'Candolim', 'Calangute', 'Porvorim', 'Margao', 'Vasco da Gama', 'Anjuna', 'Siolim', 'Mapusa', 'Baga'],
  kochi: ['Kakkanad', 'Edappally', 'Marine Drive', 'Kaloor', 'Palarivattom', 'Vyttila', 'Aluva', 'Panampilly Nagar', 'Tripunithura'],
  visakhapatnam: ['MVP Colony', 'Madhurawada', 'Gajuwaka', 'Seethammadhara', 'Siripuram', 'Yendada', 'Rushikonda'],
  coimbatore: ['RS Puram', 'Gandhipuram', 'Saibaba Colony', 'Peelamedu', 'Saravanampatti', 'Ramanathapuram', 'Singanallur', 'Vadavalli'],
  anantapur: ['Court Road', 'Kovur Nagar', 'Sai Nagar', 'Rudrampeta', 'RTC Bus Stand', 'Housing Board Colony', 'Somnath Nagar', 'Tarakarama Nagar', 'Shirdi Sai Nagar', 'Collector Office Road', 'Subhash Road', 'Gooty Road']
};
