import mongoose from 'mongoose';

const loanLeadSchema = new mongoose.Schema(
  {
    leadId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true
    },
    leadSource: {
      type: String,
      enum: ['apply_for_loan', 'emi_calculator', 'loan_eligibility', 'instant_loan', 'request_callback', 'general'],
      default: 'apply_for_loan',
      index: true
    },
    sourcePage: {
      type: String,
      default: ''
    },
    loanAmount: {
      type: Number,
      default: 0
    },
    tenureYears: {
      type: Number,
      default: 20
    },
    interestRate: {
      type: Number,
      default: 8.9
    },
    calculatedEmi: {
      type: Number,
      default: 0
    },
    totalPayable: {
      type: Number,
      default: 0
    },
    totalInterest: {
      type: Number,
      default: 0
    },
    netMonthlyIncome: {
      type: Number,
      default: 0
    },
    existingMonthlyEmi: {
      type: Number,
      default: 0
    },
    borrowerType: {
      type: String,
      enum: ['One', 'Two'],
      default: 'One'
    },
    applicantAge: {
      type: Number,
      default: 30
    },
    applicantOccupation: {
      type: String,
      default: 'Salaried'
    },
    coBorrowerIncome: {
      type: Number,
      default: 0
    },
    coBorrowerEmi: {
      type: Number,
      default: 0
    },
    eligibilityMaxLoan: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'in_review', 'documents_pending', 'approved', 'rejected', 'closed'],
      default: 'new',
      index: true
    },
    adminNotes: {
      type: String,
      default: ''
    },
    preferredBank: {
      type: String,
      default: ''
    },
    propertyValue: {
      type: Number,
      default: 0
    },
    message: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

export default mongoose.model('LoanLead', loanLeadSchema);
