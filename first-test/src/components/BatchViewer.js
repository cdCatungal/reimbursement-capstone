// Create new file: src/components/BatchViewer.js

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Chip,
  Paper,
  IconButton,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  ExpandMore,
  ExpandLess,
  Receipt as ReceiptIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";

function BatchViewer({ batchCode, currentReimbursementId, onViewReceipt }) {
  const [expanded, setExpanded] = useState(false);
  const [batchReimbursements, setBatchReimbursements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (batchCode) {
      fetchBatchReimbursements();
    }
  }, [batchCode]);

  const fetchBatchReimbursements = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/reimbursements/batch/${batchCode}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch batch reimbursements");
      }

      const data = await response.json();
      setBatchReimbursements(data);
    } catch (err) {
      console.error("Error fetching batch:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!batchCode) return null;

  const batchCount = batchReimbursements.length || "?";
  const totalAmount = batchReimbursements.reduce(
    (sum, r) => sum + parseFloat(r.total || 0),
    0,
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "warning";
      case "Approved":
        return "success";
      case "Rejected":
        return "error";
      default:
        return "default";
    }
  };

  return (
    <Paper
      sx={{
        p: 2,
        border: 1,
        borderColor: "primary.main",
        bgcolor: "primary.50",
        mb: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <ReceiptIcon color="primary" />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Batch Submission
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {batchCode}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Chip
            label={`${batchCount} Receipt${batchCount !== 1 ? "s" : ""}`}
            color="primary"
            size="small"
            sx={{ fontWeight: 600 }}
          />
          <IconButton size="small">
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ mt: 2 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mt: 1 }}>
              {error}
            </Alert>
          ) : batchReimbursements.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: "center", p: 2 }}
            >
              No other receipts in this batch
            </Typography>
          ) : (
            <>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                All Receipts in This Batch:
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Merchant</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {batchReimbursements.map((reimbursement) => (
                    <TableRow
                      key={reimbursement.id}
                      sx={{
                        bgcolor:
                          reimbursement.id === currentReimbursementId
                            ? "action.selected"
                            : "transparent",
                      }}
                    >
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight:
                              reimbursement.id === currentReimbursementId
                                ? 700
                                : 400,
                          }}
                        >
                          #{reimbursement.id}
                          {reimbursement.id === currentReimbursementId && (
                            <Chip
                              label="Current"
                              size="small"
                              color="primary"
                              sx={{ ml: 1, height: 20 }}
                            />
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {reimbursement.merchant || "N/A"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          ₱
                          {parseFloat(reimbursement.total).toLocaleString(
                            "en-PH",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={reimbursement.status}
                          size="small"
                          color={getStatusColor(reimbursement.status)}
                        />
                      </TableCell>
                      <TableCell>
                        {reimbursement.id !== currentReimbursementId && (
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewReceipt(reimbursement);
                            }}
                            title="View This Receipt"
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Box
                sx={{
                  mt: 2,
                  pt: 2,
                  borderTop: 1,
                  borderColor: "divider",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Batch Total:
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, color: "primary.main" }}
                >
                  ₱
                  {totalAmount.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}

export default BatchViewer;
