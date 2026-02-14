'use client';

import React, { useState, useEffect, useCallback } from "react";
import EmployeeDataFormPage from "@/components/EmployeeDataForm/EmployeeDataFormPage";
import EmployeeDetail from "@/components/EmployeeDataForm/EmployeeDetail";
import dayjs from "dayjs";
import Box from "@mui/material/Box";
import Pagination from "@mui/material/Pagination";
import * as XLSX from "xlsx";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import LinearProgress from "@mui/material/LinearProgress";
import { columns, dateFields, PAGE_SIZE, sanitizeKey } from "@/utils/KeySanitizer";
import { Typography, Skeleton } from "@mui/material";
import { SearchIcon } from "@/assets/icons";
import { useEmployeeData } from "@/hooks/useEmployeeData";

const initialForm = columns.reduce((acc, col) => {
  if (dateFields.includes(col)) {
    acc[col] = dayjs().format("YYYY-MM-DD");
  } else {
    acc[col] = "";
  }
  return acc;
}, {} as Record<string, string>);

export default function EmployeeDataFormRoute() {
  const {
    rows,
    loading,
    saving,
    totalRows,
    fetchRows,
    dropdownOptions,
    saveEntry,
  } = useEmployeeData();

  const [form, setForm] = useState<Record<string, string>>(initialForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");

  const [blDate, setBlDate] = useState<string | null>(null);
  const [coDate, setCoDate] = useState<string | null>(null);
  const [rcvDate, setRcvDate] = useState<string | null>(null);
  const [importProgress] = useState<number | null>(null);

  // detail dialog state
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const openDetailDialog = (row: any) => {
    if (!row || !row.id) return;
    setDetailId(row.id);
    setDetailOpen(true);
  };

  const handleDetailClose = () => {
    setDetailOpen(false);
    setDetailId(null);
  };

  const handleDetailSaved = async () => {
    await fetchRows(page);
    handleDetailClose();
  };

  useEffect(() => {
    fetchRows(page, { searchText, blDate, coDate, rcvDate });
  }, [page, fetchRows, searchText, blDate, coDate, rcvDate]);

  const openAddDialog = () => {
    // Get highest job number logic could be moved to hook too, but for simplicity I'll keep it here or just auto-calculate on save
    setForm(initialForm);
    setEditIndex(null);
    setDialogOpen(true);
  };

  const openEditDialog = (row: any, idx: number) => {
    const { id, ...rowWithoutId } = row;
    const formWithDefaults = { ...initialForm, ...rowWithoutId };
    setForm(formWithDefaults);
    setEditIndex(idx);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setForm(initialForm);
    setEditIndex(null);
  };

  const handleDialogSave = async () => {
    const sanitizedForm: Record<string, any> = {};
    for (const [key, value] of Object.entries(form)) {
      if (value !== undefined) {
        const val = dateFields.includes(key) && value ? dayjs(value).format("YYYY-MM-DD") : value;
        sanitizedForm[sanitizeKey(key)] = val;
      }
    }

    const id = editIndex !== null ? (rows[editIndex].id as string) : null;
    const success = await saveEntry(id, sanitizedForm);

    if (success) {
      await fetchRows(1);
      handleDialogClose();
    }
  };

  const handleChange = (col: string, value: string) => {
    setForm({ ...form, [col]: value });
  };

  const handleExportWithTemplate = async () => {
    const response = await fetch("/assets/report.xlsx");
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    if (rows.length > 0) {
      const rowData = rows[0];
      Object.keys(rowData).forEach((key) => {
        Object.keys(worksheet).forEach((cellAddr) => {
          if (worksheet[cellAddr] && worksheet[cellAddr].v === key) {
            worksheet[cellAddr].v = rowData[key];
          }
        });
      });
    }

    XLSX.writeFile(workbook, "FilledReport.xlsx");
  };

  const quickFillForm = () => {
    const sampleData = {
      "Job": (totalRows + 1).toString(),
      "B/L No": "JSDEXP-04002/KS",
      "B/L Date": "2021-04-02",
      "Imp/Exp": "RE-EXPORT",
      "Ship'm Mode": "LAND-LCL",
      "Importer": "JI SHUN DA TRADING CO., LTD",
      "Client Name": "FULLWELL MR. KHEAMARA)",
      "Inv": "RE-KSJSD-21-0004/A",
      "PKL": "RE-KSJSD-21-0004/A",
      "INV & PKL Date": "2021-04-01",
      "POL": "SIBW",
      "Transit Port": "KREAL",
      "SCAN STATION": "KREAL",
      "Final Destination": "LAOS",
      "Commodity": "NEW CAR LAND ROVER DISCOVERY",
      "GW": "2446",
      "CBM/CIF": "",
      "Container No": "LCL",
      "Quantity": "1 UNIT",
      "20'": "0",
      "40'": "0",
      "Received Date": "2021-04-08",
      "TP DATE": dayjs().format("YYYY-MM-DD"),
      "IM8 DATE": dayjs().format("YYYY-MM-DD"),
      "Last Updated": dayjs().format("YYYY-MM-DD HH:mm:ss")
    };

    setForm(sampleData);
    setEditIndex(null);
    setDialogOpen(true);
  };

  return (
    <div className="mx-auto w-full max-w-full space-y-6">
      <div className="flex flex-col gap-6">
        {/* Header Section */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-heading-5 font-bold text-dark dark:text-white">
              Clear Port
            </h1>
            <p className="text-body-sm font-medium text-dark-5">
              Manage and track clearance employee information
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportWithTemplate}
              className="inline-flex items-center justify-center rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2 transition-all"
            >
              Export
            </button>
            <button
              onClick={quickFillForm}
              className="inline-flex items-center justify-center rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white transition-all hover:bg-opacity-90 shadow-md"
            >
              Quick Fill
            </button>
            <button
              onClick={openAddDialog}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-all hover:bg-opacity-90 shadow-md"
            >
              Add New Entry
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="rounded-[10px] border border-stroke bg-white p-4 shadow-1 dark:border-dark-3 dark:bg-gray-dark md:p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            <div className="relative">
              <span className="absolute left-4.5 top-1/2 -translate-y-1/2">
                <SearchIcon />
              </span>
              <input
                type="text"
                placeholder="Search jobs, B/L..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full rounded-lg border border-stroke bg-gray-2 py-2.5 pl-12 pr-4.5 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
              />
            </div>

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="B/L Date"
                value={blDate ? dayjs(blDate) : null}
                onChange={(date) => setBlDate(date ? date.format("YYYY-MM-DD") : null)}
                slotProps={{
                  textField: { size: "small", fullWidth: true },
                }}
              />
              <DatePicker
                label="CO Date"
                value={coDate ? dayjs(coDate) : null}
                onChange={(date) => setCoDate(date ? date.format("YYYY-MM-DD") : null)}
                slotProps={{
                  textField: { size: "small", fullWidth: true },
                }}
              />
              <DatePicker
                label="Rcv Date"
                value={rcvDate ? dayjs(rcvDate) : null}
                onChange={(date) => setRcvDate(date ? date.format("YYYY-MM-DD") : null)}
                slotProps={{
                  textField: { size: "small", fullWidth: true },
                }}
              />
            </LocalizationProvider>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSearchText("");
                  setBlDate(null);
                  setCoDate(null);
                  setRcvDate(null);
                }}
                className="w-full rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2 transition-all"
              >
                Reset Filters
              </button>
            </div>
          </div>

          {importProgress !== null && (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-dark-5">Importing data...</span>
                <span className="text-xs font-medium text-primary">{importProgress}%</span>
              </div>
              <div className="relative h-1.5 w-full rounded-full bg-stroke dark:bg-dark-3">
                <div
                  className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Data Table Section */}
        <div className="relative min-h-[400px]">
          {loading && rows.length === 0 ? (
            <div className="space-y-4">
              {[...Array(PAGE_SIZE)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={60} className="rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              <EmployeeDataFormPage
                columns={columns}
                rows={rows}
                form={form}
                dialogOpen={dialogOpen}
                editIndex={editIndex}
                openEditDialog={openEditDialog}
                openDetailDialog={openDetailDialog}
                openAddDialog={openAddDialog}
                handleDialogClose={handleDialogClose}
                handleDialogSave={handleDialogSave}
                handleChange={handleChange}
                loading={loading}
                saving={saving}
                handleExportWithTemplate={handleExportWithTemplate}
                dropdownOptions={dropdownOptions}
              />

              <EmployeeDetail
                id={detailId}
                open={detailOpen}
                onClose={handleDetailClose}
                onSaved={handleDetailSaved}
                dropdownOptions={dropdownOptions}
              />

              {/* Pagination Section */}
              <div className="mt-6 flex flex-col items-center justify-between gap-4 md:flex-row border-t border-stroke pt-6 dark:border-dark-3">
                <p className="text-sm font-medium text-dark-5">
                  Showing <span className="text-dark dark:text-white">{rows.length}</span> of{" "}
                  <span className="text-dark dark:text-white">{totalRows}</span> entries
                </p>

                {totalRows > PAGE_SIZE && (
                  <Pagination
                    count={Math.ceil(totalRows / PAGE_SIZE)}
                    page={page}
                    onChange={(_, value) => {
                      setPage(value);
                      fetchRows(value);
                    }}
                    color="primary"
                    shape="rounded"
                    size="medium"
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}