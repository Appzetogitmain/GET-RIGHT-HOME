import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  imageUrl: { 
    type: String, 
    required: true 
  },
  imagePublicId: { 
    type: String 
  },
  link: { 
    type: String,
    default: ''
  },
  order: { 
    type: Number, 
    default: 0 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  type: {
    type: String,
    enum: ['home', 'offer', 'promotion'],
    default: 'home'
  }
}, { timestamps: true });

const Banner = mongoose.model('Banner', bannerSchema);
export default Banner;
