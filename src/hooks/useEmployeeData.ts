'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { PAGE_SIZE, sanitizeKey, unsanitizeKey, columns } from "@/utils/KeySanitizer";
import { createExcelBlobFromRows, uploadBlobToGoogleDrive } from "@/components/Report/ReportFuntion";

export function useEmployeeData() {
  const [allRows, setAllRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({
    searchText: "",
    blDate: null as string | null,
    coDate: null as string | null,
    rcvDate: null as string | null,
  });

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "employeeData"),
        orderBy(sanitizeKey("Job"), "desc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => {
        const raw = doc.data();
        const mapped: { id: string; [key: string]: any } = { id: doc.id };
        for (const key of Object.keys(raw)) {
          mapped[unsanitizeKey(key)] = raw[key];
        }
        return mapped;
      });
      setAllRows(data);
    } catch (err) {
      console.error("Error fetching all employee data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter logic
  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      // 1. Search Text Filter (Search across multiple common fields)
      if (filters.searchText) {
        const search = filters.searchText.toLowerCase();
        const searchFields = ["Job", "B/L No", "Importer", "Client Name", "Inv", "Container No"];
        const matchesSearch = searchFields.some((field) => {
          const val = row[field];
          return val && val.toString().toLowerCase().includes(search);
        });
        if (!matchesSearch) return false;
      }

      // 2. B/L Date Filter
      if (filters.blDate && row["B/L Date"] !== filters.blDate) {
        return false;
      }

      // 3. CO Date Filter
      if (filters.coDate && row["CO Date"] !== filters.coDate) {
        return false;
      }

      // 4. Rcv Date Filter (The filter on UI says Rcv Date, check matching field)
      if (filters.rcvDate && row["Rcv Date"] !== filters.rcvDate) {
        return false;
      }

      return true;
    });
  }, [allRows, filters]);

  const [page, setPage] = useState(1);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  const fetchRows = useCallback(
    async (pageNumber: number, newFilters?: typeof filters) => {
      if (newFilters) {
        setFilters(newFilters);
      }
      setPage(pageNumber);
    },
    []
  );

  const [dropdownOptions, setDropdownOptions] = useState<Record<string, string[]>>({
    "Imp/Exp": [],
    "Ship'm Mode": [],
    "Vssl/Truck": [],
  });

  const fetchDropdownOptions = useCallback(async () => {
    try {
      const fields = ["Imp/Exp", "Ship'm Mode", "Vssl/Truck"];
      const uniqueValues: Record<string, Set<string>> = {};
      fields.forEach((field) => (uniqueValues[field] = new Set<string>()));

      allRows.forEach((row) => {
        fields.forEach((field) => {
          if (row[field] && typeof row[field] === "string") {
            uniqueValues[field].add(row[field] as string);
          }
        });
      });

      const options: Record<string, string[]> = {};
      const defaults = {
        "Imp/Exp": ["IMPORT", "EXPORT", "DOMESTIC", "OTHERS", "TRANSIT", "WAREHOUSE", "RE-EXPORT"],
        "Ship'm Mode": ["SEA", "AIR", "LAND", "LAND-LCL", "SEA-LCL", "MULTI-MODAL"],
        "Vssl/Truck": ["VSSL", "TRUCK", ""],
      };

      fields.forEach((field) => {
        const combined = new Set([...(defaults[field as keyof typeof defaults] || []), ...Array.from(uniqueValues[field])]);
        options[field] = Array.from(combined).sort();
      });

      setDropdownOptions(options);
    } catch (error) {
      console.error("Error fetching dropdown options:", error);
    }
  }, [allRows]);

  const saveEntry = async (id: string | null, data: Record<string, any>) => {
    setSaving(true);
    try {
      if (id) {
        await updateDoc(doc(db, "employeeData", id), data);
      } else {
        await addDoc(collection(db, "employeeData"), data);
      }
      
      // Auto-upload ONLY the current record to Google Drive
      try {
        const mappedRow: any = { id: id || "new" };
        columns.forEach(col => {
          mappedRow[col] = data[sanitizeKey(col)] ?? "";
        });
        
        const blob = createExcelBlobFromRows([mappedRow], columns);
        await uploadBlobToGoogleDrive(
          blob,
          "1.Clearance Follow Up SAMPLE.xlsx",
          "756046169704-piuq4qipnshpv1bqe2jt4327pisccbvv.apps.googleusercontent.com"
        );
      } catch (driveErr) {
        console.error("Auto-sync to Google Drive failed:", driveErr);
      }

      await fetchAllData();
      return true;
    } catch (err) {
      console.error("Error saving entry:", err);
      return false;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    if (allRows.length > 0) {
      fetchDropdownOptions();
    }
  }, [allRows, fetchDropdownOptions]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  return {
    rows: paginatedRows,
    loading,
    saving,
    totalRows: filteredRows.length,
    fetchRows,
    dropdownOptions,
    saveEntry,
    refreshCount: fetchAllData,
  };
}