import mongoose from "mongoose";
import LoanApplication from "../loanApplication.model.js";
import LoanProduct from "../../loan-products/loanProduct.model.js";
import LoanEMI from "../../loan-emi/loanEMI.model.js";
import Disbursement from "../../loan-disbursement/disbursement.model.js";
import { manualLoanUpload } from "../../../middleware/manualLoanUpload.js";
import { generateLoanStatementPDF } from "../utils/recieptPdf.js";
import { checkEligibility } from "../../loan-products/service/eligibility.service.js";
import { decideLoan } from "../../loan-products/service/decision.service.js";
import BankAccount from "../../bank-accounts/BankAccount.model.js";
import { applyManualLoan } from "../service.js/manualLoan.service.js";
import { applyInstantLoan } from "../service.js/instantLoan.service.js";
import notificationService from "../../notification/service/notification.service.js";
import { uploadBufferToCloudinary } from "../../../config/cloudanryConnection.js";
import User from "../../User/models.js";
import KYC from "../../kyc/kyc.model.js";
import Payment from "../../payment/payment.model.js";


import {uploadToCloudinary} 
from "../service.js/visitorVerification.service.js";
const maskAccountNumber = (accountNumber = "") => {
  if (!accountNumber) return "";

  return accountNumber.replace(/\d(?=\d{4})/g, "X");
};

export const applyLoan = async (req, res) => {
  try {
    console.log("========================================");
    console.log("🔥 APPLY LOAN API HIT");
    console.log("🔥 Request Body:", req.body);
    console.log("========================================");

    const {
      productId,
      amount,
      tenure,
      applicationData = {},
      documents = [],
      remarks = "",
    } = req.body;

    // ---------------------------------------------
    // 1. Basic Validation
    // ---------------------------------------------

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    if (amount === undefined || amount === null) {
      return res.status(400).json({
        success: false,
        message: "Loan amount is required",
      });
    }

    if (tenure === undefined || tenure === null) {
      return res.status(400).json({
        success: false,
        message: "Loan tenure is required",
      });
    }

    // ---------------------------------------------
    // 2. Find Loan Product
    // ---------------------------------------------

    console.log("🔍 Searching Loan Product:", productId);

    const product = await LoanProduct.findById(productId);

    if (!product) {
      console.log("❌ Loan product not found:", productId);

      return res.status(404).json({
        success: false,
        message: "Loan product not found",
      });
    }

    // ---------------------------------------------
    // 3. Product Logs
    // ---------------------------------------------

    console.log("========================================");
    console.log("✅ PRODUCT FOUND");
    console.log("Product ID:", product._id);
    console.log("Product Name:", product.name);
    console.log("Product Code:", product.code);
    console.log("Loan Type:", product.loanType);
    console.log("Processing Type:", product.processingType);
    console.log("Minimum Amount:", product.minAmount);
    console.log("Maximum Amount:", product.maxAmount);
    console.log("Minimum Tenure:", product.minTenure);
    console.log("Maximum Tenure:", product.maxTenure);
    console.log("Interest Rate:", product.interestRate);
    console.log("========================================");

    // ---------------------------------------------
    // 4. Manual Loan
    // ---------------------------------------------

    if (product.processingType === "MANUAL") {
      console.log("🟡 MANUAL LOAN FLOW STARTED");

      const loanApplication =
        await applyManualLoan({
          userId: req.user._id,

          product,

          amount,

          tenure,

          applicationData,

          documents,

          remarks,
        });

      return res.status(201).json({
        success: true,
        message:
          "Manual loan application submitted successfully",

        data: loanApplication,
      });
    }

    // ---------------------------------------------
    // 5. Instant Loan
    // ---------------------------------------------

    console.log("🟢 INSTANT LOAN FLOW STARTED");

    return applyInstantLoan(req, res, product);
  } catch (error) {
    console.error("========================================");
    console.error("❌ APPLY LOAN ERROR");
    console.error("Error Message:", error.message);
    console.error("Error Stack:", error.stack);
    console.error("========================================");

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message || "Failed to apply for loan",

      ...(error.missingDocuments && {
        missingDocuments: error.missingDocuments,
      }),
    });
  }
};


const maskPan = (pan = "") => {
  if (!pan) return "";

  const value = String(pan).trim();

  if (value.length <= 4) {
    return "*".repeat(value.length);
  }

  return `${value.slice(0, 2)}*****${value.slice(-2)}`;
};

const maskAadhaar = (aadhaar = "") => {
  if (!aadhaar) return "";

  const value = String(aadhaar).replace(/\s/g, "");

  if (value.length <= 4) {
    return "*".repeat(value.length);
  }

  return `********${value.slice(-4)}`;
};

