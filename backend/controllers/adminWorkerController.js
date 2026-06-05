import Worker from '../models/Worker.js';
import HomeServiceBooking from '../models/HomeServiceBooking.js';
import Transaction from '../models/Transaction.js';

export const getAllWorkers = async (req, res) => {
  try {
    const { search, approvalStatus } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (approvalStatus && approvalStatus !== 'all') {
      query.approvalStatus = approvalStatus;
    }

    const workers = await Worker.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: workers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWorkerDetails = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    res.json({ success: true, worker });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveWorker = async (req, res) => {
  try {
    const worker = await Worker.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: 'approved' },
      { new: true }
    );
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    res.json({ success: true, message: 'Worker approved successfully', worker });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const rejectWorker = async (req, res) => {
  try {
    const worker = await Worker.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: 'rejected' },
      { new: true }
    );
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    res.json({ success: true, message: 'Worker rejected successfully', worker });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const suspendWorker = async (req, res) => {
  try {
    const worker = await Worker.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: 'suspended' },
      { new: true }
    );
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    res.json({ success: true, message: 'Worker suspended successfully', worker });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    const worker = await Worker.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    );
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    res.json({ success: true, message: `Worker ${isActive ? 'activated' : 'deactivated'} successfully`, worker });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteWorker = async (req, res) => {
  try {
    const worker = await Worker.findByIdAndDelete(req.params.id);
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    res.json({ success: true, message: 'Worker deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWorkerJobs = async (req, res) => {
  try {
    const jobs = await HomeServiceBooking.find({ workerId: req.params.id })
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllJobs = async (req, res) => {
  try {
    const jobs = await HomeServiceBooking.find({})
      .populate('userId', 'name email phone')
      .populate('workerId', 'name email phone')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWorkerEarnings = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });

    const transactions = await Transaction.find({ workerId: req.params.id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        balance: worker.wallet?.balance || 0,
        earnings: worker.wallet?.earnings || 0,
        totalWithdrawn: worker.wallet?.totalWithdrawn || 0,
        transactions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const payWorker = async (req, res) => {
  try {
    const { amount, notes } = req.body;
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });

    worker.wallet = worker.wallet || { balance: 0, earnings: 0, totalWithdrawn: 0 };
    worker.wallet.balance = Math.max(0, worker.wallet.balance - amount);
    worker.wallet.totalWithdrawn = (worker.wallet.totalWithdrawn || 0) + amount;
    await worker.save();

    // Create payout transaction
    await Transaction.create({
      workerId: worker._id,
      amount,
      type: 'withdrawal',
      status: 'completed',
      description: notes || 'Payout from Admin'
    });

    res.json({ success: true, message: 'Payment recorded successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWorkerAnalytics = async (req, res) => {
  try {
    const totalWorkers = await Worker.countDocuments({});
    const pendingWorkers = await Worker.countDocuments({ approvalStatus: 'pending' });
    const approvedWorkers = await Worker.countDocuments({ approvalStatus: 'approved' });
    const activeJobs = await HomeServiceBooking.countDocuments({ status: 'in_progress' });
    const completedJobs = await HomeServiceBooking.countDocuments({ status: 'completed' });

    // Top 5 workers by completed jobs
    const topWorkers = await HomeServiceBooking.aggregate([
      { $match: { status: 'completed', workerId: { $exists: true, $ne: null } } },
      { $group: { _id: '$workerId', completedJobs: { $sum: 1 } } },
      { $sort: { completedJobs: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'workers',
          localField: '_id',
          foreignField: '_id',
          as: 'workerInfo'
        }
      },
      { $unwind: '$workerInfo' },
      {
        $project: {
          name: '$workerInfo.name',
          completedJobs: 1
        }
      }
    ]);

    // Worker availability distribution (online vs offline)
    const availabilityDistribution = await Worker.aggregate([
      { $match: { approvalStatus: 'approved' } },
      { $group: { _id: '$isOnline', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        totalWorkers,
        pendingWorkers,
        approvedWorkers,
        activeJobs,
        completedJobs,
        topWorkers,
        availabilityDistribution
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.stack });
  }
};


export const getWorkerPayments = async (req, res) => {
  try {
    const transactions = await Transaction.find({ type: 'withdrawal' })
      .populate('workerId', 'name email phone')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
