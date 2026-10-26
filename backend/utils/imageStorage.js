import cloudinaryService from '../services/cloudinaryService.js';

/**
 * Photos arrive from the apps as base64 data URIs. Saving them inside Mongo made a
 * single booking up to ~6 MB, so every fetch of it (booking details, job details,
 * login lookups of workers...) dragged megabytes over the network. Upload them and
 * keep only the URL. If an upload fails the original value is kept so nothing is lost.
 */
export const offloadImages = async (items, folder) => {
  if (!Array.isArray(items)) return items;
  return Promise.all(items.map(async (item) => {
    if (typeof item !== 'string' || !item.startsWith('data:')) return item;
    const res = await cloudinaryService.uploadFile(item, { folder });
    return res.success && res.url ? res.url : item;
  }));
};
