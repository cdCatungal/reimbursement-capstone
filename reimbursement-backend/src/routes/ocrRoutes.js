import express from "express";
import Tesseract from "tesseract.js";
import multer from "multer";
import { cleanExtractedText } from "../controllers/ocrController.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import genAI from "../config/gemini.js";

const router = express.Router();

// ✅ CHANGED: Use memory storage instead of disk storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

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
      let day = part1, month = part2;
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
      return `${String(day).padStart(2,"0")}/${String(month).padStart(2,"0")}/${year}`;
    }

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
  const bottomMatches = text.split("\n").slice(-6).join("\n").match(/([0-9]{6,})/);
  return bottomMatches ? bottomMatches[1] : "";
}

function titleCase(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map(w => {
      if (w.length <= 2) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

const merchantDictionary = [
  "S&R", "S&R MEMBERSHIP SHOPPING", "JOLLIBEE", "MCDONALD'S", "PUREGOLD", "7-ELEVEN", "SM", "LANDERS"
];

function detectMerchant(lines) {
  if (!lines || !lines.length) return "";
  for (const line of lines.slice(0, 6)) {
    for (const known of merchantDictionary) {
      if (line.toUpperCase().includes(known.toUpperCase())) return known;
    }
  }
  for (const candidate of lines.slice(0, 6)) {
    if (candidate && candidate.length > 2 && /[A-Za-z]/.test(candidate)) return candidate;
  }
  return "";
}

function parseReceipt(text) {
  const cleaned = cleanOCR(text);
  const lines = cleaned.split("\n").map(l => l.trim()).filter(l => l);

  const merchant = detectMerchant(lines) || (lines.length ? lines[0] : "");
  const date = parseDateToDDMMYYYY(cleaned);
  const reference = extractReference(cleaned);
  const total = findTotal(cleaned);
  
  let subtotal = null;
  const subtotalMatch = cleaned.match(/subtotal[:\s]*₱?\s*([0-9,]+\.\d{1,2})/i);
  if (subtotalMatch && subtotalMatch[1]) subtotal = toNumber(subtotalMatch[1]);

  let payment_method = "";
  const pm = cleaned.match(/\b(Metrobank|CASH|CREDIT|GCASH|PAYMAYA|VISA|MASTERCARD)\b/i);
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
    if (/tin|tel|telephone|address|member|membership|owned|operated|birtacc|bir/i.test(lines[i])) {
      startIndex = i + 1;
      continue;
    } else {
      if (/[0-9]/.test(lines[i])) break;
    }
  }

  const rawItemLines = lines.slice(startIndex, stopIndex)
    .filter(l => !/subtotal|total|amount due|grand total|member|tin|tel|telephone|address|b\.?i\.?r/i.test(l))
    .filter(l => l.length > 3);

  const items = [];
  const priceRegex = /([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{1,2})|[0-9]+\.\d{1,2})\s*$/;
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

    const niceName = titleCase(name.replace(/\s{2,}/g, " ").replace(/[^\w\s'&-]/g, "").trim());

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

// ✅ UPDATED: Tesseract OCR route - now uses memory buffer
router.post("/", upload.single("receipt"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded (field: receipt)" });

    // ✅ Process image buffer directly, no file system needed
    const result = await Tesseract.recognize(req.file.buffer, "eng", { 
      logger: (m) => console.log(m) 
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
    return res.status(500).json({ error: "OCR processing or parsing failed", detail: err.message });
  }
});

// ✅ UPDATED: Gemini AI Vision OCR route - now uses memory buffer
router.post("/structured", upload.single("image"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "No file uploaded" });

    // ✅ Get image buffer directly from memory
    const imageBuffer = req.file.buffer;
    const base64Image = imageBuffer.toString('base64');
    const mimeType = req.file.mimetype;

    // 1) Extract raw text using Gemini Vision
    const visionModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
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

    // 2) Extract structured data using Gemini Vision
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