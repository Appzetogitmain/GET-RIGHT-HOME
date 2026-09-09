// frontend/src/utils/requirementSnapshot.js
// Utility to snapshot active search filters or infer fallback requirements from property data

export const formatPriceString = (price) => {
  if (!price || isNaN(price) || price <= 0) return '';
  if (price >= 10000000) {
    return `₹${(price / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`;
  }
  if (price >= 100000) {
    return `₹${(price / 100000).toFixed(2).replace(/\.00$/, '')} L`;
  }
  return `₹${price.toLocaleString('en-IN')}`;
};

export const getRequirementSnapshot = (propertyData = null, customContext = {}) => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Read from URL query params
    const qCity = urlParams.get('city') || urlParams.get('location') || customContext.city || '';
    const qLocality = urlParams.get('locality') || urlParams.get('area') || customContext.locality || '';
    const qBhk = urlParams.get('bhk') || customContext.bhk || '';
    const qType = urlParams.get('type') || urlParams.get('propertyType') || customContext.propertyType || '';
    const qPurpose = urlParams.get('purpose') || urlParams.get('transactionType') || customContext.purpose || '';
    const qMaxPrice = Number(urlParams.get('maxPrice') || urlParams.get('budget') || customContext.budgetMax || 0);
    const qMinPrice = Number(urlParams.get('minPrice') || customContext.budgetMin || 0);

    const hasSearchParams = !!(qCity || qLocality || qBhk || qType || qPurpose || qMaxPrice);

    if (hasSearchParams) {
      const parts = [];
      if (qBhk) parts.push(`${qBhk.replace(/bhk/i, '').trim()} BHK`);
      if (qType) parts.push(qType.charAt(0).toUpperCase() + qType.slice(1));
      
      const loc = [qLocality, qCity].filter(Boolean).join(', ');
      if (loc) parts.push(`in ${loc}`);
      
      if (qMaxPrice > 0) {
        parts.push(`under ${formatPriceString(qMaxPrice)}`);
      } else if (qMinPrice > 0) {
        parts.push(`above ${formatPriceString(qMinPrice)}`);
      }

      if (qPurpose) {
        parts.push(`for ${qPurpose.toUpperCase()}`);
      }

      const requirementText = parts.join(' ').trim() || 'General Property Inquiry';

      return {
        text: requirementText,
        bhk: qBhk ? String(qBhk).replace(/bhk/i, '').trim() : '',
        propertyType: qType || '',
        budgetMax: qMaxPrice || 0,
        budgetMin: qMinPrice || 0,
        location: qLocality || qCity || '',
        city: qCity || '',
        purpose: qPurpose || ''
      };
    }

    // Fallback: Infer from propertyData if available
    if (propertyData) {
      const pBhk = propertyData.buyDetails?.bhk || propertyData.rentDetails?.bhk || propertyData.bhk || '';
      const pType = propertyData.propertyType || '';
      const pCity = propertyData.address?.city || propertyData.city || '';
      const pLocality = propertyData.address?.locality || propertyData.address?.area || propertyData.locality || '';
      const pPurpose = propertyData.transactionType || (propertyData.rentDetails ? 'Rent' : 'Buy');
      
      const pPrice = Number(
        propertyData.startingPrice ||
        propertyData.buyDetails?.expectedPrice ||
        propertyData.plotDetails?.expectedPrice ||
        propertyData.rentDetails?.monthlyRent ||
        propertyData.price || 
        0
      );

      const parts = [];
      if (pBhk) parts.push(`${pBhk} BHK`);
      if (pType) parts.push(pType);
      
      const loc = [pLocality, pCity].filter(Boolean).join(', ');
      if (loc) parts.push(`in ${loc}`);
      
      if (pPrice > 0) parts.push(`(${formatPriceString(pPrice)})`);
      if (pPurpose) parts.push(`for ${pPurpose}`);

      const requirementText = parts.join(' ').trim() || (propertyData.propertyName || 'Property Inquiry');

      return {
        text: requirementText,
        bhk: String(pBhk || ''),
        propertyType: pType,
        budgetMax: pPrice,
        budgetMin: 0,
        location: pLocality || pCity,
        city: pCity,
        purpose: pPurpose
      };
    }

    return {
      text: 'General Inquiry',
      bhk: '',
      propertyType: '',
      budgetMax: 0,
      budgetMin: 0,
      location: '',
      city: '',
      purpose: ''
    };
  } catch (err) {
    console.warn('Error creating requirement snapshot:', err);
    return {
      text: 'General Inquiry',
      bhk: '',
      propertyType: '',
      budgetMax: 0,
      budgetMin: 0,
      location: '',
      city: '',
      purpose: ''
    };
  }
};
