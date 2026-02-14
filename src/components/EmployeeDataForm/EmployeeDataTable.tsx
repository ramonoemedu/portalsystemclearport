'use client';

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/NextAdmin/ui/table";
import { IconButton, Tooltip } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { dateFields, formatDisplayDate } from "@/utils/KeySanitizer";
import { cn } from "@/lib/NextAdmin/utils";

type Props = {
  columns: string[];
  rows: Record<string, string | number>[];
  openEditDialog: (row: any, idx: number) => void;
  openDetailDialog: (row: any) => void;
};

const getBadgeStyles = (val: string) => {
  const normalized = val.toUpperCase();
  if (normalized === "IMPORT") return "bg-green/10 text-green";
  if (normalized === "EXPORT") return "bg-blue/10 text-blue";
  if (normalized === "RE-EXPORT") return "bg-orange-light/10 text-orange-light";
  if (normalized === "DOMESTIC") return "bg-primary/10 text-primary";
  if (normalized === "SEA" || normalized === "AIR") return "bg-dark/5 text-dark dark:text-white";
  return "";
};

export function EmployeeDataTable({
  columns,
  rows,
  openEditDialog,
  openDetailDialog,
}: Props) {
  return (
    <div className="rounded-[10px] border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark md:p-2">
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-none bg-[#F7F9FC] dark:bg-dark-2 [&>th]:py-4 [&>th]:text-sm [&>th]:font-semibold [&>th]:text-dark [&>th]:dark:text-white">
              {columns.map((col) => (
                <TableHead 
                  key={col}
                  className={cn(
                    "whitespace-nowrap px-4",
                    (col === "B/L No" || col === "Quantity" || col === "CBM/CIF" || col === "20'" || col === "40'" || col === "CONT SIZE")
                      ? "text-right"
                      : "text-left"
                  )}
                >
                  {col}
                </TableHead>
              ))}
              <TableHead className="sticky right-0 z-10 bg-[#F7F9FC] dark:bg-dark-2 text-center px-4">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="text-center py-12 text-dark-5"
                >
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-lg font-medium">No records found</p>
                    <p className="text-sm">Try adjusting your filters or add a new entry.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, idx) => (
                <TableRow
                  key={row.id || idx}
                  className="group border-stroke hover:bg-gray-2/50 dark:border-dark-3 dark:hover:bg-dark-2/50 transition-colors"
                >
                  {columns.map((col) => {
                    const val = row[col];
                    const isBadgeField = col === "Imp/Exp" || col === "Ship'm Mode";
                    const badgeStyles = isBadgeField && typeof val === "string" ? getBadgeStyles(val) : "";

                    return (
                      <TableCell
                        key={col}
                        className={cn(
                          "whitespace-nowrap px-4 py-3.5 text-sm text-dark dark:text-white",
                          (col === "B/L No" || col === "Quantity" || col === "CBM/CIF")
                            ? "text-right"
                            : "text-left"
                        )}
                      >
                        {isBadgeField && typeof val === "string" ? (
                          <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-medium", badgeStyles)}>
                            {val}
                          </span>
                        ) : (
                          <span className="truncate block max-w-[180px]">
                            {dateFields.includes(col)
                              ? formatDisplayDate(val as string)
                              : val}
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell 
                    className="sticky right-0 z-10 bg-white group-hover:bg-gray-2/5 dark:bg-gray-dark dark:group-hover:bg-dark-2/5 text-center px-4 border-l border-stroke dark:border-dark-3" 
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <Tooltip title="View Details">
                        <IconButton
                          onClick={() => openDetailDialog(row)}
                          size="small"
                          className="text-dark-4 hover:text-primary transition-colors"
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Entry">
                        <IconButton
                          onClick={() => openEditDialog(row, idx)}
                          size="small"
                          className="text-dark-4 hover:text-secondary transition-colors"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}