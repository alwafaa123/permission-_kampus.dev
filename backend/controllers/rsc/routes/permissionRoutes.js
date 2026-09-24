const express = require("express");
const router = express.Router();
const permissionController = require("../../../backend/config/controllers/permissionController");
const {
  verifyToken,
  verifyRole,
} = require("../../../backend/config/middleware/auth");

router.post(
  "/",
  verifyToken,
  verifyRole(["mahasiswa"]),
  permissionController.createPermission,
);
router.get("/", verifyToken, permissionController.getPermissions);
router.put(
  "/:id/review",
  verifyToken,
  verifyRole(["admin", "dosen"]),
  permissionController.reviewPermission,
);
router.put(
  "/:id/checkout",
  verifyToken,
  verifyRole(["mahasiswa"]),
  permissionController.checkoutPermission,
);
router.put(
  "/:id/checkin",
  verifyToken,
  verifyRole(["mahasiswa"]),
  permissionController.checkinPermission,
);

exports.router = router;
