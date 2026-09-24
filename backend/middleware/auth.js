const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({
        success: false,
        message: "Akses ditolak, token tidak ditemukan.",
      });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Token tidak valid atau kedaluwarsa.",
        });
    }
    req.user = user;
    next();
  });
};

const verifyRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Anda tidak memiliki hak akses untuk tindakan ini.",
        });
    }
    next();
  };
};

module.exports = { verifyToken, verifyRole };
