const express = require("express");
const router = express.Router();
const permissionController = require("../controllers/permissionController");
const { verifyToken, verifyRole } = require("../middleware/auth");

router.post(
  "/",
  verifyToken,
  verifyRole(["mahasiswa"]),
  permissionController.createPermission,
);
router.get("/", verifyToken, permissionController.getPermissions);
router.get(
  "/activity-logs",
  verifyToken,
  verifyRole(["admin"]),
  permissionController.getActivityLogs,
);
router.put(
  "/:id/review",
  verifyToken,
  verifyRole(["admin", "dekan", "dosen"]),
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
