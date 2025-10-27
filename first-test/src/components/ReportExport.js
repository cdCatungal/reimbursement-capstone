import React, { useEffect, useState } from "react";
import {
  Button,
  Typography,
  Card,
  CardContent,
  Box,
  TextField,
  MenuItem,
  Grid,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { Download, Preview, Description } from "@mui/icons-material";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { useAdminStore } from "../store/useAdminStore";
// import { data } from "react-router-dom";

function ReportExport() {
  const { getReport, reportData, resetReportData } = useAdminStore();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    resetReportData();
  }, []);

  const filterData = () => {
    if (!Array.isArray(reportData)) return [];

    return reportData.filter((item) => {
      // Only filter by status, NOT by date
      const statusMatch =
        statusFilter === "All" || item.status === statusFilter;

      return statusMatch; // ✅ Only status filtering
    });
  };

  const exportToExcel = async () => {
    const filteredData = filterData();

    if (filteredData.length === 0) {
      alert("No data to export with current filters");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Reimbursement Report");

    // Set column definitions
    worksheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "User", key: "user", width: 20 },
      { header: "Category", key: "category", width: 20 },
      { header: "Description", key: "description", width: 40 },
      { header: "Amount (₱)", key: "amount", width: 15 },
      { header: "Status", key: "status", width: 15 },
      { header: "Submitted", key: "submitted", width: 20 },
      { header: "Approved By", key: "approvedBy", width: 20 },
    ];

    // Add data rows
    filteredData.forEach((item) => {
      worksheet.addRow({
        date: item.createdAt || "N/A",
        user: item.user.name || "Unknown",
        category: item.category || item.type || "N/A",
        description: item.description || "N/A",
        amount: parseFloat(item.total).toFixed(2),
        status: item.status,
        submitted: new Date(item.submittedAt).toLocaleDateString(),
        approvedBy: item.approvedBy || "N/A",
      });
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF667eea" },
    };
    worksheet.getRow(1).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    worksheet.getRow(1).height = 25;

    // Add borders to all cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        if (rowNumber > 1) {
          cell.alignment = { vertical: "middle" };
        }
      });
    });

    // Add summary row
    const summaryRow = worksheet.addRow([]);
    summaryRow.getCell(1).value = "SUMMARY";
    summaryRow.getCell(1).font = { bold: true, size: 12 };
    summaryRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF5F7FA" },
    };

    // Calculate totals
    const totalAmount = filteredData.reduce(
      (sum, item) => sum + parseFloat(item.total),
      0
    );
    const approvedAmount = filteredData
      .filter((item) => item.status === "Approved")
      .reduce((sum, item) => sum + parseFloat(item.total), 0);

    worksheet.addRow(["Total Requests:", filteredData.length]);
    worksheet.addRow([
      "Pending:",
      filteredData.filter((item) => item.status === "Pending").length,
    ]);
    worksheet.addRow([
      "Approved:",
      filteredData.filter((item) => item.status === "Approved").length,
    ]);
    worksheet.addRow([
      "Rejected:",
      filteredData.filter((item) => item.status === "Rejected").length,
    ]);
    worksheet.addRow(["Total Amount:", `₱${totalAmount.toFixed(2)}`]);
    worksheet.addRow(["Approved Amount:", `₱${approvedAmount.toFixed(2)}`]);

    // Generate and save file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const filename = `reimbursement_report_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    saveAs(blob, filename);
  };

  const filteredData = filterData();
  const stats = {
    total: filteredData.length,
    pending: filteredData.filter((item) => item.status === "Pending").length,
    approved: filteredData.filter((item) => item.status === "Approved").length,
    rejected: filteredData.filter((item) => item.status === "Rejected").length,
    totalAmount: filteredData.reduce(
      (sum, item) => sum + parseFloat(item.total),
      0
    ),
    approvedAmount: filteredData
      .filter((item) => item.status === "Approved")
      .reduce((sum, item) => sum + parseFloat(item.total), 0),
  };

  const handlefilterReports = (dataStart, dataEnd) => {
    setStartDate(dataStart);
    setEndDate(dataEnd);
    getReport({ start: dataStart, end: dataEnd });
  };

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          <Description sx={{ fontSize: 32, color: "primary.main", mr: 2 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Export Summary Reports
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Generate detailed Excel reports with filters
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              // onChange={(e) => setStartDate(e.target.value)}
              onChange={(e) => handlefilterReports(e.target.value, endDate)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              // onChange={(e) => setEndDate(e.target.value)}
              onChange={(e) => handlefilterReports(startDate, e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              select
              label="Status Filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              fullWidth
            >
              <MenuItem value="All">All Statuses</MenuItem>
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="Approved">Approved</MenuItem>
              <MenuItem value="Rejected">Rejected</MenuItem>
            </TextField>
          </Grid>
        </Grid>

        {/* Summary Statistics */}
        <Paper sx={{ p: 2, mt: 3, bgcolor: "action.hover" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
            Report Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: "bold", color: "primary.main" }}
                >
                  {stats.total}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Records
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: "bold", color: "warning.main" }}
                >
                  {stats.pending}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Pending
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: "bold", color: "success.main" }}
                >
                  {stats.approved}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Approved
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: "bold", color: "error.main" }}
                >
                  {stats.rejected}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Rejected
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box
                sx={{
                  textAlign: "center",
                  pt: 2,
                  borderTop: 1,
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ fontWeight: "bold", color: "secondary.main" }}
                >
                  ₱{stats.totalAmount.toFixed(2)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Amount
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box
                sx={{
                  textAlign: "center",
                  pt: 2,
                  borderTop: 1,
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ fontWeight: "bold", color: "success.main" }}
                >
                  ₱{stats.approvedAmount.toFixed(2)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Approved Amount
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Action Buttons */}
        <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
          <Button
            variant="contained"
            color="success"
            startIcon={<Download />}
            onClick={exportToExcel}
            disabled={filteredData.length === 0}
            sx={{ flex: 1 }}
          >
            Export to Excel ({stats.total} records)
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<Preview />}
            onClick={() => setShowPreview(!showPreview)}
            disabled={filteredData.length === 0}
          >
            {showPreview ? "Hide Preview" : "Preview Data"}
          </Button>
        </Box>

        {/* Preview Table */}
        {showPreview && filteredData.length > 0 && (
          <TableContainer component={Paper} sx={{ mt: 3, maxHeight: 400 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                    }}
                  >
                    Date
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                    }}
                  >
                    User
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                    }}
                  >
                    Category
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                    }}
                  >
                    Description
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                    }}
                    align="right"
                  >
                    Amount
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                    }}
                  >
                    Status
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData.slice(0, 10).map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>{item.createdAt || "N/A"}</TableCell>
                    <TableCell>{item.user.name || "Unknown"}</TableCell>
                    <TableCell>{item.category || item.type || "N/A"}</TableCell>
                    <TableCell>
                      {item.description?.substring(0, 50)}
                      {item.description?.length > 50 ? "..." : ""}
                    </TableCell>
                    <TableCell align="right">
                      ₱{parseFloat(item.total).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.status}
                        size="small"
                        color={
                          item.status === "Approved"
                            ? "success"
                            : item.status === "Pending"
                            ? "warning"
                            : "error"
                        }
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredData.length > 10 && (
              <Box sx={{ p: 2, textAlign: "center", bgcolor: "action.hover" }}>
                <Typography variant="caption" color="text.secondary">
                  Showing first 10 of {filteredData.length} records. Export to
                  see all data.
                </Typography>
              </Box>
            )}
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}

export default ReportExport;
