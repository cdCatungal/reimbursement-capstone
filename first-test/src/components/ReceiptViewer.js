import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import { Close, ZoomIn, ZoomOut, Download } from '@mui/icons-material';

/**
 * ReceiptViewer Component
 * Displays receipt images stored as base64 in database
 * 
 * Props:
 * - receipt: { data: base64String, mimetype: string, filename: string } | null
 * - open: boolean
 * - onClose: function
 */
function ReceiptViewer({ receipt, open, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));

  const handleDownload = () => {
    if (!receipt) return;

    try {
      // Convert base64 to blob and download
      const byteCharacters = atob(receipt.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: receipt.mimetype });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = receipt.filename || 'receipt.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleClose = () => {
    setZoom(1);
    setLoading(true);
    onClose();
  };

  if (!receipt) return null;

  // Create data URL from base64
  const imageUrl = `data:${receipt.mimetype};base64,${receipt.data}`;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Receipt: {receipt.filename || 'Image'}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={handleZoomOut} disabled={zoom <= 0.5}>
            <ZoomOut />
          </IconButton>
          <IconButton onClick={handleZoomIn} disabled={zoom >= 3}>
            <ZoomIn />
          </IconButton>
          <IconButton onClick={handleDownload} title="Download Receipt">
            <Download />
          </IconButton>
          <IconButton onClick={handleClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'auto',
          position: 'relative',
          bgcolor: 'action.hover',
          minHeight: 400,
        }}
      >
        {loading && (
          <CircularProgress
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
        )}
        <img
          src={imageUrl}
          alt="Receipt"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            transform: `scale(${zoom})`,
            transition: 'transform 0.2s ease-in-out',
            display: loading ? 'none' : 'block',
          }}
          onLoad={() => setLoading(false)}
          onError={(e) => {
            console.error('Failed to load receipt image');
            setLoading(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export default ReceiptViewer;