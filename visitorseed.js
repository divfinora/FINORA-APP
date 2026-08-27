// seedVisitorLoans.js

import mongoose from "mongoose";
import dotenv from "dotenv";

import LoanApplication from "./module/loan-applications/loanApplication.model.js";
import VisitorVerification from "./module/loan-applications/visitorverification.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const VISITOR_ID = new mongoose.Types.ObjectId(
  "6a5087a72c932458c10b02ae"
);

const CUSTOMER_ID = new mongoose.Types.ObjectId(
  "6a30fb1f51873322e5a84135"
);

const PRODUCT_ID = new mongoose.Types.ObjectId(
  "6a38f29706bee5a244f1307c"
);

const seedVisitorLoans = async () => {
  try {
    await mongoose.connect(MONGO_URI);

    console.log("MongoDB connected");

    // --------------------------------------------------
    // 1. Prevent duplicate seed
    // --------------------------------------------------

    const existingApplications = await LoanApplication.countDocuments({
      applicationId: {
        $in: [
          "APP-VIS-001",
          "APP-VIS-002",
          "APP-VIS-003",
          "APP-VIS-004",
          "APP-VIS-005",
        ],
      },
    });

    if (existingApplications > 0) {
      console.log(
        "Visitor seed data already exists. Skipping..."
      );

      await mongoose.disconnect();
      return;
    }

    // --------------------------------------------------
    // 2. Loan data
    // --------------------------------------------------

    const loans = [
      {
        applicationId: "APP-VIS-001",
        amount: 25000,
        approvedAmount: 25000,
        interestRate: 18,
        tenure: 12,
        emiAmount: 2291,
        totalInterest: 2492,
        totalPayable: 27492,

        status: "VISITOR_ASSIGNED",
        stage: "VISITOR_VERIFICATION",

        remarks: "Customer verification pending.",
      },

      {
        applicationId: "APP-VIS-002",
        amount: 50000,
        approvedAmount: 50000,
        interestRate: 18,
        tenure: 18,
        emiAmount: 3192,
        totalInterest: 7456,
        totalPayable: 57456,

        status: "VISITOR_IN_PROGRESS",
        stage: "VISITOR_VERIFICATION",

        remarks: "Visitor verification currently in progress.",
      },

      {
        applicationId: "APP-VIS-003",
        amount: 75000,
        approvedAmount: 75000,
        interestRate: 17,
        tenure: 24,
        emiAmount: 3716,
        totalInterest: 14184,
        totalPayable: 89184,

        status: "VISITOR_ASSIGNED",
        stage: "VISITOR_VERIFICATION",

        remarks: "Field verification assigned to visitor.",
      },

      {
        applicationId: "APP-VIS-004",
        amount: 100000,
        approvedAmount: 100000,
        interestRate: 16,
        tenure: 24,
        emiAmount: 4896,
        totalInterest: 17504,
        totalPayable: 117504,

        status: "VISITOR_ASSIGNED",
        stage: "VISITOR_VERIFICATION",

        remarks: "Customer field verification required.",
      },

      {
        applicationId: "APP-VIS-005",
        amount: 35000,
        approvedAmount: 35000,
        interestRate: 19,
        tenure: 12,
        emiAmount: 3218,
        totalInterest: 3616,
        totalPayable: 38616,

        status: "VISITOR_ASSIGNED",
        stage: "VISITOR_VERIFICATION",

        remarks: "Verification job assigned.",
      },
    ];

    // --------------------------------------------------
    // 3. Create Loan Applications
    // --------------------------------------------------

    const createdLoans = [];

    for (const loanData of loans) {
      const loan = await LoanApplication.create({
        ...loanData,

        customer: CUSTOMER_ID,

        product: PRODUCT_ID,

        disbursedAmount: 0,

        outstandingAmount: loanData.approvedAmount,

        productSnapshot: {
          code: "PERSONAL-LOAN",
          loanType: "MANUAL",
          segment: "PERSONAL",
          displayName: "Personal Loan",
        },

        assignedVisitor: VISITOR_ID,

        visitorAssignedAt: new Date(),

        approval: {
          status: "PENDING",
        },

        disbursementStatus: "PENDING",

        emiSummary: {
          totalInstallments: loanData.tenure,
          paidInstallments: 0,
          pendingInstallments: loanData.tenure,
          overdueInstallments: 0,
          nextDueDate: null,
          nextEMIAmount: loanData.emiAmount,
        },

        version: 1,

        isDeleted: false,
      });

      createdLoans.push(loan);

      console.log(
        `Loan created: ${loan.applicationId}`
      );
    }

    // --------------------------------------------------
    // 4. Create Visitor Verification Jobs
    // --------------------------------------------------

    for (let i = 0; i < createdLoans.length; i++) {
      const loan = createdLoans[i];

      const visitorStatus =
        loan.applicationId === "APP-VIS-002"
          ? "IN_PROGRESS"
          : "ASSIGNED";

      await VisitorVerification.create({
        verificationId: `VV-SEED-${Date.now()}-${i + 1}`,

        jobId: `JOB-SEED-${Date.now()}-${i + 1}`,

        loan: loan._id,

        customer: CUSTOMER_ID,

        visitor: VISITOR_ID,

        status: visitorStatus,

        recommendation: null,

        investigation: {
          customerAvailable: false,
          customerVerified: false,
          addressVerified: false,
          employmentVerified: false,
          businessVerified: false,
          incomeVerified: false,
          originalDocumentsVerified: false,
          photocopiesCollected: false,
          houseVisited: false,
          neighboursVerified: false,
          remarks: "",
        },

        location: {
          latitude: null,
          longitude: null,
          address: "",
        },

        photos: [],

        videos: [],

        documents: [],

        verificationScore: 0,

        customerConsent: {
          accepted: false,
          signature: "",
          signedAt: null,
        },

        witness: {
          fullName: "",
          mobile: "",
          relation: "",
          agreed: false,
        },

        visitorDeclaration: {
          accepted: false,
        },

        reviewRemarks: "",

        remarks: "Verification job assigned to visitor.",

        startedAt:
          visitorStatus === "IN_PROGRESS"
            ? new Date()
            : null,

        completedAt: null,

        submittedAt: null,

        version: 1,
      });

      console.log(
        `Visitor verification created for ${loan.applicationId}`
      );
    }

    console.log("\n=================================");
    console.log("VISITOR SEED COMPLETED");
    console.log("=================================");

    console.log(
      `Visitor: ${VISITOR_ID}`
    );

    console.log(
      `Total Loans: ${createdLoans.length}`
    );

    console.log(
      "All loans assigned to visitor successfully."
    );

    await mongoose.disconnect();

    console.log("MongoDB disconnected");

  } catch (error) {
    console.error(
      "Visitor seed error:",
      error
    );

    await mongoose.disconnect();

    process.exit(1);
  }
};

seedVisitorLoans();