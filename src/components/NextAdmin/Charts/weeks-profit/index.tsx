"use client";

import { cn } from "@/lib/NextAdmin/utils";
import { getWeeksProfitData } from "@/services/charts.services";
import { WeeksProfitChart } from "./chart";
import { useEffect, useState } from "react";
import { Skeleton } from "@mui/material";

type PropsType = {
  timeFrame?: string;
  className?: string;
};

export function WeeksProfit({ className, timeFrame }: PropsType) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const result = await getWeeksProfitData(timeFrame);
      setData(result);
      setLoading(false);
    }
    loadData();
  }, [timeFrame]);

  if (loading || !data) {
    return (
      <div className={cn("rounded-[10px] bg-white p-7.5 shadow-1 dark:bg-dark-2", className)}>
        <Skeleton variant="text" width="40%" height={32} className="mb-4" />
        <Skeleton variant="rectangular" height={370} className="rounded-xl" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-[10px] bg-white px-7.5 pt-7.5 shadow-1 dark:bg-dark-2 dark:shadow-card",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-body-2xlg font-bold text-dark dark:text-white">
          Shipment Modes
        </h2>
      </div>

      <WeeksProfitChart data={data} />
    </div>
  );
}