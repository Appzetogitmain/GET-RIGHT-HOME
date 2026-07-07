import { useNavigate } from 'react-router-dom';

/**
 * Custom hook to provide unified and consistent property navigation logic.
 * It handles the `isAddedByAdmin` check and routes to the correct details page.
 */
export const usePropertyNavigate = () => {
  const navigate = useNavigate();

  const getPropertyPath = (property) => {
    if (!property) return '/';
    const id = property._id || property.id;
    if (!id) return '/';

    // 1. If added by admin or marked as featured (Handpicked Project), always go to handpicked page
    if (property.isAddedByAdmin || property.featuredDetails?.isFeatured) {
      return `/handpicked/${id}`;
    }

    // 2. Determine prefix based on property type (hotel vs property)
    const propertyType = property.propertyType || '';
    const hotelTypes = ['hotel', 'resort', 'homestay'];
    const isHotelType = hotelTypes.includes(propertyType.toLowerCase());

    return isHotelType ? `/hotel/${id}` : `/property/${id}`;
  };

  const navigateToProperty = (property, options = {}) => {
    if (!property) return;
    const path = getPropertyPath(property);
    navigate(path, options);
  };

  return {
    getPropertyPath,
    navigateToProperty,
  };
};
