import express from "express";
import { getProfile,getVerificationStatus,getKycProgress,getEmpProfile, updateEmpProfile,saveFcmToken} from "./controller.js";
import { protect } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.get("/v1/profile", protect, getProfile);
router.get('/v1/get-verification',protect,getVerificationStatus)

router.get(
  "/v1/get-kyc",
  (req, res, next) => {
    console.log("🔥🔥 GET-KYC ROUTE HIT");
    next();
  },
  protect,
  getKycProgress
);

router.get("/my-profile", protect, getEmpProfile);
router.patch(
  "/my-profile",
  protect,
  updateEmpProfile
);

router.patch(
  "/fcm-token",
  protect,
  saveFcmToken
);

export default router;