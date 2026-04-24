const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Acesso negado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("🔐 JWT DECODED:", decoded);

    req.user = decoded;

    next();
  } catch (error) {
    console.log("❌ JWT ERROR:", error);

    res.status(401).json({ message: 'Token inválido' });
  }
};

module.exports = authMiddleware;