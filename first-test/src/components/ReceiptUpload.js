import { useTheme } from '@mui/material/styles';
import React, { useState, useEffect } from 'react';
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
  Alert,
} from '@mui/material';
import {
  CloudUpload,
  Image as ImageIcon,
  Delete,
  CheckCircle,
  Refresh,
} from '@mui/icons-material';

function ReceiptUpload() {
  const theme = useTheme();
  const { showNotification, user } = useAppContext();
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
    sap_code: '', // NEW: SAP code field
  });
  const [loading, setLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [errors, setErrors] = useState({});
  const [availableSapCodes, setAvailableSapCodes] = useState([]);

  const categories = [
    'Transportation (Commute)',
    'Transportation (Drive)',
    'Meal with Client',
    'Overtime Meal',
    'Accomodation',
    'Other',
  ];

  // ✅ Load user's SAP codes on mount
  useEffect(() => {
    if (user) {
      const codes = [user.sap_code_1, user.sap_code_2].filter(Boolean);
      setAvailableSapCodes(codes);
      
      // Auto-select if only one SAP code
      if (codes.length === 1) {
        setFormData(prev => ({ ...prev, sap_code: codes[0] }));
      }
    }
  }, [user]);

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
      setImagePreview(URL.createObjectURL(file));
      setExtractedText('');
      setErrors((prev) => ({ ...prev, image: '' }));
    }
  };

  const parseReceiptText = (text) => {
    const lines = text.split('\n').filter(line => line.trim());

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

    const merchant = lines[0] || '';
    const items = lines.slice(1).filter(line => !totalPatterns.some(p => p.test(line))).join('\n');

    return { total, date, merchant, items };
  };

  const handleOCR = async () => {
    if (!image) {
      showNotification('Please select an image first', 'warning');
      return;
    }

    setLoading(true);
    setOcrProgress(0);

    try {
      const result = await Tesseract.recognize(
        imagePreview,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 100));
            }
          },
        }
      );

      const text = result.data.text;
      setExtractedText(text);

      const parsed = parseReceiptText(text);
      setFormData((prev) => ({
        ...prev,
        ...parsed,
      }));

      showNotification('Text extracted successfully! Please verify the details.', 'success');
    } catch (error) {
      showNotification('OCR failed. Please try again or enter manually.', 'error');
      console.error('OCR Error:', error);
    } finally {
      setLoading(false);
      setOcrProgress(0);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateDate = (dateString) => {
    const selectedDate = new Date(dateString);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (selectedDate > today) {
      return 'Date cannot be in the future';
    }
    return '';
  };

  const validateForm = () => {
    const newErrors = {};
  
    const dateError = validateDate(formData.date);
    if (dateError) newErrors.date = dateError;

    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.total || parseFloat(formData.total) <= 0) {
      newErrors.total = 'Valid total amount is required';
    }
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.sap_code) newErrors.sap_code = 'SAP code is required'; // NEW
    if (!image) newErrors.image = 'Receipt image is required';

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

    const formDataToSend = new FormData();
    formDataToSend.append('category', formData.category);
    formDataToSend.append('type', formData.category);
    formDataToSend.append('description', formData.description);
    formDataToSend.append('items', formData.items);
    formDataToSend.append('total', parseFloat(formData.total));
    formDataToSend.append('merchant', formData.merchant);
    formDataToSend.append('date_of_expense', formData.date);
    formDataToSend.append('sap_code', formData.sap_code); // NEW
    
    if (image) formDataToSend.append('receipt', image);

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/reimbursements`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
        body: formDataToSend,
        credentials: 'include',
      });

      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();

      showNotification('Reimbursement submitted successfully!', 'success');
      console.log('Created reimbursement:', data);

      // Reset fields
      setFormData({
        date: new Date().toISOString().split('T')[0],
        items: '',
        total: '',
        description: '',
        category: 'Meal with Client',
        merchant: '',
        sap_code: availableSapCodes.length === 1 ? availableSapCodes[0] : '',
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

  const handleClearImage = () => {
    setImage(null);
    setImagePreview(null);
    setExtractedText('');
    setErrors((prev) => ({ ...prev, image: '' }));
  };

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
          Upload Receipt for Reimbursement
        </Typography>

        {/* SAP Code Alert */}
        {availableSapCodes.length === 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            No SAP codes assigned to your account. Please contact your administrator.
          </Alert>
        )}

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
                  <CloudUpload sx={{ 
                    fontSize: 64, 
                    color: theme.palette.mode === 'dark' ? theme.palette.primary.light : '#00387e', 
                    mb: 2 
                  }} />
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
              {/* NEW: SAP Code Selector */}
              <TextField
                select
                label="SAP Code *"
                name="sap_code"
                value={formData.sap_code}
                onChange={handleChange}
                fullWidth
                error={!!errors.sap_code}
                helperText={errors.sap_code || 'Select the department/project for this expense'}
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
                    '& input[type="date"]::-webkit-calendar-picker-indicator': {
                      filter: theme.palette.mode === 'dark' ? 'invert(1)' : 'none'
                    }
                  }
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
                label="Purpose *"
                name="description"
                value={formData.description}
                onChange={handleChange}
                fullWidth
                multiline
                rows={3}
                placeholder="Purpose of the expense..."
                error={!!errors.description}
                helperText={errors.description || 'Explain the business purpose of this expense'}
              />

              <TextField
                label="Description *"
                name="items"
                value={formData.items}
                onChange={handleChange}
                fullWidth
                multiline
                rows={3}
                placeholder="Description of this reimbursement application..."
              />

              <Button
                variant="contained"
                onClick={handleSubmit}
                size="large"
                startIcon={<CheckCircle />}
                sx={{
                  py: 1.5,
                  fontWeight: 600,
                  bgcolor: '#2e7d32',
                  color: '#fafafa',
                  '&:hover': {
                    bgcolor: '#1b5e20',
                  },
                  '&:disabled': {
                    bgcolor: 'action.disabledBackground',
                    color: 'action.disabled',
                  },
                }}
                disabled={loading || availableSapCodes.length === 0}
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