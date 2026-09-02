import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    // =====================================
    // BASIC INFO
    // =====================================

    employeeId: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      index: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },

    mobile: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    profileImage: {
      url: {
        type: String,
        default: "",
      },
      publicId: {
        type: String,
        default: "",
      },
    },

    // =====================================
    // AUTHENTICATION
    // =====================================

    password: {
      type: String,
      required: true,
      select: false,
    },

    loginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
      default: null,
    },

    lastLogin: {
      type: Date,
      default: null,
    },
fcmToken: {
  type: String,
  default: "",
},
    passwordChangedAt: {
      type: Date,
      default: null,
    },

    tokenVersion: {
      type: Number,
      default: 0,
    },

    // =====================================
    // ROLE & DEPARTMENT
    // =====================================

    role: {
      type: String,
      enum: [
        "SUPER_ADMIN",
        "ADMIN",
        "MANAGER",
        "RECOVERY_MANAGER",
        "VISITOR",
        "CREDIT_ANALYST",
        "DISBURSEMENT_OFFICER",
        "COLLECTION_AGENT",
        "CUSTOMER_SUPPORT",
        "AUDITOR",
      ],
      required: true,
      index: true,
    },

    designation: {
      type: String,
      trim: true,
    },

    department: {
      type: String,
      enum: [
        "ADMIN",
        "OPERATIONS",
        "CREDIT",
        "COLLECTION",
        "FINANCE",
        "SUPPORT",
        "HR",
      ],
      index: true,
    },

    permissions: [
      {
        type: String,
      },
    ],

    // =====================================
    // EMPLOYMENT
    // =====================================

    branch: {
      type: String,
      trim: true,
    },

    reportingManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
      index: true,
    },

    joiningDate: {
      type: Date,
      default: Date.now,
    },

    employmentType: {
      type: String,
      enum: ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"],
      default: "FULL_TIME",
    },

    status: {
      type: String,
      enum: [
        "ACTIVE",
        "INACTIVE",
        "ON_LEAVE",
        "SUSPENDED",
        "RESIGNED",
      ],
      default: "ACTIVE",
      index: true,
    },

    // =====================================
    // PERSONAL INFO
    // =====================================

    gender: {
      type: String,
      enum: ["MALE", "FEMALE", "OTHER"],
    },

    dateOfBirth: {
      type: Date,
    },

    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      pincode: String,
    },

    emergencyContact: {
      name: String,
      relation: String,
      mobile: String,
    },

    // =====================================
    // RECOVERY ASSIGNMENT (Optional)
    // =====================================

    assignedBranches: [
      {
        type: String,
      },
    ],

    // =====================================
    // AUDIT
    // =====================================

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// =====================================
// INDEXES
// =====================================

employeeSchema.index({ role: 1 });

employeeSchema.index({ department: 1 });

employeeSchema.index({ status: 1 });

employeeSchema.index({ reportingManager: 1 });

employeeSchema.index({ createdAt: -1 });

const Employee = mongoose.model("Employee", employeeSchema);

export default Employee;