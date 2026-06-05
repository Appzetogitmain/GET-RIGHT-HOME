import mongoose from "mongoose";

const validationSchema = new mongoose.Schema({
  required: { type: Boolean, default: false },
  min: { type: Number },
  max: { type: Number },
  minLength: { type: Number },
  maxLength: { type: Number },
  pattern: { type: String }, // Regex string
  customErrorMessage: { type: String }
}, { _id: false });

const fieldSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. "bedrooms", "carpetArea"
  label: { type: String, required: true }, // e.g. "No. of Bedrooms"
  type: { 
    type: String, 
    enum: ["text", "number", "email", "tel", "textarea", "dropdown", "pill", "radio", "checkbox", "checkbox_group", "multiselect", "file", "location", "nearby_places", "date", "multiselect_pill"],
    required: true 
  },
  placeholder: { type: String },
  options: [{ type: String }], // Used for dropdown, pill, radio, multiselect
  defaultValue: { type: mongoose.Schema.Types.Mixed },
  required: { type: Boolean, default: false },
  validation: validationSchema,
  dependsOn: {
    field: { type: String }, // e.g. "propertyType"
    value: { type: mongoose.Schema.Types.Mixed } // e.g. "Flat/Apartment"
  },
  order: { type: Number, default: 0 }
});

// Since subFields is recursive, we must define it after schema creation
fieldSchema.add({ subFields: [fieldSchema] });

const stepSchema = new mongoose.Schema({
  stepNumber: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String },
  fields: [fieldSchema]
});

const propertyFormTemplateSchema = new mongoose.Schema({
  transactionType: { type: String, required: true },
  category: { type: String, required: true },
  propertyType: { type: String, required: true }, // e.g. "Flat/Apartment", "Office Space"
  steps: [stepSchema],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Ensure unique combination so we know exactly which template to load
propertyFormTemplateSchema.index({ transactionType: 1, category: 1, propertyType: 1 }, { unique: true });

export default mongoose.model("PropertyFormTemplate", propertyFormTemplateSchema);
