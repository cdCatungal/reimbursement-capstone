import express from "express";
import Tesseract from "tesseract.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { cleanExtractedText } from "../controllers/ocrController.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import genAI from "../config/gemini.js";


const router = express.Router();

// ----------------- Multer -----------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

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
  // remove commas and stray characters
  const clean = numStr.replace(/[^\d.-]/g, "").replace(/,+/g, "");
  const n = parseFloat(clean);
  return isFinite(n) ? Number(n.toFixed(2)) : null;
}

function findAmounts(text) {
  // Return array of numeric-like matches (preserve order)
  const regex = /(?:₱|\bPHP\b|PHP|\bP\b)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{1,2})?|[0-9]+\.\d{1,2})/gi;
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
  // fallback: last currency-like value
  const amounts = findAmounts(text);
  if (amounts.length) return amounts[amounts.length - 1].value;
  return null;
}

function parseDateToDDMMYYYY(text) {
  if (!text) return null;
  // Look for common date formats
  const datePatterns = [
    /\b(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})\b/,        // YYYY-MM-DD or YYYY/MM/DD
    /\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/,      // DD/MM/YYYY or MM/DD/YYYY (we'll disambiguate)
    /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/,          // MonthName DD, YYYY
  ];

  for (const p of datePatterns) {
    const m = text.match(p);
    if (!m) continue;

    // YYYY-MM-DD
    if (p === datePatterns[0]) {
      const [_, y, mo, d] = m;
      const dd = String(d).padStart(2, "0");
      const mm = String(mo).padStart(2, "0");
      return `${dd}/${mm}/${y}`;
    }

    // DD/MM/YYYY or MM/DD/YYYY -> we choose the more plausible (if first > 12 then treat as DD)
    if (p === datePatterns[1]) {
      let [_, part1, part2, year] = m;
      let day = part1, month = part2;
      // if month > 12 then swap
      if (Number(month) > 12 && Number(day) <= 12) {
        month = part1;
        day = part2;
      } else {
        // ambiguous: many PH receipts are MM/DD/YYYY or DD/MM/YYYY; prefer DD/MM/YYYY if day <=31 and month <=12
        // If first part > 12, treat it as month? We'll keep safe approach:
        if (Number(part1) > 31) { // impossible as day
          // treat as MM/DD/YYYY -> swap
          day = part2;
          month = part1;
        } else {
          // assume DD/MM/YYYY
          day = part1;
          month = part2;
        }
      }
      return `${String(day).padStart(2,"0")}/${String(month).padStart(2,"0")}/${year}`;
    }

    // MonthName DD, YYYY
    if (p === datePatterns[2]) {
      const [_, monthName, d, y] = m;
      const monthIndex = new Date(`${monthName} 1, ${y}`).getMonth() + 1;
      if (!isNaN(monthIndex)) {
        return `${String(d).padStart(2,"0")}/${String(monthIndex).padStart(2,"0")}/${y}`;
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
  // fallback: find series of digits with length >= 6 near bottom
  const bottomMatches = text.split("\n").slice(-6).join("\n").match(/([0-9]{6,})/);
  return bottomMatches ? bottomMatches[1] : "";
}

function titleCase(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map(w => {
      if (w.length <= 2) return w.toUpperCase(); // keep short acronyms capitalized (e.g., "kg" -> "KG")
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

// small merchant dictionary to improve detection; add more as needed
const merchantDictionary = [
  "S&R", "S&R MEMBERSHIP SHOPPING", "JOLLIBEE", "MCDONALD'S", "PUREGOLD", "7-ELEVEN", "SM", "LANDERS"
];

function detectMerchant(lines) {
  if (!lines || !lines.length) return "";
  // Try to find a merchant from dictionary
  for (const line of lines.slice(0, 6)) { // check top 6 lines
    for (const known of merchantDictionary) {
      if (line.toUpperCase().includes(known.toUpperCase())) return known;
    }
  }
  // fallback: choose the biggest non-empty top line (likely store name)
  for (const candidate of lines.slice(0, 6)) {
    if (candidate && candidate.length > 2 && /[A-Za-z]/.test(candidate)) return candidate;
  }
  return "";
}

// ----------------- Parser -----------------
function parseReceipt(text) {
  const cleaned = cleanOCR(text);
  const lines = cleaned.split("\n").map(l => l.trim()).filter(l => l);

  // Merchant
  const merchant = detectMerchant(lines) || (lines.length ? lines[0] : "");

  // Date (search whole text)
  const date = parseDateToDDMMYYYY(cleaned);

  // Reference / OR / Invoice
  const reference = extractReference(cleaned);

  // Total & Subtotal
  const total = findTotal(cleaned); // uses total priority
  // Try to find subtotal near 'subtotal' keyword
  let subtotal = null;
  const subtotalMatch = cleaned.match(/subtotal[:\s]*₱?\s*([0-9,]+\.\d{1,2})/i);
  if (subtotalMatch && subtotalMatch[1]) subtotal = toNumber(subtotalMatch[1]);

  // Payment method (search for common words)
  let payment_method = "";
  const pm = cleaned.match(/\b(Metrobank|CASH|CREDIT|GCASH|PAYMAYA|VISA|MASTERCARD)\b/i);
  if (pm) payment_method = pm[1].toUpperCase();

  // Cashier (small heuristic)
  const cashierMatch = cleaned.match(/Cashier[:\s]*([A-Za-z\s]+)/i);
  const cashier = cashierMatch ? cashierMatch[1].trim() : "";

  // Items: heuristic - take lines between header and subtotal/total area that look like item lines (contain a number)
  // We'll search for the line index of SUBTOTAL/TOTAL and use lines before it.
  let stopIndex = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (/subtotal|total|amount due|grand total/i.test(lines[i])) {
      stopIndex = i;
      break;
    }
  }

  // Candidate item lines = lines from top after merchant lines until stopIndex
  // But skip initial header lines that contain address, phone, TIN etc.
  let startIndex = 1; // assume line 0 is merchant
  for (let i = 1; i < Math.min(6, lines.length); i++) {
    // skip if line contains TIN, TEL, BIR, MEMBER, ADDRESS keywords
    if (/tin|tel|telephone|address|member|membership|owned|operated|birtacc|bir/i.test(lines[i])) {
      startIndex = i + 1;
      continue;
    } else {
      // stop skipping when we find first product-like line or line with numbers/prices
      if (/[0-9]/.test(lines[i])) break;
    }
  }

  const rawItemLines = lines.slice(startIndex, stopIndex)
    .filter(l => !/subtotal|total|amount due|grand total|member|tin|tel|telephone|address|b\.?i\.?r/i.test(l))
    .filter(l => l.length > 3);

  const items = [];
  // Parse each candidate line: extract last number as price; rest as name
  const priceRegex = /([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{1,2})|[0-9]+\.\d{1,2})\s*$/;
  for (const line of rawItemLines) {
    let price = null;
    let name = line;

    const m = line.match(priceRegex);
    if (m && m[1]) {
      price = toNumber(m[1]);
      name = line.slice(0, m.index).trim();
      // Sometimes price is earlier and line has multiple numbers, fallback to last occurrence
      if (!name) name = line.replace(m[0], "").trim();
    } else {
      // try to find any numeric token in the line (if none, skip)
      const anyNum = line.match(/([0-9]+(?:\.\d{1,2}))/);
      if (anyNum) {
        price = toNumber(anyNum[1]);
        name = line.replace(anyNum[0], "").trim();
      } else {
        // no price — treat as description line (skip if very short)
        continue;
      }
    }

    // Title-case name
    const niceName = titleCase(name.replace(/\s{2,}/g, " ").replace(/[^\w\s'&-]/g, "").trim());

    items.push({
      name: niceName || titleCase(line),
      qty: 1,
      price: price !== null ? price : 0,
    });
  }

  // If items empty, try looser parse: look for lines containing "x" or "X" like "0.655X 185.00"
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

  // Final fallback: if total exists but subtotal null, set subtotal = total
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

// ----------------- Route -----------------
router.post("/", upload.single("receipt"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded (field: receipt)" });

    const imgPath = req.file.path;

    const result = await Tesseract.recognize(imgPath, "eng", { logger: (m) => console.log(m) });
    const raw = result?.data?.text || "";

    const parsed = parseReceipt(raw);

    // cleanup file async
    fs.unlink(imgPath, () => {});

    return res.json({
      success: true,
      rawText: raw,
      cleanedText: parsed.rawText,
      extracted: {
        store: parsed.store,
        date: parsed.date,            // DD/MM/YYYY or null
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
    return res.status(500).json({ error: "OCR processing or parsing failed", detail: err.message });
  }
});



// Replace your /structured route in ocrRoutes.js with this improved version:

// Simplified AI OCR route - auto-populate only receipt data
// Replace your existing /structured route in ocrRoutes.js with this:

router.post("/structured", upload.single("image"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "No file uploaded" });

    const imagePath = req.file.path;

    // 1) Use Gemini Vision to extract the actual text from the receipt image
    // This will be MORE accurate than Tesseract for display purposes
    const visionModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    // Read image as base64 first
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = req.file.mimetype;
    
    const textExtractionPrompt = `Extract ALL text from this receipt image EXACTLY as it appears.

RULES:
- Preserve the EXACT layout and spacing
- Include every line, even blank lines
- Keep all numbers, symbols, and punctuation exactly as shown
- Maintain the original order from top to bottom
- Do NOT interpret, summarize, or format - just extract the raw text

Return ONLY the extracted text, nothing else.`;

    const textResult = await visionModel.generateContent([
      textExtractionPrompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      }
    ]);

    const rawText = textResult.response.text();
    const cleanedText = cleanOCR(rawText);

    // Delete temp file
    fs.unlink(imagePath, () => {});

    // 2) Now use the same Gemini Vision for structured data extraction
    const structuredModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `You are an expert receipt parser. Analyze this receipt image with EXTREME PRECISION.

CRITICAL EXTRACTION RULES:
1. **MERCHANT**: Extract the EXACT store name from the TOP of the receipt (first 1-2 lines, usually in larger text)
2. **DATE**: Find the transaction date and return in DD/MM/YYYY format
3. **TOTAL**: Find the FINAL TOTAL amount - look for:
   - "TOTAL" or "GRAND TOTAL" or "AMOUNT DUE" labels
   - Usually the LAST and LARGEST number on the receipt
   - DO NOT use subtotal, tax amounts, or individual item prices
   - Be extremely careful with decimal points
4. **ITEMS**: Extract ALL line items with individual prices
5. **PAYMENT**: Look for payment method (Cash, Credit, Debit, etc.)

IMPORTANT FOR TOTALS:
- If you see multiple totals (subtotal, tax, grand total), ALWAYS use the grand/final total
- Double-check the number matches the largest amount on the receipt
- Preserve exact decimal values (e.g., 1387.72, not 1387.7 or 1388)

Return ONLY valid JSON with this EXACT structure:
{
  "merchant": "EXACT STORE NAME",
  "date": "DD/MM/YYYY",
  "total": 1234.56,
  "items": [
    {"description": "Item Name", "price": 12.34},
    {"description": "Item Name 2", "price": 56.78}
  ],
  "payment_method": "Cash/Card/etc or null"
}

NO markdown formatting, NO explanations, ONLY the JSON object.`;

    const aiResult = await structuredModel.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      }
    ]);

    const aiText = aiResult.response.text();
    
    // Remove markdown code blocks if present
    const cleanedAIText = aiText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    let structured;
    try {
      structured = JSON.parse(cleanedAIText);
      
      // Validation: Ensure total is a number with 2 decimal places
      if (structured.total) {
        const totalNum = typeof structured.total === 'string' 
          ? parseFloat(structured.total.replace(/[^0-9.]/g, ''))
          : structured.total;
        structured.total = parseFloat(totalNum.toFixed(2));
      }
      
      // Validation: Ensure items prices are numbers
      if (Array.isArray(structured.items)) {
        structured.items = structured.items.map(item => ({
          ...item,
          price: item.price ? parseFloat(
            typeof item.price === 'string' 
              ? item.price.replace(/[^0-9.]/g, '')
              : item.price
          ).toFixed(2) : null
        }));
      }
      
    } catch (err) {
      console.error("JSON parse error:", cleanedAIText);
      return res.status(500).json({ 
        error: "AI JSON parsing failed", 
        detail: cleanedAIText,
        rawText,
        cleanedText
      });
    }

    return res.json({
      success: true,
      rawText,
      cleanedText,
      structured,
    });

  } catch (error) {
    console.error("Structured OCR error:", error);
    res.status(500).json({ 
      error: "Structured OCR failed",
      detail: error.message 
    });
  }
});
router.post("/clean-text", cleanExtractedText);


export default router;
