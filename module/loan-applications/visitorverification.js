import mongoose from "mongoose";

const visitorVerificationSchema = new mongoose.Schema(
  {
    // ======================================
    // VERIFICATION BASIC DETAILS
    // ======================================

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

    // ======================================
    // STATUS
    // ======================================

    status: {
      type: String,
      enum: ["ASSIGNED", "IN_PROGRESS", "SUBMITTED", "APPROVED", "REJECTED"],
      default: "ASSIGNED",
      index: true,
    },

    // ======================================
    // RECOMMENDATION
    // ======================================

    recommendation: {
      type: String,
      enum: ["APPROVE", "REJECT"],
      default: null,
    },

    // ======================================
    // INVESTIGATION
    // ======================================

    investigation: {
      customerAvailable: {
        type: Boolean,
        default: false,
      },

      customerVerified: {
        type: Boolean,
        default: false,
      },

      addressVerified: {
        type: Boolean,
        default: false,
      },

      employmentVerified: {
        type: Boolean,
        default: false,
      },

      businessVerified: {
        type: Boolean,
        default: false,
      },

      incomeVerified: {
        type: Boolean,
        default: false,
      },

      originalDocumentsVerified: {
        type: Boolean,
        default: false,
      },

      photocopiesCollected: {
        type: Boolean,
        default: false,
      },

      houseVisited: {
        type: Boolean,
        default: false,
      },

      neighboursVerified: {
        type: Boolean,
        default: false,
      },

      remarks: {
        type: String,
        trim: true,
      },
    },

    // ======================================
    // LOCATION
    // ======================================

    location: {
      latitude: {
        type: Number,
      },

      longitude: {
        type: Number,
      },

      address: {
        type: String,
        trim: true,
      },
    },

    // ======================================
    // VERIFICATION PHOTOS
    // Actual image is NOT stored in DB.
    // Only Cloudinary metadata is stored.
    // ======================================

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
            "OTHER",
          ],
        },

        name: {
          type: String,
          trim: true,
        },

        url: {
          type: String,
          required: true,
          trim: true,
        },

        publicId: {
          type: String,
          trim: true,
        },

        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],


    // ======================================
// SITE DETAILS
// ======================================

siteDetails: {
  photos: [
    {
      name: {
        type: String,
        trim: true,
      },

      url: {
        type: String,
        required: true,
        trim: true,
      },

      publicId: {
        type: String,
        trim: true,
      },

      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
},

    // ======================================
    // VERIFICATION VIDEOS
    // ======================================

    videos: [
      {
        category: {
          type: String,
          enum: ["CUSTOMER", "HOUSE", "SHOP", "OFFICE", "OTHER"],
        },

        name: {
          type: String,
          trim: true,
        },

        url: {
          type: String,
          required: true,
          trim: true,
        },

        publicId: {
          type: String,
          trim: true,
        },

        duration: {
          type: Number,
        },

        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ======================================
    // FINAL DECLARATION
    // ======================================

    finalDeclaration: {
      informationCorrect: {
        type: Boolean,
        default: false,
      },

      photosGenuine: {
        type: Boolean,
        default: false,
      },

      investigationCompleted: {
        type: Boolean,
        default: false,
      },

      acceptedAt: {
        type: Date,
      },
    },

    // ======================================
    // VERIFICATION DOCUMENTS
    // ======================================

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
            "OTHER",
          ],
        },

        owner: {
          type: String,
          enum: ["CUSTOMER", "WITNESS"],
        },

        frontUrl: {
          type: String,
          trim: true,
        },

        backUrl: {
          type: String,
          trim: true,
        },

        verified: {
          type: Boolean,
          default: false,
        },

        originalSeen: {
          type: Boolean,
          default: false,
        },

        photocopyCollected: {
          type: Boolean,
          default: false,
        },

        remarks: {
          type: String,
          trim: true,
        },
      },
    ],

    // ======================================
    // VERIFICATION SCORE
    // ======================================

    verificationScore: {
      type: Number,
      default: 0,
    },

    // ======================================
    // CUSTOMER CONSENT
    // ======================================

    customerConsent: {
      accepted: {
        type: Boolean,
        default: false,
      },

      signature: {
        type: String,
        trim: true,
      },

      signedAt: {
        type: Date,
      },
    },

    // ======================================
    // WITNESS
    // ======================================

    witness: {
      fullName: {
        type: String,
        trim: true,
      },

      mobile: {
        type: String,
        trim: true,
      },

      relation: {
        type: String,
        trim: true,
      },

      // ------------------------------------
      // Witness Signatures - Maximum 2
      // ------------------------------------

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

          publicId: {
            type: String,
            trim: true,
          },
        },
      ],

      // ------------------------------------
      // Witness Photos - Maximum 2
      // ------------------------------------

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

          publicId: {
            type: String,
            trim: true,
          },
        },
      ],

      // ------------------------------------
      // Witness Documents - Maximum 10
      // ------------------------------------

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

          publicId: {
            type: String,
            trim: true,
          },
        },
      ],

      agreed: {
        type: Boolean,
        default: false,
      },

      signedAt: {
        type: Date,
      },
    },

    // ======================================
    // VISITOR DECLARATION
    // ======================================

    visitorDeclaration: {
      accepted: {
        type: Boolean,
        default: false,
      },

      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },

      reviewedAt: {
        type: Date,
      },

      signature: {
        type: String,
        trim: true,
      },

      declaredAt: {
        type: Date,
      },
    },

    // ======================================
    // ADMIN REVIEW
    // ======================================

    reviewRemarks: {
      type: String,
      trim: true,
    },

    // ======================================
    // REJECTION REASON
    // ======================================

    rejectionReason: {
      code: {
        type: String,
        trim: true,
      },

      message: {
        type: String,
        trim: true,
      },

      rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },

      rejectedAt: {
        type: Date,
      },
    },

    // ======================================
    // GENERAL REMARKS
    // ======================================

    remarks: {
      type: String,
      trim: true,
    },

    // ======================================
    // TIMELINE
    // ======================================

    startedAt: {
      type: Date,
    },

    completedAt: {
      type: Date,
    },

    submittedAt: {
      type: Date,
    },

    // ======================================
    // VERSION
    // ======================================

    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  },
);

// ==========================================
// INDEXES
// ==========================================

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

// ==========================================
// MODEL
// ==========================================

export default mongoose.model("VisitorVerification", visitorVerificationSchema);
