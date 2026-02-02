import { useTheme } from "@mui/material/styles";
import React, { useState, useEffect } from "react";
import { useAppContext } from "../App";
import {
  Box,
  Button,
  Typography,
  TextField,
  Card,
  CardContent,
  LinearProgress,
  MenuItem,
  Grid,
  IconButton,
  Paper,
  Alert,
  Backdrop,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Stack,
  Chip,
} from "@mui/material";
import {
  CloudUpload,
  Image as ImageIcon,
  Delete,
  CheckCircle,
  Refresh,
  PictureAsPdf,
  Edit,
  Send,
  Close,
  Add,
  Visibility,
} from "@mui/icons-material";

function ReceiptUpload() {
  const theme = useTheme();
  const { showNotification, user } = useAppContext();

  // Multi-receipt state
  const [receipts, setReceipts] = useState([
    {
      id: Date.now(),
      file: null,
      preview: null,
      extractedText: "",
      merchant: "",
      total: "",
      description: "",
      items: "",
      category: "Meal with Client",
      date: new Date().toISOString().split("T")[0],
      number_of_people: 1,
      number_of_days: 1,
      isProcessing: false,
    },
  ]);

  const [formData, setFormData] = useState({
    sap_code: "",
    entity: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [availableSapCodes, setAvailableSapCodes] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [editingReceiptId, setEditingReceiptId] = useState(null);
  const [previewReceiptId, setPreviewReceiptId] = useState(null);

  // ✅ Rate limiting state
  const [lastOCRCall, setLastOCRCall] = useState(0);
  const OCR_COOLDOWN_MS = 3000; // 3 seconds between OCR calls

  const categories = [
    "Transportation (Commute)",
    "Transportation (Drive)",
    "Meal with Client",
    "Overtime Meal",
    "Accommodation",
    "Other",
  ];

  const CATEGORY_LIMITS = {
    "Overtime Meal": { maxPerUnit: 300, unit: "fixed" },
    "Meal with Client": { maxPerUnit: 800, unit: "person" },
    Accommodation: { maxPerUnit: 2500, unit: "person-day" },
  };

  const calculateReimbursableAmount = (
    category,
    total,
    numPeople = 1,
    numDays = 1,
  ) => {
    const totalAmount = parseFloat(total) || 0;

    if (!CATEGORY_LIMITS[category]) {
      return totalAmount;
    }

    const limit = CATEGORY_LIMITS[category];
    let maxReimbursable = 0;

    switch (category) {
      case "Overtime Meal":
        maxReimbursable = Math.min(totalAmount, limit.maxPerUnit);
        break;
      case "Meal with Client":
        maxReimbursable = Math.min(totalAmount, limit.maxPerUnit * numPeople);
        break;
      case "Accommodation":
        maxReimbursable = Math.min(
          totalAmount,
          limit.maxPerUnit * numPeople * numDays,
        );
        break;
      default:
        maxReimbursable = totalAmount;
    }

    return maxReimbursable;
  };

  const getReimbursableAmountHelper = (category, numPeople, numDays) => {
    if (!CATEGORY_LIMITS[category]) return "";

    const limit = CATEGORY_LIMITS[category];

    switch (category) {
      case "Overtime Meal":
        return `Maximum reimbursable: ₱${limit.maxPerUnit.toFixed(2)}`;
      case "Meal with Client":
        return (
          <>
            Maximum reimbursable: ₱{(limit.maxPerUnit * numPeople).toFixed(2)}
            <br />
            (₱{limit.maxPerUnit}/person × {numPeople}{" "}
            {numPeople === 1 ? "person" : "people"})
          </>
        );
      case "Accommodation":
        return (
          <>
            Maximum reimbursable: ₱
            {(limit.maxPerUnit * numPeople * numDays).toFixed(2)}
            <br />
            (₱{limit.maxPerUnit}/person/day × {numPeople}{" "}
            {numPeople === 1 ? "person" : "people"})
            <br />× {numDays} {numDays === 1 ? "day" : "days"}
          </>
        );
      default:
        return "";
    }
  };

  const bypassesSapValidation = user?.role === "Invoice Specialist";

  useEffect(() => {
    if (user) {
      fetchUserSapCodes();

      if (user.role === "Invoice Specialist") {
        setFormData({ sap_code: "INVOICE_SPECIALIST" });
      }
    }
  }, [user]);

  const fetchUserSapCodes = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/users/settings`,
        {
          credentials: "include",
        },
      );
      const data = await response.json();

      if (data.data && data.data.sapCodes) {
        const codes = data.data.sapCodes.map((sc) => sc.code);
        setAvailableSapCodes(codes);

        if (codes.length === 1 && !bypassesSapValidation) {
          setFormData({ sap_code: codes[0] });
        }

        console.log(
          `✅ ${user.role} has ${codes.length} assigned SAP codes:`,
          codes,
        );
      }
    } catch (error) {
      console.error("Failed to fetch SAP codes:", error);
      if (!bypassesSapValidation) {
        showNotification("Failed to load SAP codes", "error");
      }
    }
  };

  // Add new receipt
  const handleAddReceipt = () => {
    setReceipts([
      ...receipts,
      {
        id: Date.now(),
        file: null,
        preview: null,
        extractedText: "",
        merchant: "",
        total: "",
        description: "",
        items: "",
        category: "Meal with Client",
        date: new Date().toISOString().split("T")[0],
        number_of_people: 1,
        number_of_days: 1,
        isProcessing: false,
      },
    ]);
  };

  // Remove receipt
  const handleRemoveReceipt = (id) => {
    if (receipts.length === 1) {
      showNotification("Must have at least one receipt", "warning");
      return;
    }

    setReceipts(receipts.filter((r) => r.id !== id));

    if (editingReceiptId === id) {
      setEditingReceiptId(null);
    }
  };

  // Update receipt data
  const updateReceipt = (id, updates) => {
    setReceipts(receipts.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  // Handle file upload for a specific receipt
  const handleFileUpload = (receiptId, file) => {
    console.log("📎 handleFileUpload called", { receiptId, file: file?.name });

    if (!file) {
      console.log("❌ No file provided");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    const allowedExtensions = ["jpg", "jpeg", "png", "pdf"];
    const fileExtension = file.name.split(".").pop().toLowerCase();

    if (
      !allowedTypes.includes(file.type) ||
      !allowedExtensions.includes(fileExtension)
    ) {
      showNotification(
        "Only JPG, JPEG, PNG, or PDF files are allowed",
        "error",
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showNotification("File size must be less than 5MB", "error");
      return;
    }

    console.log("✅ File validation passed, type:", file.type);

    if (file.type !== "application/pdf") {
      const reader = new FileReader();
      reader.onload = (event) => {
        console.log("📸 Image loaded, updating receipt");
        updateReceipt(receiptId, {
          file,
          preview: event.target.result,
        });
      };
      reader.onerror = (error) => {
        console.error("❌ FileReader error:", error);
      };
      reader.readAsDataURL(file);
    } else {
      console.log("📄 PDF file, updating receipt");
      updateReceipt(receiptId, {
        file,
        preview: "pdf",
      });
    }
  };

  // ✅ UPDATED: Handle OCR with rate limiting, retry logic, and global lock
  const handleOCR = async (receiptId) => {
    const receipt = receipts.find((r) => r.id === receiptId);
    if (!receipt || !receipt.file) {
      showNotification("Please select a file first", "warning");
      return;
    }

    // ✅ Check rate limiting
    const now = Date.now();
    const timeSinceLastCall = now - lastOCRCall;

    if (timeSinceLastCall < OCR_COOLDOWN_MS) {
      const waitTime = Math.ceil((OCR_COOLDOWN_MS - timeSinceLastCall) / 1000);
      showNotification(
        `⏳ Please wait ${waitTime} seconds before processing another receipt`,
        "info",
      );
      return;
    }

    updateReceipt(receiptId, { isProcessing: true });
    setLastOCRCall(now);
    setShowOcrLoading(true); // ✅ ADDED: Block all UI interactions

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("image", receipt.file);

      console.log(`📤 Sending OCR request for receipt ${receiptId}`);

      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/ocr/structured`,
        {
          method: "POST",
          body: formDataToSend,
          credentials: "include",
        },
      );

      const data = await res.json();

      // ✅ Handle rate limit error specifically
      if (res.status === 429) {
        showNotification(
          `⏳ ${data.message || "Rate limit reached. Please wait a moment and try again."}`,
          "warning",
        );
        updateReceipt(receiptId, { isProcessing: false });
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || `OCR failed with status ${res.status}`);
      }

      const extractedText = data.cleanedText || data.rawText;

      if (data.structured) {
        const structured = data.structured;

        console.log("🤖 AI Extracted Data:", structured);

        let formattedDate = receipt.date;
        if (structured.date) {
          try {
            const parts = structured.date.split(/[/-]/);
            if (parts.length === 3) {
              let [day, month, year] = parts;
              day = day.padStart(2, "0");
              month = month.padStart(2, "0");
              if (year.length === 2) {
                year = "20" + year;
              }
              formattedDate = `${year}-${month}-${day}`;
            }
          } catch (e) {
            console.error("❌ Date parse error:", e);
          }
        }

        let itemsText = "";
        if (Array.isArray(structured.items) && structured.items.length > 0) {
          itemsText = structured.items
            .map((item) => {
              if (typeof item === "object" && item.description) {
                return item.price && item.price > 0
                  ? `${item.description} - ₱${parseFloat(item.price).toFixed(2)}`
                  : item.description;
              }
              return "";
            })
            .filter((line) => line.trim())
            .join("\n");
        }

        let formattedTotal = "";
        if (structured.total) {
          formattedTotal = String(parseFloat(structured.total).toFixed(2));
        }

        updateReceipt(receiptId, {
          extractedText,
          date: formattedDate,
          merchant: structured.merchant || receipt.merchant,
          total: formattedTotal || receipt.total,
          description: itemsText || receipt.description,
          isProcessing: false,
        });

        const details = [
          structured.merchant ? `${structured.merchant}` : null,
          structured.date ? `${structured.date}` : null,
          structured.total ? `₱${structured.total}` : null,
        ]
          .filter(Boolean)
          .join(" | ");

        showNotification(`✅ Receipt extracted! ${details}`, "success");
      } else {
        updateReceipt(receiptId, {
          extractedText,
          isProcessing: false,
        });
        showNotification(
          "⚠️ OCR completed but no structured data found",
          "warning",
        );
      }
    } catch (error) {
      console.error("❌ OCR Error:", error);
      showNotification(`OCR failed: ${error.message}`, "error");
      updateReceipt(receiptId, { isProcessing: false });
    } finally {
      setShowOcrLoading(false); // ✅ ADDED: Always unblock UI
    }
  };

  const validateDate = (dateString) => {
    const selectedDate = new Date(dateString);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (selectedDate > today) {
      return "Date cannot be in the future";
    }
    return "";
  };

  const validateReceipt = (receipt) => {
    const errors = {};

    const dateError = validateDate(receipt.date);
    if (dateError) errors.date = dateError;

    if (!receipt.date) errors.date = "Date is required";
    if (!receipt.total || parseFloat(receipt.total) <= 0) {
      errors.total = "Valid total amount is required";
    }
    if (!receipt.category) errors.category = "Category is required";
    if (!receipt.items.trim()) errors.items = "Purpose is required";
    if (!receipt.description.trim())
      errors.description = "Description is required";

    if (receipt.category === "Meal with Client") {
      const numPeople = parseInt(receipt.number_of_people);
      if (!numPeople || numPeople < 1) {
        errors.number_of_people = "Number of people must be at least 1";
      }
    }

    if (receipt.category === "Accommodation") {
      const numDays = parseInt(receipt.number_of_days);
      if (!numDays || numDays < 1) {
        errors.number_of_days = "Number of days must be at least 1";
      }
      const numPeople = parseInt(receipt.number_of_people);
      if (!numPeople || numPeople < 1) {
        errors.number_of_people = "Number of people must be at least 1";
      }
    }

    if (!receipt.file) errors.file = "Receipt file is required";

    return errors;
  };

  const validateAllReceipts = () => {
    let allValid = true;
    const updatedReceipts = receipts.map((receipt) => {
      const errors = validateReceipt(receipt);
      if (Object.keys(errors).length > 0) {
        allValid = false;
        return { ...receipt, errors };
      }
      return { ...receipt, errors: {} };
    });

    setReceipts(updatedReceipts);

    if (!bypassesSapValidation && !formData.sap_code) {
      showNotification("Please select a SAP code", "error");
      return false;
    }

    return allValid;
  };

  const handleSubmitClick = () => {

    if (!validateAllReceipts()) {
      showNotification(
        "Please complete all required fields for all receipts",
        "error",
      );
      return;
    }

    if (!user) {
      showNotification("Please log in first", "error");
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);

    try {
      // ✅ Generate timestamp once for entire batch
      const timestamp = Date.now();

      console.log("📦 Submitting batch with timestamp:", timestamp);

      const promises = receipts.map(async (receipt, index) => {
        const reimbursableAmount = calculateReimbursableAmount(
          receipt.category,
          receipt.total,
          parseInt(receipt.number_of_people) || 1,
          parseInt(receipt.number_of_days) || 1,
        );

        const formDataToSend = new FormData();
        formDataToSend.append("category", receipt.category);
        formDataToSend.append("type", receipt.category);
        formDataToSend.append("description", receipt.description);
        formDataToSend.append("items", receipt.items);
        formDataToSend.append("total", parseFloat(receipt.total));
        formDataToSend.append("reimbursable_amount", reimbursableAmount);
        formDataToSend.append("merchant", receipt.merchant);
        formDataToSend.append("date_of_expense", receipt.date);
        formDataToSend.append("sap_code", formData.sap_code);
        formDataToSend.append("entity", formData.entity);

        // ✅ Send timestamp - backend will create full batch_code
        formDataToSend.append("batch_timestamp", timestamp);

        if (receipt.category === "Meal with Client") {
          formDataToSend.append(
            "number_of_people",
            parseInt(receipt.number_of_people),
          );
        }
        if (receipt.category === "Accommodation") {
          formDataToSend.append(
            "number_of_days",
            parseInt(receipt.number_of_days),
          );
          formDataToSend.append(
            "number_of_people",
            parseInt(receipt.number_of_people),
          );
        }

        if (receipt.file) {
          formDataToSend.append("receipt", receipt.file);
        }

        console.log(`📄 Submitting receipt ${index + 1}/${receipts.length}`);

        const res = await fetch(
          `${process.env.REACT_APP_API_URL}/api/reimbursements`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
            body: formDataToSend,
            credentials: "include",
          },
        );

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(
            `Receipt ${index + 1} failed: ${errorData.error || res.status}`,
          );
        }

        const data = await res.json();
        console.log(
          `✅ Receipt ${index + 1} submitted:`,
          data.reimbursement?.id,
        );
        return data;
      });

      // Wait for all receipts to submit
      const results = await Promise.all(promises);

      // ✅ Get batch_code from first response
      const batchCode = results[0]?.reimbursement?.batch_code;

      console.log(
        `✅ All ${results.length} receipts submitted successfully in batch ${batchCode}`,
      );

      showNotification(
        `✅ Successfully submitted ${receipts.length} reimbursement${receipts.length > 1 ? "s" : ""} in batch ${batchCode}`,
        "success",
      );

      // Reset form
      const defaultSapCode = bypassesSapValidation
        ? "INVOICE_SPECIALIST"
        : availableSapCodes.length === 1
          ? availableSapCodes[0]
          : "";

      setFormData({ sap_code: defaultSapCode });
      setReceipts([
        {
          id: Date.now(),
          file: null,
          preview: null,
          extractedText: "",
          merchant: "",
          total: "",
          description: "",
          items: "",
          category: "Meal with Client",
          date: new Date().toISOString().split("T")[0],
          number_of_people: 1,
          number_of_days: 1,
          isProcessing: false,
        },
      ]);
    } catch (err) {
      console.error("❌ Batch submission error:", err);
      showNotification(
        err.message || "Failed to submit reimbursements",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Receipt Card Component
  // ✅ UPDATED: Receipt Card Component - disable interactions during OCR
  const ReceiptCard = ({ receipt, index }) => {
    const isComplete =
      receipt.file &&
      receipt.merchant &&
      receipt.total &&
      receipt.items &&
      receipt.description;

    const reimbursableAmount = calculateReimbursableAmount(
      receipt.category,
      receipt.total,
      parseInt(receipt.number_of_people) || 1,
      parseInt(receipt.number_of_days) || 1,
    );

    return (
      <Card
        sx={{
          position: "relative",
          border: 2,
          borderColor: isComplete ? "success.main" : "divider",
          transition: "all 0.3s",
          "&:hover": {
            boxShadow: 6,
            borderColor: "primary.main",
          },
        }}
      >
        <CardContent sx={{ p: 2 }}>
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {receipt.file ? (
                receipt.preview === "pdf" ? (
                  <PictureAsPdf color="primary" />
                ) : (
                  <ImageIcon color="primary" />
                )
              ) : (
                <CloudUpload color="disabled" />
              )}
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Receipt #{index + 1}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <IconButton
                size="small"
                onClick={() => setPreviewReceiptId(receipt.id)}
                disabled={!receipt.file || showOcrLoading} // ✅ UPDATED
              >
                <Visibility fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setEditingReceiptId(receipt.id)}
                disabled={showOcrLoading} // ✅ UPDATED
              >
                <Edit fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => handleRemoveReceipt(receipt.id)}
                disabled={receipts.length === 1 || showOcrLoading} // ✅ UPDATED
              >
                <Delete fontSize="small" color="error" />
              </IconButton>
            </Box>
          </Box>

          {/* Status Chip */}
          <Chip
            label={isComplete ? "Complete" : "Incomplete"}
            size="small"
            color={isComplete ? "success" : "warning"}
            sx={{ mb: 2 }}
          />

          {/* Receipt Info */}
          <Stack spacing={1}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Date:
              </Typography>
              <Typography variant="body2">
                {receipt.date
                  ? new Date(receipt.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "Not set"}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Category:
              </Typography>
              <Typography variant="body2">{receipt.category}</Typography>
            </Box>

            {receipt.merchant && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Merchant:
                </Typography>
                <Typography variant="body2">{receipt.merchant}</Typography>
              </Box>
            )}

            {receipt.total && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Total Amount:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  ₱{parseFloat(receipt.total).toFixed(2)}
                </Typography>
              </Box>
            )}

            {receipt.total && CATEGORY_LIMITS[receipt.category] && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Reimbursable:
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 600,
                    color:
                      reimbursableAmount < parseFloat(receipt.total)
                        ? "warning.main"
                        : "success.main",
                  }}
                >
                  ₱{reimbursableAmount.toFixed(2)}
                </Typography>
              </Box>
            )}
          </Stack>

          {/* File Upload Area */}
          {!receipt.file && (
            <Box sx={{ mt: 2 }}>
              <input
                type="file"
                hidden
                accept=".jpg, .jpeg, .png, .pdf"
                id={`file-upload-${receipt.id}`}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  console.log("📎 File selected:", file?.name);
                  if (file) {
                    handleFileUpload(receipt.id, file);
                  }
                  e.target.value = "";
                }}
              />
              <label htmlFor={`file-upload-${receipt.id}`}>
                <Button
                  component="span"
                  variant="outlined"
                  startIcon={<CloudUpload />}
                  fullWidth
                  size="small"
                  disabled={showOcrLoading}
                >
                  Upload Receipt
                </Button>
              </label>
            </Box>
          )}

          {/* OCR Button */}
          {receipt.file && !receipt.extractedText && (
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                startIcon={receipt.isProcessing ? <Refresh /> : <ImageIcon />}
                onClick={() => handleOCR(receipt.id)}
                disabled={receipt.isProcessing || showOcrLoading} // ✅ UPDATED
                fullWidth
                size="small"
              >
                {receipt.isProcessing ? "Processing..." : "Extract Data (OCR)"}
              </Button>
            </Box>
          )}

          {/* ✅ REMOVED: Local progress bar - shown globally now */}

          {/* Validation Errors */}
          {receipt.errors && Object.keys(receipt.errors).length > 0 && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Please complete all required fields
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  // ✅ OCR Loading state at component level (outside dialog)
  const [showOcrLoading, setShowOcrLoading] = useState(false);

  // ✅ FIXED: Edit Receipt Dialog - NO MORE FLICKERING
  // ✅ FIXED: Edit Receipt Dialog - NO MORE FLICKERING
  // Solution 1: Remove receipts from useEffect dependencies
  // Solution 2: Don't update parent state during OCR, only on dialog close

  // ✅ FIXED: Edit Receipt Dialog - NO MORE FLICKERING
  // Solution 1: Remove receipts from useEffect dependencies
  // Solution 2: Don't update parent state during OCR, only on dialog close

  // ✅ FIXED: Edit Receipt Dialog - NO MORE FLICKERING
  // Solution 1: Remove receipts from useEffect dependencies
  // Solution 2: Don't update parent state during OCR, only on dialog close

  // ✅ UPDATED: Edit Receipt Dialog with global processing lock
  const EditReceiptDialog = () => {
    // Local state to buffer changes
    const [localReceipt, setLocalReceipt] = useState(null);
    // ✅ Track if we've initialized to prevent re-syncing
    const [hasInitialized, setHasInitialized] = useState(false);

    // ✅ SOLUTION 1: Initialize ONCE when dialog opens, never re-sync from receipts array
    useEffect(() => {
      if (editingReceiptId !== null && !hasInitialized) {
        const receipt = receipts.find((r) => r.id === editingReceiptId);
        if (receipt) {
          setLocalReceipt({ ...receipt });
          setHasInitialized(true);
        }
      }
      // Reset initialization flag when dialog closes
      if (editingReceiptId === null) {
        setHasInitialized(false);
        setLocalReceipt(null);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingReceiptId, hasInitialized]); // ✅ REMOVED 'receipts' from dependencies

    if (!editingReceiptId || !localReceipt) return null;

    const handleChange = (field, value) => {
      setLocalReceipt((prev) => ({ ...prev, [field]: value }));
    };

    const handleNumericInput = (field, value) => {
      let cleanValue = value;
      if (field === "total") {
        cleanValue = value.replace(/[^0-9.]/g, "");
        const parts = cleanValue.split(".");
        if (parts.length > 2) {
          cleanValue = parts[0] + "." + parts.slice(1).join("");
        }
        // ✅ Prevent entering value that exceeds 50,000
        const numericValue = parseFloat(cleanValue);
        if (!isNaN(numericValue) && numericValue > 50000) {
          return; // Don't update the state if it would exceed 50,000
        }
      } else {
        cleanValue = value.replace(/[^0-9]/g, "");
      }
      handleChange(field, cleanValue);
    };

    const handleClose = () => {
      // Save changes back to main state when closing
      updateReceipt(editingReceiptId, localReceipt);
      setEditingReceiptId(null);
    };

    const handleFileUploadLocal = (file) => {
      if (!file) return;

      const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
      const allowedExtensions = ["jpg", "jpeg", "png", "pdf"];
      const fileExtension = file.name.split(".").pop().toLowerCase();

      if (
        !allowedTypes.includes(file.type) ||
        !allowedExtensions.includes(fileExtension)
      ) {
        showNotification(
          "Only JPG, JPEG, PNG, or PDF files are allowed",
          "error",
        );
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showNotification("File size must be less than 5MB", "error");
        return;
      }

      if (file.type !== "application/pdf") {
        const reader = new FileReader();
        reader.onload = (event) => {
          setLocalReceipt((prev) => ({
            ...prev,
            file,
            preview: event.target.result,
          }));
        };
        reader.readAsDataURL(file);
      } else {
        setLocalReceipt((prev) => ({
          ...prev,
          file,
          preview: "pdf",
        }));
      }
    };

    const handleOCRLocal = async () => {
      if (!localReceipt.file) {
        showNotification("Please select a file first", "warning");
        return;
      }

      // ✅ Check rate limiting
      const now = Date.now();
      const timeSinceLastCall = now - lastOCRCall;

      if (timeSinceLastCall < OCR_COOLDOWN_MS) {
        const waitTime = Math.ceil(
          (OCR_COOLDOWN_MS - timeSinceLastCall) / 1000,
        );
        showNotification(
          `⏳ Please wait ${waitTime} seconds before processing another receipt`,
          "info",
        );
        return;
      }

      // Close the dialog first
      const receiptToProcess = { ...localReceipt };
      const receiptIdToProcess = editingReceiptId;
      setEditingReceiptId(null);
      setShowOcrLoading(true); // ✅ ADDED: Block all UI interactions

      // Update parent state to show processing in the card
      setLastOCRCall(now);
      updateReceipt(receiptIdToProcess, {
        ...receiptToProcess,
        isProcessing: true,
      });

      try {
        const formDataToSend = new FormData();
        formDataToSend.append("image", receiptToProcess.file);

        const res = await fetch(
          `${process.env.REACT_APP_API_URL}/api/ocr/structured`,
          {
            method: "POST",
            body: formDataToSend,
            credentials: "include",
          },
        );

        const data = await res.json();

        // ✅ Handle rate limit error
        if (res.status === 429) {
          showNotification(
            `⏳ ${data.message || "Rate limit reached. Please wait a moment and try again."}`,
            "warning",
          );
          updateReceipt(receiptIdToProcess, {
            ...receiptToProcess,
            isProcessing: false,
          });
          return;
        }

        if (!res.ok) throw new Error(data.error || "OCR failed");

        const extractedText = data.cleanedText || data.rawText;

        if (data.structured) {
          const structured = data.structured;

          let formattedDate = receiptToProcess.date;
          if (structured.date) {
            try {
              const parts = structured.date.split(/[/-]/);
              if (parts.length === 3) {
                let [day, month, year] = parts;
                day = day.padStart(2, "0");
                month = month.padStart(2, "0");
                if (year.length === 2) {
                  year = "20" + year;
                }
                formattedDate = `${year}-${month}-${day}`;
              }
            } catch (e) {
              console.error("❌ Date parse error:", e);
            }
          }

          let itemsText = "";
          if (Array.isArray(structured.items) && structured.items.length > 0) {
            itemsText = structured.items
              .map((item) => {
                if (typeof item === "object" && item.description) {
                  return item.price && item.price > 0
                    ? `${item.description} - ₱${parseFloat(item.price).toFixed(2)}`
                    : item.description;
                }
                return "";
              })
              .filter((line) => line.trim())
              .join("\n");
          }

          let formattedTotal = "";
          if (structured.total) {
            formattedTotal = String(parseFloat(structured.total).toFixed(2));
          }

          const updatedData = {
            ...receiptToProcess,
            extractedText,
            date: formattedDate,
            merchant: structured.merchant || receiptToProcess.merchant,
            total: formattedTotal || receiptToProcess.total,
            description: itemsText || receiptToProcess.description,
            isProcessing: false,
          };

          const details = [
            structured.merchant ? `${structured.merchant}` : null,
            structured.date ? `${structured.date}` : null,
            structured.total ? `₱${structured.total}` : null,
          ]
            .filter(Boolean)
            .join(" | ");

          updateReceipt(receiptIdToProcess, updatedData);
          showNotification(`✅ Receipt extracted! ${details}`, "success");
        } else {
          const updatedData = {
            ...receiptToProcess,
            extractedText,
            isProcessing: false,
          };

          updateReceipt(receiptIdToProcess, updatedData);
          showNotification(
            "⚠️ OCR completed but no structured data found",
            "warning",
          );
        }
      } catch (error) {
        console.error("❌ OCR Error:", error);
        updateReceipt(receiptIdToProcess, {
          ...receiptToProcess,
          isProcessing: false,
        });
        showNotification(`OCR failed: ${error.message}`, "error");
      } finally {
        setShowOcrLoading(false); // ✅ ADDED: Always unblock UI
      }
    };

    return (
      <Dialog
        open={editingReceiptId !== null}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            bgcolor: "primary.main",
            color: "primary.contrastText",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Edit Receipt Details
          </Typography>
          <IconButton
            onClick={handleClose}
            sx={{ color: "primary.contrastText" }}
            disabled={showOcrLoading} // ✅ ADDED: Disable close during OCR
          >
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ mt: 2 }}>
          {/* ✅ REMOVED: Box with opacity transition - no longer needed */}
          <Stack spacing={2.5}>
            {/* File Preview */}
            {localReceipt.preview && (
              <Paper
                sx={{
                  p: 2,
                  bgcolor: "action.hover",
                  textAlign: "center",
                }}
              >
                {localReceipt.preview === "pdf" ? (
                  <Box>
                    <PictureAsPdf
                      sx={{ fontSize: 64, color: "primary.main" }}
                    />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {localReceipt.file?.name}
                    </Typography>
                  </Box>
                ) : (
                  <img
                    src={localReceipt.preview}
                    alt="Receipt"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "300px",
                      borderRadius: "8px",
                    }}
                  />
                )}
              </Paper>
            )}

            {/* Upload New File */}
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUpload />}
              disabled={showOcrLoading} // ✅ UPDATED: Disable during OCR
            >
              {localReceipt.file ? "Change File" : "Upload File"}
              <input
                type="file"
                hidden
                accept=".jpg, .jpeg, .png, .pdf"
                onChange={(e) => {
                  if (e.target.files[0]) {
                    handleFileUploadLocal(e.target.files[0]);
                  }
                }}
              />
            </Button>

            {/* OCR Button */}
            {localReceipt.file && (
              <Button
                variant="contained"
                startIcon={
                  localReceipt.isProcessing ? <Refresh /> : <ImageIcon />
                }
                onClick={handleOCRLocal}
                disabled={localReceipt.isProcessing || showOcrLoading} // ✅ UPDATED: Disable during OCR
              >
                {localReceipt.isProcessing
                  ? "Processing..."
                  : "Extract Data (OCR)"}
              </Button>
            )}

            {/* ✅ REMOVED: Progress bar - shown globally now */}

            <Divider />

            <TextField
              select
              label="Category *"
              value={localReceipt.category}
              onChange={(e) => handleChange("category", e.target.value)}
              fullWidth
              disabled={showOcrLoading} // ✅ UPDATED: Disable during OCR
            >
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Date *"
              type="date"
              value={localReceipt.date}
              onChange={(e) => handleChange("date", e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              InputProps={{
                sx: {
                  '& input[type="date"]::-webkit-calendar-picker-indicator': {
                    filter:
                      theme.palette.mode === "dark" ? "invert(1)" : "none",
                  },
                },
              }}
              disabled={showOcrLoading} // ✅ UPDATED: Disable during OCR
            />

            <TextField
              label="Merchant/Vendor"
              value={localReceipt.merchant}
              onChange={(e) => handleChange("merchant", e.target.value)}
              fullWidth
              placeholder="e.g., Grab, Jollibee, Office Depot"
              disabled={showOcrLoading} // ✅ UPDATED: Disable during OCR
            />

            <TextField
              label="Total Amount (₱) *"
              type="text"
              value={localReceipt.total}
              onChange={(e) => handleNumericInput("total", e.target.value)}
              onKeyDown={(e) => {
                if (["e", "E", "+", "-"].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              fullWidth
              inputProps={{ inputMode: "decimal" }}
              disabled={showOcrLoading} // ✅ UPDATED: Disable during OCR
              helperText="Maximum: ₱50,000"
            />

            {localReceipt.category === "Meal with Client" && (
              <TextField
                label="Number of People *"
                type="text"
                value={localReceipt.number_of_people}
                onChange={(e) =>
                  handleNumericInput("number_of_people", e.target.value)
                }
                onKeyDown={(e) => {
                  if (["e", "E", "+", "-", "."].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                fullWidth
                inputProps={{ inputMode: "numeric" }}
                helperText="How many people attended the client meal?"
                disabled={showOcrLoading} // ✅ UPDATED: Disable during OCR
              />
            )}

            {localReceipt.category === "Accommodation" && (
              <>
                <TextField
                  label="Number of Days *"
                  type="text"
                  value={localReceipt.number_of_days}
                  onChange={(e) =>
                    handleNumericInput("number_of_days", e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (["e", "E", "+", "-", "."].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  fullWidth
                  inputProps={{ inputMode: "numeric" }}
                  helperText="How many days of accommodation?"
                  disabled={showOcrLoading} // ✅ UPDATED: Disable during OCR
                />
                <TextField
                  label="Number of People *"
                  type="text"
                  value={localReceipt.number_of_people}
                  onChange={(e) =>
                    handleNumericInput("number_of_people", e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (["e", "E", "+", "-", "."].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  fullWidth
                  inputProps={{ inputMode: "numeric" }}
                  helperText="How many people will use the accommodation?"
                  disabled={showOcrLoading} // ✅ UPDATED: Disable during OCR
                />
              </>
            )}

            {["Overtime Meal", "Meal with Client", "Accommodation"].includes(
              localReceipt.category,
            ) &&
              localReceipt.total && (
                <Box
                  sx={{
                    p: 2,
                    bgcolor:
                      theme.palette.mode === "dark"
                        ? "rgba(76, 175, 80, 0.15)"
                        : "grey.100",
                    borderRadius: 1,
                    border: 1,
                    borderColor:
                      theme.palette.mode === "dark"
                        ? "#4caf50"
                        : "success.main",
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 0.5 }}
                  >
                    Reimbursable Amount:
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color:
                        theme.palette.mode === "dark" ? "#4caf50" : "#1b5e20",
                    }}
                  >
                    ₱
                    {calculateReimbursableAmount(
                      localReceipt.category,
                      localReceipt.total,
                      parseInt(localReceipt.number_of_people) || 1,
                      parseInt(localReceipt.number_of_days) || 1,
                    ).toFixed(2)}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 0.5 }}
                  >
                    {getReimbursableAmountHelper(
                      localReceipt.category,
                      parseInt(localReceipt.number_of_people) || 1,
                      parseInt(localReceipt.number_of_days) || 1,
                    )}
                  </Typography>
                  {calculateReimbursableAmount(
                    localReceipt.category,
                    localReceipt.total,
                    parseInt(localReceipt.number_of_people) || 1,
                    parseInt(localReceipt.number_of_days) || 1,
                  ) < parseFloat(localReceipt.total) && (
                    <Typography
                      variant="caption"
                      color="warning.main"
                      sx={{ display: "block", mt: 1, fontWeight: 600 }}
                    >
                      ⚠️ Amount exceeds category limit.
                      <br />
                      Only ₱
                      {calculateReimbursableAmount(
                        localReceipt.category,
                        localReceipt.total,
                        parseInt(localReceipt.number_of_people) || 1,
                        parseInt(localReceipt.number_of_days) || 1,
                      ).toFixed(2)}{" "}
                      will be reimbursed.
                    </Typography>
                  )}
                </Box>
              )}

            <TextField
              label="Purpose *"
              value={localReceipt.items}
              onChange={(e) => handleChange("items", e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="Purpose of the expense..."
              helperText="Explain the business purpose of this expense"
              disabled={showOcrLoading} // ✅ UPDATED: Disable during OCR
            />

            <TextField
              label="Description *"
              value={localReceipt.description}
              onChange={(e) => handleChange("description", e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="Description of this reimbursement application..."
              disabled={showOcrLoading} // ✅ UPDATED: Disable during OCR
            />

            {/* Extracted Text */}
            {localReceipt.extractedText && (
              <Paper sx={{ p: 2, bgcolor: "action.hover" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Extracted Text:
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    maxHeight: 150,
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    fontFamily: "monospace",
                    fontSize: "0.75rem",
                  }}
                >
                  {localReceipt.extractedText}
                </Typography>
              </Paper>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={handleClose}
            variant="outlined"
            disabled={showOcrLoading} // ✅ UPDATED: Disable during OCR
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Preview Receipt Dialog
  const PreviewReceiptDialog = () => {
    const previewReceipt = receipts.find((r) => r.id === previewReceiptId);

    if (!previewReceipt) return null;

    return (
      <Dialog
        open={previewReceiptId !== null}
        onClose={() => setPreviewReceiptId(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            bgcolor: "primary.main",
            color: "primary.contrastText",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Receipt Preview
          </Typography>
          <IconButton
            onClick={() => setPreviewReceiptId(null)}
            sx={{ color: "primary.contrastText" }}
          >
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ mt: 2, textAlign: "center" }}>
          {previewReceipt.preview === "pdf" ? (
            <Box>
              <PictureAsPdf sx={{ fontSize: 100, color: "primary.main" }} />
              <Typography variant="h6" sx={{ mt: 2 }}>
                PDF Receipt
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {previewReceipt.file?.name}
              </Typography>
            </Box>
          ) : (
            <img
              src={previewReceipt.preview}
              alt="Receipt"
              style={{
                maxWidth: "100%",
                maxHeight: "70vh",
                borderRadius: "8px",
              }}
            />
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setPreviewReceiptId(null)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Confirmation Modal
  const ConfirmationModal = () => {
    const totalAmount = receipts.reduce(
      (sum, r) => sum + (parseFloat(r.total) || 0),
      0,
    );
    const totalReimbursable = receipts.reduce((sum, r) => {
      return (
        sum +
        calculateReimbursableAmount(
          r.category,
          r.total,
          parseInt(r.number_of_people) || 1,
          parseInt(r.number_of_days) || 1,
        )
      );
    }, 0);

    return (
      <Dialog
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            bgcolor: "primary.main",
            color: "primary.contrastText",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Review Your Reimbursement Request
          </Typography>
          <IconButton
            onClick={() => setShowConfirmModal(false)}
            sx={{ color: "primary.contrastText" }}
          >
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            You are submitting {receipts.length} receipt
            {receipts.length > 1 ? "s" : ""}. Please review all details
            carefully.
          </Alert>

          {/* Summary */}
          <Paper sx={{ p: 2, mb: 3, bgcolor: "action.hover" }}>
            <Grid container spacing={2}>
              {!bypassesSapValidation && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    SAP Code:
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {formData.sap_code}
                  </Typography>
                </Grid>
              )}
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Total Receipts:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {receipts.length}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Total Amount:
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, color: "primary.main" }}
                >
                  ₱{totalAmount.toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Total Reimbursable:
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, color: "success.main" }}
                >
                  ₱{totalReimbursable.toFixed(2)}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Individual Receipts */}
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            Receipt Details:
          </Typography>
          <Stack spacing={2}>
            {receipts.map((receipt, index) => {
              const reimbursable = calculateReimbursableAmount(
                receipt.category,
                receipt.total,
                parseInt(receipt.number_of_people) || 1,
                parseInt(receipt.number_of_days) || 1,
              );

              return (
                <Paper key={receipt.id} sx={{ p: 2, bgcolor: "action.hover" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Receipt #{index + 1}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Date:
                      </Typography>
                      <Typography variant="body2">
                        {new Date(receipt.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Category:
                      </Typography>
                      <Typography variant="body2">
                        {receipt.category}
                      </Typography>
                    </Grid>
                    {receipt.merchant && (
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">
                          Merchant:
                        </Typography>
                        <Typography variant="body2">
                          {receipt.merchant}
                        </Typography>
                      </Grid>
                    )}
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Total:
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        ₱{parseFloat(receipt.total).toFixed(2)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Reimbursable:
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 600,
                          color:
                            reimbursable < parseFloat(receipt.total)
                              ? "warning.main"
                              : "success.main",
                        }}
                      >
                        ₱{reimbursable.toFixed(2)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              );
            })}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button
            onClick={() => setShowConfirmModal(false)}
            startIcon={<Edit />}
            variant="outlined"
            size="large"
          >
            Continue Editing
          </Button>
          <Button
            onClick={handleConfirmSubmit}
            startIcon={<Send />}
            variant="contained"
            size="large"
            sx={{
              bgcolor: "#2e7d32",
              "&:hover": {
                bgcolor: "#1b5e20",
              },
            }}
          >
            Submit {receipts.length} Receipt{receipts.length > 1 ? "s" : ""}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <>
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Upload Receipts for Reimbursement
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAddReceipt}
            >
              Add Receipt
            </Button>
          </Box>

          {!bypassesSapValidation && availableSapCodes.length === 0 && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              No SAP codes assigned to your account. Please contact your Sales
              Director.
            </Alert>
          )}

          {/* SAP Code Selection */}
         {!bypassesSapValidation && (
  <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
    <TextField
      select
      label="SAP Code *"
      value={formData.sap_code}
      onChange={(e) => setFormData({ ...formData, sap_code: e.target.value })}
      fullWidth
      helperText="Select the department/project for all receipts"
      disabled={availableSapCodes.length === 0}
    >
      {availableSapCodes.map((code) => (
        <MenuItem key={code} value={code}>
          {code}
        </MenuItem>
      ))}
    </TextField>

    <TextField
      select
      label="Entity *"
      value={formData.entity}
      onChange={(e) => setFormData({ ...formData, entity: e.target.value })}
      fullWidth
      helperText="Select entity"
      disabled={availableSapCodes.length === 0}
    >
     <MenuItem value="EPH">EPH</MenuItem>
      <MenuItem value="EPM">EPM</MenuItem>
    </TextField>
  </Box>
)}

          {/* Receipt Cards Grid */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {receipts.map((receipt, index) => (
              <Grid item xs={12} sm={6} md={4} key={receipt.id}>
                <ReceiptCard receipt={receipt} index={index} />
              </Grid>
            ))}
          </Grid>

          {/* Summary and Submit */}
          <Paper sx={{ p: 3, bgcolor: "action.hover" }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Summary
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Total Receipts:
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {receipts.length}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Total Amount:
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, color: "primary.main" }}
                >
                  ₱
                  {receipts
                    .reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0)
                    .toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Reimbursable:
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, color: "success.main" }}
                >
                  ₱
                  {receipts
                    .reduce((sum, r) => {
                      return (
                        sum +
                        calculateReimbursableAmount(
                          r.category,
                          r.total,
                          parseInt(r.number_of_people) || 1,
                          parseInt(r.number_of_days) || 1,
                        )
                      );
                    }, 0)
                    .toFixed(2)}
                </Typography>
              </Grid>
            </Grid>

            <Button
              variant="contained"
              onClick={handleSubmitClick}
              size="large"
              startIcon={<Send />}
              fullWidth
              sx={{
                py: 1.5,
                fontWeight: 600,
                bgcolor: "#2e7d32",
                color: "#fafafa",
                "&:hover": {
                  bgcolor: "#1b5e20",
                },
                "&:disabled": {
                  bgcolor: "action.disabledBackground",
                  color: "action.disabled",
                },
              }}
              disabled={
                submitting ||
                (!bypassesSapValidation && availableSapCodes.length === 0) ||
                (!bypassesSapValidation && !formData.sap_code)
              }
            >
              {submitting
                ? "Submitting..."
                : `Submit ${receipts.length} Receipt${receipts.length > 1 ? "s" : ""} for Approval`}
            </Button>
          </Paper>
        </CardContent>
      </Card>

      {/* Modals */}
      <EditReceiptDialog />
      <PreviewReceiptDialog />
      <ConfirmationModal />

      {/* ✅ OCR Loading Overlay - Outside all dialogs */}
      <Backdrop
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.modal + 1,
          backdropFilter: "blur(10px)",
          backgroundColor: "rgba(0, 0, 0, 0.8)",
        }}
        open={showOcrLoading}
      >
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress color="inherit" size={80} thickness={4} />
          <Typography variant="h5" sx={{ mt: 4, fontWeight: 600 }}>
            Extracting Receipt Data...
          </Typography>
          <Typography variant="body1" sx={{ mt: 2, opacity: 0.9 }}>
            Please wait while we process your receipt
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
            This may take a few seconds
          </Typography>
        </Box>
      </Backdrop>

      {/* Loading Backdrop */}
      <Backdrop
        sx={{
          color: "#fff",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backdropFilter: "blur(8px)",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
        }}
        open={submitting}
      >
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress color="inherit" size={60} thickness={4} />
          <Typography variant="h6" sx={{ mt: 3, fontWeight: 600 }}>
            Submitting Receipts...
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
            Please wait while we process your {receipts.length} reimbursement
            {receipts.length > 1 ? "s" : ""}
          </Typography>
        </Box>
      </Backdrop>
    </>
  );
}

export default ReceiptUpload;
