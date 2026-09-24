const mysql = require("mysql2");
const bcrypt = require("bcrypt");
require("dotenv").config({ path: __dirname + "/.env" });

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "db_sistem_pengontrolan_mahasiswa",
  multipleStatements: true,
});

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

async function setup() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin','dekan','dosen','mahasiswa') NOT NULL,
        nim_nip VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        mahasiswa_id INT NOT NULL,
        dosen_pembimbing_id INT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT NOT NULL,
        status ENUM('MENUNGGU','DISETUJUI','DITOLAK','SEDANG_KELUAR','SELESAI') NOT NULL DEFAULT 'MENUNGGU',
        reviewed_by INT NULL,
        review_notes TEXT NULL,
        student_signature BOOLEAN DEFAULT FALSE,
        dosen_signature BOOLEAN DEFAULT FALSE,
        dean_signature BOOLEAN DEFAULT FALSE,
        student_signed_at TIMESTAMP NULL,
        dosen_signed_at TIMESTAMP NULL,
        dean_signed_at TIMESTAMP NULL,
        document_number VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (mahasiswa_id) REFERENCES users(id),
        FOREIGN KEY (dosen_pembimbing_id) REFERENCES users(id),
        FOREIGN KEY (reviewed_by) REFERENCES users(id)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        action VARCHAR(100) NOT NULL,
        details TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    const defaultUsers = [
      {
        name: "Administrator Sistem",
        email: "admin@kampus.ac.id",
        password: "admin123",
        role: "admin",
        nim_nip: "ADM001",
      },
      {
        name: "Prof. Dr. Arif Rahman, M.Si",
        email: "dekan@kampus.ac.id",
        password: "dekan123",
        role: "dekan",
        nim_nip: "DEKAN001",
      },
      {
        name: "Dr. Budi Santoso, M.T.",
        email: "budi.dosen@kampus.ac.id",
        password: "dosen123",
        role: "dosen",
        nim_nip: "NIP198001012005011001",
      },
      {
        name: "Ahmad Mahasiswa",
        email: "ahmad.mhs@student.kampus.ac.id",
        password: "mahasiswa123",
        role: "mahasiswa",
        nim_nip: "210401001",
      },
    ];

    for (const user of defaultUsers) {
      const [existing] = await query("SELECT id FROM users WHERE email = ?", [
        user.email,
      ]);

      if (!existing) {
        const hashed = await bcrypt.hash(user.password, 10);
        await query(
          "INSERT INTO users (name, email, password, role, nim_nip) VALUES (?, ?, ?, ?, ?)",
          [user.name, user.email, hashed, user.role, user.nim_nip],
        );
        console.log(`User ${user.email} berhasil dibuat`);
      } else {
        const hashed = await bcrypt.hash(user.password, 10);
        await query(
          "UPDATE users SET name = ?, password = ?, role = ?, nim_nip = ? WHERE email = ?",
          [user.name, hashed, user.role, user.nim_nip, user.email],
        );
        console.log(`User ${user.email} berhasil diperbarui passwordnya`);
      }
    }

    console.log("Database setup selesai.");
    db.end();
  } catch (error) {
    console.error("DB_SETUP_ERROR:", error.message);
    process.exit(1);
  }
}

setup();
