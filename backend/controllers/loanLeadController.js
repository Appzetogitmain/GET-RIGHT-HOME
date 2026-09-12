import LoanLead from '../models/LoanLead.js';
import User from '../models/User.js';
import { safeRegex } from '../utils/escapeRegex.js';

// Helper to generate readable Lead ID
const generateLeadId = () => {
  const prefix = 'LL';
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  return `${prefix}-${randomStr}-${timestamp}`;
};

/**
 * USER / PUBLIC: Create a new Loan Lead
 * POST /api/loan-leads
 */
export const createLoanLead = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      leadSource = 'apply_for_loan',
      sourcePage = '',
      loanAmount = 0,
      tenureYears = 20,
      interestRate = 8.9,
      calculatedEmi = 0,
      totalPayable = 0,
      totalInterest = 0,
      netMonthlyIncome = 0,
      existingMonthlyEmi = 0,
      borrowerType = 'One',
      applicantAge = 30,
      applicantOccupation = 'Salaried',
      coBorrowerIncome = 0,
      coBorrowerEmi = 0,
      eligibilityMaxLoan = 0,
      preferredBank = '',
      propertyValue = 0,
      message = ''
    } = req.body;

    let customerName = (name || '').trim();
    let customerPhone = (phone || '').trim();
    let customerEmail = (email || '').trim().toLowerCase();
    let userId = null;

    // 1. If user is logged in
    if (req.user) {
      userId = req.user._id;
      customerName = customerName || req.user.name || 'Valued Customer';
      customerPhone = customerPhone || req.user.phone || '';
      customerEmail = customerEmail || req.user.email || '';
    } else {
      // 2. Check if a user with this phone exists in database
      if (customerPhone) {
        const existingUser = await User.findOne({ phone: customerPhone });
        if (existingUser) {
          userId = existingUser._id;
          if (!customerName) customerName = existingUser.name;
          if (!customerEmail) customerEmail = existingUser.email;
        }
      }
    }

    if (!customerPhone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required to apply for a loan'
      });
    }

    if (!customerName) {
      customerName = 'Loan Applicant';
    }

    const leadId = generateLeadId();

    const newLead = new LoanLead({
      leadId,
      userId,
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
      leadSource,
      sourcePage,
      loanAmount: Number(loanAmount) || 0,
      tenureYears: Number(tenureYears) || 20,
      interestRate: Number(interestRate) || 8.9,
      calculatedEmi: Number(calculatedEmi) || 0,
      totalPayable: Number(totalPayable) || 0,
      totalInterest: Number(totalInterest) || 0,
      netMonthlyIncome: Number(netMonthlyIncome) || 0,
      existingMonthlyEmi: Number(existingMonthlyEmi) || 0,
      borrowerType,
      applicantAge: Number(applicantAge) || 30,
      applicantOccupation,
      coBorrowerIncome: Number(coBorrowerIncome) || 0,
      coBorrowerEmi: Number(coBorrowerEmi) || 0,
      eligibilityMaxLoan: Number(eligibilityMaxLoan) || 0,
      preferredBank,
      propertyValue: Number(propertyValue) || 0,
      message
    });

    await newLead.save();

    res.status(201).json({
      success: true,
      message: 'Loan application submitted successfully. Our loan expert will contact you shortly.',
      lead: newLead
    });
  } catch (error) {
    console.error('Create Loan Lead Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting loan application: ' + error.message
    });
  }
};

/**
 * ADMIN: Get all Loan Leads with pagination, filters and stats
 * GET /api/admin/loan-leads
 */
export const adminGetLoanLeads = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 15);
    const skip = (page - 1) * limit;

    const { status, leadSource, search } = req.query;

    const query = {};

    if (status && status !== 'all') {
      query.status = status.toLowerCase().trim();
    }

    if (leadSource && leadSource !== 'all') {
      query.leadSource = leadSource.trim();
    }

    if (search && search.trim()) {
      const searchRegex = safeRegex(search.trim());
      query.$or = [
        { leadId: searchRegex },
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { applicantOccupation: searchRegex }
      ];
    }

    const total = await LoanLead.countDocuments(query);
    const leads = await LoanLead.find(query)
      .populate('userId', 'name email phone avatar role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Compute Summary Stats
    const [stats] = await LoanLead.aggregate([
      {
        $facet: {
          totalCount: [{ $count: 'count' }],
          newCount: [{ $match: { status: 'new' } }, { $count: 'count' }],
          contactedCount: [{ $match: { status: 'contacted' } }, { $count: 'count' }],
          inReviewCount: [{ $match: { status: 'in_review' } }, { $count: 'count' }],
          approvedCount: [{ $match: { status: 'approved' } }, { $count: 'count' }],
          totalVolume: [{ $group: { _id: null, totalSum: { $sum: '$loanAmount' } } }]
        }
      }
    ]);

    const formattedStats = {
      total: stats?.totalCount?.[0]?.count || 0,
      new: stats?.newCount?.[0]?.count || 0,
      contacted: stats?.contactedCount?.[0]?.count || 0,
      inReview: stats?.inReviewCount?.[0]?.count || 0,
      approved: stats?.approvedCount?.[0]?.count || 0,
      totalVolume: stats?.totalVolume?.[0]?.totalSum || 0
    };

    res.status(200).json({
      success: true,
      leads,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      stats: formattedStats
    });
  } catch (error) {
    console.error('Admin Get Loan Leads Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching loan leads'
    });
  }
};

/**
 * ADMIN: Update Loan Lead status & admin notes
 * PUT /api/admin/loan-leads/:id
 */
export const adminUpdateLoanLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, preferredBank } = req.body;

    const lead = await LoanLead.findById(id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Loan lead not found'
      });
    }

    if (status !== undefined) {
      const ALLOWED = ['new', 'contacted', 'in_review', 'documents_pending', 'approved', 'rejected', 'closed'];
      if (!ALLOWED.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status "${status}". Allowed: ${ALLOWED.join(', ')}`
        });
      }
      lead.status = status;
    }

    if (adminNotes !== undefined) {
      lead.adminNotes = adminNotes;
    }

    if (preferredBank !== undefined) {
      lead.preferredBank = preferredBank;
    }

    await lead.save();

    const updated = await LoanLead.findById(id).populate('userId', 'name email phone avatar role');

    res.status(200).json({
      success: true,
      message: 'Loan lead updated successfully',
      lead: updated
    });
  } catch (error) {
    console.error('Admin Update Loan Lead Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating loan lead'
    });
  }
};

/**
 * ADMIN: Delete Loan Lead
 * DELETE /api/admin/loan-leads/:id
 */
export const adminDeleteLoanLead = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await LoanLead.findByIdAndDelete(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Loan lead not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Loan lead deleted successfully'
    });
  } catch (error) {
    console.error('Admin Delete Loan Lead Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting loan lead'
    });
  }
};

/**
 * USER: Get user's own submitted loan leads
 * GET /api/loan-leads/my
 */
export const getUserLoanLeads = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const leads = await LoanLead.find({
      $or: [{ userId: req.user._id }, { phone: req.user.phone }]
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      leads
    });
  } catch (error) {
    console.error('Get User Loan Leads Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user loan leads'
    });
  }
};
