import { Router } from "express";
import { OtpController } from "./otp.controller.js";
import validateRequest from "../../middleware/validateRequest.js";
import { OtpValidation } from "./otp.validation.js";
import { rateLimit } from "../../middleware/rateLimit.js";

const router = Router();
router.post(
  "/send",
  rateLimit({
    keyPrefix: "rl:otp:send",
    windowSeconds: 60,
    max: 5,
    message: "Too many OTP requests. Please wait and try again.",
  }),
  validateRequest(OtpValidation.sendOtpSchema),
  OtpController.sendOtp,
);
router.post(
  "/verify",
  rateLimit({
    keyPrefix: "rl:otp:verify",
    windowSeconds: 60,
    max: 10,
    message: "Too many OTP verification attempts. Please wait and try again.",
  }),
  validateRequest(OtpValidation.verifyOtpSchema),
  OtpController.verifyOtp,
);

export const OtpRouter = router;
