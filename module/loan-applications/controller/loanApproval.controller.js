import mongoose from "mongoose";
import approvalService from "../loanApproval.model.js";
import LoanApplication from "../loanApplication.model.js";
import User from "../../User/user.route.js";
import { applyManualLoan } from "../service.js/manualLoan.service.js";
import { applyInstantLoan } from "../service.js/instantLoan.service.js";
import { uploadToCloudinary } from "../service.js/visitorVerification.service.js";
import VisitorVerification from "../visitorverification.js";
import Employee  from "../../User/Employee_Schema.js";
import { getVerificationProgress } from "../helper/visitorProgress.helper.js";
export const createApproval = async (req, res) => {
  try {
    const approval = await approvalService.createApproval(req.body, req.user);

    return res.status(201).json({
      success: true,
      message: "Loan approval created successfully.",
      data: approval,
    });
  } catch (error) {
    console.error("Create Approval Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const approveLoan = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { loanId } = req.params;

    const {
      approvedAmount,
      approvedTenure,
      interestRate,
      processingFee = 0,
      remarks = "",
    } = req.body || {};

    if (!approvedAmount || !approvedTenure || !interestRate) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message:
          "approvedAmount, approvedTenure and interestRate are required.",
      });
    }

    // Get Loan
    const loan = await LoanApplication.findById(loanId)
      .populate("product")
      .session(session);

    if (!loan) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Loan application not found.",
      });
    }

    if (loan.status !== "UNDER_REVIEW") {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Loan is not under review.",
      });
    }

    /**
     * ===================================
     * MANUAL LOAN VALIDATION
     * ===================================
     */
    if (loan.product.processingType === "MANUAL") {
      const verification = await VisitorVerification.findOne({
        loan: loan._id,
      }).session(session);

      if (!verification) {
        await session.abortTransaction();

        return res.status(404).json({
          success: false,
          message: "Visitor verification not found.",
        });
      }

      if (verification.status !== "SUBMITTED") {
        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message:
            "Visitor verification is not submitted or already reviewed.",
        });
      }

      // Approve Visitor Verification
      verification.status = "APPROVED";
      verification.reviewedBy = req.user._id;
      verification.reviewedAt = new Date();

      if (remarks) {
        verification.reviewRemarks = remarks;
      }

      await verification.save({ session });
    }

    /**
     * ===================================
     * APPROVE LOAN
     * ===================================
     */
    loan.status = "APPROVED";
    loan.stage = "DISBURSEMENT";
    loan.approvedAmount = approvedAmount;
    loan.tenure = approvedTenure;
    loan.interestRate = interestRate;

    await loan.save({ session });

    /**
     * ===================================
     * APPROVAL HISTORY
     * ===================================
     */
    const approval = await approvalService.create(
      [
        {
          loan: loan._id,
          reviewer: req.user._id,
          approver: req.user._id,
          status: "APPROVED",
          approvedAmount,
          approvedTenure,
          interestRate,
          processingFee,
          remarks,
          approvedAt: new Date(),
        },
      ],
      { session },
    );

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: `${
        loan.product.processingType === "MANUAL"
          ? "Manual"
          : "Instant"
      } loan approved successfully.`,
      data: {
        loan,
        approval: approval[0],
      },
    });
  } catch (error) {
    await session.abortTransaction();

    console.error("Approve Loan Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    session.endSession();
  }
};

export const rejectLoan = async (req, res) => {
  try {
    const approval = await approvalService.rejectLoan(
      req.params.loanId,
      req.body,
      req.user,
    );

    return res.status(200).json({
      success: true,
      message: "Loan rejected successfully.",
      data: approval,
    });
  } catch (error) {
    console.error("Reject Loan Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Update Approval
 * PATCH /loan-approval/:loanId
 */
export const updateApproval = async (req, res) => {
  try {
    const approval = await approvalService.updateApproval(
      req.params.loanId,
      req.body,
      req.user,
    );

    return res.status(200).json({
      success: true,
      message: "Loan approval updated successfully.",
      data: approval,
    });
  } catch (error) {
    console.error("Update Approval Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Cancel Approval
 * PATCH /loan-approval/:loanId/cancel
 */
export const cancelApproval = async (req, res) => {
  try {
    const approval = await approvalService.cancelApproval(
      req.params.loanId,
      req.user,
    );

    return res.status(200).json({
      success: true,
      message: "Loan approval cancelled successfully.",
      data: approval,
    });
  } catch (error) {
    console.error("Cancel Approval Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get Approval By Loan Id
 * GET /loan-approval/:loanId
 */
// export const getApproval = async (req, res) => {
//   try {
//     const approval = await approvalService.getApproval(
//       req.params.loanId
//     );

//     return res.status(200).json({
//       success: true,
//       data: approval,
//     });
//   } catch (error) {
//     console.error("Get Approval Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

/**
 * Get All Pending Approvals
 * GET /loan-approval/pending
 */
export const getPendingApprovals = async (req, res) => {
  try {
    const approvals = await LoanApplication.find({
      status: "UNDER_REVIEW",
    })
      .populate("customer", "name email phone")
      .populate("product");

    return res.status(200).json({
      success: true,
      count: approvals.length,
      data: approvals,
    });
  } catch (error) {
    console.error("Pending Approvals Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get All Approved Loans
 * GET /loan-approval/approved
 */
export const getApprovedLoans = async (req, res) => {
  try {
    const approvals = await approvalService.getApprovedLoans();

    return res.status(200).json({
      success: true,
      count: approvals.length,
      data: approvals,
    });
  } catch (error) {
    console.error("Approved Loans Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get All Rejected Loans
 * GET /loan-approval/rejected
 */
export const getRejectedLoans = async (req, res) => {
  try {
    const approvals = await approvalService.getRejectedLoans();

    return res.status(200).json({
      success: true,
      count: approvals.length,
      data: approvals,
    });
  } catch (error) {
    console.error("Rejected Loans Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



const generateJobId = () => {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);

  return `JOB-${year}-${timestamp}`;
};

export const assignVisitor = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { loanId } = req.params;
    const { visitorId } = req.body;

    if (!visitorId) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Visitor is required.",
      });
    }

    // Get Loan
    const loan = await LoanApplication.findById(loanId)
      .populate("product")
      .session(session);

    if (!loan || loan.isDeleted) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Loan application not found.",
      });
    }

    // Only Manual Loan
    if (loan.product.processingType !== "MANUAL") {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Visitor can only be assigned to manual loans.",
      });
    }

    // Only Submitted Loan
    if (!["SUBMITTED", "DOCUMENT_PENDING"].includes(loan.status)) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Visitor cannot be assigned at current loan status.",
      });
    }

    // Already Assigned
    if (loan.assignedVisitor) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Visitor already assigned.",
      });
    }

    // Get Visitor
    const visitor = await Employee.findById(visitorId).session(session);

    if (!visitor) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Visitor not found.",
      });
    }

    if (visitor.role !== "VISITOR") {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Selected user is not a visitor.",
      });
    }

 if (visitor.status !== "ACTIVE") {
  await session.abortTransaction();

  return res.status(400).json({
    success: false,
    message: "Visitor account is inactive.",
  });
}
const jobId = generateJobId();
const verificationId = `VV-${Date.now()}`;

    // Update Loan
    loan.assignedVisitor = visitor._id;
    loan.visitorAssignedAt = new Date();
    loan.stage = "VISITOR_VERIFICATION";
    loan.status = "VISITOR_ASSIGNED";

    await loan.save({ session });

    // Create Verification Record
  await VisitorVerification.create(
  [
    {
      jobId,
      verificationId,

      loan: loan._id,
      customer: loan.customer,
      visitor: visitor._id,

      status: "ASSIGNED",

      photos: [],
      videos: [],
      documents: [],

      investigation: {},

      location: {},

      witness: {},

      customerConsent: {},

      visitorDeclaration: {},

      recommendation: null,

      remarks: "",

      startedAt: null,
      submittedAt: null,
      completedAt: null,
    },
  ],
  {
    session,
  }
);

    await session.commitTransaction();

