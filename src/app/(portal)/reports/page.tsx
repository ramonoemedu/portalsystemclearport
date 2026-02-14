'use client';

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Pagination,
  useMediaQuery,
  useTheme,
  TableContainer,
  Checkbox,
  CircularProgress,
  Paper,
} from "@mui/material";
import TextField from "@mui/material/TextField";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import SortIcon from "@mui/icons-material/Sort";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  writeBatch,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { sanitizeKey, columns, unsanitizeKey } from "@/utils/KeySanitizer";
import {
  createExcelBlobFromRows,
  uploadBlobToGoogleDrive,
} from "@/components/Report/ReportFuntion";

const PAGE_SIZE = 20;

export default function ReportsRoute() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const router = useRouter();

  const [rows, setRows] = useState<Record<string, string | number>[]>([]);
  const [displayedRows, setDisplayedRows] = useState<Record<string, any>[]>([]);
  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [cursors, setCursors] = useState<(QueryDocumentSnapshot<DocumentData> | null)[]>([null]);
  const [searchText, setSearchText] = useState("");
  const [blDate, setBlDate] = useState<string | null>(null);
  const [coDate, setCoDate] = useState<string | null>(null);
  const [rcvDate, setRcvDate] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filteredRows, setFilteredRows] = useState(rows);
  const [jobsConverted, setJobsConverted] = useState(false);

  const convertJobs = useCallback(async () => {
    if (jobsConverted) return;
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "employeeData"));
      let updatedCount = 0;
      setTotalRows(snapshot.size);
      const batch = writeBatch(db);

      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        const jobKey = sanitizeKey("Job");

        if (
          data[jobKey] &&
          typeof data[jobKey] === "string" &&
          !isNaN(Number(data[jobKey]))
        ) {
          batch.update(doc(db, "employeeData", docSnapshot.id), {
            [jobKey]: Number(data[jobKey]),
          });
          updatedCount++;
        }
        if (updatedCount > 0 && updatedCount % 500 === 0) {
          await batch.commit();
        }
      }

      if (updatedCount % 500 !== 0 && updatedCount > 0) {
        await batch.commit();
      }
      setJobsConverted(true);
    } catch (err) {
      console.error("Error converting jobs:", err);
    } finally {
      setLoading(false);
    }
  }, [jobsConverted]);

  useEffect(() => {
    convertJobs();
  }, [convertJobs]);

  const fetchRows = useCallback(
    async (pageNumber: number) => {
      setLoading(true);
      try {
        let q = query(
          collection(db, "employeeData"),
          orderBy(sanitizeKey("Job"), "desc"),
          limit(PAGE_SIZE)
        );

        const cursor = cursors[pageNumber - 1];
        if (cursor) {
          q = query(
            collection(db, "employeeData"),
            orderBy(sanitizeKey("Job"), "desc"),
            startAfter(cursor),
            limit(PAGE_SIZE)
          );
        }

        const snapshot = await getDocs(q);

        const data = snapshot.docs.map((doc) => {
          const raw = doc.data();
          const mapped: { id: string;[key: string]: any } = { id: doc.id };
          for (const key of Object.keys(raw)) {
            mapped[unsanitizeKey(key)] = raw[key];
          }
          return mapped;
        });

        setRows(data);

        if (!cursors[pageNumber]) {
          setCursors((prev) => {
            const updated = [...prev];
            updated[pageNumber] = snapshot.docs[snapshot.docs.length - 1] ?? null;
            return updated;
          });
        }
      } catch (err) {
        console.error("Error fetching employee data:", err);
      } finally {
        setLoading(false);
      }
    },
    [cursors]
  );

  useEffect(() => {
    fetchRows(page);
  }, [page, fetchRows]);

  const computedDisplayedRows = useMemo(() => {
    let filtered = [...rows];

    if (searchText) {
      const s = searchText.toLowerCase();
      filtered = filtered.filter((row) =>
        columns.some((col) =>
          String(row[col] ?? "")
            .toLowerCase()
            .includes(s)
        )
      );
    }

    if (blDate) {
      filtered = filtered.filter((row) => row["B/L Date"] === blDate);
    }
    if (coDate) {
      filtered = filtered.filter((row) => row["CO Date"] === coDate);
    }
    if (rcvDate) {
      filtered = filtered.filter((row) => row["Rcv Date"] === rcvDate);
    }
    setFilteredRows(filtered);
    return filtered;
  }, [rows, searchText, blDate, coDate, rcvDate]);

  useEffect(() => {
    setDisplayedRows(computedDisplayedRows);
    setTotalRows((prev) => Math.max(prev, computedDisplayedRows.length));
  }, [computedDisplayedRows]);

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id)));
  };

  const handleSelectAllCurrentPage = (checked: boolean) => {
    if (checked) {
      const ids = displayedRows.map((r) => r.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
    } else {
      const ids = new Set(displayedRows.map((r) => r.id));
      setSelectedIds((prev) => prev.filter((id) => !ids.has(id)));
    }
  };

  const handleExportNewExcel = () => {
    if (selectedIds.length === 0) {
      alert("Please select at least one row to export.");
      return;
    }
    const exportRows = displayedRows.filter((r) => selectedIds.includes(r.id));
    const blob = createExcelBlobFromRows(exportRows, columns);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ExportedData.xlsx";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportToGoogleDrive = async () => {
    if (selectedIds.length === 0) {
      alert("Please select at least one row to export.");
      return;
    }
    setLoading(true);
    try {
      const exportRows = displayedRows.filter((r) => selectedIds.includes(r.id));
      const blob = createExcelBlobFromRows(exportRows, columns);
      await uploadBlobToGoogleDrive(
        blob,
        "1.Clearance Follow Up SAMPLE.xlsx",
        "756046169704-piuq4qipnshpv1bqe2jt4327pisccbvv.apps.googleusercontent.com"
      );
      alert('File uploaded to Google Drive as "1.Clearance Follow Up SAMPLE.xlsx"');
    } catch (err: any) {
      console.error(err);
      alert("Export/upload failed: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (row: Record<string, any>) => {
    if (row.id) router.push(`/customs-form/${row.id}`);
  };

  const handleSort = (field: string) => {
    if (sortField === field) setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDirection("asc");
    }
    setPage(1);
    setCursors([null]);
  };

  return (
    <Box sx={{ maxWidth: "100%", mx: "auto", position: "relative" }}>
      <Paper sx={{ mb: 4, p: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
            Shipment Records
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" onClick={handleExportNewExcel} disabled={selectedIds.length === 0}>
              Download Excel
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleExportToGoogleDrive}
              disabled={selectedIds.length === 0}
            >
              Save to Google Drive
            </Button>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 2 }}>
          <Box sx={{ flexGrow: 1, minWidth: "200px", maxWidth: isMobile ? "100%" : "220px" }}>
            <TextField
              label="Search Records"
              variant="outlined"
              size="small"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              fullWidth
            />
          </Box>

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ flexGrow: 1, minWidth: "200px", maxWidth: isMobile ? "100%" : "220px" }}>
              <DatePicker
                label="B/L Date"
                value={blDate ? dayjs(blDate) : null}
                onChange={(date) => setBlDate(date ? date.format("YYYY-MM-DD") : null)}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </Box>
            <Box sx={{ flexGrow: 1, minWidth: "200px", maxWidth: isMobile ? "100%" : "220px" }}>
              <DatePicker
                label="CO Date"
                value={coDate ? dayjs(coDate) : null}
                onChange={(date) => setCoDate(date ? date.format("YYYY-MM-DD") : null)}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </Box>
            <Box sx={{ flexGrow: 1, minWidth: "200px", maxWidth: isMobile ? "100%" : "220px" }}>
              <DatePicker
                label="Rcv Date"
                value={rcvDate ? dayjs(rcvDate) : null}
                onChange={(date) => setRcvDate(date ? date.format("YYYY-MM-DD") : null)}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </Box>
          </LocalizationProvider>

          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              onClick={() => {
                setSearchText("");
                setBlDate(null);
                setCoDate(null);
                setRcvDate(null);
              }}
            >
              Clear Filters
            </Button>
          </Box>
        </Box>

        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={filteredRows.length > 0 && filteredRows.every((r) => selectedIds.includes(String(r.id)))}
                    onChange={(e) => handleSelectAllCurrentPage(e.target.checked)}
                    indeterminate={selectedIds.length > 0 && !displayedRows.every((r) => selectedIds.includes(String(r.id)))}
                  />
                </TableCell>

                {columns.map((col, colIndex) => (
                  <TableCell
                    key={`${col}-${colIndex}`}
                    onClick={() => handleSort(col)}
                    sx={{
                      fontWeight: 700,
                      bgcolor: "#f5f5f5",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      maxWidth: 120,
                      minWidth: 80,
                      fontSize: 13,
                      cursor: 'pointer',
                      ...(col === "B/L No" ||
                        col === "Quantity" ||
                        col === "CBM/CIF" ||
                        col === "20'" ||
                        col === "40'" ||
                        col === "CONT SIZE"
                        ? { textAlign: "right" }
                        : { textAlign: "left" }),
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      {col}
                      {sortField === col && (
                        <SortIcon
                          fontSize="small"
                          sx={{
                            ml: 0.5,
                            transform: sortDirection === "desc" ? "rotate(180deg)" : "none",
                            fontSize: "16px",
                            opacity: 0.7,
                          }}
                        />
                      )}
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {displayedRows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => handleRowClick(row)}
                  sx={{ cursor: "pointer", "&:hover": { backgroundColor: "#f9f9fb" } }}
                >
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(row.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelect(row.id, e.target.checked);
                      }}
                    />
                  </TableCell>

                  {columns.map((col) => (
                    <TableCell key={col} sx={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: 120 }}>
                      {row[col]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}

              {displayedRows.length === 0 && !loading && (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + 1}
                    sx={{ textAlign: "center", py: 3 }}
                  >
                    <Typography variant="body2">No records found</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          {totalRows > PAGE_SIZE && (
            <Pagination
              count={Math.ceil(totalRows / PAGE_SIZE)}
              page={page}
              onChange={(_, value) => {
                setPage(value);
                fetchRows(value);
              }}
              color="primary"
            />
          )}
        </Box>
      </Paper>

      {loading && (
        <Box
          sx={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: 'column',
            alignItems: "center",
            gap: 1,
            bgcolor: 'rgba(255,255,255,0.8)',
            p: 3,
            borderRadius: 2,
            boxShadow: 3,
            zIndex: 9999
          }}
        >
          <CircularProgress />
          <Typography variant="body2">Loading...</Typography>
        </Box>
      )}
    </Box>
  );
}
