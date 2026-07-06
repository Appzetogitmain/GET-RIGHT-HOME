import PropertyVideo from '../models/PropertyVideo.js';
import Property from '../models/Property.js';

export const getVideos = async (req, res) => {
    try {
        const { page } = req.query;
        const filter = { isActive: true };
        if (page) {
            filter.visibility = page;
        }

        const videos = await PropertyVideo.find(filter)
            .populate('propertyId', 'title slug city location')
            .sort({ createdAt: -1 });

        res.json({ success: true, videos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

export const getAllVideos = async (req, res) => {
    try {
        const videos = await PropertyVideo.find()
            .populate('propertyId', 'title slug city location')
            .sort({ createdAt: -1 });
        res.json({ success: true, videos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

export const createVideo = async (req, res) => {
    try {
        const { title, youtubeUrl, propertyId, visibility, isActive } = req.body;
        
        const video = new PropertyVideo({
            title,
            youtubeUrl,
            propertyId: propertyId || null,
            visibility,
            isActive: isActive !== undefined ? isActive : true
        });

        await video.save();
        res.status(201).json({ success: true, video });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

export const updateVideo = async (req, res) => {
    try {
        const { title, youtubeUrl, propertyId, visibility, isActive } = req.body;
        const video = await PropertyVideo.findById(req.params.id);

        if (!video) {
            return res.status(404).json({ success: false, message: 'Video not found' });
        }

        if (title !== undefined) video.title = title;
        if (youtubeUrl !== undefined) video.youtubeUrl = youtubeUrl;
        if (propertyId !== undefined) video.propertyId = propertyId || null;
        if (visibility !== undefined) video.visibility = visibility;
        if (isActive !== undefined) video.isActive = isActive;

        await video.save();
        res.json({ success: true, video });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

export const deleteVideo = async (req, res) => {
    try {
        const video = await PropertyVideo.findById(req.params.id);

        if (!video) {
            return res.status(404).json({ success: false, message: 'Video not found' });
        }

        await video.deleteOne();
        res.json({ success: true, message: 'Video removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