return res.status(200).json({
  success: true,
  message: "Visitor assigned successfully.",
  data: {
    jobId,
    verificationId,
    loanId: loan._id,
    applicationId: loan.applicationId,
    visitorId: visitor._id,
    visitorName: visitor.fullName,
    status: "ASSIGNED",
    assignedAt: loan.visitorAssignedAt,
  },
});
  } catch (error) {
    await session.abortTransaction();

    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    session.endSession();
  }
};

export const getAllVisitors = async (req, res) => {
  try {
    const visitors = await Employee.find({
      role: "VISITOR",
      status: "ACTIVE",
    })
      .select("_id fullName employeeId mobile email profileImage")
      .sort({ fullName: 1 });

    return res.status(200).json({
      success: true,
      count: visitors.length,
      data: visitors,
    });
  } catch (error) {
    console.error("Get Visitors Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getVisitorActivity = async (req, res) => {
  try {
    const visitorId = req.user._id;

    const [assigned, inProgress, submitted, approved, rejected, today] =
      await Promise.all([
        VisitorVerification.countDocuments({
          visitor: visitorId,
          status: "ASSIGNED",
        }),

        VisitorVerification.countDocuments({
          visitor: visitorId,
          status: "IN_PROGRESS",
        }),

        VisitorVerification.countDocuments({
          visitor: visitorId,
          status: "SUBMITTED",
        }),

        VisitorVerification.countDocuments({
          visitor: visitorId,
          status: "APPROVED",
        }),

        VisitorVerification.countDocuments({
          visitor: visitorId,
          status: "REJECTED",
        }),

        VisitorVerification.find({
          visitor: visitorId,
        })
          .populate({
            path: "loan",
            select: "applicationId amount status customer",
            populate: {
              path: "customer",
              select: "fullName mobile",
            },
          })
          .sort({ createdAt: -1 })
          .limit(10),
      ]);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          assigned,
          inProgress,
          submitted,
          approved,
          rejected,
        },
        recentActivities: today,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const submitVerification = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const { loanId } = req.params;

    const {
      informationCorrect,
      photosGenuine,
      investigationCompleted,
    } = req.body;

    const verification = await VisitorVerification.findOne({
      loan: loanId,
      visitor: req.user._id,
    }).session(session);

    if (!verification) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Verification not found.",
      });
    }

    if (verification.status === "SUBMITTED") {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Verification already submitted.",
      });
    }

    // ======================================================
    // Investigation Validation
    // ======================================================

    const investigation = verification.investigation || {};

    const investigationCompletedFlag =
      investigation.customerAvailable ||
      investigation.customerVerified ||
      investigation.addressVerified ||
      investigation.employmentVerified ||
      investigation.businessVerified ||
      investigation.incomeVerified ||
      investigation.originalDocumentsVerified ||
      investigation.photocopiesCollected ||
      investigation.houseVisited ||
      investigation.neighboursVerified;

    if (!investigationCompletedFlag) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Please complete investigation.",
      });
    }

    // ======================================================
    // Photo Validation
    // ======================================================

    const requiredPhotos = [
      "CUSTOMER",
      "CUSTOMER_SELFIE",
      "HOUSE_FRONT",
    ];

    const uploadedPhotos = verification.photos.map(
      (item) => item.category
    );

    const missingPhotos = requiredPhotos.filter(
      (item) => !uploadedPhotos.includes(item)
    );

    if (missingPhotos.length) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: `Missing required photos: ${missingPhotos.join(", ")}`,
      });
    }

    // ======================================================
    // Document Validation
    // ======================================================

    const requiredDocuments = [
      "AADHAAR",
      "PAN",
    ];

    const uploadedDocuments = verification.documents.map(
      (item) => item.type
    );

    const missingDocuments = requiredDocuments.filter(
      (item) => !uploadedDocuments.includes(item)
    );

    if (missingDocuments.length) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: `Missing required documents: ${missingDocuments.join(", ")}`,
      });
    }

    // ======================================================
    // Witness Validation
    // ======================================================

    if (!verification.witness?.agreed) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Witness verification is required.",
      });
    }

    // ======================================================
    // Customer Consent
    // ======================================================

    if (!verification.customerConsent?.accepted) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Customer consent is required.",
      });
    }

    // ======================================================
    // Recommendation
    // ======================================================

    if (!verification.recommendation) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Recommendation is required.",
      });
    }

    // ======================================================
    // Final Declaration Validation
    // ======================================================

    if (
      !informationCorrect ||
      !photosGenuine ||
      !investigationCompleted
    ) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message:
          "Please accept all declaration checkboxes before submitting.",
      });
    }

    verification.finalDeclaration = {
      informationCorrect,
      photosGenuine,
      investigationCompleted,
      acceptedAt: new Date(),
    };

    // ======================================================
    // Loan Validation
    // ======================================================

    const loan = await LoanApplication.findById(loanId).session(session);

    if (!loan) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Loan not found.",
      });
    }

    // ======================================================
    // Final Submission
    // ======================================================

    verification.status = "SUBMITTED";
    verification.submittedAt = new Date();
    verification.completedAt = new Date();

    await verification.save({ session });

    loan.status = "UNDER_REVIEW";
    loan.stage = "ADMIN_REVIEW";

    await loan.save({ session });

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message:
        "Verification submitted successfully. Waiting for admin approval.",
      data: {
        verificationId: verification.verificationId,
        jobId: verification.jobId,
        status: verification.status,
        submittedAt: verification.submittedAt,
      },
    });

  } catch (error) {
    await session.abortTransaction();

    console.error("Submit Verification Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  } finally {
    session.endSession();
  }
};

