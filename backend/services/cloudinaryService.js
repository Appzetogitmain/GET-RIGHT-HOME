// Cloudinary service - wraps the cloudinary utils for use in controllers
import { uploadToCloudinary, deleteFromCloudinary, uploadVideoToCloudinary } from '../utils/cloudinary.js';

const cloudinaryService = {
  uploadFile: async (fileData, options = {}) => {
    try {
      const result = await uploadToCloudinary(fileData, options.folder || 'workers');
      return { success: true, url: result.url, publicId: result.publicId };
    } catch (error) {
      console.error('[Cloudinary] uploadFile error:', error.message);
      return { success: false, error: error.message };
    }
  },

  deleteFile: async (publicId) => {
    try {
      await deleteFromCloudinary(publicId);
      return { success: true };
    } catch (error) {
      console.error('[Cloudinary] deleteFile error:', error.message);
      return { success: false, error: error.message };
    }
  }
};

export default cloudinaryService;
