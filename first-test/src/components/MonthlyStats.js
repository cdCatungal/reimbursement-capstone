import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useAppContext } from '../App';

function MonthlyStats() {
  const [stats, setStats] = useState({
    approved: 0,
    pending: 0,
    rejected: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const { showNotification } = useAppContext();

  useEffect(() => {
    fetchMonthlyStats();
  }, []);

  const fetchMonthlyStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/reimbursements/monthly-stats', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        showNotification('Failed to fetch monthly stats', 'error');
      }
    } catch (error) {
      console.error('Error fetching monthly stats:', error);
      showNotification('Error loading stats', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 120
      }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        mx: 2,
        mb: 2,
        p: 2.5,
        borderRadius: 3,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        boxShadow: 1
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            fontWeight: 600,
            fontSize: '1rem'
          }}
        >
          This Month
        </Typography>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: 'success.main'
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Approved
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              fontWeight: 600,
              color: 'success.main'
            }}
          >
            {stats.approved}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Pending
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              fontWeight: 600,
              color: 'warning.main'
            }}
          >
            {stats.pending}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Rejected
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              fontWeight: 600,
              color: 'error.main'
            }}
          >
            {stats.rejected}
          </Typography>
        </Box>

        <Box 
          sx={{ 
            pt: 1.5, 
            mt: 1, 
            borderTop: 1, 
            borderColor: 'divider',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}
        >
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Total
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {stats.total}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default MonthlyStats;