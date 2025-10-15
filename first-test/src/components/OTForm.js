import React, { useState } from 'react';
import { 
  Button, 
  Typography, 
  TextField, 
  Card, 
  CardContent, 
  Box,
  Grid,
} from '@mui/material';
import { AccessTime, Send } from '@mui/icons-material';
import { useAppContext } from '../App';

function OTForm() {
  const { addReimbursement, showNotification, user } = useAppContext();
  const [formData, setFormData] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    hours: '', 
    description: '' 
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.hours || parseFloat(formData.hours) <= 0) {
      newErrors.hours = 'Valid hours are required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!user) {
      showNotification('User not authenticated. Please log in.', 'error');
      return;
    }

    if (!validateForm()) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    const otAmount = parseFloat(formData.hours) * 50;
    
    const otRequest = {
      userId: user.uid,
      type: 'OT',
      category: 'Overtime',
      total: otAmount,
      description: formData.description,
      date: formData.date,
      hours: parseFloat(formData.hours),
      status: 'Pending',
      submittedAt: new Date().toISOString(),
    };

    addReimbursement(otRequest);
    showNotification('OT request submitted successfully!', 'success');

    // Reset form
    setFormData({
      date: new Date().toISOString().split('T')[0],
      hours: '',
      description: '',
    });
    setErrors({});
  };

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <AccessTime sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              Overtime Request Form
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Submit your overtime hours for approval
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Date *"
              name="date"
              type="date"
              value={formData.date}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              InputLabelProps={{ shrink: true }}
              error={!!errors.date}
              helperText={errors.date}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Hours *"
              name="hours"
              type="number"
              value={formData.hours}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              inputProps={{ step: '0.5', min: '0' }}
              placeholder="e.g., 2.5"
              error={!!errors.hours}
              helperText={errors.hours || 'Enter overtime hours worked'}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Description/Reason *"
              name="description"
              value={formData.description}
              onChange={handleChange}
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              placeholder="Explain the reason for overtime (e.g., project deadline, urgent task, etc.)"
              error={!!errors.description}
              helperText={errors.description || 'Provide details about the overtime work'}
            />
          </Grid>

          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              size="large"
              fullWidth
              startIcon={<Send />}
              sx={{
                py: 1.5,
                fontWeight: 600,
              }}
            >
              Submit for Approval
            </Button>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Note:</strong> Your overtime request will be reviewed by your manager. 
            You will receive a notification once it's approved or if additional information is needed.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default OTForm;