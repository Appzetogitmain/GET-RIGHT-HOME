import LocalityReview from '../models/LocalityReview.js';

export const createLocalityReview = async (req, res) => {
  try {
    const {
      localityName,
      rating,
      connectivityRating,
      lifestyleRating,
      safetyRating,
      greenAreaRating,
      comment,
      positives,
      negatives,
      userType,
      stayDuration
    } = req.body;

    if (!localityName || !rating) {
      return res.status(400).json({ message: "Locality name and overall rating are required" });
    }

    const review = await LocalityReview.create({
      userId: req.user._id,
      localityName: localityName.trim(),
      rating,
      connectivityRating: connectivityRating || rating,
      lifestyleRating: lifestyleRating || rating,
      safetyRating: safetyRating || rating,
      greenAreaRating: greenAreaRating || rating,
      comment,
      positives: Array.isArray(positives) ? positives : [],
      negatives: Array.isArray(negatives) ? negatives : [],
      userType: userType || 'Resident',
      stayDuration: stayDuration || 'living since 1Y+'
    });

    res.status(201).json({ success: true, review });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLocalityReviewStats = async (req, res) => {
  try {
    const { localityName } = req.query;
    if (!localityName) {
      return res.status(400).json({ message: "localityName query parameter is required" });
    }

    const trimmedLocality = localityName.trim();
    const reviews = await LocalityReview.find({ localityName: trimmedLocality, status: 'approved' }).lean();

    if (reviews.length === 0) {
      return res.json({
        success: true,
        stats: {
          avgRating: 0,
          totalReviews: 0,
          ratingsBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          connectivity: 0,
          lifestyle: 0,
          safety: 0,
          greenArea: 0,
          positives: [],
          negatives: []
        }
      });
    }

    let sumRating = 0;
    let sumConnectivity = 0;
    let sumLifestyle = 0;
    let sumSafety = 0;
    let sumGreenArea = 0;

    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const positiveCounts = {};
    const negativeCounts = {};

    reviews.forEach(r => {
      sumRating += r.rating;
      sumConnectivity += (r.connectivityRating || r.rating);
      sumLifestyle += (r.lifestyleRating || r.rating);
      sumSafety += (r.safetyRating || r.rating);
      sumGreenArea += (r.greenAreaRating || r.rating);

      const rounded = Math.round(r.rating);
      if (breakdown[rounded] !== undefined) {
        breakdown[rounded]++;
      }

      if (Array.isArray(r.positives)) {
        r.positives.forEach(p => {
          positiveCounts[p] = (positiveCounts[p] || 0) + 1;
        });
      }
      if (Array.isArray(r.negatives)) {
        r.negatives.forEach(n => {
          negativeCounts[n] = (negativeCounts[n] || 0) + 1;
        });
      }
    });

    const total = reviews.length;

    // Get top positives and negatives sorted by frequency
    const positives = Object.keys(positiveCounts).sort((a, b) => positiveCounts[b] - positiveCounts[a]).slice(0, 5);
    const negatives = Object.keys(negativeCounts).sort((a, b) => negativeCounts[b] - negativeCounts[a]).slice(0, 5);

    // Fallbacks if empty
    if (positives.length === 0) positives.push("Good Public Transport", "Easy Cab Availability", "Safe at Night");
    if (negatives.length === 0) negatives.push("Frequent Traffic Jams");

    res.json({
      success: true,
      stats: {
        avgRating: Number((sumRating / total).toFixed(1)),
        totalReviews: total,
        ratingsBreakdown: breakdown,
        connectivity: Number((sumConnectivity / total).toFixed(1)),
        lifestyle: Number((sumLifestyle / total).toFixed(1)),
        safety: Number((sumSafety / total).toFixed(1)),
        greenArea: Number((sumGreenArea / total).toFixed(1)),
        positives,
        negatives
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLocalityReviews = async (req, res) => {
  try {
    const { localityName, page = 1, limit = 10 } = req.query;
    if (!localityName) {
      return res.status(400).json({ message: "localityName query parameter is required" });
    }

    const trimmedLocality = localityName.trim();
    const query = { localityName: trimmedLocality, status: 'approved' };

    const total = await LocalityReview.countDocuments(query);
    const reviews = await LocalityReview.find(query)
      .populate('userId', 'name profileImage')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      total,
      pages: Math.ceil(total / limit),
      currentPage: Number(page),
      reviews
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
