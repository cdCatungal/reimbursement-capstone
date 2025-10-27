import React, { useState } from 'react';
import Tesseract from 'tesseract.js';
import { useAppContext } from '../App';
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
} from '@mui/material';
import {
  CloudUpload,
  Image as ImageIcon,
  Delete,
  CheckCircle,
  Refresh,
} from '@mui/icons-material';

function ReceiptUpload() {
  const { showNotification, user } = useAppContext(); // ⬅️ Add user from context
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    items: '',
    total: '',
    description: '',
    category: 'Meal with Client',
    merchant: '',
  });
  const [loading, setLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [errors, setErrors] = useState({});

  // Categories for the dropdown
  const categories = [
    'Transportation (Commute)',
    'Transportation (Drive)',
    'Meal with Client',
    'Overtime Meal',
    'Accomodation',
    'Other',
  ];

  // Handle image selection and validation
const handleImageChange = (e) => {
  const file = e.target.files[0];
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      showNotification('File size must be less than 5MB', 'error');
      return;
    }
    if (!file.type.startsWith('image/')) {
      showNotification('Please upload an image file', 'error');
      return;
    }

    setImage(file);
    setExtractedText('');
    setErrors((prev) => ({ ...prev, image: '' }));

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const scaleFactor = 2.5;
        canvas.width = img.width * scaleFactor;
        canvas.height = img.height * scaleFactor;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const processedUrl = canvas.toDataURL('image/png');
        setImagePreview(processedUrl);
      };
    };

    reader.readAsDataURL(file);
  }
};



  // Parse OCR-extracted text to extract relevant fields
  const parseReceiptText = (text) => {
    const lines = text.split('\n').filter(line => line.trim());

    // Extract total using multiple patterns
    const totalPatterns = [
      /total[:\s]*₱?\s*(\d+\.?\d*)/i,
      /amount[:\s]*₱?\s*(\d+\.?\d*)/i,
      /grand\s+total[:\s]*₱?\s*(\d+\.?\d*)/i,
      /₱\s*(\d+\.?\d*)\s*$/m,
    ];
    let total = '';
    for (const pattern of totalPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        total = parseFloat(match[1]).toFixed(2);
        break;
      }
    }

    // Extract date
    const datePattern = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/;
    const dateMatch = text.match(datePattern);
    let date = formData.date;
    if (dateMatch) {
      try {
        const parsedDate = new Date(dateMatch[1]);
        if (!isNaN(parsedDate.getTime())) {
          date = parsedDate.toISOString().split('T')[0];
        }
      } catch (e) {
        console.warn('Invalid date format in receipt:', dateMatch[1]);
      }
    }

    // Extract merchant (first non-empty line as fallback)
    const merchant = lines[0] || '';

    // Extract items (join non-empty lines after merchant)
    const items = lines.slice(1).filter(line => !totalPatterns.some(p => p.test(line))).join('\n');

    return { total, date, merchant, items };
  };

  // Perform OCR on the uploaded image
  // Perform OCR using backend instead of browser
