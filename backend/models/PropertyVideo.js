import mongoose from 'mongoose';

const propertyVideoSchema = new mongoose.Schema({
    title: { type: String, required: true },
    youtubeUrl: { type: String, required: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
    visibility: {
        type: [String],
        enum: ['home', 'buy', 'rent'],
        required: true,
        default: ['home']
    },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

const PropertyVideo = mongoose.model('PropertyVideo', propertyVideoSchema);
export default PropertyVideo;