export const getLoanApplicationPrefill = async (req, res) => {
  try {
    const userId = req.user._id;

    // ==========================================
    // USER
    // ==========================================
    const user = await User.findById(userId).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ==========================================
    // KYC
    // ==========================================
    const kyc = await KYC.findOne({
      user: userId,
    }).lean();

    // ==========================================
    // BANK ACCOUNT
    // ==========================================
    const bankAccount = await BankAccount.findOne({
      user: userId,
      isPrimary: true,
    }).lean();

    // ==========================================
    // RESPONSE
    // ==========================================
    return res.status(200).json({
      success: true,

      data: {
        personalDetails: {
          fullName: user.name || "",
          mobileNumber: user.mobile || "",
          email: user.email || "",
          dateOfBirth: kyc?.dateOfBirth || user.dateOfBirth || "",
          gender: kyc?.gender || user.gender || "",
        },

        kycDetails: {
          panNumber: maskPan(
            kyc?.panNumber || kyc?.pan || ""
          ),

          aadhaarNumber: maskAadhaar(
            kyc?.aadhaarNumber || kyc?.aadhaar || ""
          ),

          kycVerified: Boolean(
            kyc?.verified || kyc?.status === "VERIFIED"
          ),
        },

        addressDetails: {
          addressLine1: kyc?.address?.addressLine1 || "",
          addressLine2: kyc?.address?.addressLine2 || "",
          city: kyc?.address?.city || "",
          state: kyc?.address?.state || "",
          pincode: kyc?.address?.pincode || "",
        },

        employmentDetails: {
          employmentType: user.employmentType || "",
          occupation: user.occupation || "",
          monthlyIncome: user.monthlyIncome || 0,
        },

        bankDetails: bankAccount
          ? {
              bankName: bankAccount.bankName || "",

              accountNumber: maskAccountNumber(
                bankAccount.accountNumber
              ),

              ifsc: bankAccount.ifsc || "",

              accountHolderName:
                bankAccount.accountHolderName || "",

              bankVerified: Boolean(
                bankAccount.verified
              ),
            }
          : null,
      },
    });
  } catch (error) {
    console.error(
      "Loan Application Prefill Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch application prefill data",
    });
  }
};
export const uploadLoanDocument = async (req, res) => {
    const { documentId } = req.body;

    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "File is required"
        });
    }

    const result = await uploadToCloudinary(req.file.path);

    return res.json({
        success: true,
        data: {
            documentId,
            file: result.secure_url,
            publicId: result.public_id
        }
    });
};

export const getLoan = async (req, res) => {
  try {
    const loans = await LoanApplication.find({
      customer: req.user._id,
      isDeleted: false,
    })
      .populate("product", "name")
      .sort({ createdAt: -1 })
      .lean();

    const result = await Promise.all(
      loans.map(async (loan) => {
        const nextEMI = await LoanEMI.findOne({
          loan: loan._id,
          status: {
            $in: ["UPCOMING", "DUE", "OVERDUE", "PARTIAL"],
          },
        }).sort({ installmentNumber: 1 });

        const totalEMIs = await LoanEMI.countDocuments({
          loan: loan._id,
        });

        const paidEMIs = await LoanEMI.countDocuments({
          loan: loan._id,
          status: "PAID",
        });

        return {
          loanId: loan._id,
          applicationId: loan.applicationId,
          loanNumber: loan.loanNumber,

          productName: loan.product?.name,

          approvedAmount: loan.approvedAmount,
          disbursedAmount: loan.disbursedAmount,
          outstandingAmount: loan.outstandingAmount,

          emiAmount: loan.emiAmount,

          tenure: loan.tenure,

          interestRate: loan.interestRate,

          status: loan.status,

          totalInstallments: totalEMIs,

          paidInstallments: paidEMIs,

          pendingInstallments: totalEMIs - paidEMIs,

          nextEMI: nextEMI
            ? {
                emiId: nextEMI.emiId,
                installmentNumber: nextEMI.installmentNumber,
                dueDate: nextEMI.dueDate,
                emiAmount: nextEMI.emiAmount,
                penaltyAmount: nextEMI.penaltyAmount,
                totalDueAmount: nextEMI.totalDueAmount,
                status: nextEMI.status,
              }
            : null,
        };
      }),
    );

    return res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



export const uploadLoanDocuments = async (req, res) => {
  try {
    // ---------------------------------------------
    // 1. Validate Files
    // ---------------------------------------------

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one file is required",
      });
    }

    // ---------------------------------------------
    // 2. Maximum 5 Files
    // ---------------------------------------------

    if (req.files.length > 5) {
      return res.status(400).json({
        success: false,
        message: "Maximum 5 files can be uploaded at once",
      });
    }

    // ---------------------------------------------
    // 3. Upload All Files
    // ---------------------------------------------

    const uploadedFiles = await Promise.all(
      req.files.map(async (file) => {
        const result = await uploadBufferToCloudinary(
          file.buffer,
          "finsarthi/documents"
        );

        return {
          name: file.originalname,
          file: result.secure_url,
          publicId: result.public_id,
        };
      })
    );

    // ---------------------------------------------
    // 4. Response
    // ---------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Files uploaded successfully",
      count: uploadedFiles.length,
      data: uploadedFiles,
    });
  } catch (error) {
    console.error(
      "Upload Loan Documents Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to upload files",
    });
  }
};

