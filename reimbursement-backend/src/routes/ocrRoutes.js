/**
 * @swagger
 * tags:
 *   name: OCR
 *   description: Optical Character Recognition for receipt processing
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     OCRResult:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         rawText:
 *           type: string
 *           example: "Store Name\nDate: 12/15/2024\nTotal: ₱1,500.00"
 *         cleanedText:
 *           type: string
 *           example: "Store Name Date: 12/15/2024 Total: 1500.00"
 *         extracted:
 *           type: object
 *           properties:
 *             store:
 *               type: string
 *               example: "7-ELEVEN"
 *             date:
 *               type: string
 *               example: "15/12/2024"
 *             reference:
 *               type: string
 *               example: "OR-123456"
 *             items:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: "Coffee"
 *                   qty:
 *                     type: integer
 *                     example: 1
 *                   price:
 *                     type: number
 *                     example: 50.00
 *             subtotal:
 *               type: number
 *               example: 1400.00
 *             total:
 *               type: number
 *               example: 1500.00
 *             payment_method:
 *               type: string
 *               example: "CASH"
 *             cashier:
 *               type: string
 *               example: "John Doe"
 *     StructuredOCRResult:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         rawText:
 *           type: string
 *         cleanedText:
 *           type: string
 *         structured:
 *           type: object
 *           properties:
 *             merchant:
 *               type: string
 *               example: "JOLLIBEE"
 *             date:
 *               type: string
 *               example: "15/12/2024"
 *             total:
 *               type: number
 *               example: 1387.72
 *             items:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   description:
 *                     type: string
 *                   price:
 *                     type: number
 *             payment_method:
 *               type: string
 */

import express from "express";
import Tesseract from "tesseract.js";
import multer from "multer";
import { cleanExtractedText } from "../controllers/ocrController.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import genAI from "../config/gemini.js";

const router = express.Router();

