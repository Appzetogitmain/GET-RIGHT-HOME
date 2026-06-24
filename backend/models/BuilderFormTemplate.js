import mongoose from 'mongoose';

const fieldValidationSchema = new mongoose.Schema({
  min: Number,
  max: Number,
  minLength: Number,
  maxLength: Number,
  customErrorMessage: String
}, { _id: false });

const stepFieldSchema = new mongoose.Schema({
  name: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, required: true },
  options: [String],
  required: { type: Boolean, default: false },
  placeholder: String,
  order: { type: Number, default: 0 },
  dependsOn: {
    field: String,
    value: mongoose.Schema.Types.Mixed
  },
  validation: fieldValidationSchema,
  subFields: [mongoose.Schema.Types.Mixed] // for repeater types
}, { _id: false });

const stepSchema = new mongoose.Schema({
  stepNumber: { type: Number, required: true },
  title: { type: String, required: true },
  description: String,
  fields: [stepFieldSchema]
}, { _id: false });

const builderFormTemplateSchema = new mongoose.Schema({
  transactionType: { type: String, required: true },
  category: { type: String, required: true },
  propertyType: { type: String, required: true },
  steps: [stepSchema],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

builderFormTemplateSchema.index({ transactionType: 1, category: 1, propertyType: 1 }, { unique: true });

export default mongoose.model("BuilderFormTemplate", builderFormTemplateSchema);
