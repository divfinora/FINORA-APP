import mongoose from "mongoose";

const visitorVerificationSchema = new mongoose.Schema(
  {
    verificationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    loan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LoanApplication",
      required: true,
      index: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    visitor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "ASSIGNED",
        "IN_PROGRESS",
        "SUBMITTED",
        "APPROVED",
        "REJECTED",
      ],
      default: "ASSIGNED",
      index: true,
    },

    recommendation: {
      type: String,
      enum: [
        "APPROVE",
        "REJECT",
      ],
      default: null,
    },

    investigation: {
      customerAvailable: Boolean,

      customerVerified: Boolean,

      addressVerified: Boolean,

      employmentVerified: Boolean,

      businessVerified: Boolean,

      incomeVerified: Boolean,

      originalDocumentsVerified: Boolean,

      photocopiesCollected: Boolean,

      houseVisited: Boolean,

      neighboursVerified: Boolean,

      remarks: String,
    },

    location: {
      latitude: Number,
      longitude: Number,
      address: String,
    },

    photos: [
      {
        category: {
          type: String,
          enum: [
            "CUSTOMER",
            "CUSTOMER_SELFIE",
            "HOUSE_FRONT",
            "HOUSE_INSIDE",
            "SHOP",
            "OFFICE",
            "DOCUMENT",
            "WITNESS",
            "OTHER"
          ]
        },

        url: {
          type: String,
          required: true
        },

        publicId: String,

        uploadedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    videos: [
      {
        category: {
          type: String,
          enum: [
            "CUSTOMER",
            "HOUSE",
            "SHOP",
            "OFFICE",
            "OTHER"
          ]
        },

        url: {
          type: String,
          required: true
        },

        publicId: String,

        duration: Number,

        uploadedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    finalDeclaration: {
      informationCorrect: {
        type: Boolean,
        default: false
      },

      photosGenuine: {
        type: Boolean,
        default: false
      },

      investigationCompleted: {
        type: Boolean,
        default: false
      },

      acceptedAt: Date
    },

    documents: [
      {
        type: {
          type: String,
          enum: [
            "AADHAAR",
            "PAN",
            "PASSPORT",
            "DRIVING_LICENSE",
            "VOTER_ID",
            "BANK_PASSBOOK",
            "OTHER"
          ]
        },

        owner: {
          type: String,
          enum: [
            "CUSTOMER",
            "WITNESS"
          ]
        },

        frontUrl: String,

        backUrl: String,

        verified: {
          type: Boolean,
          default: false
        },

        originalSeen: {
          type: Boolean,
          default: false
        },

        photocopyCollected: {
          type: Boolean,
          default: false
        },

        remarks: String
      }
    ],

    verificationScore: {
      type: Number,
      default: 0
    },

    customerConsent: {
      accepted: {
        type: Boolean,
        default: false
      },

      signature: String,

      signedAt: Date,
    },

    // ======================================
    // WITNESS
    // ======================================

    witness: {
      fullName: String,

      mobile: String,

      relation: String,

      // Maximum 2
      signatures: [
        {
          name: {
            type: String,
            trim: true,
          },

          imageUrl: {
            type: String,
            trim: true,
          },

          publicId: String,
        }
      ],

      // Maximum 2
      photos: [
        {
          name: {
            type: String,
            trim: true,
          },

          imageUrl: {
            type: String,
            trim: true,
          },

          publicId: String,
        }
      ],

      // Maximum 10
      documents: [
        {
          docTypeName: {
            type: String,
            trim: true,
          },

          docTypeId: {
            type: String,
            trim: true,
          },

          docUrl: {
            type: String,
            trim: true,
          },

          publicId: String,
        }
      ],

      agreed: {
        type: Boolean,
        default: false
      },

      signedAt: Date
    },

    visitorDeclaration: {
      accepted: {
        type: Boolean,
        default: false
      },

      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },

      reviewedAt: Date,

      signature: String,

      declaredAt: Date,
    },

    // Admin Review

    reviewRemarks: {
      type: String,
      trim: true,
    },

    rejectionReason: {
      code: String,

      message: String,
    },

    rejectionReason: {
      code: String,
      message: String,
      rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      rejectedAt: Date,
    },

    remarks: String,

    startedAt: Date,

    photos: [
      {
        category: {
          type: String,
          enum: [
            "CUSTOMER",
            "CUSTOMER_SELFIE",
            "HOUSE_FRONT",
            "HOUSE_INSIDE",
            "SHOP",
            "OFFICE",
            "DOCUMENT",
            "WITNESS",
            "OTHER"
          ]
        },

        url: {
          type: String,
          required: true
        },

        publicId: String,

        uploadedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    completedAt: Date,

    submittedAt: Date,

    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

visitorVerificationSchema.index({
  loan: 1,
  visitor: 1,
});

visitorVerificationSchema.index({
  customer: 1,
});

visitorVerificationSchema.index({
  status: 1,
});

export default mongoose.model(
  "VisitorVerification",
  visitorVerificationSchema
);