// ✅ Use memory storage instead of disk storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// ----------------- Retry Helper -----------------
/**
 * Retry function with exponential backoff for handling rate limits
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} Result of the function
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i); // Exponential backoff: 2s, 4s, 8s
        console.log(
          `⏳ Rate limit hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

// ----------------- Helpers -----------------
function cleanOCR(text) {
  if (!text) return "";
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[|¦]/g, "I")
    .replace(/[\u00A0]/g, " ")
    .replace(/\t/g, " ")
    .replace(/ {2,}/g, " ")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toNumber(numStr) {
  if (!numStr) return null;
  const clean = numStr.replace(/[^\d.-]/g, "").replace(/,+/g, "");
  const n = parseFloat(clean);
  return isFinite(n) ? Number(n.toFixed(2)) : null;
}

function findAmounts(text) {
  const regex =
    /(?:₱|\bPHP\b|PHP|\bP\b)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{1,2})?|[0-9]+\.\d{1,2})/gi;
  const matches = [];
  let m;
  while ((m = regex.exec(text)) !== null) {
    matches.push({ raw: m[0], value: toNumber(m[1]), index: m.index });
  }
  return matches;
}

function findTotal(text) {
  const totalPatterns = [
    /grand\s*total[:\s]*₱?\s*([0-9,]+\.\d{1,2})/i,
    /total\s*[:\s]*₱?\s*([0-9,]+\.\d{1,2})/i,
    /amount\s*due[:\s]*₱?\s*([0-9,]+\.\d{1,2})/i,
    /amount[:\s]*₱?\s*([0-9,]+\.\d{1,2})/i,
  ];
  for (const p of totalPatterns) {
    const m = text.match(p);
    if (m && m[1]) return toNumber(m[1]);
  }
  const amounts = findAmounts(text);
  if (amounts.length) return amounts[amounts.length - 1].value;
  return null;
}

function parseDateToDDMMYYYY(text) {
  if (!text) return null;
  const datePatterns = [
    /\b(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})\b/,
    /\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/,
    /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/,
  ];

  for (const p of datePatterns) {
    const m = text.match(p);
    if (!m) continue;

    if (p === datePatterns[0]) {
      const [_, y, mo, d] = m;
      const dd = String(d).padStart(2, "0");
      const mm = String(mo).padStart(2, "0");
      return `${dd}/${mm}/${y}`;
    }

    if (p === datePatterns[1]) {
      let [_, part1, part2, year] = m;
      let day = part1,
        month = part2;
      if (Number(month) > 12 && Number(day) <= 12) {
        month = part1;
        day = part2;
      } else {
        if (Number(part1) > 31) {
          day = part2;
          month = part1;
        } else {
          day = part1;
          month = part2;
        }
      }
      return `${String(day).padStart(2, "0")}/${String(month).padStart(
        2,
        "0",
      )}/${year}`;
    }

    if (p === datePatterns[2]) {
      const [_, monthName, d, y] = m;
      const monthIndex = new Date(`${monthName} 1, ${y}`).getMonth() + 1;
      if (!isNaN(monthIndex)) {
        return `${String(d).padStart(2, "0")}/${String(monthIndex).padStart(
          2,
          "0",
        )}/${y}`;
      }
    }
  }
  return null;
}

function extractReference(text) {
  const patterns = [
    /\b(?:OR|O\.R\.|Official Receipt|Invoice|Inv\.|Ref|Reference|Acn?t No\.?)\s*[:#-]?\s*([A-Za-z0-9-]+)/i,
    /\b(?:Sales Invoice|Sales Inv)\s*[:#-]?\s*([A-Za-z0-9-]+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) return m[1].trim();
  }
  const bottomMatches = text
    .split("\n")
    .slice(-6)
    .join("\n")
    .match(/([0-9]{6,})/);
  return bottomMatches ? bottomMatches[1] : "";
}

function titleCase(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => {
      if (w.length <= 2) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

const merchantDictionary = [
  "S&R",
  "S&R MEMBERSHIP SHOPPING",
  "JOLLIBEE",
  "MCDONALD'S",
  "PUREGOLD",
  "7-ELEVEN",
  "SM",
  "LANDERS",
];

function detectMerchant(lines) {
  if (!lines || !lines.length) return "";
  for (const line of lines.slice(0, 6)) {
    for (const known of merchantDictionary) {
      if (line.toUpperCase().includes(known.toUpperCase())) return known;
    }
  }
  for (const candidate of lines.slice(0, 6)) {
    if (candidate && candidate.length > 2 && /[A-Za-z]/.test(candidate))
      return candidate;
  }
  return "";
}

function parseReceipt(text) {
  const cleaned = cleanOCR(text);
  const lines = cleaned
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l);

  const merchant = detectMerchant(lines) || (lines.length ? lines[0] : "");
  const date = parseDateToDDMMYYYY(cleaned);
  const reference = extractReference(cleaned);
  const total = findTotal(cleaned);

  let subtotal = null;
  const subtotalMatch = cleaned.match(/subtotal[:\s]*₱?\s*([0-9,]+\.\d{1,2})/i);
  if (subtotalMatch && subtotalMatch[1]) subtotal = toNumber(subtotalMatch[1]);

  let payment_method = "";
  const pm = cleaned.match(
    /\b(Metrobank|CASH|CREDIT|GCASH|PAYMAYA|VISA|MASTERCARD)\b/i,
  );
  if (pm) payment_method = pm[1].toUpperCase();

  const cashierMatch = cleaned.match(/Cashier[:\s]*([A-Za-z\s]+)/i);
  const cashier = cashierMatch ? cashierMatch[1].trim() : "";

  let stopIndex = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (/subtotal|total|amount due|grand total/i.test(lines[i])) {
      stopIndex = i;
      break;
    }
  }

  let startIndex = 1;
  for (let i = 1; i < Math.min(6, lines.length); i++) {
    if (
      /tin|tel|telephone|address|member|membership|owned|operated|birtacc|bir/i.test(
        lines[i],
      )
    ) {
      startIndex = i + 1;
      continue;
    } else {
      if (/[0-9]/.test(lines[i])) break;
    }
  }

  const rawItemLines = lines
    .slice(startIndex, stopIndex)
    .filter(
      (l) =>
        !/subtotal|total|amount due|grand total|member|tin|tel|telephone|address|b\.?i\.?r/i.test(
          l,
        ),
    )
    .filter((l) => l.length > 3);

  const items = [];
  const priceRegex =
    /([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{1,2})|[0-9]+\.\d{1,2})\s*$/;
  for (const line of rawItemLines) {
    let price = null;
    let name = line;

    const m = line.match(priceRegex);
    if (m && m[1]) {
      price = toNumber(m[1]);
      name = line.slice(0, m.index).trim();
      if (!name) name = line.replace(m[0], "").trim();
    } else {
      const anyNum = line.match(/([0-9]+(?:\.\d{1,2}))/);
      if (anyNum) {
        price = toNumber(anyNum[1]);
        name = line.replace(anyNum[0], "").trim();
      } else {
        continue;
      }
    }

    const niceName = titleCase(
      name
        .replace(/\s{2,}/g, " ")
        .replace(/[^\w\s'&-]/g, "")
        .trim(),
    );

    items.push({
      name: niceName || titleCase(line),
      qty: 1,
      price: price !== null ? price : 0,
    });
  }

  if (!items.length) {
    const looser = cleaned.match(/([A-Za-z0-9'&\s]{3,})\s+([0-9,]+\.\d{1,2})/g);
    if (looser) {
      for (const chunk of looser) {
        const m = chunk.match(/(.+)\s+([0-9,]+\.\d{1,2})$/);
        if (m) {
          items.push({
            name: titleCase(m[1].trim()),
            qty: 1,
            price: toNumber(m[2]),
          });
        }
      }
    }
  }

  const finalTotal = total;
  const finalSubtotal = subtotal || finalTotal;

  return {
    store: merchant,
    rawText: cleaned,
    date: date || null,
    reference: reference || null,
    items,
    subtotal: finalSubtotal !== null ? Number(finalSubtotal) : null,
    total: finalTotal !== null ? Number(finalTotal) : null,
    payment_method: payment_method || null,
    cashier: cashier || null,
  };
}

// ----------------- Routes -----------------

/**
 * @swagger
 * /api/ocr:
 *   post:
 *     summary: Extract text from receipt using Tesseract OCR
 *     tags: [OCR]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - receipt
 *             properties:
 *               receipt:
 *                 type: string
 *                 format: binary
 *                 description: Receipt image file (max 5MB)
 *     responses:
 *       200:
 *         description: OCR processing successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OCRResult'
 *       400:
 *         description: No file uploaded
 *       500:
 *         description: OCR processing failed
 */

