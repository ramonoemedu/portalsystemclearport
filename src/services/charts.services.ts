import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { sanitizeKey } from "@/utils/KeySanitizer";

export async function getClearPortStats() {
  try {
    const snapshot = await getDocs(collection(db, "employeeData"));
    const totalJobs = snapshot.size;
    
    let imports = 0;
    let exports = 0;
    const shipModeCounts: Record<string, number> = {};

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const type = data[sanitizeKey("Imp/Exp")]?.toString().toUpperCase();
      const mode = data[sanitizeKey("Ship'm Mode")]?.toString().toUpperCase();

      if (type === "IMPORT") imports++;
      if (type === "EXPORT") exports++;
      
      if (mode) {
        shipModeCounts[mode] = (shipModeCounts[mode] || 0) + 1;
      }
    });

    return {
      totalJobs,
      imports,
      exports,
      shipModeCounts,
      // Mock growth rates for now as we don't have historical snapshots yet
      growth: {
        total: 12.5,
        imports: 8.2,
        exports: 15.4,
      }
    };
  } catch (error) {
    console.error("Error fetching ClearPort stats:", error);
    return {
      totalJobs: 0,
      imports: 0,
      exports: 0,
      shipModeCounts: {},
      growth: { total: 0, imports: 0, exports: 0 }
    };
  }
}

export async function getClearanceTimelineData() {
  try {
    const snapshot = await getDocs(collection(db, "employeeData"));
    const monthlyData: Record<string, { imports: number, exports: number }> = {};
    
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Initialize months
    months.forEach(m => monthlyData[m] = { imports: 0, exports: 0 });

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const dateStr = data[sanitizeKey("B/L Date")] || data[sanitizeKey("Received Date")];
      const type = data[sanitizeKey("Imp/Exp")]?.toString().toUpperCase();
      
      if (dateStr) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          const month = months[date.getMonth()];
          if (type === "IMPORT") monthlyData[month].imports++;
          else if (type === "EXPORT") monthlyData[month].exports++;
        }
      }
    });

    return {
      received: months.map(m => ({ x: m, y: monthlyData[m].imports })),
      due: months.map(m => ({ x: m, y: monthlyData[m].exports }))
    };
  } catch (error) {
    console.error("Error fetching timeline data:", error);
    return { received: [], due: [] };
  }
}

export async function getWeeksProfitData(timeFrame?: string) {
  const stats = await getClearPortStats();
  const modes = Object.keys(stats.shipModeCounts);
  
  return {
    sales: modes.map(m => ({ x: m, y: stats.shipModeCounts[m] })),
    revenue: modes.map(m => ({ x: m, y: 0 })),
  };
}

export async function getPaymentsOverviewData(timeFrame?: string) {
  return getClearanceTimelineData();
}

// RESTORED PLACEHOLDERS FOR BUILD COMPATIBILITY
export async function getDevicesUsedData(timeFrame?: string) {
  return [
    { name: "Desktop", percentage: 0.65, amount: 1625 },
    { name: "Tablet", percentage: 0.1, amount: 250 },
    { name: "Mobile", percentage: 0.2, amount: 500 },
    { name: "Unknown", percentage: 0.05, amount: 125 },
  ];
}

export async function getCampaignVisitorsData() {
  return {
    total_visitors: 784_000,
    performance: -1.5,
    chart: [
      { x: "S", y: 168 },
      { x: "S", y: 385 },
      { x: "M", y: 201 },
      { x: "T", y: 298 },
      { x: "W", y: 187 },
      { x: "T", y: 195 },
      { x: "F", y: 291 },
    ],
  };
}

export async function getVisitorsAnalyticsData() {
  return Array.from({ length: 30 }, (_, i) => ({ x: (i + 1).toString(), y: Math.floor(Math.random() * 300) }));
}

export async function getCostsPerInteractionData() {
  return {
    avg_cost: 560.93,
    growth: 2.5,
    chart: [
      { name: "Google Ads", data: [{ x: "Jan", y: 10 }] },
      { name: "Facebook Ads", data: [{ x: "Jan", y: 20 }] },
    ],
  };
}