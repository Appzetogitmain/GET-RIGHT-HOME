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
  India: ['Karnataka']
};
