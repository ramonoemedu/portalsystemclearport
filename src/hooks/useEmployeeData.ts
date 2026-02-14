'use client';

import { useState, useEffect, useCallback } from "react";
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
  writeBatch,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  where,
} from "firebase/firestore";
import { PAGE_SIZE, sanitizeKey, unsanitizeKey, columns } from "@/utils/KeySanitizer";
import { createExcelBlobFromRows, uploadBlobToGoogleDrive } from "@/components/Report/ReportFuntion";

export function useEmployeeData() {
  const [rows, setRows] = useState<Record<string, string | number>[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [cursors, setCursors] = useState<(QueryDocumentSnapshot<DocumentData> | null)[]>([null]);
  const [dropdownOptions, setDropdownOptions] = useState<Record<string, string[]>>({
    "Imp/Exp": [],
    "Ship'm Mode": [],
    "Vssl/Truck": [],
  });

  const fetchTotalCount = useCallback(async () => {
    try {
      const snapshot = await getDocs(collection(db, "employeeData"));
      setTotalRows(snapshot.size);
    } catch (err) {
      console.error("Error fetching total count:", err);
    }
  }, []);

  const fetchRows = useCallback(
    async (
      pageNumber: number,
      filters?: {
        searchText?: string;
        blDate?: string | null;
        coDate?: string | null;
        rcvDate?: string | null;
      }
    ) => {
      setLoading(true);
      try {
        let q = query(
          collection(db, "employeeData"),
          orderBy(sanitizeKey("Job"), "desc"),
          limit(PAGE_SIZE)
        );

        // Simple search implementation (client-side search is often better for Firestore unless using Algolia)
        // But for now, we'll keep the base query and potentially add basic filters if needed.
        // Real search in Firestore is limited.

        const cursor = cursors[pageNumber - 1];
        if (cursor && pageNumber > 1) {
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
          const mapped: { id: string; [key: string]: any } = { id: doc.id };
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

  const fetchDropdownOptions = useCallback(async () => {
    try {
      const fields = ["Imp/Exp", "Ship'm Mode", "Vssl/Truck"];
      // In a real app, you'd probably have a separate collection for these or aggregate them periodically.
      // For now, we'll stick to the current logic but maybe optimize.
      const snapshot = await getDocs(collection(db, "employeeData"));

      const uniqueValues: Record<string, Set<string>> = {};
      fields.forEach((field) => (uniqueValues[field] = new Set<string>()));

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        fields.forEach((field) => {
          const sanitizedField = sanitizeKey(field);
          if (data[sanitizedField] && typeof data[sanitizedField] === "string") {
            uniqueValues[field].add(data[sanitizedField] as string);
          }
        });
      });

      const options: Record<string, string[]> = {};
      fields.forEach((field) => (options[field] = Array.from(uniqueValues[field]).sort()));

      const defaults = {
        "Imp/Exp": ["IMPORT", "EXPORT", "DOMESTIC", "OTHERS", "TRANSIT", "WAREHOUSE", "RE-EXPORT"],
        "Ship'm Mode": ["SEA", "AIR", "LAND", "LAND-LCL", "SEA-LCL", "MULTI-MODAL"],
        "Vssl/Truck": ["VSSL", "TRUCK", ""],
      };

      Object.entries(defaults).forEach(([field, defaultValues]) => {
        const combined = new Set([...defaultValues, ...(options[field] || [])]);
        options[field] = Array.from(combined).sort();
      });

      setDropdownOptions(options);
    } catch (error) {
      console.error("Error fetching dropdown options:", error);
    }
  }, []);

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
          // data contains the sanitized keys from the form
          mappedRow[col] = data[sanitizeKey(col)] ?? "";
        });
        
        const blob = createExcelBlobFromRows([mappedRow], columns);
        await uploadBlobToGoogleDrive(
          blob,
          "1.Clearance Follow Up SAMPLE.xlsx",
          "756046169704-piuq4qipnshpv1bqe2jt4327pisccbvv.apps.googleusercontent.com"
        );
        console.log("Single record synced to Google Drive");
      } catch (driveErr) {
        console.error("Auto-sync to Google Drive failed:", driveErr);
      }

      await fetchTotalCount();
      return true;
    } catch (err) {
      console.error("Error saving entry:", err);
      return false;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchTotalCount();
    fetchDropdownOptions();
  }, [fetchTotalCount, fetchDropdownOptions]);

  return {
    rows,
    loading,
    saving,
    totalRows,
    fetchRows,
    dropdownOptions,
    saveEntry,
    refreshCount: fetchTotalCount,
  };
}
