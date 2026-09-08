import mongoose from "mongoose";
import dotenv from "dotenv";

import LoanProduct from "./module/loan-products/loanProduct.model.js";
import DocumentMaster from "./module/loan-products/documentMaster.model.js";
import LoanProductDocument from "./module/loan-products/LoanProductDocument.model.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

// =========================================================
// DOCUMENT MASTER HELPER
// =========================================================

const createDocumentIfNotExists = async ({ name, code, description }) => {
  let document = await DocumentMaster.findOne({ code });

  if (document) {
    console.log(`Document already exists: ${code}`);
    return document;
  }

  document = await DocumentMaster.create({
    name,
    code,
    description,

    allowedTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],

    maxSizeMB: 5,
    active: true,
  });

  console.log(`NEW DocumentMaster created: ${name} (${code})`);

  return document;
};

// =========================================================
// EDUCATION LOAN SEED
// =========================================================

const seedEducationLoan001 = async () => {
  try {
    await mongoose.connect(MONGO_URI);

    console.log("MongoDB connected");

    // =====================================================
    // 1. CREATE / FIND EDUCATION LOAN
    // =====================================================

    let educationLoan = await LoanProduct.findOne({
      code: "EDUCATION-LOAN-001",
    });

    if (educationLoan) {
      console.log(
        "Education Loan already exists:",
        educationLoan._id.toString(),
      );
    } else {
      educationLoan = await LoanProduct.create({
        name: "Education Loan",

        code: "EDUCATION-LOAN-001",

        description:
          "Education loan for students seeking financial assistance for higher education, tuition fees, hostel expenses and other education-related expenses.",

        category: "EDUCATION",

        processingType: "MANUAL",

        minAmount: 50000,
        maxAmount: 5000000,

        minTenure: 12,
        maxTenure: 180,

        interestRate: 10.5,
        interestType: "REDUCING",

        emiFrequency: "MONTHLY",

        processingFee: 1,
        processingFeeType: "PERCENTAGE",

        gstPercentage: 18,

        minRiskScore: 650,

        maxActiveLoans: 1,

        instantDisbursement: false,

        requiresPhysicalVerification: true,

        overdue: {
          enabled: true,
          type: "PERCENTAGE",
          value: 2,
          graceDays: 3,
          maxPenaltyPercentage: 100,
        },

        // =================================================
        // FORM CONFIGURATION
        // =================================================

        formConfiguration: {
          fields: [
            // =================================================
            // STEP 1 - PERSONAL DETAILS
            // =================================================

            {
              key: "fullName",
              label: "Full Name",
              type: "text",
              required: true,
              placeholder: "As per PAN card",
              section: "Personal Details",
            },

            {
              key: "dateOfBirth",
              label: "Date of Birth",
              type: "date",
              required: true,
              placeholder: "DD/MM/YYYY",
              section: "Personal Details",
            },

            {
              key: "mobileNumber",
              label: "Mobile Number",
              type: "phone",
              required: true,
              placeholder: "Enter your phone number",
              section: "Personal Details",
            },

            {
              key: "email",
              label: "Email ID",
              type: "email",
              required: true,
              placeholder: "Enter your email address",
              section: "Personal Details",
            },

            {
              key: "aadhaarNumber",
              label: "Aadhaar No.",
              type: "text",
              required: true,
              placeholder: "Enter Aadhaar number",
              section: "Personal Details",
            },

            {
              key: "panNumber",
              label: "PAN No.",
              type: "text",
              required: true,
              placeholder: "Enter PAN number",
              section: "Personal Details",
            },

            {
              key: "pincode",
              label: "PIN Code",
              type: "number",
              required: true,
              placeholder: "Enter PIN code",
              section: "Personal Details",
            },

            // =================================================
            // STEP 2 - ACADEMIC INFORMATION
            // =================================================

            {
              key: "course",
              label: "Course",
              type: "text",
              required: true,
              placeholder: "Enter course name",
              section: "Academic Information",
            },

            {
              key: "specialization",
              label: "Specialization",
              type: "text",
              required: false,
              placeholder: "Enter specialization",
              section: "Academic Information",
            },

            {
              key: "durationYears",
              label: "Duration (Years)",
              type: "number",
              required: true,
              min: 1,
              max: 10,
              placeholder: "Enter course duration",
              section: "Academic Information",
            },

            {
              key: "collegeUniversity",
              label: "College / University",
              type: "text",
              required: true,
              placeholder: "Enter institution name",
              section: "Academic Information",
            },

            {
              key: "country",
              label: "Country",
              type: "text",
              required: true,
              placeholder: "Enter country name",
              section: "Academic Information",
            },

            {
              key: "state",
              label: "State",
              type: "select",
              required: true,
              options: [],
              placeholder: "Select state",
              section: "Academic Information",
            },

            {
              key: "city",
              label: "City",
              type: "text",
              required: true,
              placeholder: "Enter city",
              section: "Academic Information",
            },

            {
              key: "admissionStatus",
              label: "Admission Status",
              type: "select",
              required: true,

              options: [
                {
                  value: "ADMISSION_CONFIRMED",
                  label: "Admission Confirmed",
                },
                {
                  value: "ADMISSION_PENDING",
                  label: "Admission Pending",
                },
              ],

              section: "Academic Information",
            },

            // =================================================
            // STEP 3 - LOAN AMOUNT APPLICATION
            // =================================================

            {
              key: "loanAmount",
              label: "Loan Amount Required",
              type: "number",
              required: true,
              min: 50000,
              max: 5000000,
              placeholder: "Enter loan amount",
              section: "Loan Information",
            },

            {
              key: "totalCourseCost",
              label: "Total Course Cost",
              type: "number",
              required: true,
              min: 0,
              placeholder: "Enter total course cost",
              section: "Loan Information",
            },

            {
              key: "hostelExpenses",
              label: "Hostel Expenses",
              type: "number",
              required: false,
              min: 0,
              placeholder: "Enter hostel expenses",
              section: "Loan Information",
            },

            {
              key: "otherExpenses",
              label: "Other Expenses",
              type: "number",
              required: true,
              min: 0,
              placeholder: "Enter other expenses",
              section: "Loan Information",
            },

            // =================================================
            // STEP 4 - PARENTS & GUARDIAN DETAILS
            // =================================================

            {
              key: "parentGuardianName",
              label: "Parents / Guardian Name",
              type: "text",
              required: true,
              placeholder: "Enter parents / guardian name",
              section: "Parents & Guardian Details",
            },

            {
              key: "guardianRelationship",
              label: "Relationship",
              type: "text",
              required: true,
              placeholder: "Enter relationship",
              section: "Parents & Guardian Details",
            },

            {
              key: "guardianMobileNumber",
              label: "Mobile Number",
              type: "phone",
              required: true,
              placeholder: "Enter mobile number",
              section: "Parents & Guardian Details",
            },

            {
              key: "guardianOccupation",
              label: "Occupation",
              type: "text",
              required: true,
              placeholder: "Enter occupation",
              section: "Parents & Guardian Details",
            },

            {
              key: "guardianEmployerName",
              label: "Employer Name",
              type: "text",
              required: true,
              placeholder: "Enter employer name",
              section: "Parents & Guardian Details",
            },

            {
              key: "guardianMonthlyIncome",
              label: "Monthly Income",
              type: "number",
              required: true,
              min: 0,
              placeholder: "Enter monthly income",
              section: "Parents & Guardian Details",
            },

            {
              key: "guardianAnnualIncome",
              label: "Annual Income",
              type: "number",
              required: true,
              min: 0,
              placeholder: "Enter annual income",
              section: "Parents & Guardian Details",
            },

            {
              key: "guardianPanNumber",
              label: "PAN Number",
              type: "text",
              required: true,
              placeholder: "Enter PAN number",
              section: "Parents & Guardian Details",
            },

            // =================================================
            // STEP 5 - FINANCIAL INFORMATION
            // =================================================

            {
              key: "existingLoanDetails",
              label: "Existing Loan Details",
              type: "textarea",
              required: false,
              placeholder: "Enter existing loan details",
              section: "Financial Information",
            },

            {
              key: "currentEmi",
              label: "Current EMI (if applicable)",
              type: "number",
              required: false,
              min: 0,
              placeholder: "Enter EMI amount",
              section: "Financial Information",
            },

            {
              key: "bankName",
              label: "Bank Name",
              type: "text",
              required: true,
              placeholder: "Enter bank name",
              section: "Financial Information",
            },

            {
              key: "accountNumber",
              label: "Account Number",
              type: "text",
              required: true,
              placeholder: "Enter account number",
              section: "Financial Information",
            },

            {
              key: "ifscCode",
              label: "IFSC Code",
              type: "text",
              required: true,
              placeholder: "Enter IFSC code",
              section: "Financial Information",
            },

            // =================================================
            // STEP 7 - LOAN PREFERENCE
            // =================================================

            {
              key: "preferredBank",
              label: "Preferred Bank",
              type: "select",
              required: true,
              options: [],
              placeholder: "Select bank",
              section: "Loan Preference",
            },

            {
              key: "loanTenure",
              label: "Loan Tenure",
              type: "select",
              required: true,

              options: [
                {
                  value: "12",
                  label: "12 months",
                },
                {
                  value: "24",
                  label: "24 months",
                },
                {
                  value: "36",
                  label: "36 months",
                },
                {
                  value: "48",
                  label: "48 months",
                },
                {
                  value: "60",
                  label: "60 months",
                },
                {
                  value: "84",
                  label: "84 months",
                },
                {
                  value: "120",
                  label: "120 months",
                },
                {
                  value: "180",
                  label: "180 months",
                },
              ],

              section: "Loan Preference",
            },

            {
              key: "moratoriumPeriod",
              label: "Moratorium Period",
              type: "select",
              required: true,

              options: [
                {
                  value: "NONE",
                  label: "No Moratorium",
                },
                {
                  value: "6_MONTHS",
                  label: "6 Months",
                },
                {
                  value: "12_MONTHS",
                  label: "12 Months",
                },
                {
                  value: "18_MONTHS",
                  label: "18 Months",
                },
                {
                  value: "24_MONTHS",
                  label: "24 Months",
                },
              ],

              section: "Loan Preference",
            },

            // =================================================
            // DECLARATION
            // =================================================

            {
              key: "declarationAccepted",
              label:
                "I hereby declare that all the information provided above is true and correct to the best of my knowledge. I understand that any false information may lead to rejection of my loan application.",

              type: "checkbox",

              required: true,

              section: "Declaration",
            },
          ],

          // =====================================================
          // DOCUMENT CONFIGURATION
          // =====================================================

          documents: {
            COMMON: [
              {
                code: "AADHAAR",
                label: "Aadhaar Card",
                required: true,
              },

              {
                code: "PAN",
                label: "PAN Card",
                required: true,
              },

              {
                code: "ADMISSION_LETTER",
                label: "Admission Letter",
                required: true,
              },

              {
                code: "FEE_STRUCTURE",
                label: "Fee Structure",
                required: true,
              },

              {
                code: "LATEST_MARKSHEET",
                label: "Latest Marksheet",
                required: true,
              },
            ],
          },
        },

        active: true,
      });

      console.log("NEW Education Loan created:", educationLoan._id.toString());
    }

    // =====================================================
    // 2. CREATE MISSING DOCUMENT MASTER RECORDS
    // =====================================================

    const admissionLetter = await createDocumentIfNotExists({
      name: "Admission Letter",
      code: "ADMISSION_LETTER",
      description:
        "Official admission letter issued by the college or university confirming the applicant's admission.",
    });

    const feeStructure = await createDocumentIfNotExists({
      name: "Fee Structure",
      code: "FEE_STRUCTURE",
      description:
        "Official fee structure issued by the college or university showing the course and applicable academic fees.",
    });

    const latestMarksheet = await createDocumentIfNotExists({
      name: "Latest Marksheet",
      code: "LATEST_MARKSHEET",
      description:
        "Latest academic marksheet of the applicant used for education and academic verification.",
    });

    // =====================================================
    // 3. FIND EXISTING AADHAAR + PAN
    // =====================================================

    const aadhaar = await DocumentMaster.findOne({
      code: "AADHAAR",
      active: true,
    });

    const pan = await DocumentMaster.findOne({
      code: "PAN",
      active: true,
    });

    if (!aadhaar) {
      throw new Error("DocumentMaster record not found: AADHAAR");
    }

    if (!pan) {
      throw new Error("DocumentMaster record not found: PAN");
    }

    // =====================================================
    // 4. DOCUMENT LIST
    // =====================================================

    const documents = [
      aadhaar,
      pan,
      admissionLetter,
      feeStructure,
      latestMarksheet,
    ];

    console.log(
      "\nAll Education Loan documents:",
      documents.map((doc) => doc.code),
    );

    // =====================================================
    // 5. DELETE OLD MAPPINGS
    // =====================================================

    await LoanProductDocument.deleteMany({
      loanProduct: educationLoan._id,
    });

    console.log("Old document mappings removed for EDUCATION-LOAN-001");

    // =====================================================
    // 6. CREATE DOCUMENT MAPPINGS
    // =====================================================

    const mappings = documents.map((document, index) => ({
      loanProduct: educationLoan._id,

      document: document._id,

      mandatory: true,

      displayOrder: index + 1,

      active: true,
    }));

    const createdMappings = await LoanProductDocument.insertMany(mappings);

    // =====================================================
    // 7. FINAL OUTPUT
    // =====================================================

    console.log("\n======================================");

    console.log("EDUCATION LOAN CREATED SUCCESSFULLY");

    console.log("======================================");

    console.log("Loan ID:", educationLoan._id.toString());

    console.log("Loan Code:", educationLoan.code);

    console.log("Loan Name:", educationLoan.name);

    console.log("\n======================================");

    console.log("EDUCATION LOAN DOCUMENTS");

    console.log("======================================");

    documents.forEach((document, index) => {
      console.log(
        `${index + 1}. ${document.name} | ${document.code} | ${document._id}`,
      );
    });

    console.log("\nDocument mappings created:", createdMappings.length);

    console.log("\nSeed completed successfully.");
  } catch (error) {
    console.error("Education Loan seed failed:", error);
  } finally {
    await mongoose.connection.close();

    console.log("MongoDB connection closed");
  }
};

seedEducationLoan001();