export const saveInvestigation = async (req, res) => {
  try {
    const { loanId } = req.params;

    const verification = await VisitorVerification.findOne({
      loan: loanId,
      visitor: req.user._id,
    });

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "Verification not found.",
      });
    }

    if (verification.status === "SUBMITTED") {
      return res.status(400).json({
        success: false,
        message: "Already submitted.",
      });
    }

    const {
      investigation,
      location,
      recommendation,
      remarks,
      description,
    } = req.body;

    // Description is optional
    if (description !== undefined) {
      verification.description = description;
    }

    // Investigation data is optional
    if (investigation !== undefined) {
      verification.investigation = investigation;
    }

    // Location is optional
    // GPS location OR manual address - both supported
    if (location !== undefined) {
      verification.location = location;
    }

    // Recommendation is optional
    // Ignore empty string
    if (
      recommendation !== undefined &&
      recommendation !== null &&
      recommendation !== ""
    ) {
      verification.recommendation = recommendation;
    }

    // Investigation remark
    if (remarks !== undefined) {
      if (!verification.investigation) {
        verification.investigation = {};
      }

      verification.investigation.remarks = remarks;
    }

    // Start investigation
    if (verification.status === "ASSIGNED") {
      verification.status = "IN_PROGRESS";
      verification.startedAt = new Date();
    }

    await verification.save();

    return res.status(200).json({
      success: true,
      message: "Investigation saved you can start next.",
      data: verification,
    });

  } catch (error) {
    console.error("Save Investigation Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const uploadPhotos = async (req, res) => {
  try {
    const { loanId } = req.params;

    // Check files
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one photo is required.",
      });
    }

    // Check category
    const category = req.body.category?.trim();

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Photo category is required.",
      });
    }

    // Find verification
    const verification = await VisitorVerification.findOne({
      loan: loanId,
      visitor: req.user._id,
    });

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "Verification not found.",
      });
    }

    // Already submitted
    if (verification.status === "SUBMITTED") {
      return res.status(400).json({
        success: false,
        message: "Verification already submitted.",
      });
    }

    const uploadedFiles = [];

    // Upload all photos
    for (const file of req.files) {
      const uploaded = await uploadToCloudinary(
        file.buffer,
        `visitor-verification/${loanId}/photos`
      );

      const photoData = {
        category,
        name: file.originalname,
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        uploadedAt: new Date(),
      };

      // Save in verification.photos
      verification.photos.push(photoData);

      uploadedFiles.push(photoData);
    }

    // Change status when first photo is uploaded
    if (verification.status === "ASSIGNED") {
      verification.status = "IN_PROGRESS";
      verification.startedAt = new Date();
    }

    await verification.save();

    return res.status(201).json({
      success: true,
      message: "Photos uploaded successfully.",
      data: uploadedFiles,
    });
  } catch (error) {
    console.error("Upload Photos Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const saveSiteDetails = async (req, res) => {
  try {
    const { loanId } = req.params;
    const { photos } = req.body;

    const verification = await VisitorVerification.findOne({
      loan: loanId,
      visitor: req.user._id,
    });

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "Verification not found.",
      });
    }

    if (verification.status === "SUBMITTED") {
      return res.status(400).json({
        success: false,
        message: "Verification already submitted.",
      });
    }

    if (!Array.isArray(photos)) {
      return res.status(400).json({
        success: false,
        message: "Photos must be an array.",
      });
    }

    if (photos.length > 10) {
      return res.status(400).json({
        success: false,
        message: "Maximum 10 site photos allowed.",
      });
    }

    for (const photo of photos) {
      if (!photo.name || !photo.url) {
        return res.status(400).json({
          success: false,
          message: "Each site photo must contain name and url.",
        });
      }
    }

    verification.siteDetails = {
      photos,
    };

    if (verification.status === "ASSIGNED") {
      verification.status = "IN_PROGRESS";
      verification.startedAt = new Date();
    }

    await verification.save();

    return res.status(200).json({
      success: true,
      message: "Site details saved successfully.",
      data: verification.siteDetails,
    });
  } catch (error) {
    console.error("Save Site Details Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const saveWitness = async (req, res) => {
  try {
    const { loanId } = req.params;

    const verification = await VisitorVerification.findOne({
      loan: loanId,
      visitor: req.user._id,
    });

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "Verification not found.",
      });
    }

    if (verification.status === "SUBMITTED") {
      return res.status(400).json({
        success: false,
        message: "Verification already submitted.",
      });
    }

    const {
      fullName,
      mobile,
      relation,
      signatures,
      photos,
      documents,
      agreed,
    } = req.body;

    // ======================================
    // Validation
    // ======================================

    if (!fullName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Witness name is required.",
      });
    }

    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: "Witness mobile number is required.",
      });
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mobile number.",
      });
    }

    if (!relation?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Relation is required.",
      });
    }

    if (!(agreed === true || agreed === "true")) {
      return res.status(400).json({
        success: false,
        message: "Please accept witness declaration.",
      });
    }

    // ======================================
    // Parse Arrays
    // ======================================

    let parsedSignatures = signatures || [];
    let parsedPhotos = photos || [];
    let parsedDocuments = documents || [];

    if (typeof parsedSignatures === "string") {
      try {
        parsedSignatures = JSON.parse(parsedSignatures);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid signatures format.",
        });
      }
    }

    if (typeof parsedPhotos === "string") {
      try {
        parsedPhotos = JSON.parse(parsedPhotos);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid witness photos format.",
        });
      }
    }

    if (typeof parsedDocuments === "string") {
      try {
        parsedDocuments = JSON.parse(parsedDocuments);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid documents format.",
        });
      }
    }

    // ======================================
    // Array Validation
    // ======================================

    if (!Array.isArray(parsedSignatures)) {
      return res.status(400).json({
        success: false,
        message: "Signatures must be an array.",
      });
    }

    if (!Array.isArray(parsedPhotos)) {
      return res.status(400).json({
        success: false,
        message: "Witness photos must be an array.",
      });
    }

    if (!Array.isArray(parsedDocuments)) {
      return res.status(400).json({
        success: false,
        message: "Documents must be an array.",
      });
    }

    // ======================================
    // Maximum Limits
    // ======================================

    if (parsedSignatures.length > 2) {
      return res.status(400).json({
        success: false,
        message: "Maximum 2 signatures are allowed.",
      });
    }

    if (parsedPhotos.length > 2) {
      return res.status(400).json({
        success: false,
        message: "Maximum 2 witness photos are allowed.",
      });
    }

    if (parsedDocuments.length > 10) {
      return res.status(400).json({
        success: false,
        message: "Maximum 10 documents are allowed.",
      });
    }

    // ======================================
    // Validate Signatures
    // ======================================

    for (const signature of parsedSignatures) {
      if (!signature?.name?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Signature name is required.",
        });
      }

      if (!signature?.imageUrl?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Signature image URL is required.",
        });
      }
    }

    // ======================================
    // Validate Witness Photos
    // ======================================

    for (const photo of parsedPhotos) {
      if (!photo?.name?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Witness photo name is required.",
        });
      }

      if (!photo?.imageUrl?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Witness photo URL is required.",
        });
      }
    }

    // ======================================
    // Validate Documents
    // ======================================

    for (const document of parsedDocuments) {
      if (!document?.docTypeName?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Document type name is required.",
        });
      }

      if (!document?.docTypeId?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Document type ID is required.",
        });
      }

      if (!document?.docUrl?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Document URL is required.",
        });
      }
    }

    // ======================================
    // Save Witness Details
    // ======================================

    verification.witness = {
      ...verification.witness,

      fullName: fullName.trim(),

      mobile: mobile.trim(),

      relation: relation.trim(),

      signatures: parsedSignatures.map((signature) => ({
        name: signature.name.trim(),
        imageUrl: signature.imageUrl.trim(),
        publicId: signature.publicId || undefined,
      })),

      photos: parsedPhotos.map((photo) => ({
        name: photo.name.trim(),
        imageUrl: photo.imageUrl.trim(),
        publicId: photo.publicId || undefined,
      })),

      documents: parsedDocuments.map((document) => ({
        docTypeName: document.docTypeName.trim(),
        docTypeId: document.docTypeId.trim(),
        docUrl: document.docUrl.trim(),
        publicId: document.publicId || undefined,
      })),

      agreed: true,

      signedAt: new Date(),
    };

    // ======================================
    // Start Verification
    // ======================================

    if (verification.status === "ASSIGNED") {
      verification.status = "IN_PROGRESS";
      verification.startedAt = new Date();
    }

    await verification.save();

    // ======================================
    // Progress
    // ======================================

    const progress = getVerificationProgress(verification);

    return res.status(200).json({
      success: true,
      message: "Witness details saved successfully.",

      data: {
        witness: verification.witness,

        progress,

        canResume: true,
      },
    });

  } catch (error) {
    console.error("Save Witness Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};




export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File is required.",
      });
    }

    const { folder } = req.body;

    const uploadFolder =
      folder?.trim() || "visitor-verification";

    const uploaded = await uploadToCloudinary(
      req.file.buffer,
      uploadFolder
    );

    return res.status(200).json({
      success: true,
      message: "File uploaded successfully.",

      data: {
        url: uploaded.secure_url,
        name: req.file.originalname,
        publicId: uploaded.public_id,
      },
    });

  } catch (error) {
    console.error("Upload File Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// admin flow of manual verification 

export const getVerificationDetails = async (req, res) => {
  try {
    const { loanId } = req.params;

    const verification = await VisitorVerification.findOne({
      loan: loanId,
    })
      .populate({
        path: "loan",
        populate: [
          {
            path: "customer",
            select: "fullName mobile email",
          },
          {
            path: "product",
            select: "name processingType",
          },
        ],
      })
      .populate(
        "visitor",
        "fullName employeeId mobile email profileImage"
      );

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "Verification not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: verification,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};




// ✅ Yaha rakho
const calculateProgress = (verification) => {
  const checklist = [
    !!verification.startedAt,
    !!verification.location?.latitude,
    !!verification.location?.longitude,

    verification.investigation?.customerAvailable,
    verification.investigation?.customerVerified,
    verification.investigation?.addressVerified,
    verification.investigation?.employmentVerified,
    verification.investigation?.businessVerified,
    verification.investigation?.incomeVerified,

    verification.photos?.length > 0,
    verification.documents?.length > 0,

    !!verification.customerConsent?.accepted,

    !!verification.witness?.fullName,
    !!verification.witness?.signature?.url,

    !!verification.visitorDeclaration?.accepted,

    !!verification.submittedAt,
  ];

  const completed = checklist.filter(Boolean).length;

  return Math.round((completed / checklist.length) * 100);
};


// ✅ Ye bhi yahi rakho
const getChecklist = (verification) => {
  return [
    {
      title: "Visit Started",
      completed: !!verification.startedAt,
    },
    {
      title: "GPS Captured",
      completed: !!verification.location?.latitude,
    },
    {
      title: "Customer Verified",
      completed: !!verification.investigation?.customerVerified,
    },
    {
      title: "Address Verified",
      completed: !!verification.investigation?.addressVerified,
    },
    {
      title: "Photos Uploaded",
      completed: verification.photos?.length > 0,
    },
    {
      title: "Documents Uploaded",
      completed: verification.documents?.length > 0,
    },
    {
      title: "Witness Added",
      completed: !!verification.witness?.fullName,
    },
    {
      title: "Customer Consent",
      completed: !!verification.customerConsent?.accepted,
    },
    {
      title: "Final Submitted",
      completed: !!verification.submittedAt,
    },
  ];
};


// API Controllers niche
export const getMyApplications = async (req, res) => {
  try {
    const visitorId = req.user._id;

    const loans = await LoanApplication.find({
      assignedVisitor: visitorId,
      isDeleted: false,
    })
      .populate("customer", "fullName mobile")
      .populate("product", "displayName")
      .sort({ createdAt: -1 });

    const response = await Promise.all(
      loans.map(async (loan) => {
        const verification = await VisitorVerification.findOne({
          loan: loan._id,
        });

        let progress = 0;

        if (verification) {
          progress = calculateProgress(verification);
        }

        return {
          loanId: loan._id,

          applicationId: loan.applicationId,

          customer: loan.customer,

          product: loan.product,

          amount: loan.amount,

          status: loan.status,

          stage: loan.stage,

          // ======================================
          // NEW FIELDS FOR MY APPLICATIONS SCREEN
          // ======================================

          loanType: loan.product?.displayName || null,

          assignedDate: loan.assignedDate || null,

          address: loan.address || null,

          // ======================================
          // VISITOR VERIFICATION
          // ======================================

          verificationStatus:
            verification?.status || "ASSIGNED",

          progress,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: response,
    });
  } catch (err) {
    console.error("Get My Applications Error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


export const getApplicationProgress = async (req, res) => {
  try {
    const { loanId } = req.params;

    const verification = await VisitorVerification.findOne({
      loan: loanId,
      visitor: req.user._id,
    })
      .populate("customer", "fullName mobile")
      .populate("loan");

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "Verification not found.",
      });
    }

    // Production Resume Helper
    const progress = getVerificationProgress(verification);

    return res.status(200).json({
      success: true,
      message: "Verification details fetched successfully.",
      data: {
        // IDs
        jobId: verification.jobId,
        verificationId: verification.verificationId,

        // Loan
        loan: verification.loan,
        customer: verification.customer,

        // Status
        status: verification.status,

        // Resume Information
        progress,

        canResume: verification.status !== "SUBMITTED",
        isCompleted: verification.status === "SUBMITTED",

        // Investigation
        investigation: verification.investigation,
        location: verification.location,
        recommendation: verification.recommendation,
        remarks: verification.remarks,

        // Media
        photos: verification.photos,
        videos: verification.videos,
        documents: verification.documents,

        // Witness
        witness: verification.witness,

        // Consent
        customerConsent: verification.customerConsent,
        visitorDeclaration: verification.visitorDeclaration,

        // Timeline
        startedAt: verification.startedAt,
        submittedAt: verification.submittedAt,
        completedAt: verification.completedAt,

        // Checklist
        checklist: getChecklist(verification),
      },
    });
  } catch (err) {
    console.error("Get Application Progress Error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getVisitorDashboard = async (req, res) => {
  try {
    const visitorId = req.user._id;

    // ============================================
    // Visitor Details
    // ============================================

    const visitor = await Employee.findById(visitorId).select(
      "employeeId fullName mobile email profileImage role"
    );

    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: "Visitor not found",
      });
    }

    // ============================================
    // Date Calculations
    // ============================================

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const currentWeekStart = new Date();
    currentWeekStart.setDate(
      currentWeekStart.getDate() - currentWeekStart.getDay()
    );
    currentWeekStart.setHours(0, 0, 0, 0);

    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);

    // ============================================
    // Dashboard Counts
    // ============================================

    const [
      totalAssigned,
      assigned,
      inProgress,
      submitted,
      newAssignments,
      highPriority,
      currentWeekCompleted,
      previousWeekCompleted,
    ] = await Promise.all([
      VisitorVerification.countDocuments({
        visitor: visitorId,
      }),

      VisitorVerification.countDocuments({
        visitor: visitorId,
        status: "ASSIGNED",
      }),

      VisitorVerification.countDocuments({
        visitor: visitorId,
        status: "IN_PROGRESS",
      }),

      VisitorVerification.countDocuments({
        visitor: visitorId,
        status: "SUBMITTED",
      }),

      LoanApplication.countDocuments({
        assignedVisitor: visitorId,
        visitorAssignedAt: {
          $gte: todayStart,
        },
        isDeleted: false,
      }),

      LoanApplication.countDocuments({
        assignedVisitor: visitorId,
        amount: {
          $gte: 1000000,
        },
        isDeleted: false,
      }),

      VisitorVerification.countDocuments({
        visitor: visitorId,
        status: "SUBMITTED",
        submittedAt: {
          $gte: currentWeekStart,
        },
      }),

      VisitorVerification.countDocuments({
        visitor: visitorId,
        status: "SUBMITTED",
        submittedAt: {
          $gte: previousWeekStart,
          $lt: currentWeekStart,
        },
      }),
    ]);

    // ============================================
    // Calculated Values
    // ============================================

    const pending = assigned + inProgress;

    const completionRate =
      totalAssigned === 0
        ? 0
        : Math.round((submitted / totalAssigned) * 100);

    const visitGrowth =
      previousWeekCompleted === 0
        ? currentWeekCompleted > 0
          ? 100
          : 0
        : Math.round(
            ((currentWeekCompleted - previousWeekCompleted) /
              previousWeekCompleted) *
              100
          );

    // ============================================
    // Assigned Loans
    // (Part-2 me continue hoga...)
    // ============================================

    const loans = await LoanApplication.find({
      assignedVisitor: visitorId,
      isDeleted: false,
    })
      .populate("customer", "fullName mobile city state")
      .populate("product", "displayName name")
      .sort({ visitorAssignedAt: -1 });
          // ============================================
    // Visitor Verification Map
    // ============================================

    const loanIds = loans.map((loan) => loan._id);

const verifications = await VisitorVerification.find({
  loan: { $in: loanIds },
  visitor: visitorId,
}).select(
  "jobId verificationId loan status investigation photos videos documents startedAt submittedAt"
);

    const verificationMap = new Map();

    verifications.forEach((item) => {
      verificationMap.set(item.loan.toString(), item);
    });

    // ============================================
    // Today Jobs
    // ============================================

    const todayJobs = loans.map((loan) => {
      const verification = verificationMap.get(loan._id.toString());

      let progress = 0;

      if (verification) {
        progress = calculateProgress(verification);
      }

      let priority = "LOW";

      if (loan.amount >= 1000000) {
        priority = "HIGH";
      } else if (loan.amount >= 300000) {
        priority = "MEDIUM";
      }

      return {
  jobId: verification?.jobId || null,

  verificationId: verification?.verificationId || null,

  loanId: loan._id,

  applicationId: loan.applicationId,

  customer: {
    id: loan.customer?._id,
    name: loan.customer?.fullName,
    mobile: loan.customer?.mobile,
    city: loan.customer?.city,
    state: loan.customer?.state,
  },

  product: {
    id: loan.product?._id,
    name:
      loan.product?.displayName ||
      loan.product?.name,
  },

  amount: loan.amount,

  status: loan.status,

  verificationStatus:
    verification?.status || "ASSIGNED",

  progress,

  priority,

  assignedAt: loan.visitorAssignedAt,
};
    });

    // ============================================
    // Upcoming Tasks
    // ============================================

    const upcomingTasks = todayJobs.filter(
      (job) => job.verificationStatus === "ASSIGNED"
    );

    // ============================================
    // Notifications
    // ============================================

    const notifications = {
      unread: newAssignments,
    };

    // ============================================
    // Final Response
    // ============================================

    return res.status(200).json({
      success: true,
      message: "Visitor dashboard fetched successfully.",

      data: {
        visitor,

        summary: {
          totalAssigned,
          assigned,
          inProgress,
          submitted,
          pending,

          completionRate,

          visitGrowth,

          newAssignments,

          highPriority,
        },

        todayJobs,

        upcomingTasks,

        notifications,
      },
    });
  } catch (err) {
    console.error("Visitor Dashboard Error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch visitor dashboard.",
      error: err.message,
    });
  }
};




export const getVerificationReview = async (req, res) => {
  try {
    const { loanId } = req.params;

    const verification = await VisitorVerification.findOne({
      loan: loanId,
      visitor: req.user._id,
    })
      .populate("customer", "fullName mobile")
      .populate("loan", "applicationId amount status stage");

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "Verification not found.",
      });
    }

    // ================================
    // Section Completion Checks
    // ================================

    const investigationCompleted =
      !!verification.investigation &&
      (
        verification.investigation.customerAvailable ||
        verification.investigation.customerVerified ||
        verification.investigation.addressVerified ||
        verification.investigation.employmentVerified ||
        verification.investigation.businessVerified ||
        verification.investigation.incomeVerified ||
        verification.investigation.originalDocumentsVerified ||
        verification.investigation.photocopiesCollected ||
        verification.investigation.houseVisited ||
        verification.investigation.neighboursVerified
      );

    const photosCompleted = verification.photos.length > 0;

    const documentsCompleted = verification.documents.length > 0;

    const witnessCompleted =
      verification.witness?.agreed === true;

    const consentCompleted =
      verification.customerConsent?.accepted === true;

    const declarationCompleted =
      verification.visitorDeclaration?.accepted === true;

    const recommendationCompleted =
      !!verification.recommendation;

    // ================================
    // Missing Sections
    // ================================

    const missing = [];

    if (!investigationCompleted) missing.push("INVESTIGATION");
    if (!photosCompleted) missing.push("PHOTOS");
    if (!documentsCompleted) missing.push("DOCUMENTS");
    if (!witnessCompleted) missing.push("WITNESS");
    if (!consentCompleted) missing.push("CUSTOMER_CONSENT");
    if (!declarationCompleted) missing.push("DECLARATION");
    if (!recommendationCompleted) missing.push("RECOMMENDATION");

    // ================================
    // Ready For Submit
    // ================================

    const readyForSubmit = missing.length === 0;

    // =====================================================
    // PHOTO SEGREGATION
    // =====================================================

    const allPhotos = verification.photos || [];

    /*
      WITNESS:
      All photos having category WITNESS

      VERIFICATION:
      Verification/field visit related photos

      OTHER:
      Everything else
    */

    const witnessPhotos = allPhotos
      .filter((photo) => photo.category === "WITNESS")
      .map((photo) => ({
        category: photo.category,
        name: photo.name || null,
        url: photo.url,
        publicId: photo.publicId || null,
        uploadedAt: photo.uploadedAt,
      }));

    const verificationCategories = [
      "CUSTOMER",
      "CUSTOMER_SELFIE",
      "HOUSE_FRONT",
      "HOUSE_INSIDE",
      "SHOP",
      "OFFICE",
    ];

    const verificationPhotos = allPhotos
      .filter((photo) =>
        verificationCategories.includes(photo.category)
      )
      .map((photo) => ({
        category: photo.category,
        name: photo.name || null,
        url: photo.url,
        publicId: photo.publicId || null,
        uploadedAt: photo.uploadedAt,
      }));

    const otherPhotos = allPhotos
      .filter(
        (photo) =>
          photo.category === "OTHER" ||
          photo.category === "DOCUMENT" ||
          ![
            "WITNESS",
            ...verificationCategories,
          ].includes(photo.category)
      )
      .map((photo) => ({
        category: photo.category,
        name: photo.name || null,
        url: photo.url,
        publicId: photo.publicId || null,
        uploadedAt: photo.uploadedAt,
      }));

    // =====================================================
    // PHOTO SUMMARY
    // =====================================================

    const photoSummary = {
      total: allPhotos.length,

      witness: {
        count: witnessPhotos.length,
        photos: witnessPhotos,
      },

      verification: {
        count: verificationPhotos.length,
        photos: verificationPhotos,
      },

      other: {
        count: otherPhotos.length,
        photos: otherPhotos,
      },
    };

    // ================================
    // Final Response
    // ================================

    return res.status(200).json({
      success: true,
      message: "Review details fetched successfully.",

      data: {
        jobId: verification.jobId,
        verificationId: verification.verificationId,

        loan: verification.loan,
        customer: verification.customer,

        status: verification.status,

        // ======================
        // Review Summary
        // ======================

        summary: {
          investigationCompleted,
          photosCompleted,
          documentsCompleted,
          witnessCompleted,
          consentCompleted,
          declarationCompleted,
          recommendationCompleted,

          totalPhotos: allPhotos.length,
          totalDocuments: verification.documents.length,
          totalVideos: verification.videos.length,

          readyForSubmit,
          missing,
        },

        // ======================
        // PHOTO SUMMARY
        // ======================

        photoSummary,

        // ======================
        // UI Cards
        // ======================

        cards: {
          verification: {
            completed: readyForSubmit,
          },

          investigation: {
            completed: investigationCompleted,
            editable: true,
          },

          photos: {
            completed: photosCompleted,
            editable: true,

            count: allPhotos.length,

            witness: witnessPhotos,
            verification: verificationPhotos,
            other: otherPhotos,
          },

          documents: {
            completed: documentsCompleted,
            editable: true,
            count: verification.documents.length,
          },

          witness: {
            completed: witnessCompleted,
            editable: true,
            data: verification.witness,
          },

          remarks: {
            completed: !!verification.remarks,
            editable: true,
            value: verification.remarks || "",
          },

          recommendation: {
            completed: recommendationCompleted,
            editable: true,
            value: verification.recommendation,
          },
        },

        // ======================
        // Full Editable Data
        // ======================

        editableData: {
          investigation: verification.investigation,
          location: verification.location,

          photos: {
            all: allPhotos,
            witness: witnessPhotos,
            verification: verificationPhotos,
            other: otherPhotos,
          },

          videos: verification.videos,
          documents: verification.documents,
          witness: verification.witness,
          customerConsent: verification.customerConsent,
          visitorDeclaration: verification.visitorDeclaration,
          recommendation: verification.recommendation,
          remarks: verification.remarks,
        },

        // ======================
        // Timeline
        // ======================

        timeline: {
          startedAt: verification.startedAt,
          submittedAt: verification.submittedAt,
          completedAt: verification.completedAt,
          lastSavedAt: verification.updatedAt,
        },
      },
    });
  } catch (err) {
    console.error("Get Verification Review Error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getSubmitSummary = async (req, res) => {
  try {
    const { loanId } = req.params;

    const verification = await VisitorVerification.findOne({
      loan: loanId,
      visitor: req.user._id,
    })
      .populate("customer", "fullName mobile")
      .populate("loan", "applicationId amount");

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "Verification not found.",
      });
    }

    // ==============================
    // File Counts
    // ==============================

    const totalPhotos = verification.photos?.length || 0;
    const totalVideos = verification.videos?.length || 0;
    const totalDocuments = verification.documents?.length || 0;

    const totalFiles =
      totalPhotos +
      totalVideos +
      totalDocuments;

    // ==============================
    // Metadata Status
    // ==============================

    const metadataVerified =
      !!verification.location?.latitude &&
      !!verification.location?.longitude &&
      verification.customerConsent?.accepted;

    // ==============================
    // Final Review
    // ==============================

    const finalReview =
      verification.recommendation &&
      verification.photos.length > 0 &&
      verification.documents.length > 0 &&
      verification.witness?.agreed;

    // ==============================
    // Submit Allowed
    // ==============================

    const submitAllowed =
      metadataVerified &&
      finalReview &&
      verification.finalDeclaration?.informationCorrect &&
      verification.finalDeclaration?.photosGenuine &&
      verification.finalDeclaration?.investigationCompleted;

    return res.status(200).json({
      success: true,
      message: "Submit summary fetched successfully.",

      data: {
        loan: verification.loan,

        customer: verification.customer,

        declaration: verification.finalDeclaration,

        summary: {
          totalPhotos,
          totalVideos,
          totalDocuments,
          totalFiles,

          metadataStatus:
            metadataVerified ? "VERIFIED" : "PENDING",

          finalReview:
            finalReview ? "READY" : "INCOMPLETE",
        },

        submitAllowed,
      },
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


export const saveFinalDeclaration = async (req, res) => {
  try {
    const { loanId } = req.params;

    const {
      informationCorrect,
      photosGenuine,
      investigationCompleted,
    } = req.body;

    const verification = await VisitorVerification.findOne({
      loan: loanId,
      visitor: req.user._id,
    });

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "Verification not found.",
      });
    }

    if (verification.status === "SUBMITTED") {
      return res.status(400).json({
        success: false,
        message: "Verification already submitted.",
      });
    }

    verification.finalDeclaration = {
      informationCorrect,
      photosGenuine,
      investigationCompleted,
      acceptedAt: new Date(),
    };

    await verification.save();

    return res.status(200).json({
      success: true,
      message: "Final declaration saved successfully.",
      data: verification.finalDeclaration,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


export const getVerificationSummary = async (req, res) => {
  try {
    const { loanId } = req.params;

    // ==========================================
    // FIND VERIFICATION BY LOAN ID
    // ==========================================

    const verification = await VisitorVerification.findOne({
      loan: loanId,
    })
      .populate("customer", "fullName mobile")
      .populate("loan", "applicationId amount status stage");

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "Verification not found for this loan.",
      });
    }

    // ==========================================
    // SAFE DATA
    // ==========================================

    const investigation = verification.investigation || {};
    const location = verification.location || {};
    const siteDetails = verification.siteDetails || {};
    const witness = verification.witness || {};
    const customerConsent =
      verification.customerConsent || {};
    const visitorDeclaration =
      verification.visitorDeclaration || {};
    const finalDeclaration =
      verification.finalDeclaration || {};

    const allPhotos = verification.photos || [];
    const allDocuments = verification.documents || [];
    const allVideos = verification.videos || [];

    // ROOT LEVEL DESCRIPTION
    const description =
      verification.description || "";

    const editable =
      verification.status !== "SUBMITTED";

    // ==========================================
    // INVESTIGATION COMPLETION
    // ==========================================

    const investigationFields = [
      "customerAvailable",
      "customerVerified",
      "addressVerified",
      "employmentVerified",
      "businessVerified",
      "incomeVerified",
      "originalDocumentsVerified",
      "photocopiesCollected",
      "houseVisited",
      "neighboursVerified",
    ];

    const investigationCompleted =
      investigationFields.every(
        (field) => investigation[field] === true
      );

    // ==========================================
    // SITE DETAILS
    // ==========================================

    const sitePhotos =
      siteDetails.photos || [];

    const hasGps =
      location.latitude !== null &&
      location.latitude !== undefined &&
      location.longitude !== null &&
      location.longitude !== undefined;

    const hasAddress =
      typeof location.address === "string" &&
      location.address.trim() !== "";

    const hasSitePhotos =
      sitePhotos.length > 0;

    const siteDetailsCompleted =
      hasSitePhotos ||
      hasGps ||
      hasAddress;

    // ==========================================
    // PHOTO CLEANER
    // ==========================================
    // Local file:// URL ko valid uploaded URL
    // nahi maana jayega.
    // ==========================================

    const cleanPhoto = (photo) => {
      const isLocalFile =
        typeof photo.url === "string" &&
        photo.url.startsWith("file://");

      return {
        category: photo.category || null,

        name:
          photo.name || null,

        // Only Cloudinary/remote URL
        url: isLocalFile
          ? null
          : photo.url || null,

        publicId:
          photo.publicId || null,

        uploadedAt:
          photo.uploadedAt || null,
      };
    };

    // ==========================================
    // PHOTO CATEGORIES
    // ==========================================

    const verificationCategories = [
      "CUSTOMER",
      "CUSTOMER_SELFIE",
      "HOUSE_FRONT",
      "HOUSE_INSIDE",
      "SHOP",
      "OFFICE",
    ];

    const verificationPhotos = allPhotos
      .filter((photo) =>
        verificationCategories.includes(
          photo.category
        )
      )
      .map(cleanPhoto);

    const witnessPhotos = allPhotos
      .filter(
        (photo) =>
          photo.category === "WITNESS"
      )
      .map(cleanPhoto);

    const documentPhotos = allPhotos
      .filter(
        (photo) =>
          photo.category === "DOCUMENT"
      )
      .map(cleanPhoto);

    const otherPhotos = allPhotos
      .filter(
        (photo) =>
          photo.category === "OTHER"
      )
      .map(cleanPhoto);

    // ==========================================
    // CLEAN SITE PHOTOS
    // ==========================================

    const cleanSitePhotos =
      sitePhotos.map((photo) => {
        const isLocalFile =
          typeof photo.url === "string" &&
          photo.url.startsWith("file://");

        return {
          name:
            photo.name || null,

          url: isLocalFile
            ? null
            : photo.url || null,

          publicId:
            photo.publicId || null,

          uploadedAt:
            photo.uploadedAt || null,
        };
      });

    // ==========================================
    // PHOTO COMPLETION
    // ==========================================

    const validPhotoCount =
      allPhotos.filter(
        (photo) =>
          photo.url &&
          !photo.url.startsWith("file://")
      ).length;

    const validSitePhotoCount =
      sitePhotos.filter(
        (photo) =>
          photo.url &&
          !photo.url.startsWith("file://")
      ).length;

    const photosCompleted =
      validPhotoCount > 0 ||
      validSitePhotoCount > 0;

    // ==========================================
    // DOCUMENTS
    // ==========================================

    const documentsCompleted =
      allDocuments.length > 0;

    // ==========================================
    // WITNESS
    // ==========================================

    const witnessCompleted =
      witness.agreed === true;

    // ==========================================
    // CUSTOMER CONSENT
    // ==========================================

    const customerConsentCompleted =
      customerConsent.accepted === true;

    // ==========================================
    // VISITOR DECLARATION
    // ==========================================

    const visitorDeclarationCompleted =
      visitorDeclaration.accepted === true;

    // ==========================================
    // FINAL DECLARATION
    // ==========================================

    const finalDeclarationCompleted =
      finalDeclaration.informationCorrect === true &&
      finalDeclaration.photosGenuine === true &&
      finalDeclaration.investigationCompleted === true;

    // ==========================================
    // REMARKS
    // ==========================================

    const remarksCompleted =
      !!verification.remarks?.trim() ||
      !!investigation.remarks?.trim();

    // ==========================================
    // RECOMMENDATION
    // ==========================================

    const recommendationCompleted =
      !!verification.recommendation;

    // ==========================================
    // SECTION STATUS
    // ==========================================

    const sectionStatus = {
      verification: true,
      investigation:
        investigationCompleted,
      siteDetails:
        siteDetailsCompleted,
      photos:
        photosCompleted,
      documents:
        documentsCompleted,
      witness:
        witnessCompleted,
      customerConsent:
        customerConsentCompleted,
      visitorDeclaration:
        visitorDeclarationCompleted,
      remarks:
        remarksCompleted,
      recommendation:
        recommendationCompleted,
    };

    // ==========================================
    // MISSING SECTIONS
    // ==========================================

    const missing = Object.entries(
      sectionStatus
    )
      .filter(
        ([_, completed]) =>
          !completed
      )
      .map(
        ([section]) =>
          section.toUpperCase()
      );

    const completedSections =
      Object.values(
        sectionStatus
      ).filter(Boolean).length;

    const totalSections =
      Object.keys(
        sectionStatus
      ).length;

    const readyForSubmit =
      missing.length === 0;

    // ==========================================
    // PROGRESS
    // ==========================================

    const percentage =
      totalSections > 0
        ? Math.round(
            (completedSections /
              totalSections) *
              100
          )
        : 0;

    // ==========================================
    // PHOTO SUMMARY
    // ==========================================

    const photoSummary = {
      total:
        validPhotoCount +
        validSitePhotoCount,

      witness: {
        count:
          witnessPhotos.length,
        photos:
          witnessPhotos,
      },

      verification: {
        count:
          verificationPhotos.length,
        photos:
          verificationPhotos,
      },

      document: {
        count:
          documentPhotos.length,
        photos:
          documentPhotos,
      },

      other: {
        count:
          otherPhotos.length,
        photos:
          otherPhotos,
      },

      site: {
        count:
          validSitePhotoCount,
        photos:
          cleanSitePhotos,
      },
    };

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,

      message:
        "Verification summary fetched successfully.",

      data: {
        // ======================================
        // HEADER
        // ======================================

        header: {
          jobId:
            verification.jobId,

          verificationId:
            verification.verificationId,

          loanId:
            verification.loan?._id?.toString() ||
            loanId,

          status:
            verification.status,

          editable,

          progress: {
            completedSteps:
              completedSections,

            totalSteps:
              totalSections,

            percentage,
          },
        },

        // ======================================
        // LOAN
        // ======================================

        loan:
          verification.loan,

        // ======================================
        // CUSTOMER
        // ======================================

        customer:
          verification.customer,

        // ======================================
        // DESCRIPTION
        // ======================================

        description,

        // ======================================
        // INVESTIGATION
        // ======================================

        investigationDetails: {
          completed:
            investigationCompleted,

          editable,

          description,

          customerAvailable:
            investigation.customerAvailable ??
            false,

          customerVerified:
            investigation.customerVerified ??
            false,

          addressVerified:
            investigation.addressVerified ??
            false,

          employmentVerified:
            investigation.employmentVerified ??
            false,

          businessVerified:
            investigation.businessVerified ??
            false,

          incomeVerified:
            investigation.incomeVerified ??
            false,

          originalDocumentsVerified:
            investigation.originalDocumentsVerified ??
            false,

          photocopiesCollected:
            investigation.photocopiesCollected ??
            false,

          houseVisited:
            investigation.houseVisited ??
            false,

          neighboursVerified:
            investigation.neighboursVerified ??
            false,

          remarks:
            investigation.remarks || "",

          location: {
            latitude:
              location.latitude ?? null,

            longitude:
              location.longitude ?? null,

            address:
              location.address || "",
          },

          recommendation:
            verification.recommendation ||
            null,
        },

        // ======================================
        // SITE DETAILS
        // ======================================

        siteDetails: {
          completed:
            siteDetailsCompleted,

          editable,

          description,

          latitude:
            location.latitude ?? null,

          longitude:
            location.longitude ?? null,

          address:
            location.address || "",

          photos:
            cleanSitePhotos,
        },

        // ======================================
        // PHOTOS
        // ======================================

        photos: {
          completed:
            photosCompleted,

          editable,

          count:
            validPhotoCount +
            validSitePhotoCount,

          verificationPhotos: {
            count:
              verificationPhotos.length,

            items:
              verificationPhotos,
          },

          witnessPhotos: {
            count:
              witnessPhotos.length,

            items:
              witnessPhotos,
          },

          documentPhotos: {
            count:
              documentPhotos.length,

            items:
              documentPhotos,
          },

          otherPhotos: {
            count:
              otherPhotos.length,

            items:
              otherPhotos,
          },

          sitePhotos: {
            count:
              validSitePhotoCount,

            items:
              cleanSitePhotos,
          },
        },

        // ======================================
        // DOCUMENTS
        // ======================================

        documents: {
          completed:
            documentsCompleted,

          editable,

          count:
            allDocuments.length,

          items:
            allDocuments,
        },

        // ======================================
        // WITNESS
        // ======================================

        witnessDetails: {
          completed:
            witnessCompleted,

          editable,

          fullName:
            witness.fullName || "",

          mobile:
            witness.mobile || "",

          relation:
            witness.relation || "",

          signatures:
            witness.signatures || [],

          photos:
            witness.photos || [],

          documents:
            witness.documents || [],

          agreed:
            witness.agreed ?? false,

          signedAt:
            witness.signedAt || null,
        },

        // ======================================
        // CUSTOMER CONSENT
        // ======================================

        customerConsent: {
          completed:
            customerConsentCompleted,

          editable,

          accepted:
            customerConsent.accepted ??
            false,

          signature:
            customerConsent.signature ||
            "",

          signedAt:
            customerConsent.signedAt ||
            null,
        },

        // ======================================
        // VISITOR DECLARATION
        // ======================================

        visitorDeclaration: {
          completed:
            visitorDeclarationCompleted,

          editable,

          accepted:
            visitorDeclaration.accepted ??
            false,

          signature:
            visitorDeclaration.signature ||
            "",

          reviewedBy:
            visitorDeclaration.reviewedBy ||
            null,

          reviewedAt:
            visitorDeclaration.reviewedAt ||
            null,

          declaredAt:
            visitorDeclaration.declaredAt ||
            null,
        },

        // ======================================
        // REVIEW DETAILS
        // ======================================

        reviewDetails: {
          verification: {
            completed:
              readyForSubmit,

            editable,
          },

          investigation: {
            completed:
              investigationCompleted,

            editable,

            data: {
              description,

              ...investigation,

              location: {
                latitude:
                  location.latitude ??
                  null,

                longitude:
                  location.longitude ??
                  null,

                address:
                  location.address ||
                  "",
              },

              recommendation:
                verification.recommendation ||
                null,
            },
          },

          siteDetails: {
            completed:
              siteDetailsCompleted,

            editable,

            description,

            latitude:
              location.latitude ??
              null,

            longitude:
              location.longitude ??
              null,

            address:
              location.address ||
              "",

            photos:
              cleanSitePhotos,
          },

          photos: {
            completed:
              photosCompleted,

            editable,

            count:
              validPhotoCount +
              validSitePhotoCount,

            items: [
              ...verificationPhotos,
              ...witnessPhotos,
              ...documentPhotos,
              ...otherPhotos,
              ...cleanSitePhotos,
            ],
          },

          witness: {
            completed:
              witnessCompleted,

            editable,

            data:
              witness,
          },

          customerConsent: {
            completed:
              customerConsentCompleted,

            editable,

            data:
              customerConsent,
          },

          visitorDeclaration: {
            completed:
              visitorDeclarationCompleted,

            editable,

            data:
              visitorDeclaration,
          },

          remarks: {
            completed:
              remarksCompleted,

            editable,

            value:
              verification.remarks ||
              investigation.remarks ||
              "",
          },

          recommendation: {
            completed:
              recommendationCompleted,

            editable,

            value:
              verification.recommendation ||
              null,
          },
        },

        // ======================================
        // SUBMIT VERIFICATION
        // ======================================

        submitVerification: {
          completed:
            finalDeclarationCompleted,

          editable,

          declaration: {
            informationCorrect:
              finalDeclaration.informationCorrect ??
              false,

            photosGenuine:
              finalDeclaration.photosGenuine ??
              false,

            investigationCompleted:
              finalDeclaration.investigationCompleted ??
              false,

            acceptedAt:
              finalDeclaration.acceptedAt ||
              null,
          },

          submissionSummary: {
            filesAttached:
              validPhotoCount +
              validSitePhotoCount +
              allDocuments.length,

            totalPhotos:
              validPhotoCount +
              validSitePhotoCount,

            totalDocuments:
              allDocuments.length,

            totalVideos:
              allVideos.length,

            metadataStatus:
              verification.status ===
              "SUBMITTED"
                ? "Verified"
                : "Pending",

            finalReview:
              readyForSubmit
                ? "Ready"
                : "Pending",
          },
        },

        // ======================================
        // SUMMARY
        // ======================================

        summary: {
          totalPhotos:
            validPhotoCount +
            validSitePhotoCount,

          totalDocuments:
            allDocuments.length,

          totalVideos:
            allVideos.length,

          completedSections,

          totalSections,

          percentage,

          readyForSubmit,

          missing,
        },

        // ======================================
        // TIMELINE
        // ======================================

        timeline: {
          startedAt:
            verification.startedAt ||
            null,

          submittedAt:
            verification.submittedAt ||
            null,

          completedAt:
            verification.completedAt ||
            null,

          lastSavedAt:
            verification.updatedAt ||
            null,
        },
      },
    });
  } catch (error) {
    console.error(
      "Get Verification Summary Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};