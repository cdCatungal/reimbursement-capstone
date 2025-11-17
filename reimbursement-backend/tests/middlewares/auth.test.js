import { jest, it, expect, beforeEach, describe } from "@jest/globals";

// Mock jwt first
const jwt = {
  sign: jest.fn(),
  verify: jest.fn(),
};

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: jwt,
}));

// Now import your middleware
const { verifyToken } = await import("../../src/middlewares/authMiddleware.js");
const { ensureAuthenticated } = await import("../../src/middlewares/auth.js");

describe("Authentication Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      isAuthenticated: jest.fn(),
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();

    // Set JWT secret for testing
    const mockEnv = {
      JWT_SECRET: "test_secret_key",
    };

    mockEnv.JWT_SECRET = "test_secret_key";
  });

  describe("verifyToken", () => {
    it("should pass if user authenticated via session", () => {
      req.isAuthenticated.mockReturnValue(true);

      verifyToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should verify JWT token from Authorization header", () => {
      req.isAuthenticated.mockReturnValue(false);
      req.headers.authorization = "Bearer valid-token";

      const mockDecoded = {
        id: 1,
        email: "test@example.com",
        role: "Employee",
      };

      jwt.verify.mockReturnValue(mockDecoded);

      verifyToken(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith("valid-token", "test_secret_key");
      expect(req.user).toEqual(mockDecoded);
      expect(next).toHaveBeenCalled();
    });

    it("should return 403 for invalid JWT token", () => {
      req.isAuthenticated.mockReturnValue(false);
      req.headers.authorization = "Bearer invalid-token";

      jwt.verify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid token" });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 if no authentication found", () => {
      req.isAuthenticated.mockReturnValue(false);

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Not authenticated" });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle malformed Authorization header", () => {
      req.isAuthenticated.mockReturnValue(false);
      req.headers.authorization = "InvalidFormat";

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("should handle Bearer token with no space", () => {
      req.isAuthenticated.mockReturnValue(false);
      req.headers.authorization = "BearerTokenWithoutSpace";

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe("ensureAuthenticated", () => {
    it("should pass if authenticated", () => {
      req.isAuthenticated.mockReturnValue(true);

      ensureAuthenticated(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("should return 401 if not authenticated", () => {
      req.isAuthenticated.mockReturnValue(false);

      ensureAuthenticated(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Not authenticated" });
    });

    it("should handle missing isAuthenticated", () => {
      req.isAuthenticated = undefined;

      ensureAuthenticated(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe("JWT Token Validation", () => {
    it("should validate token expiration", () => {
      req.isAuthenticated.mockReturnValue(false);
      req.headers.authorization = "Bearer expired-token";

      jwt.verify.mockImplementation(() => {
        const err = new Error("jwt expired");
        err.name = "TokenExpiredError";
        throw err;
      });

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(jwt.verify).toHaveBeenCalled();
    });

    it("should validate signature error", () => {
      req.isAuthenticated.mockReturnValue(false);
      req.headers.authorization = "Bearer tampered-token";

      jwt.verify.mockImplementation(() => {
        const err = new Error("invalid signature");
        err.name = "JsonWebTokenError";
        throw err;
      });

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("should extract user from valid token", () => {
      req.isAuthenticated.mockReturnValue(false);
      req.headers.authorization = "Bearer valid-token";

      const mockUser = { id: 5, email: "user@example.com", role: "Admin" };

      jwt.verify.mockReturnValue(mockUser);

      verifyToken(req, res, next);

      expect(req.user).toEqual(mockUser);
      expect(req.user.id).toBe(5);
    });
  });

  describe("Session vs JWT", () => {
    it("should prioritize session authentication", () => {
      req.isAuthenticated.mockReturnValue(true);
      req.headers.authorization = "Bearer some-token";

      verifyToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(jwt.verify).not.toHaveBeenCalled();
    });
  });
});
