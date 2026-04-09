const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Acesso de administrador necessário' });
  }
  next();
};

module.exports = adminMiddleware;