import User from "../User/models.js";
import Kyc from "../kyc/kyc.model.js";
import BankAccount from "../bank-accounts/BankAccount.model.js";

import Employee from "./Employee_Schema.js";
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-mpin -fcmToken");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const kyc = await Kyc.findOne({
      userId: req.user.id,
    }).select("dob gender");

    return res.status(200).json({
      success: true,
      data: {
        ...user.toObject(),

          dob: kyc?.dob || null,
    gender: kyc?.gender || null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getEmpProfile = async (req, res) => {
  try {
    const employeeId = req.user.id;

    const employee = await Employee.findOne({
      _id: employeeId,
      isDeleted: false,
    })
      .select(
        "-password -loginAttempts -lockUntil -tokenVersion -passwordChangedAt"
      )
      .populate({
        path: "reportingManager",
        select: "employeeId fullName designation profileImage",
        match: { isDeleted: false },
      })
      .lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      data: {
        // =====================================
        // PROFILE
        // =====================================
        profile: {
          profileImage: employee.profileImage || {
            url: "",
            publicId: "",
          },
        },

        // =====================================
        // BASIC INFORMATION
        // =====================================
        basicInformation: {
          employeeId: employee.employeeId,
          fullName: employee.fullName,
          dateOfBirth: employee.dateOfBirth || null,
          gender: employee.gender || null,
        },

        // =====================================
        // CONTACT DETAILS
        // =====================================
        contactDetails: {
          email: employee.email || "",
          mobile: employee.mobile || "",
        },

        // =====================================
        // EMPLOYMENT INFORMATION
        // =====================================
        employmentInformation: {
          role: employee.role,
          designation: employee.designation || "",
          department: employee.department || null,
          branch: employee.branch || "",
          joiningDate: employee.joiningDate || null,
          employmentType: employee.employmentType,
          status: employee.status,
        },

        // =====================================
        // REPORTING MANAGER
        // =====================================
        reportingManager: employee.reportingManager
          ? {
              employeeId: employee.reportingManager.employeeId,
              fullName: employee.reportingManager.fullName,
              designation: employee.reportingManager.designation || "",
              profileImage:
                employee.reportingManager.profileImage || {
                  url: "",
                  publicId: "",
                },
            }
          : null,

        // =====================================
        // RESIDENTIAL ADDRESS
        // =====================================
        residentialAddress: employee.address || {
          street: "",
          city: "",
          state: "",
          country: "",
          pincode: "",
        },

        // =====================================
        // EMERGENCY CONTACT
        // =====================================
        emergencyContact: employee.emergencyContact || {
          name: "",
          relation: "",
          mobile: "",
        },

        // =====================================
        // PERMISSIONS
        // =====================================
        permissions: employee.permissions || [],

        // =====================================
        // ASSIGNED BRANCHES
        // =====================================
        assignedBranches: employee.assignedBranches || [],

        // =====================================
        // LAST LOGIN
        // =====================================
        lastLogin: employee.lastLogin || null,

        // =====================================
        // ACCOUNT META
        // =====================================
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get My Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



export const  updateEmpProfile = async (req, res) => {
  try {
    const employeeId = req.user.id;

    const employee = await Employee.findOne({
      _id: employeeId,
      isDeleted: false,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const {
      fullName,
      email,
      mobile,
      profileImage,
      dateOfBirth,
      gender,
      address,
      emergencyContact,
    } = req.body;

    // =====================================
    // BASIC INFORMATION
    // =====================================

    if (fullName !== undefined) {
      if (!fullName.trim()) {
        return res.status(400).json({
          success: false,
          message: "Full name cannot be empty",
        });
      }

      employee.fullName = fullName.trim();
    }

    // =====================================
    // EMAIL
    // =====================================

    if (email !== undefined) {
      const normalizedEmail = email.trim().toLowerCase();

      if (normalizedEmail) {
        const existingEmail = await Employee.findOne({
          email: normalizedEmail,
          _id: { $ne: employeeId },
          isDeleted: false,
        });

        if (existingEmail) {
          return res.status(409).json({
            success: false,
            message: "Email is already registered with another employee",
          });
        }

        employee.email = normalizedEmail;
      } else {
        employee.email = undefined;
      }
    }

    // =====================================
    // MOBILE
    // =====================================

    if (mobile !== undefined) {
      const normalizedMobile = mobile.trim();

      if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid Indian mobile number",
        });
      }

      const existingMobile = await Employee.findOne({
        mobile: normalizedMobile,
        _id: { $ne: employeeId },
        isDeleted: false,
      });

      if (existingMobile) {
        return res.status(409).json({
          success: false,
          message: "Mobile number is already registered with another employee",
        });
      }

      employee.mobile = normalizedMobile;
    }

    // =====================================
    // PROFILE IMAGE
    // =====================================

    if (profileImage !== undefined) {
      if (
        typeof profileImage !== "object" ||
        Array.isArray(profileImage)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid profile image format",
        });
      }

      employee.profileImage = {
        url: profileImage.url || "",
        publicId: profileImage.publicId || "",
      };
    }

    // =====================================
    // DATE OF BIRTH
    // =====================================

    if (dateOfBirth !== undefined) {
      if (dateOfBirth === null || dateOfBirth === "") {
        employee.dateOfBirth = null;
      } else {
        const parsedDate = new Date(dateOfBirth);

        if (Number.isNaN(parsedDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid date of birth",
          });
        }

        employee.dateOfBirth = parsedDate;
      }
    }

    // =====================================
    // GENDER
    // =====================================

    if (gender !== undefined) {
      if (!["MALE", "FEMALE", "OTHER"].includes(gender)) {
        return res.status(400).json({
          success: false,
          message: "Gender must be MALE, FEMALE or OTHER",
        });
      }

      employee.gender = gender;
    }

    // =====================================
    // RESIDENTIAL ADDRESS
    // =====================================

    if (address !== undefined) {
      if (
        typeof address !== "object" ||
        Array.isArray(address)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid address format",
        });
      }

      employee.address = {
        street: address.street ?? employee.address?.street ?? "",
        city: address.city ?? employee.address?.city ?? "",
        state: address.state ?? employee.address?.state ?? "",
        country: address.country ?? employee.address?.country ?? "",
        pincode: address.pincode ?? employee.address?.pincode ?? "",
      };
    }

    // =====================================
    // EMERGENCY CONTACT
    // =====================================

    if (emergencyContact !== undefined) {
      if (
        typeof emergencyContact !== "object" ||
        Array.isArray(emergencyContact)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid emergency contact format",
        });
      }

      if (emergencyContact.mobile) {
        if (!/^[6-9]\d{9}$/.test(emergencyContact.mobile)) {
          return res.status(400).json({
            success: false,
            message: "Invalid emergency contact mobile number",
          });
        }
      }

      employee.emergencyContact = {
        name:
          emergencyContact.name ??
          employee.emergencyContact?.name ??
          "",

        relation:
          emergencyContact.relation ??
          employee.emergencyContact?.relation ??
          "",

        mobile:
          emergencyContact.mobile ??
          employee.emergencyContact?.mobile ??
          "",
      };
    }

    // =====================================
    // SAVE
    // =====================================

    await employee.save();

    // =====================================
    // RETURN UPDATED PROFILE
    // =====================================

    const updatedEmployee = await Employee.findOne({
      _id: employeeId,
      isDeleted: false,
    })
      .select(
        "-password -loginAttempts -lockUntil -tokenVersion -passwordChangedAt"
      )
      .populate({
        path: "reportingManager",
        select: "employeeId fullName designation profileImage",
        match: { isDeleted: false },
      })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        profile: {
          profileImage: updatedEmployee.profileImage || {
            url: "",
            publicId: "",
          },
        },

        basicInformation: {
          employeeId: updatedEmployee.employeeId,
          fullName: updatedEmployee.fullName,
          dateOfBirth: updatedEmployee.dateOfBirth || null,
          gender: updatedEmployee.gender || null,
        },

        contactDetails: {
          email: updatedEmployee.email || "",
          mobile: updatedEmployee.mobile || "",
        },

        employmentInformation: {
          role: updatedEmployee.role,
          designation: updatedEmployee.designation || "",
          department: updatedEmployee.department || null,
          branch: updatedEmployee.branch || "",
          joiningDate: updatedEmployee.joiningDate || null,
          employmentType: updatedEmployee.employmentType,
          status: updatedEmployee.status,
        },

        reportingManager: updatedEmployee.reportingManager
          ? {
              employeeId:
                updatedEmployee.reportingManager.employeeId,

              fullName:
                updatedEmployee.reportingManager.fullName,

              designation:
                updatedEmployee.reportingManager.designation || "",

              profileImage:
                updatedEmployee.reportingManager.profileImage || {
                  url: "",
                  publicId: "",
                },
            }
          : null,

        residentialAddress: updatedEmployee.address || {
          street: "",
          city: "",
          state: "",
          country: "",
          pincode: "",
        },

        emergencyContact:
          updatedEmployee.emergencyContact || {
            name: "",
            relation: "",
            mobile: "",
          },

        permissions: updatedEmployee.permissions || [],

        assignedBranches:
          updatedEmployee.assignedBranches || [],

        lastLogin: updatedEmployee.lastLogin || null,

        createdAt: updatedEmployee.createdAt,
        updatedAt: updatedEmployee.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update My Profile Error:", error);

    // MongoDB duplicate key error
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0];

      return res.status(409).json({
        success: false,
        message: `${duplicateField} is already registered`,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getVerificationStatus = async (req, res) => {
  try {
    const [kyc, bankAccount] = await Promise.all([
      Kyc.findOne({
        user: req.user.id,
      }),

      BankAccount.findOne({
        user: req.user.id,
        isPrimary: true,
      }).select("verified status"),
    ]);

    const aadhaarVerified = !!kyc?.aadhaarNumber;

    const panVerified = !!kyc?.panNumber;

    const personalDetailsCompleted =
      !!kyc?.fullName &&
      !!kyc?.dob &&
      !!kyc?.gender;

    const addressCompleted =
      !!kyc?.addressLine &&
      !!kyc?.city &&
      !!kyc?.state &&
      !!kyc?.pinCode;

    const occupationCompleted =
      !!kyc?.occupation &&
      !!kyc?.annualIncome;

    const bankVerified =
      bankAccount?.verified === true &&
      bankAccount?.status === "VERIFIED";

    // Agar koi bhi ek section complete/verified hai
    const isVerification =
      aadhaarVerified ||
      panVerified ||
      personalDetailsCompleted ||
      addressCompleted ||
      occupationCompleted ||
      bankVerified;

    return res.status(200).json({
      success: true,
      data: {
        isVerification,

        aadhaarVerified,
        panVerified,
        personalDetailsCompleted,
        addressCompleted,
        occupationCompleted,
        bankVerified,

        kycStatus: isVerification
          ? "VERIFIED"
          : "PENDING",
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};




export const getKycProgress = async (req, res) => {
  try {
        console.log("🔥 NEW getKycProgress CONTROLLER HIT");
    const [user, kyc, bankAccount] = await Promise.all([
      User.findById(req.user.id).select("mobile"),

      Kyc.findOne({
        user: req.user.id,
      }),

      BankAccount.findOne({
        user: req.user.id,
        isPrimary: true,
      }).select(
        "bankName accountHolderName accountNumber ifscCode branchName accountType isPrimary verified verificationMethod verificationReference verificationMessage status rejectedReason verifiedAt createdAt updatedAt"
      ),
    ]);

    // -------------------------
    // MASK FUNCTIONS
    // -------------------------

    const maskAadhaar = (aadhaar) => {
      if (!aadhaar) return null;

      return `XXXXXXXX${aadhaar.slice(-4)}`;
    };

    const maskPan = (pan) => {
      if (!pan) return null;

      return `${pan.slice(0, 5)}****${pan.slice(-1)}`;
    };

    const maskAccountNumber = (accountNumber) => {
      if (!accountNumber) return null;

      return `XXXXXX${accountNumber.slice(-4)}`;
    };

    // -------------------------
    // AADHAAR
    // -------------------------

    const aadhaarVerified =
      kyc?.aadhaarVerified === true;

    // -------------------------
    // PAN
    // -------------------------

    const panVerified =
      kyc?.panVerified === true;

    // -------------------------
    // PERSONAL DETAILS
    // -------------------------

    const personalDetailsCompleted =
      !!kyc?.fullName &&
      !!kyc?.dob &&
      !!kyc?.gender;

    // -------------------------
    // ADDRESS
    // -------------------------

    const addressCompleted =
      !!kyc?.addressLine &&
      !!kyc?.city &&
      !!kyc?.state &&
      !!kyc?.pinCode;

    // -------------------------
    // OCCUPATION
    // -------------------------

    const occupationCompleted =
      !!kyc?.occupation &&
      !!kyc?.annualIncome;

    // -------------------------
    // BANK VERIFICATION
    // -------------------------

    const bankVerified =
      bankAccount?.verified === true &&
      bankAccount?.status === "VERIFIED";

    const bankStatus =
      bankAccount?.status || "PENDING";

    // -------------------------
    // OVERALL KYC
    // -------------------------

    const isVerification =
      aadhaarVerified ||
      panVerified ||
      personalDetailsCompleted ||
      addressCompleted ||
      occupationCompleted ||
      bankVerified;

    const kycStatus =
      isVerification
        ? "VERIFIED"
        : "PENDING";

    // -------------------------
    // RESPONSE
    // -------------------------

    return res.status(200).json({
      success: true,

      data: {

        // =========================
        // OVERALL KYC
        // =========================

        isVerification,

        kycStatus,

        lastUpdatedAt:
          kyc?.updatedAt || null,

        // =========================
        // AADHAAR
        // =========================

        aadhaarVerified,

        aadhaarNumber:
          maskAadhaar(
            kyc?.aadhaarNumber
          ),

        // =========================
        // PAN
        // =========================

        panVerified,

        panNumber:
          maskPan(
            kyc?.panNumber
          ),

        // =========================
        // MOBILE
        // =========================

        mobileNumber:
          user?.mobile || null,

        // =========================
        // PERSONAL DETAILS
        // =========================

        personalDetailsCompleted,

        // =========================
        // ADDRESS
        // =========================

        addressCompleted,

        // =========================
        // OCCUPATION
        // =========================

        occupationCompleted,

        // =========================
        // BANK ACCOUNT
        // =========================

        bankVerified,

        bankStatus,

        bankDetails: bankAccount
          ? {
              bankName:
                bankAccount.bankName || null,

              accountHolderName:
                bankAccount.accountHolderName || null,

              accountNumber:
                maskAccountNumber(
                  bankAccount.accountNumber
                ),

              ifscCode:
                bankAccount.ifscCode || null,

              branchName:
                bankAccount.branchName || null,

              accountType:
                bankAccount.accountType || null,

              isPrimary:
                bankAccount.isPrimary || false,

              verified:
                bankAccount.verified || false,

              status:
                bankAccount.status || "PENDING",

              verificationMethod:
                bankAccount.verificationMethod || null,

              verificationReference:
                bankAccount.verificationReference || null,

              verificationMessage:
                bankAccount.verificationMessage || null,

              rejectedReason:
                bankAccount.rejectedReason || null,

              verifiedAt:
                bankAccount.verifiedAt || null,

              createdAt:
                bankAccount.createdAt || null,

              updatedAt:
                bankAccount.updatedAt || null,
            }
          : null,
      },
     
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};





export const saveFcmToken = async (req, res) => {
  try {
    const userId = req.user._id;
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: "FCM token is required.",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          fcmToken: fcmToken,
        },
      },
      {
        new: true,
      }
    ).select("_id fullName fcmToken");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "FCM token saved successfully.",
      data: {
        userId: user._id,
        fullName: user.fullName,
        fcmToken: user.fcmToken,
      },
    });
  } catch (error) {
    console.error("Save FCM Token Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save FCM token.",
      error: error.message,
    });
  }
};