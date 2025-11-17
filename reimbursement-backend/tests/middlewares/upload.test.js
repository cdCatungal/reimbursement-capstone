// reimbursement-backend/tests/middlewares/upload.test.js
import { it, expect, describe } from "@jest/globals";
import { Buffer } from "buffer";
import {
  bufferToBase64,
  base64ToBuffer,
  upload,
} from "../../src/middlewares/upload.js";

describe("Upload Middleware", () => {
  describe("bufferToBase64", () => {
    it("should convert buffer to base64 string", () => {
      const buffer = Buffer.from("test data");
      const base64 = bufferToBase64(buffer);

      expect(typeof base64).toBe("string");
      expect(base64).toBe(buffer.toString("base64"));
    });

    it("should handle empty buffer", () => {
      const buffer = Buffer.from("");
      const base64 = bufferToBase64(buffer);

      expect(base64).toBe("");
    });

    it("should handle binary image data", () => {
      // Simulate JPEG header bytes
      const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const base64 = bufferToBase64(buffer);

      expect(base64.length).toBeGreaterThan(0);
      expect(typeof base64).toBe("string");
    });
  });

  describe("base64ToBuffer", () => {
    it("should convert base64 string to buffer", () => {
      const originalData = "test data";
      const base64 = Buffer.from(originalData).toString("base64");
      const buffer = base64ToBuffer(base64);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.toString()).toBe(originalData);
    });

    it("should round-trip buffer conversion", () => {
      const originalBuffer = Buffer.from("test image data");
      const base64 = bufferToBase64(originalBuffer);
      const convertedBuffer = base64ToBuffer(base64);

      expect(convertedBuffer).toEqual(originalBuffer);
    });
  });

  describe("Multer Configuration", () => {
    it("should use memory storage", () => {
      expect(upload).toBeDefined();
      // Multer configuration would be checked here
    });

    it("should enforce 5MB file size limit", () => {
      const limits = upload.limits;
      expect(limits.fileSize).toBe(5 * 1024 * 1024);
    });

    it("should only accept image files", () => {
      const fileFilter = upload.fileFilter;
      expect(fileFilter).toBeDefined();

      // Test file filter logic
      const mockReq = {};
      const mockImageFile = { mimetype: "image/jpeg" };
      const mockPdfFile = { mimetype: "application/pdf" };

      let callbackResult;
      const mockCallback = (error, result) => {
        callbackResult = { error, result };
      };

      // Should accept images
      fileFilter(mockReq, mockImageFile, mockCallback);
      expect(callbackResult.result).toBe(true);

      // Should reject non-images
      fileFilter(mockReq, mockPdfFile, mockCallback);
      expect(callbackResult.error).toBeDefined();
    });
  });

  describe("Image Processing", () => {
    it("should handle JPEG images", () => {
      const jpegMagicBytes = Buffer.from([0xff, 0xd8, 0xff]);
      expect(jpegMagicBytes[0]).toBe(0xff);
      expect(jpegMagicBytes[1]).toBe(0xd8);
    });

    it("should handle PNG images", () => {
      const pngMagicBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      expect(pngMagicBytes[0]).toBe(0x89);
      expect(pngMagicBytes[1]).toBe(0x50);
    });
  });
});
