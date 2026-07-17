import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  title: { 
    type: String
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
  linkedItemType: {
    type: String,
    enum: ['Property', 'Project', null],
    default: null
  },
  linkedItem: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'linkedItemType',
    default: null
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
