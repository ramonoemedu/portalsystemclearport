'use client';

import React, { useEffect, useState } from 'react';
import { OverviewCard } from "@/components/NextAdmin/Dashboard/overview-cards/card";
import { 
  Users as UsersIcon, 
  Views as ViewsIcon, 
  Profit as ProfitIcon, 
  Product as ProductIcon 
} from "@/components/NextAdmin/Dashboard/overview-cards/icons";
import { PaymentsOverview } from "@/components/NextAdmin/Charts/payments-overview";
import { WeeksProfit } from "@/components/NextAdmin/Charts/weeks-profit";
import { getClearPortStats } from "@/services/charts.services";
import { Skeleton } from "@mui/material";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await getClearPortStats();
        setStats(data);
      } catch (error) {
        console.error("Dashboard load error:", error);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="mx-auto w-full max-w-full space-y-6">
        <div className="flex flex-col gap-6">
          <Skeleton variant="rectangular" height={80} className="rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={150} className="rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-full space-y-6">
      <div className="flex flex-col gap-6">
        {/* Header Section */}
        <div>
          <h1 className="text-heading-5 font-bold text-dark dark:text-white">
            Clearance Analytics
          </h1>
          <p className="text-body-sm font-medium text-dark-5">
            Real-time overview of port clearance operations
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4 2xl:gap-7.5">
          <OverviewCard
            label="Total Clearances"
            data={{
              value: stats.totalJobs.toString(),
              growthRate: stats.growth.total,
            }}
            Icon={ViewsIcon}
          />

          <OverviewCard
            label="Import Jobs"
            data={{
              value: stats.imports.toString(),
              growthRate: stats.growth.imports,
            }}
            Icon={ProductIcon}
          />

          <OverviewCard
            label="Export Jobs"
            data={{
              value: stats.exports.toString(),
              growthRate: stats.growth.exports,
            }}
            Icon={ProfitIcon}
          />

          <OverviewCard
            label="Active Users"
            data={{
              value: "1",
              growthRate: 0,
            }}
            Icon={UsersIcon}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-9 2xl:gap-7.5">
        <div className="col-span-12 xl:col-span-7">
          <PaymentsOverview />
        </div>

        <div className="col-span-12 xl:col-span-5">
          <WeeksProfit />
        </div>
      </div>
    </div>
  );
}