router.post("/", upload.single("receipt"), async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ error: "No file uploaded (field: receipt)" });

    // Process image buffer directly, no file system needed
    const result = await Tesseract.recognize(req.file.buffer, "eng", {
      logger: (m) => console.log(m),
    });
    const raw = result?.data?.text || "";

    const parsed = parseReceipt(raw);

    return res.json({
      success: true,
      rawText: raw,
      cleanedText: parsed.rawText,
      extracted: {
        store: parsed.store,
        date: parsed.date,
        reference: parsed.reference,
        items: parsed.items,
        subtotal: parsed.subtotal,
        total: parsed.total,
        payment_method: parsed.payment_method,
        cashier: parsed.cashier,
      },
    });
  } catch (err) {
    console.error("OCR/parse error:", err);
    return res
      .status(500)
      .json({ error: "OCR processing or parsing failed", detail: err.message });
  }
});

/**
 * @swagger
 * /api/ocr/structured:
 *   post:
 *     summary: Extract structured data from receipt using Gemini AI Vision
 *     tags: [OCR]
 *     description: Uses Google Gemini AI to extract and parse receipt data with high precision
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Receipt image file (max 5MB)
 *     responses:
 *       200:
 *         description: Structured OCR processing successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StructuredOCRResult'
 *       400:
 *         description: No file uploaded
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Structured OCR failed
 */

