const db = require("../config/database");

// Mahasiswa mengajukan izin baru
exports.createPermission = async (req, res) => {
  try {
    const mahasiswa_id = req.user.id;
    const { start_date, end_date, reason, dosen_pembimbing_id } = req.body;

    if (!start_date || !end_date || !reason || !dosen_pembimbing_id) {
      return res.status(400).json({
        success: false,
        message: "Tanggal, alasan, dan dosen pembimbing wajib diisi.",
      });
    }

    const [dosen] = await db.query(
      "SELECT id FROM users WHERE id = ? AND role = 'dosen'",
      [dosen_pembimbing_id],
    );

    if (dosen.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Dosen pembimbing tidak valid.",
      });
    }

    const document_number = `SP-${Date.now()}`;

    const [result] = await db.query(
      'INSERT INTO permissions (mahasiswa_id, dosen_pembimbing_id, start_date, end_date, reason, status, document_number, student_signature, student_signed_at) VALUES (?, ?, ?, ?, ?, "MENUNGGU", ?, true, NOW())',
      [
        mahasiswa_id,
        dosen_pembimbing_id,
        start_date,
        end_date,
        reason,
        document_number,
      ],
    );

    await db.query(
      "INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)",
      [
        mahasiswa_id,
        "SUBMIT_PERMISSION",
        `Mahasiswa mengajukan perizinan baru dengan ID ${result.insertId}`,
      ],
    );

    res.status(201).json({
      success: true,
      message:
        "Pengajuan izin berhasil dibuat dan menunggu persetujuan dosen serta dekan.",
      permissionId: result.insertId,
      document_number: document_number,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mengambil daftar perizinan (berdasarkan role pengguna)
exports.getPermissions = async (req, res) => {
  try {
    let query = `
      SELECT p.*, u.name as mahasiswa_name, u.nim_nip,
             d.name as dosen_pembimbing_name,
             reviewer.name as reviewer_name
      FROM permissions p
      JOIN users u ON p.mahasiswa_id = u.id
      LEFT JOIN users d ON p.dosen_pembimbing_id = d.id
      LEFT JOIN users reviewer ON p.reviewed_by = reviewer.id
    `;
    let params = [];

    if (req.user.role === "mahasiswa") {
      query += " WHERE p.mahasiswa_id = ?";
      params.push(req.user.id);
    }

    query += " ORDER BY p.created_at DESC";

    const [rows] = await db.query(query, params);
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getActivityLogs = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message:
          "Anda tidak memiliki akses ke riwayat aktivitas seluruh pengguna.",
      });
    }

    let query = `
      SELECT al.id, al.action, al.details, al.created_at,
             u.name AS user_name, u.role AS user_role, u.email
      FROM activity_logs al
      JOIN users u ON u.id = al.user_id
    `;
    const params = [];

    const { role, limit } = req.query;
    if (role && ["admin", "dekan", "dosen", "mahasiswa"].includes(role)) {
      query += " WHERE u.role = ?";
      params.push(role);
    }

    query += " ORDER BY al.created_at DESC LIMIT ?";
    params.push(Number(limit) || 25);

    const [rows] = await db.query(query, params);

    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Dosen / Admin meninjau perizinan (Setujui atau Tolak)
exports.reviewPermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, review_notes } = req.body;
    const reviewer_id = req.user.id;

    if (!["DISETUJUI", "DITOLAK"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status peninjauan tidak valid.",
      });
    }

    const [perm] = await db.query("SELECT * FROM permissions WHERE id = ?", [
      id,
    ]);
    if (perm.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Data perizinan tidak ditemukan.",
      });
    }

    const current = perm[0];
    let finalStatus = status;
    let updateSet = "status = ?, reviewed_by = ?, review_notes = ?";
    const params = [status, reviewer_id, review_notes || ""];

    if (req.user.role === "dosen") {
      updateSet += ", dosen_signature = ?, dosen_signed_at = NOW()";
      params.push(status === "DISETUJUI" ? 1 : 0);
      finalStatus = status === "DISETUJUI" ? "MENUNGGU" : "DITOLAK";
    }

    if (req.user.role === "dekan") {
      updateSet += ", dean_signature = ?, dean_signed_at = NOW()";
      params.push(status === "DISETUJUI" ? 1 : 0);
    }

    if (req.user.role === "admin") {
      updateSet = "status = ?, reviewed_by = ?, review_notes = ?";
      params.length = 3;
      params[0] = status;
      params[1] = reviewer_id;
      params[2] = review_notes || "";
    }

    params.push(id);
    await db.query(`UPDATE permissions SET ${updateSet} WHERE id = ?`, params);

    if (req.user.role === "dosen" && status === "DISETUJUI") {
      await db.query(
        'UPDATE permissions SET status = "MENUNGGU" WHERE id = ?',
        [id],
      );
    }

    if (req.user.role === "dekan" && status === "DISETUJUI") {
      await db.query(
        'UPDATE permissions SET status = "DISETUJUI" WHERE id = ?',
        [id],
      );
    }

    const notifMessage = `Pengajuan perizinan Anda telah ${status.toLowerCase()} oleh ${req.user.role}.`;
    await db.query(
      "INSERT INTO notifications (user_id, message) VALUES (?, ?)",
      [current.mahasiswa_id, notifMessage],
    );

    await db.query(
      "INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)",
      [
        reviewer_id,
        "REVIEW_PERMISSION",
        `Reviewer ${req.user.role} meninjau izin ID ${id} dengan status ${status}`,
      ],
    );

    res.status(200).json({
      success: true,
      message: `Perizinan berhasil diperbarui menjadi ${finalStatus}.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mahasiswa melakukan Check-out saat keluar kampus
exports.checkoutPermission = async (req, res) => {
  try {
    const { id } = req.params;
    const mahasiswa_id = req.user.id;

    const [perm] = await db.query(
      "SELECT * FROM permissions WHERE id = ? AND mahasiswa_id = ?",
      [id, mahasiswa_id],
    );
    if (perm.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Perizinan tidak ditemukan atau bukan milik Anda.",
      });
    }

    if (perm[0].status !== "DISETUJUI") {
      return res.status(400).json({
        success: false,
        message: "Izin harus berstatus DISETUJUI untuk melakukan check-out.",
      });
    }

    await db.query(
      'UPDATE permissions SET status = "SEDANG_KELUAR" WHERE id = ?',
      [id],
    );

    await db.query(
      "INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)",
      [
        mahasiswa_id,
        "CHECK_OUT",
        `Mahasiswa melakukan check-out untuk izin ID ${id}`,
      ],
    );

    res.status(200).json({
      success: true,
      message: "Check-out berhasil dicatat. Status: SEDANG_KELUAR.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mahasiswa melakukan Check-in saat kembali ke kampus
exports.checkinPermission = async (req, res) => {
  try {
    const { id } = req.params;
    const mahasiswa_id = req.user.id;

    const [perm] = await db.query(
      "SELECT * FROM permissions WHERE id = ? AND mahasiswa_id = ?",
      [id, mahasiswa_id],
    );
    if (perm.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Perizinan tidak ditemukan atau bukan milik Anda.",
      });
    }

    if (perm[0].status !== "SEDANG_KELUAR") {
      return res.status(400).json({
        success: false,
        message: "Izin harus berstatus SEDANG_KELUAR untuk melakukan check-in.",
      });
    }

    await db.query('UPDATE permissions SET status = "SELESAI" WHERE id = ?', [
      id,
    ]);

    await db.query(
      "INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)",
      [
        mahasiswa_id,
        "CHECK_IN",
        `Mahasiswa melakukan check-in kembali untuk izin ID ${id}`,
      ],
    );

    res.status(200).json({
      success: true,
      message: "Check-in berhasil dicatat. Status perizinan SELESAI.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
