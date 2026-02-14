'use client';

import React from "react";
import {
  IconButton,
  Tooltip,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import InventoryIcon from '@mui/icons-material/Inventory';
import DescriptionIcon from '@mui/icons-material/Description';
import CloseIcon from '@mui/icons-material/Close';

import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

import { dateFields } from "@/utils/KeySanitizer";
import { EmployeeDataTable } from "./EmployeeDataTable";
import { cn } from "@/lib/NextAdmin/utils";

type Props = {
  columns: string[];
  rows: Record<string, string | number>[];
  form: Record<string, string>;
  dialogOpen: boolean;
  editIndex: number | null;
  openEditDialog: (row: any, idx: number) => void;
  openAddDialog: () => void;
  handleDialogClose: () => void;
  handleDialogSave: () => void;
  handleChange: (col: string, value: string) => void;
  loading: boolean;
  saving: boolean;
  handleExportWithTemplate: () => void;
  dropdownOptions: Record<string, string[]>;
  openDetailDialog: (row: any) => void;
};

const FormField = ({ 
  label, 
  children, 
  className 
}: { 
  label: string; 
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("space-y-1.5", className)}>
    <label className="text-xs font-bold uppercase tracking-wider text-dark-5 dark:text-dark-6">
      {label}
    </label>
    {children}
  </div>
);

const EmployeeDataFormPage: React.FC<Props> = ({
  columns,
  rows,
  form,
  dialogOpen,
  editIndex,
  openEditDialog,
  openAddDialog,
  handleDialogClose,
  handleDialogSave,
  handleChange,
  openDetailDialog,
  dropdownOptions,
  saving,
}) => {
  return (
    <div className="w-full">
      <EmployeeDataTable
        columns={columns}
        rows={rows}
        openEditDialog={openEditDialog}
        openDetailDialog={openDetailDialog}
      />

      <Tooltip title="Add Entry">
        <Fab
          color="primary"
          sx={{ 
            position: "fixed", 
            bottom: 32, 
            right: 32, 
            zIndex: 1000, 
            boxShadow: '0 10px 15px -3px rgba(0, 107, 255, 0.3)',
            bgcolor: '#006BFF',
            '&:hover': { bgcolor: '#0052CC' }
          }}
          onClick={openAddDialog}
        >
          <AddIcon />
        </Fab>
      </Tooltip>

      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        maxWidth="lg"
        fullWidth
        scroll="paper"
        PaperProps={{
          sx: { 
            borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            backgroundImage: 'none',
          },
          className: "dark:bg-gray-dark dark:border dark:border-dark-3"
        }}
      >
        <DialogTitle className="flex items-center justify-between border-b border-stroke p-6 dark:border-dark-3 dark:bg-gray-dark">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg",
              editIndex !== null ? "bg-secondary shadow-secondary/20" : "bg-primary shadow-primary/20"
            )}>
              {editIndex !== null ? <InventoryIcon /> : <AddIcon />}
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-dark dark:text-white">
                {editIndex !== null ? "Edit Entry" : "New Entry"}
              </h2>
              <p className="text-xs font-medium text-dark-5 dark:text-dark-6">
                {editIndex !== null ? "Update existing clearance record" : "Create a new clearance record"}
              </p>
            </div>
          </div>
          <IconButton 
            onClick={handleDialogClose} 
            size="small" 
            className="rounded-xl bg-gray-2 text-dark-5 transition-all hover:bg-danger/10 hover:text-danger dark:bg-dark-2 dark:text-dark-6"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        
        <DialogContent className="bg-gray-2 p-6 dark:bg-[#020D1A]">
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <div className="grid grid-cols-1 gap-8 pt-2">
              {/* Shipment Details Section */}
              <div className="rounded-2xl border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-gray-dark">
                <div className="mb-6 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <LocalShippingIcon fontSize="small" />
                  </div>
                  <h3 className="text-lg font-bold text-dark dark:text-white text-heading-6">Shipment Info</h3>
                </div>
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {[
                    "Job", "B/L No", "B/L Date", "Imp/Exp", "Ship'm Mode", "Importer",
                    "Client Name", "Inv", "PKL", "INV & PKL Date", "CO", "CO Date",
                    "Rcv Date", "Shipping Line", "MBL #", "Vssl/Truck", "ETA/ETD",
                    "LOAD ON", "POL", "Transit Port", "SCAN STATION", "Final Destination",
                  ].map((col) => (
                    <FormField key={col} label={col}>
                      {Object.keys(dropdownOptions).includes(col) ? (
                        <select
                          value={form[col] || ""}
                          onChange={(e) => handleChange(col, e.target.value)}
                          className="w-full rounded-xl border border-stroke bg-gray-2 px-4 py-2.5 text-sm text-dark outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                        >
                          <option value="">Select {col}</option>
                          {dropdownOptions[col].map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : dateFields.includes(col) ? (
                        <DatePicker
                          value={form[col] ? dayjs(form[col]) : null}
                          onChange={(date) => handleChange(col, date ? date.format("YYYY-MM-DD") : "")}
                          slotProps={{
                            textField: { 
                              size: "small", 
                              fullWidth: true,
                              className: "modern-datepicker",
                              sx: {
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: '12px',
                                  backgroundColor: 'var(--color-gray-2)',
                                  '& fieldset': { borderColor: 'var(--color-stroke)' },
                                  '&:hover fieldset': { borderColor: 'var(--color-primary)' },
                                  '&.Mui-focused fieldset': { borderColor: 'var(--color-primary)' },
                                }
                              }
                            },
                          }}
                        />
                      ) : (
                        <input
                          type="text"
                          value={form[col] || ""}
                          onChange={(e) => handleChange(col, e.target.value)}
                          placeholder={`Enter ${col.toLowerCase()}`}
                          className="w-full rounded-xl border border-stroke bg-gray-2 px-4 py-2.5 text-sm text-dark outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                        />
                      )}
                    </FormField>
                  ))}
                </div>
              </div>

              {/* Commodity & Container Section */}
              <div className="rounded-2xl border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-gray-dark">
                <div className="mb-6 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                    <InventoryIcon fontSize="small" />
                  </div>
                  <h3 className="text-lg font-bold text-dark dark:text-white text-heading-6">Commodity & Container</h3>
                </div>
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {[
                    "Commodity", "NW", "GW", "CBM/CIF", "FOB", "Container No",
                    "Quantity", "20'", "40'", "CONT SIZE", "Shipper Name",
                    "Received Date", "SR NAME",
                  ].map((col) => (
                    <FormField key={col} label={col}>
                      {dateFields.includes(col) ? (
                        <DatePicker
                          value={form[col] ? dayjs(form[col]) : null}
                          onChange={(date) => handleChange(col, date ? date.format("YYYY-MM-DD") : "")}
                          slotProps={{
                            textField: { 
                              size: "small", 
                              fullWidth: true,
                              sx: {
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: '12px',
                                  backgroundColor: 'var(--color-gray-2)',
                                  '& fieldset': { borderColor: 'var(--color-stroke)' },
                                }
                              }
                            },
                          }}
                        />
                      ) : (
                        <input
                          type="text"
                          value={form[col] || ""}
                          onChange={(e) => handleChange(col, e.target.value)}
                          placeholder={`Enter ${col.toLowerCase()}`}
                          className="w-full rounded-xl border border-stroke bg-gray-2 px-4 py-2.5 text-sm text-dark outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                        />
                      )}
                    </FormField>
                  ))}
                </div>
              </div>

              {/* Customs & Tracking Section */}
              <div className="rounded-2xl border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-gray-dark">
                <div className="mb-6 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10 text-orange-light">
                    <DescriptionIcon fontSize="small" />
                  </div>
                  <h3 className="text-lg font-bold text-dark dark:text-white text-heading-6">Customs & Tracking</h3>
                </div>
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {[
                    "TP", "TP DATE", "IM8", "IM8 DATE", "GATE IN DP/BW/SEZ",
                    "IM7", "IM7 DATE", "SR", "SR DATE", "CV", "CV DATE",
                    "CO", "CO DATE", "IM4", "IM4 DATE", "EX3", "EX3 DATE",
                    "GATE OUT DP/BW/SEZ", "INV",
                  ].map((col) => (
                    <FormField key={col} label={col}>
                      {dateFields.includes(col) ? (
                        <DatePicker
                          value={form[col] ? dayjs(form[col]) : null}
                          onChange={(date) => handleChange(col, date ? date.format("YYYY-MM-DD") : "")}
                          slotProps={{
                            textField: { 
                              size: "small", 
                              fullWidth: true,
                              sx: {
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: '12px',
                                  backgroundColor: 'var(--color-gray-2)',
                                  '& fieldset': { borderColor: 'var(--color-stroke)' },
                                }
                              }
                            },
                          }}
                        />
                      ) : (
                        <input
                          type="text"
                          value={form[col] || ""}
                          onChange={(e) => handleChange(col, e.target.value)}
                          placeholder={`Enter ${col.toLowerCase()}`}
                          className="w-full rounded-xl border border-stroke bg-gray-2 px-4 py-2.5 text-sm text-dark outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                        />
                      )}
                    </FormField>
                  ))}
                </div>
              </div>
            </div>
          </LocalizationProvider>
        </DialogContent>
        
        <DialogActions className="border-t border-stroke p-6 dark:border-dark-3 dark:bg-gray-dark">
          <button 
            onClick={handleDialogClose}
            className="rounded-xl px-6 py-3 text-sm font-bold text-dark-4 transition-all hover:bg-gray-2 hover:text-dark dark:text-dark-6 dark:hover:bg-dark-2 dark:hover:text-white"
          >
            Discard Changes
          </button>
          <button
            onClick={handleDialogSave}
            disabled={saving}
            className="inline-flex min-w-[160px] items-center justify-center rounded-xl bg-primary px-8 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:bg-opacity-50"
          >
            {saving ? (
              <>
                <svg className="mr-2 h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              editIndex !== null ? "Update Entry" : "Create Entry"
            )}
          </button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default EmployeeDataFormPage;