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
} from "@mui/material";
import {
  CloudUpload,
  Image as ImageIcon,
  Delete,
  CheckCircle,
  Refresh,
} from "@mui/icons-material";

function ReceiptUpload() {
  const theme = useTheme();
  const { showNotification, user } = useAppContext();
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [formData, setFormData] = useState({
<<<<<<< HEAD
    date: new Date().toISOString().split("T")[0],
    items: "",
    total: "",
    description: "",
    category: "Meal with Client",
    merchant: "",
    sap_code: "",
=======
    date: new Date().toISOString().split('T')[0],
    items: '',
    total: '',
    description: '',
    category: 'Meal with Client',
    merchant: '',
    sap_code: '',
    number_of_people: 1,
    number_of_days: 1,
>>>>>>> origin
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [errors, setErrors] = useState({});
  const [availableSapCodes, setAvailableSapCodes] = useState([]);

  const categories = [
    "Transportation (Commute)",
    "Transportation (Drive)",
    "Meal with Client",
    "Overtime Meal",
    "Accomodation",
    "Other",
  ];

<<<<<<< HEAD
  const isInvoiceSpecialist = user?.role === "Invoice Specialist";
=======
  // Category reimbursement limits
const CATEGORY_LIMITS = {
  'Overtime Meal': { maxPerUnit: 300, unit: 'fixed' },
  'Meal with Client': { maxPerUnit: 800, unit: 'person' },
  'Accomodation': { maxPerUnit: 2500, unit: 'day' }
};

// Calculate reimbursable amount based on category
const calculateReimbursableAmount = (category, total, numPeople = 1, numDays = 1) => {
  const totalAmount = parseFloat(total) || 0;
  
  if (!CATEGORY_LIMITS[category]) {
    return totalAmount; // No limit for other categories
  }

  const limit = CATEGORY_LIMITS[category];
  let maxReimbursable = 0;

  switch (category) {
    case 'Overtime Meal':
      maxReimbursable = Math.min(totalAmount, limit.maxPerUnit);
      break;
    case 'Meal with Client':
      maxReimbursable = Math.min(totalAmount, limit.maxPerUnit * numPeople);
      break;
    case 'Accomodation':
      maxReimbursable = Math.min(totalAmount, limit.maxPerUnit * numDays);
      break;
    default:
      maxReimbursable = totalAmount;
  }

  return maxReimbursable;
};

// Get helper text for reimbursable amount
const getReimbursableAmountHelper = (category, numPeople, numDays) => {
  if (!CATEGORY_LIMITS[category]) return '';
  
  const limit = CATEGORY_LIMITS[category];
  
  switch (category) {
    case 'Overtime Meal':
      return `Maximum reimbursable: ₱${limit.maxPerUnit.toFixed(2)}`;
    case 'Meal with Client':
      return `Maximum reimbursable: ₱${(limit.maxPerUnit * numPeople).toFixed(2)} (₱${limit.maxPerUnit}/person × ${numPeople} ${numPeople === 1 ? 'person' : 'people'})`;
    case 'Accomodation':
      return `Maximum reimbursable: ₱${(limit.maxPerUnit * numDays).toFixed(2)} (₱${limit.maxPerUnit}/day × ${numDays} ${numDays === 1 ? 'day' : 'days'})`;
    default:
      return '';
  }
};

  // ✅ Check if user bypasses SAP validation
  const bypassesSapValidation = ['Invoice Specialist', 'SUL'].includes(user?.role);
>>>>>>> origin

  useEffect(() => {
    if (user) {
      // Fetch user's SAP codes from settings endpoint
      fetchUserSapCodes();

      // Set default for Invoice Specialist
      if (isInvoiceSpecialist) {
        setFormData((prev) => ({ ...prev, sap_code: "INVOICE_SPECIALIST" }));
      }
    }
  }, [user, isInvoiceSpecialist]);

  const fetchUserSapCodes = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/users/settings`,
        {
          credentials: "include",
        }
      );
      const data = await response.json();

      if (data.data && data.data.sapCodes) {
        const codes = data.data.sapCodes.map((sc) => sc.code);
        setAvailableSapCodes(codes);

        // Auto-select if only one SAP code
        if (codes.length === 1) {
          setFormData((prev) => ({ ...prev, sap_code: codes[0] }));
        }

        console.log(
          `✅ ${user.role} has ${codes.length} assigned SAP codes:`,
          codes
        );
      }
    } catch (error) {
      console.error("Failed to fetch SAP codes:", error);
      showNotification("Failed to load SAP codes", "error");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ["image/jpeg", "image/png"];
      const allowedExtensions = ["jpg", "jpeg", "png"];

      const fileExtension = file.name.split(".").pop().toLowerCase();

      // ✅ Check MIME + extension
      if (
        !allowedTypes.includes(file.type) ||
        !allowedExtensions.includes(fileExtension)
      ) {
        showNotification("Only JPG, JPEG, or PNG files are allowed", "error");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showNotification("File size must be less than 5MB", "error");
        return;
      }

      setImage(file);
      setExtractedText("");
      setErrors((prev) => ({ ...prev, image: "" }));

      const reader = new FileReader();
      reader.onload = (event) => setImagePreview(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleOCR = async () => {
    if (!image) {
      showNotification("Please select an image first", "warning");
      return;
    }

    setLoading(true);
    setOcrProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setOcrProgress((prev) => {
          if (prev >= 90) return 90;
          return prev + 10;
        });
      }, 200);

      const formDataToSend = new FormData();
      formDataToSend.append("image", image);

      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/ocr/structured`,
        {
          method: "POST",
          body: formDataToSend,
          credentials: "include",
        }
      );

      clearInterval(progressInterval);
      setOcrProgress(100);

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "OCR failed");

      setExtractedText(data.cleanedText || data.rawText);

      if (data.structured) {
        const structured = data.structured;

        console.log("🤖 AI Extracted Data:", structured);

        let formattedDate = formData.date;
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
              console.log("📅 Date:", structured.date, "→", formattedDate);
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
                  ? `${item.description} - ₱${parseFloat(item.price).toFixed(
                      2
                    )}`
                  : item.description;
              }
              return "";
            })
            .filter((line) => line.trim())
            .join("\n");

          console.log("📦 Items:", structured.items.length, "extracted");
        }

        let formattedTotal = "";
        if (structured.total) {
          formattedTotal = String(parseFloat(structured.total).toFixed(2));
          console.log("💰 Total: ₱", formattedTotal);
        }

        setFormData((prev) => ({
          ...prev,
          date: formattedDate,
          merchant: structured.merchant || prev.merchant,
          total: formattedTotal || prev.total,
          description: itemsText || prev.description,
        }));

        const details = [
          structured.merchant ? `${structured.merchant}` : null,
          structured.date ? `${structured.date}` : null,
          structured.total ? `₱${structured.total}` : null,
        ]
          .filter(Boolean)
          .join(" | ");

        showNotification(`✅ Receipt extracted! ${details}`, "success");
      } else {
        showNotification(
          "⚠️ OCR completed but no structured data found",
          "warning"
        );
      }
    } catch (error) {
      console.error("❌ OCR Error:", error);
      showNotification(`OCR failed: ${error.message}`, "error");
    } finally {
      setLoading(false);
      setTimeout(() => setOcrProgress(0), 500);
    }
  };

