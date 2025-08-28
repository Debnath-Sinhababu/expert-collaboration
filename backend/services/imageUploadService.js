const cloudinary = require('../config/cloudinary');

class ImageUploadService {
  /**
   * Upload image to Cloudinary with optimization
   * @param {Buffer} imageBuffer - Image buffer from multer
   * @param {string} folder - Cloudinary folder (e.g., 'expert-profiles')
   * @param {string} publicId - Optional public ID for the image
   * @returns {Promise<Object>} Upload result with URL and public ID
   */
  static async uploadImage(imageBuffer, folder = 'expert-profiles', publicId = null) {
    try {
      // Convert buffer to base64 string
      const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
      
      // Upload options for optimization
      const uploadOptions = {
        folder: folder,
        resource_type: 'image',
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' }, // Optimize for profile photos
          { quality: 'auto:good' }, // Auto-optimize quality
          { format: 'auto' } // Auto-format (webp for modern browsers)
        ],
        eager: [
          { width: 200, height: 200, crop: 'fill', gravity: 'face' }, // Thumbnail version
          { width: 100, height: 100, crop: 'fill', gravity: 'face' }  // Small version
        ],
        eager_format: 'auto'
      };

      // Add public ID if provided
      if (publicId) {
        uploadOptions.public_id = publicId;
      }

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(base64Image, uploadOptions);
      
      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
        thumbnailUrl: result.eager?.[0]?.secure_url || result.secure_url,
        smallUrl: result.eager?.[1]?.secure_url || result.secure_url
      };
    } catch (error) {
      console.error('Image upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete image from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @returns {Promise<Object>} Deletion result
   */
  static async deleteImage(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return {
        success: true,
        result: result
      };
    } catch (error) {
      console.error('Image deletion error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update image (delete old and upload new)
   * @param {Buffer} newImageBuffer - New image buffer
   * @param {string} oldPublicId - Old image public ID to delete
   * @param {string} folder - Cloudinary folder
   * @returns {Promise<Object>} Update result
   */
  static async updateImage(newImageBuffer, oldPublicId = null, folder = 'expert-profiles') {
    try {
      // Delete old image if exists
      if (oldPublicId) {
        await this.deleteImage(oldPublicId);
      }

      // Upload new image
      const uploadResult = await this.uploadImage(newImageBuffer, folder);
      return uploadResult;
    } catch (error) {
      console.error('Image update error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = ImageUploadService;