router.post("/structured", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    console.log(
      `📸 Processing receipt: ${req.file.originalname} (${(req.file.size / 1024).toFixed(2)} KB)`,
    );

    const imageBuffer = req.file.buffer;
    const base64Image = imageBuffer.toString("base64");
    const mimeType = req.file.mimetype;

    // ✅ OPTIMIZED: Single API call to extract both raw text and structured data
    const combinedPrompt = `You are an expert receipt parser. Analyze this receipt image and extract both raw text AND structured data.

STEP 1 - Extract raw text exactly as it appears:
- Preserve the EXACT layout and spacing
- Include every line, even blank lines
- Keep all numbers, symbols, and punctuation exactly as shown
- Maintain the original order from top to bottom

STEP 2 - Parse structured data with EXTREME PRECISION:

1. **MERCHANT**: Extract the EXACT store name from the TOP of the receipt (first 1-2 lines, usually in larger text)
2. **DATE**: Find the transaction date and return in DD/MM/YYYY format
3. **TOTAL**: Find the FINAL TOTAL amount - look for:
   - "TOTAL" or "GRAND TOTAL" or "AMOUNT DUE" labels
   - Usually the LAST and LARGEST number on the receipt
   - DO NOT use subtotal, tax amounts, or individual item prices
   - Be extremely careful with decimal points
4. **ITEMS**: Extract ALL line items with individual prices
5. **PAYMENT**: Look for payment method (Cash, Credit, Debit, GCash, etc.)

CRITICAL FOR TOTALS:
- If you see multiple totals (subtotal, tax, grand total), ALWAYS use the grand/final total
- Double-check the number matches the largest amount on the receipt
- Preserve exact decimal values (e.g., 1387.72, not 1387.7 or 1388)

Return ONLY this JSON structure (NO markdown, NO explanations):
{
  "rawText": "complete extracted text here preserving all formatting and line breaks",
  "structured": {
    "merchant": "EXACT STORE NAME",
    "date": "DD/MM/YYYY",
    "total": 1234.56,
    "items": [
      {"description": "Item Name", "price": 12.34},
      {"description": "Item Name 2", "price": 56.78}
    ],
    "payment_method": "Cash/Card/GCash/etc or null"
  }
}`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    // ✅ Use retry logic with exponential backoff
    const aiText = await retryWithBackoff(
      async () => {
        const aiResult = await model.generateContent([
          combinedPrompt,
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
        ]);
        return aiResult.response.text();
      },
      3,
      2000,
    ); // 3 retries, starting with 2 second delay

    // Clean up markdown formatting if present
    const cleanedAIText = aiText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleanedAIText);
    } catch (err) {
      console.error("❌ JSON parse error:", cleanedAIText);
      return res.status(500).json({
        error: "AI JSON parsing failed",
        detail: "The AI returned invalid JSON format",
        rawResponse: cleanedAIText.substring(0, 500), // First 500 chars for debugging
      });
    }

    // Extract and clean the data
    const rawText = parsed.rawText || "";
    const cleanedText = cleanOCR(rawText);
    const structured = parsed.structured || {};

    // ✅ Validation: Ensure total is a number with 2 decimal places
    if (structured.total) {
      const totalNum =
        typeof structured.total === "string"
          ? parseFloat(structured.total.replace(/[^0-9.]/g, ""))
          : structured.total;
      structured.total = parseFloat(totalNum.toFixed(2));
    }

    // ✅ Validation: Ensure items prices are numbers with 2 decimal places
    if (Array.isArray(structured.items)) {
      structured.items = structured.items.map((item) => ({
        ...item,
        price: item.price
          ? parseFloat(
              typeof item.price === "string"
                ? item.price.replace(/[^0-9.]/g, "")
                : item.price,
            )
          : null,
      }));
    }

    console.log(
      `✅ OCR Success: ${structured.merchant || "Unknown"} | ${structured.date || "No date"} | ₱${structured.total || "0.00"}`,
    );

    return res.json({
      success: true,
      rawText,
      cleanedText,
      structured,
    });
  } catch (error) {
    console.error("❌ Structured OCR error:", error);

    // ✅ Better error handling for rate limits
    if (error.status === 429) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        message:
          "The AI service is currently busy. Please wait a moment and try again.",
        retryAfter: 60, // seconds
        detail: error.message,
      });
    }

    // Handle other errors
    res.status(500).json({
      error: "Structured OCR failed",
      detail: error.message,
    });
  }
});

/**
 * @swagger
 * /api/ocr/clean-text:
 *   post:
 *     summary: Clean and format extracted OCR text
 *     tags: [OCR]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 example: "Raw OCR text with special characters"
 *     responses:
 *       200:
 *         description: Text cleaned successfully
 *       400:
 *         description: Invalid input
 */

router.post("/clean-text", cleanExtractedText);

export default router;