<<<<<<< HEAD
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };
=======
>>>>>>> origin

  const validateDate = (dateString) => {
    const selectedDate = new Date(dateString);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (selectedDate > today) {
      return "Date cannot be in the future";
    }
    return "";
  };

  const handleChange = (e) => {
  const { name, value } = e.target;
  
  setFormData((prev) => {
    const updated = { ...prev, [name]: value };
    
    // Recalculate reimbursable amount when relevant fields change
    if (['category', 'total', 'number_of_people', 'number_of_days'].includes(name)) {
      // No automatic recalculation here - we'll show it separately
    }
    
    return updated;
  });
  
  if (errors[name]) {
    setErrors((prev) => ({ ...prev, [name]: '' }));
  }
};

  const validateForm = () => {
<<<<<<< HEAD
    const newErrors = {};

    const dateError = validateDate(formData.date);
    if (dateError) newErrors.date = dateError;

    if (!formData.date) newErrors.date = "Date is required";
    if (!formData.total || parseFloat(formData.total) <= 0) {
      newErrors.total = "Valid total amount is required";
    }
    if (!formData.category) newErrors.category = "Category is required";
    if (!formData.items.trim()) newErrors.items = "Purpose is required";
    if (!formData.description.trim())
      newErrors.description = "Description is required";

    // Only validate SAP code if user is NOT an Invoice Specialist
    if (!isInvoiceSpecialist && !formData.sap_code) {
      newErrors.sap_code = "SAP code is required";
    }

    if (!image) newErrors.image = "Receipt image is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      showNotification("Please fill in all required fields", "error");
      return;
    }

    if (!user) {
      showNotification("Please log in first", "error");
      return;
=======
  const newErrors = {};
 
  const dateError = validateDate(formData.date);
  if (dateError) newErrors.date = dateError;
 
  if (!formData.date) newErrors.date = 'Date is required';
  if (!formData.total || parseFloat(formData.total) <= 0) {
    newErrors.total = 'Valid total amount is required';
  }
  if (!formData.category) newErrors.category = 'Category is required';
  if (!formData.items.trim()) newErrors.items = 'Purpose is required';
  if (!formData.description.trim()) newErrors.description = 'Description is required';
  
  // Validate number of people for Meal with Client
  if (formData.category === 'Meal with Client') {
    const numPeople = parseInt(formData.number_of_people);
    if (!numPeople || numPeople < 1) {
      newErrors.number_of_people = 'Number of people must be at least 1';
    }
  }
  
  // Validate number of days for Accommodation
  if (formData.category === 'Accomodation') {
    const numDays = parseInt(formData.number_of_days);
    if (!numDays || numDays < 1) {
      newErrors.number_of_days = 'Number of days must be at least 1';
    }
  }
  
  // Only validate SAP code if user doesn't bypass validation
  if (!bypassesSapValidation && !formData.sap_code) {
    newErrors.sap_code = 'SAP code is required';
  }
  
  if (!image) newErrors.image = 'Receipt file is required';
 
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

  const handleSubmit = async () => {
  if (!validateForm()) {
    showNotification('Please fill in all required fields', 'error');
    return;
  }

  if (!user) {
    showNotification('Please log in first', 'error');
    return;
  }

  setSubmitting(true);

  try {
    // Calculate reimbursable amount
    const reimbursableAmount = calculateReimbursableAmount(
      formData.category,
      formData.total,
      parseInt(formData.number_of_people) || 1,
      parseInt(formData.number_of_days) || 1
    );

    // Create FormData for multipart upload
    const formDataToSend = new FormData();
    formDataToSend.append('category', formData.category);
    formDataToSend.append('type', formData.category);
    formDataToSend.append('description', formData.description);
    formDataToSend.append('items', formData.items);
    formDataToSend.append('total', parseFloat(formData.total));
    formDataToSend.append('reimbursable_amount', reimbursableAmount);
    formDataToSend.append('merchant', formData.merchant);
    formDataToSend.append('date_of_expense', formData.date);
    formDataToSend.append('sap_code', formData.sap_code);
    
    // Add category-specific fields
    if (formData.category === 'Meal with Client') {
      formDataToSend.append('number_of_people', parseInt(formData.number_of_people));
    }
    if (formData.category === 'Accomodation') {
      formDataToSend.append('number_of_days', parseInt(formData.number_of_days));
    }
    
    // Append the actual file (image or PDF)
    if (image) {
      formDataToSend.append('receipt', image);
    }

    const res = await fetch(`${process.env.REACT_APP_API_URL}/api/reimbursements`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
      body: formDataToSend,
      credentials: 'include',
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || `Server responded with ${res.status}`);
>>>>>>> origin
    }
    
    const data = await res.json();

    showNotification('Reimbursement submitted successfully!', 'success');
    console.log('Created reimbursement:', data);

<<<<<<< HEAD
    try {
      // Create FormData for multipart upload
      const formDataToSend = new FormData();
      formDataToSend.append("category", formData.category);
      formDataToSend.append("type", formData.category);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("items", formData.items);
      formDataToSend.append("total", parseFloat(formData.total));
      formDataToSend.append("merchant", formData.merchant);
      formDataToSend.append("date_of_expense", formData.date);
      formDataToSend.append("sap_code", formData.sap_code);

      // Append the actual image file
      if (image) {
        formDataToSend.append("receipt", image);
      }

      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/reimbursements`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
          body: formDataToSend,
          credentials: "include",
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          errorData.error || `Server responded with ${res.status}`
        );
      }

      const data = await res.json();

      showNotification("Reimbursement submitted successfully!", "success");
      console.log("Created reimbursement:", data);

      // Reset form
      const defaultSapCode = bypassesSapValidation
        ? user.role === "Invoice Specialist"
          ? "INVOICE_SPECIALIST"
          : "SUL_DIRECT"
        : availableSapCodes.length === 1
        ? availableSapCodes[0]
        : "";

      setFormData({
        date: new Date().toISOString().split("T")[0],
        items: "",
        total: "",
        description: "",
        category: "Meal with Client",
        merchant: "",
        sap_code: isInvoiceSpecialist
          ? "INVOICE_SPECIALIST"
          : availableSapCodes.length === 1
          ? availableSapCodes[0]
          : "",
      });
      setImage(null);
      setImagePreview(null);
      setExtractedText("");
      setErrors({});
    } catch (err) {
      console.error("Error submitting reimbursement:", err);
      showNotification(
        err.message || "Failed to submit reimbursement",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };
=======
    // Reset form
    const defaultSapCode = bypassesSapValidation 
      ? (user.role === 'Invoice Specialist' ? 'INVOICE_SPECIALIST' : 'SUL_DIRECT')
      : (availableSapCodes.length === 1 ? availableSapCodes[0] : '');

    setFormData({
      date: new Date().toISOString().split('T')[0],
      items: '',
      total: '',
      description: '',
      category: 'Meal with Client',
      merchant: '',
      sap_code: defaultSapCode,
      number_of_people: 1,
      number_of_days: 1,
    });
    setImage(null);
    setImagePreview(null);
    setExtractedText('');
    setErrors({});
  } catch (err) {
    console.error('Error submitting reimbursement:', err);
    showNotification(err.message || 'Failed to submit reimbursement', 'error');
  } finally {
    setSubmitting(false);
  }
};
>>>>>>> origin

  const handleClearImage = () => {
    setImage(null);
    setImagePreview(null);
    setExtractedText("");
    setErrors((prev) => ({ ...prev, image: "" }));
  };

  return (
    <>
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: "bold", mb: 3 }}>
            Upload Receipt for Reimbursement
          </Typography>

          {availableSapCodes.length === 0 && !isInvoiceSpecialist && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              No SAP codes assigned to your account. Please contact your Sales
              Director.
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper
                sx={{
                  p: 3,
                  border: 2,
                  borderStyle: "dashed",
                  borderColor: errors.image ? "error.main" : "divider",
                  borderRadius: 2,
                  textAlign: "center",
                  bgcolor: "action.hover",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: "action.selected",
                  },
                }}
              >
                {imagePreview ? (
                  <Box>
                    <Box sx={{ position: "relative", mb: 2 }}>
                      <img
                        src={imagePreview}
                        alt="Receipt preview"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "400px",
                          borderRadius: "8px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                        onError={() =>
                          showNotification(
                            "Failed to load image preview",
                            "error"
                          )
                        }
                      />
                      <IconButton
                        onClick={handleClearImage}
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          bgcolor: "background.paper",
                          "&:hover": { bgcolor: "background.default" },
                        }}
                      >
                        <Delete color="error" />
                      </IconButton>
                    </Box>
                    <Box
                      sx={{ display: "flex", gap: 2, justifyContent: "center" }}
                    >
                      <Button
                        variant="contained"
                        startIcon={loading ? <Refresh /> : <ImageIcon />}
                        onClick={handleOCR}
                        disabled={loading}
                        color="primary"
                      >
                        {loading ? "Processing..." : "Extract Text (OCR)"}
                      </Button>
                    </Box>
                    {loading && (
                      <Box sx={{ mt: 2 }}>
                        <LinearProgress
                          variant="determinate"
                          value={ocrProgress}
                        />
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mt: 1 }}
                        >
                          {ocrProgress}% Complete
                        </Typography>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <label
                    htmlFor="receipt-upload"
                    style={{ cursor: "pointer", display: "block" }}
                  >
                    <input
                      id="receipt-upload"
                      data-testid="receipt-upload"
                      type="file"
                      accept=".jpg, .jpeg, .png, .pdf"
                      onChange={handleImageChange}
                      style={{ display: "none" }}
                    />
                    <CloudUpload
                      sx={{
                        fontSize: 64,
                        color:
                          theme.palette.mode === "dark"
                            ? theme.palette.primary.light
                            : "#00387e",
                        mb: 2,
                      }}
                    />
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      Click to Upload Receipt
                    </Typography>
                    {/* ✅ UPDATED: Added PDF to supported formats */}
                    <Typography variant="body2" color="text.secondary">
                      Supported formats: JPG, PNG, JPEG, PDF (Max 5MB)
                    </Typography>
                  </label>
                )}
                {errors.image && (
                  <Typography
                    variant="caption"
                    sx={{ color: "error.main", mt: 1, display: "block" }}
                  >
                    {errors.image}
                  </Typography>
                )}
              </Paper>

              {extractedText && (
                <Paper sx={{ mt: 2, p: 2, bgcolor: "action.hover" }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, mb: 1 }}
                  >
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
                    {extractedText}
                  </Typography>
                </Paper>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                {!isInvoiceSpecialist && (
                  <TextField
                    select
                    label="SAP Code *"
                    name="sap_code"
                    value={formData.sap_code}
                    onChange={handleChange}
                    fullWidth
                    error={!!errors.sap_code}
                    helperText={
                      errors.sap_code ||
                      (user?.role === "Account Manager"
                        ? "Select SAP code for your reimbursement submission"
                        : "Select the department/project for this expense")
                    }
                    disabled={availableSapCodes.length === 0}
                  >
                    {availableSapCodes.map((code) => (
                      <MenuItem key={code} value={code}>
                        {code}
                      </MenuItem>
                    ))}
                  </TextField>
                )}

                <TextField
                  select
                  label="Category *"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  fullWidth
                  error={!!errors.category}
                  helperText={errors.category}
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Date *"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  error={!!errors.date}
                  helperText={errors.date}
                  InputProps={{
                    sx: {
                      '& input[type="date"]::-webkit-calendar-picker-indicator':
                        {
                          filter:
                            theme.palette.mode === "dark"
                              ? "invert(1)"
                              : "none",
                        },
                    },
                  }}
                />

                <TextField
                  label="Merchant/Vendor"
                  name="merchant"
                  value={formData.merchant}
                  onChange={handleChange}
                  fullWidth
                  placeholder="e.g., Grab, Jollibee, Office Depot"
                />

                <TextField
<<<<<<< HEAD
                  label="Total Amount (₱) *"
                  name="total"
                  type="number"
                  value={formData.total}
                  onChange={handleChange}
                  fullWidth
                  inputProps={{ step: "0.01", min: "0" }}
                  error={!!errors.total}
                  helperText={errors.total}
                />
=======
  label="Total Amount (₱) *"
  name="total"
  type="number"
  value={formData.total}
  onChange={handleChange}
  fullWidth
  inputProps={{ step: '0.01', min: '0' }}
  error={!!errors.total}
  helperText={errors.total}
/>

{/* Show Number of People field for Meal with Client */}
{formData.category === 'Meal with Client' && (
  <TextField
    label="Number of People *"
    name="number_of_people"
    type="number"
    value={formData.number_of_people}
    onChange={handleChange}
    fullWidth
    inputProps={{ step: '1', min: '1' }}
    error={!!errors.number_of_people}
    helperText={errors.number_of_people || 'How many people attended the client meal?'}
  />
)}

{/* Show Number of Days field for Accommodation */}
{formData.category === 'Accomodation' && (
  <TextField
    label="Number of Days *"
    name="number_of_days"
    type="number"
    value={formData.number_of_days}
    onChange={handleChange}
    fullWidth
    inputProps={{ step: '1', min: '1' }}
    error={!!errors.number_of_days}
    helperText={errors.number_of_days || 'How many days of accommodation?'}
  />
)}

{/* Reimbursable Amount Display - Show for categories with limits */}
{['Overtime Meal', 'Meal with Client', 'Accomodation'].includes(formData.category) && formData.total && (
  <Box
    sx={{
      p: 2,
      bgcolor: 'info.light',
      borderRadius: 1,
      border: 1,
      borderColor: 'info.main',
    }}
  >
    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
      Reimbursable Amount:
    </Typography>
    <Typography variant="h6" sx={{ fontWeight: 700, color: 'info.dark' }}>
      ₱{calculateReimbursableAmount(
        formData.category,
        formData.total,
        parseInt(formData.number_of_people) || 1,
        parseInt(formData.number_of_days) || 1
      ).toFixed(2)}
    </Typography>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
      {getReimbursableAmountHelper(
        formData.category,
        parseInt(formData.number_of_people) || 1,
        parseInt(formData.number_of_days) || 1
      )}
    </Typography>
    {calculateReimbursableAmount(
      formData.category,
      formData.total,
      parseInt(formData.number_of_people) || 1,
      parseInt(formData.number_of_days) || 1
    ) < parseFloat(formData.total) && (
      <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1, fontWeight: 600 }}>
        ⚠️ Amount exceeds category limit. Only ₱{calculateReimbursableAmount(
          formData.category,
          formData.total,
          parseInt(formData.number_of_people) || 1,
          parseInt(formData.number_of_days) || 1
        ).toFixed(2)} will be reimbursed.
      </Typography>
    )}
  </Box>
)}
>>>>>>> origin

                <TextField
                  label="Purpose *"
                  name="items"
                  value={formData.items}
                  onChange={handleChange}
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Purpose of the expense..."
                  error={!!errors.items}
                  helperText={
                    errors.items ||
                    "Explain the business purpose of this expense"
                  }
                />

                <TextField
                  label="Description *"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Description of this reimbursement application..."
                  error={!!errors.description}
                  helperText={errors.description}
                />

                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  size="large"
                  startIcon={<CheckCircle />}
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
                    loading ||
                    (!isInvoiceSpecialist && availableSapCodes.length === 0) ||
                    submitting
                  }
                >
                  {submitting ? "Submitting..." : "Submit for Approval"}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Backdrop Loader for Submission */}
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
            Submitting Receipt...
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
            Please wait while we process your reimbursement
          </Typography>
        </Box>
      </Backdrop>
    </>
  );
}

export default ReceiptUpload;
