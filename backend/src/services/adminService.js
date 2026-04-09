const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class AdminService {
  constructor() {
    this.adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    this.adminPassword = process.env.ADMIN_PASSWORD || 'change-me';
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
    this.jwtExpiresIn = '8h';
  }

  validateAdminCredentials(email, password) {
    const emailBuffer = Buffer.from(email || '');
    const storedEmailBuffer = Buffer.from(this.adminEmail);
    const passwordBuffer = Buffer.from(password || '');
    const storedPasswordBuffer = Buffer.from(this.adminPassword);

    if (emailBuffer.length !== storedEmailBuffer.length || passwordBuffer.length !== storedPasswordBuffer.length) {
      return false;
    }

    const resultEmail = crypto.timingSafeEqual(emailBuffer, storedEmailBuffer);
    const resultPassword = crypto.timingSafeEqual(passwordBuffer, storedPasswordBuffer);
    return resultEmail && resultPassword;
  }

  createAdminToken() {
    return jwt.sign({ id: 0, role: 'ADMIN' }, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
  }
}

module.exports = new AdminService();