const handleOCR = async () => {
  if (!image) {
    showNotification('Please select an image first', 'warning');
    return;
  }

  setLoading(true);

  try {
    const formDataToSend = new FormData();
    formDataToSend.append('image', image);

    const res = await fetch(`${process.env.REACT_APP_API_URL}/api/ocr/structured`, {
      method: 'POST',
      body: formDataToSend,
      credentials: 'include',
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'OCR failed');

    // Save both raw and structured
    setExtractedText(data.cleanedText || data.rawText);

    if (data.structured) {
      setFormData((prev) => ({
        ...prev,
        date: data.structured.date || prev.date,
        total: data.structured.total || prev.total,
        merchant: data.structured.merchant || prev.merchant,
        items: data.structured.items || prev.items,
      }));
    }

    showNotification('AI OCR extracted receipt details successfully!', 'success');
  } catch (error) {
    console.error(error);
    showNotification('OCR failed. Please try again.', 'error');
  } finally {
    setLoading(false);
  }
};



  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Validate form before submission
  const validateForm = () => {
    const newErrors = {};
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.total || parseFloat(formData.total) <= 0) {
      newErrors.total = 'Valid total amount is required';
    }
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!image) newErrors.image = 'Receipt image is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit reimbursement request
  const handleSubmit = async () => {
    if (!validateForm()) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    if (!user) { // ⬅️ Check if user is authenticated
      showNotification('Please log in first', 'error');
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('category', formData.category);
    formDataToSend.append('type', formData.category);
    formDataToSend.append('description', formData.description);
    formDataToSend.append('total', parseFloat(formData.total));
    if (image) formDataToSend.append('receipt', image);

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/reimbursements`, { // ⬅️ Use env variable
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`, // ⬅️ Add authorization header
        },
        body: formDataToSend,
        credentials: 'include',
      });

      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();

      showNotification('Reimbursement submitted successfully!', 'success');
      console.log('Created reimbursement:', data);

      // ✅ Reset all fields after successful submission
      setFormData({
        date: new Date().toISOString().split('T')[0],
        items: '',
        total: '',
        description: '',
        category: 'Transportation (Drive)',
        merchant: '',
      });
      setImage(null);
      setImagePreview(null);
      setExtractedText('');
      setErrors({});
    } catch (err) {
      console.error('Error submitting reimbursement:', err);
      showNotification('Failed to submit reimbursement', 'error');
    }
  };

  // Clear uploaded image
  const handleClearImage = () => {
    setImage(null);
    setImagePreview(null);
    setExtractedText('');
    setErrors((prev) => ({ ...prev, image: '' }));
  };

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
          Upload Receipt for Reimbursement
        </Typography>

        <Grid container spacing={3}>
          {/* Image Upload Section */}
          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                p: 3,
                border: 2,
                borderStyle: 'dashed',
                borderColor: errors.image ? 'error.main' : 'divider',
                borderRadius: 2,
                textAlign: 'center',
                bgcolor: 'action.hover',
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.selected',
                },
              }}
            >
              {imagePreview ? (
                <Box>
                  <Box sx={{ position: 'relative', mb: 2 }}>
                    <img
                      src={imagePreview}
                      alt="Receipt preview"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '400px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                      onError={() => showNotification('Failed to load image preview', 'error')}
                    />
                    <IconButton
                      onClick={handleClearImage}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        bgcolor: 'background.paper',
                        '&:hover': { bgcolor: 'background.default' },
                      }}
                    >
                      <Delete color="error" />
                    </IconButton>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <Button
                      variant="contained"
                      startIcon={loading ? <Refresh /> : <ImageIcon />}
                      onClick={handleOCR}
                      disabled={loading}
                      color="primary"
                    >
                      {loading ? 'Processing...' : 'Extract Text (OCR)'}
                    </Button>
                  </Box>
                  {loading && (
                    <Box sx={{ mt: 2 }}>
                      <LinearProgress variant="determinate" value={ocrProgress} />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                        {ocrProgress}% Complete
                      </Typography>
                    </Box>
                  )}
                </Box>
              ) : (
                <label htmlFor="receipt-upload" style={{ cursor: 'pointer', display: 'block' }}>
                  <input
                    id="receipt-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  <CloudUpload sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Click to Upload Receipt
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Supported formats: JPG, PNG, JPEG (Max 5MB)
                  </Typography>
                </label>
              )}
              {errors.image && (
                <Typography variant="caption" sx={{ color: 'error.main', mt: 1, display: 'block' }}>
                  {errors.image}
                </Typography>
              )}
            </Paper>

            {extractedText && (
              <Paper sx={{ mt: 2, p: 2, bgcolor: 'action.hover' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Extracted Text:
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    maxHeight: 150,
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                  }}
                >
                  {extractedText}
                </Typography>
              </Paper>
            )}
          </Grid>

          {/* Form Section */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
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

              <TextField
                label="Items/Details"
                name="items"
                value={formData.items}
                onChange={handleChange}
                fullWidth
                multiline
                rows={3}
                placeholder="List of items purchased..."
              />

              <TextField
                label="Description/Purpose *"
                name="description"
                value={formData.description}
                onChange={handleChange}
                fullWidth
                multiline
                rows={3}
                placeholder="Brief description of the expense purpose..."
                error={!!errors.description}
                helperText={errors.description || 'Explain the business purpose of this expense'}
              />

              <Button
                variant="contained"
                color="success"
                onClick={handleSubmit}
                size="large"
                startIcon={<CheckCircle />}
                sx={{
                  py: 1.5,
                  fontWeight: 600,
                }}
                disabled={loading}
              >
                Submit for Approval
              </Button>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

export default ReceiptUpload;