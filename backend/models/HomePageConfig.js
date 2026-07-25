import mongoose from 'mongoose';

const homePageConfigSchema = new mongoose.Schema({
  sections: [
    {
      id: { type: String, required: true },
      name: { type: String, required: true },
      isVisible: { type: Boolean, default: true }
    }
  ],
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

const HomePageConfig = mongoose.model('HomePageConfig', homePageConfigSchema);

export default HomePageConfig;
