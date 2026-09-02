import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
import { upload   } from "../../middleware/visitorupload.js";
import { manualLoanUpload } from "../../middleware/manualLoanUpload.js";
import {
  applyLoan,
  getLoan,
  getLoanById,
  downloadLoanStatement,getLoanApplicationPrefill,uploadLoanDocuments
} from "./controller/loanApplication.controller.js";

import {
  createApproval,
  approveLoan,
  rejectLoan,
  updateApproval,
  cancelApproval,
  getPendingApprovals,
  getApprovedLoans,
  getRejectedLoans,
  assignVisitor,
  getAllVisitors,
  getVisitorActivity,
  submitVerification,
  saveInvestigation,
  uploadPhotos,
  saveWitness,
  getVerificationDetails,
  getMyApplications,
  getApplicationProgress,getVisitorDashboard,getVerificationReview,uploadFile,getVerificationSummary,saveSiteDetails
} from "./controller/loanApproval.controller.js";

const router = express.Router();


// ======================================================
// LOAN APPLICATION
// ======================================================

router.post(
  "/apply",
  protect,
  applyLoan
);
router.post(
  "/upload-documents",
  manualLoanUpload.array("files", 10),
  uploadLoanDocuments
);

router.get("/my-loans", protect, getLoan);

router.get("/:loanId/statement", protect, downloadLoanStatement);

router.get(
  "/application/prefill",
  protect,
  getLoanApplicationPrefill
);
// ======================================================
// LOAN APPROVAL
// ======================================================

router.post("/approval", protect, createApproval);

router.patch("/:loanId/approve", protect, approveLoan);

router.patch("/:loanId/reject", protect, rejectLoan);

router.patch("/:loanId", protect, updateApproval);

router.patch("/:loanId/cancel", protect, cancelApproval);


// ======================================================
// APPROVAL LISTS
// ======================================================

router.get("/approval/pending", protect, getPendingApprovals);

router.get("/approval/approved", protect, getApprovedLoans);

router.get("/approval/rejected", protect, getRejectedLoans);


// ======================================================
// VISITOR MANAGEMENT
// ======================================================

router.get("/visitors", protect, getAllVisitors);

router.post("/:loanId/assign-visitor", protect, assignVisitor);

router.get("/visitor/activity", protect, getVisitorActivity);


// ======================================================
// VISITOR VERIFICATION
// ======================================================

router.patch(
  "/:loanId/investigation",
  protect,
  saveInvestigation
);

router.post(
  "/:loanId/upload-photo",
  protect,
  upload.array("files", 10),
  uploadPhotos
);


router.patch(
  "/:loanId/site-details",
  protect,
  saveSiteDetails
)

router.patch(
  "/:loanId/witness",
  protect,
  saveWitness
);

router.post(
  "/upload-file",
  protect,
  upload.single("file"),
  uploadFile
);
router.patch(
  "/:loanId/submit-verification",
  protect,
  submitVerification
);


// ======================================================
// ADMIN VERIFICATION
// ======================================================

router.get(
  "/:loanId/verification",
  protect,
  getVerificationDetails
);


// ======================================================
// LOAN DETAILS
// ======================================================

router.get("/:loanId/check", protect, getLoanById);
router.get(
  "/my-applications",
  protect,
 
  getMyApplications
);


// Single application ka progress + checklist
router.get(
  "/my-applications/:loanId",
  protect,
 
  getApplicationProgress
);




router.get(
  "/dashboard",
protect,
  getVisitorDashboard
);


router.get(
  "/applications/:loanId/review",
  protect,
  getVerificationReview
);

// router.post('/get-summery',protect,)


router.get(
  "/applications/:loanId/verification-summary",
  protect,
  getVerificationSummary
);

export default router;