export const getLoanById = async (req, res) => {
  try {
    const { loanId } = req.params;

    // ==========================================
    // 1. VALIDATE LOAN ID
    // ==========================================

    if (!mongoose.Types.ObjectId.isValid(loanId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid loan ID.",
      });
    }

    // ==========================================
    // 2. GET LOAN
    // ==========================================

    const loan = await LoanApplication.findOne({
      _id: loanId,
      customer: req.user._id,
      isDeleted: false,
    })
      .populate("product")
      .lean();

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found.",
      });
    }

    // ==========================================
    // 3. GET DISBURSEMENT
    // ==========================================

    const disbursement = await Disbursement.findOne({
      loanId: loan._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    // ==========================================
    // 4. GET EMI SCHEDULE
    // ==========================================

    const emis = await LoanEMI.find({
      loan: loan._id,
    })
      .sort({ installmentNumber: 1 })
      .lean();

    // ==========================================
    // 4.1 GET PAYMENTS
    // ==========================================

    const payments = await Payment.find({
      loan: loan._id,
    })
      .sort({ createdAt: -1 })
      .lean();
      

    // ==========================================
    // 4.2 GROUP PAYMENTS BY EMI
    // ==========================================

    const paymentsByEmi = {};

    payments.forEach((payment) => {
      if (!payment.emi) return;

      const emiId = payment.emi.toString();

      if (!paymentsByEmi[emiId]) {
        paymentsByEmi[emiId] = [];
      }

      paymentsByEmi[emiId].push(payment);
    });

    // ==========================================
    // 5. FEE CALCULATION
    // ==========================================

    let processingFee = 0;

    if (loan.product?.processingFee) {
      processingFee = Number(
        loan.product.processingFee
      );
    }

    if (
      loan.product?.processingFeePercentage &&
      !loan.product?.processingFee
    ) {
      processingFee =
        (Number(
          loan.approvedAmount ||
            loan.amount ||
            0
        ) *
          Number(
            loan.product.processingFeePercentage
          )) /
        100;
    }

    // ==========================================
    // 6. TOTAL FEES
    // ==========================================

    const totalFees = processingFee;

    // ==========================================
    // 7. LOAN AMOUNT
    // ==========================================

    const loanAmount = Number(
      loan.approvedAmount ||
        loan.amount ||
        0
    );

    // ==========================================
    // 8. DISBURSAL AMOUNT
    // ==========================================

    const calculatedDisbursalAmount =
      loanAmount - totalFees;

    const disbursalAmount =
      loan.disbursedAmount > 0
        ? loan.disbursedAmount
        : calculatedDisbursalAmount;

    // ==========================================
    // 9. EMI SCHEDULE
    // ==========================================

 // ==========================================
// 9. EMI SCHEDULE
// ==========================================

const repaymentSchedule = emis.map((emi) => {
  const emiPayments =
    paymentsByEmi[emi._id.toString()] || [];

  // Latest payment for this EMI
  const latestPayment =
    emiPayments.length > 0
      ? emiPayments[0]
      : null;

  // Latest successful payment
  const successfulPayment = emiPayments.find(
    (payment) => payment.status === "SUCCESS"
  );

  return {
    emiId: emi.emiId,

    emiObjectId: emi._id,

    installmentNumber:
      emi.installmentNumber,

    dueDate: emi.dueDate,

    emiAmount: emi.emiAmount,

    principalAmount:
      emi.principalAmount,

    interestAmount:
      emi.interestAmount,

    penaltyAmount:
      emi.penaltyAmount,

    totalDueAmount:
      emi.totalDueAmount ??
      Number(emi.emiAmount || 0) +
        Number(emi.penaltyAmount || 0),

    overdueDays:
      emi.overdueDays,

    // EMI Status
    status: emi.status,

    isClosed:
      emi.isClosed,

    // Payment Status
    paymentStatus: latestPayment
      ? latestPayment.status
      : "NOT_PAID",

    // Successful Payment Date
    paymentDate: successfulPayment
      ? successfulPayment.createdAt
      : null,
  };
});

    // ==========================================
    // 10. RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,

      data: {
        // ======================================
        // LOAN DETAILS
        // ======================================

        loanDetails: {
          loanId: loan._id,

          applicationId:
            loan.applicationId,

          loanNumber:
            loan.loanNumber,

          productName:
            loan.product?.name || null,

          loanRefNo:
            loan.loanNumber ||
            loan.applicationId ||
            null,

          approvedAmount: Number(
            loan.approvedAmount || 0
          ),

          disbursementAmount: Number(
            loan.disbursedAmount || 0
          ),

          outstandingAmount: Number(
            loan.outstandingAmount || 0
          ),

          interestRate:
            loan.interestRate,

          tenure:
            loan.tenure,

          emiAmount: Number(
            loan.emiAmount || 0
          ),

          status:
            loan.status,
        },

        // ======================================
        // FEE DETAILS
        // ======================================

        feeDetails: {
          loanAmount,

          totalFees,

          processingFee,

          disbursalAmount,
        },

        // ======================================
        // BANK / DISBURSEMENT DETAILS
        // ======================================

        bankDetails: disbursement
          ? {
              accountHolderName:
                disbursement.bankDetails
                  ?.accountHolderName ||
                null,

              accountNumber:
                disbursement.bankDetails
                  ?.accountNumber ||
                null,

              ifsc:
                disbursement.bankDetails
                  ?.ifsc || null,

              utrNumber:
                disbursement.utrNumber ||
                null,

              transferredAmount:
                disbursement.amount || 0,

              transferMethod:
                disbursement.method ||
                null,

              transferStatus:
                disbursement.status ||
                null,

              transferredAt:
                disbursement.processedAt ||
                null,
            }
          : null,

        // ======================================
        // REPAYMENT SCHEDULE
        // ======================================

        repaymentSchedule,
      },
    });
  } catch (error) {
    console.error(
      "Get Loan Details Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const downloadLoanStatement = async (req, res) => {
  try {
    const { loanId } = req.params;

    const loan = await LoanApplication.findOne({
      _id: loanId,
      customer: req.user._id,
      isDeleted: false,
    })
      .populate("product")
      .lean();

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan not found",
      });
    }

    const bank = await BankAccount.findOne({
      user: req.user._id,
      isPrimary: true,
    }).lean();

    const disbursement = await Disbursement.findOne({
      loanId,
    }).lean();

    const emis = await LoanEMI.find({
      loan: loanId,
    })
      .sort({ installmentNumber: 1 })
      .lean();

    // PDF Utility ko res bhi pass karo
    await generateLoanStatementPDF(
      {
        loanNumber: loan.loanNumber,

        borrower: {
          name: req.user.name,
          customerId: req.user.customerId,
          mobile: req.user.mobile,
          email: req.user.email,
          address: req.user.address,
        },

        productName: loan.product?.name,

        loanAmount: loan.approvedAmount,

        interestRate: loan.interestRate,

        tenure: loan.tenure,

        emiAmount: loan.emiAmount,

        totalInterest: loan.totalInterest,

        totalPayable: loan.totalPayable,

        loanStartDate: disbursement?.processedAt,

        loanEndDate: emis.at(-1)?.dueDate,

        nextEMIDate: emis.find((e) => e.status !== "PAID")?.dueDate,

        status: loan.status,

        bank,

        disbursement,

        repaymentSchedule: emis,

        summary: {
          totalInstallments: emis.length,

          paidInstallments: emis.filter((x) => x.status === "PAID").length,

          pendingInstallments: emis.filter(
            (x) => x.status === "DUE" || x.status === "UPCOMING",
          ).length,

          overdueInstallments: emis.filter((x) => x.status === "OVERDUE")
            .length,

          totalAmountPaid: emis.reduce((a, b) => a + (b.paidAmount || 0), 0),

          remainingAmount: loan.outstandingAmount,

          outstandingPrincipal: loan.outstandingAmount,

          outstandingInterest: loan.totalInterest,

          collectionPercentage:
            (emis.filter((x) => x.status === "PAID").length / emis.length) *
            100,
        },
      },
      res,
    );
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};