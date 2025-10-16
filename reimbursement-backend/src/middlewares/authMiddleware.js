import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  // Check if user is authenticated via session (Passport)
  if (req.isAuthenticated()) {
    return next();
  }

  // Fallback to JWT token if provided (for API clients)
  const token = req.headers.authorization?.split(" ")[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (err) {
      return res.status(403).json({ message: "Invalid token" });
    }
  }

  // No auth found
  return res.status(401).json({ message: "Not authenticated" });
};