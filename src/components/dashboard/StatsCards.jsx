// src/components/dashboard/StatsCards.jsx
import React from "react";

export default function StatsCards({ stats, revenue }) {
  const statItems = [
    {
      key: "totalRevenue",
      label: "Total Revenue",
      icon: "fa-coins",
      color: "bg-blue-100 text-blue-600",
      value: `₱${revenue.total}`,
    },
    {
      key: "totalCheckins",
      label: "Total Check-ins",
      icon: "fa-users",
      color: "bg-green-100 text-green-700",
      value: revenue.totalCheckins,
    },
    {
      key: "totalBookings",
      label: "Total Bookings",
      icon: "fa-clock",
      color: "bg-amber-100 text-amber-700",
      value: revenue.totalBookings,
    },
    {
      key: "occupancyRate",
      label: "Occupancy Rate",
      icon: "fa-chart-line",
      color: "bg-rose-100 text-rose-700",
      value: `${revenue.occupancyRate}%`,
    },
  ];

  const statCards = [
    {
      key: "available",
      label: "Available",
      icon: "fa-check",
      color: "text-green-600 bg-green-100",
      value: stats.available,
    },
    {
      key: "occupied",
      label: "Occupied",
      icon: "fa-bed",
      color: "text-red-600 bg-red-100",
      value: stats.occupied,
    },
    {
      key: "expiring",
      label: "Expiring",
      icon: "fa-hourglass-half",
      color: "text-orange-600 bg-orange-100",
      value: stats.expiring,
    },
    {
      key: "expired",
      label: "Expired",
      icon: "fa-clock",
      color: "text-gray-600 bg-gray-100",
      value: stats.expired,
    },
    {
      key: "cleaning",
      label: "Cleaning",
      icon: "fa-broom",
      color: "text-blue-600 bg-blue-100",
      value: stats.cleaning,
    },
    {
      key: "occupancy",
      label: "Occupancy",
      icon: "fa-building",
      color: "text-indigo-600 bg-indigo-100",
      value: `${revenue.occupancyRate}%`,
    },
  ];

  return (
    <>
      {/* Revenue Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4">
        {statItems.map((item) => (
          <div
            key={item.key}
            className="bg-white border border-[#e5e2db] rounded-xl p-3 text-center">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm mx-auto mb-1.5 ${item.color}`}>
              <i className={`fas ${item.icon}`}></i>
            </div>
            <div className="text-lg font-bold text-[#0f1b2d]">{item.value}</div>
            <div className="text-[10px] text-[#8a8278]">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Status Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
        {statCards.map((stat) => (
          <div
            key={stat.key}
            className="bg-white border border-[#e5e2db] rounded-xl p-2.5 text-center hover:shadow-md transition cursor-pointer">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs mx-auto mb-1 ${stat.color}`}>
              <i className={`fas ${stat.icon}`}></i>
            </div>
            <div className="text-base font-bold text-[#0f1b2d]">
              {stat.value}
            </div>
            <div className="text-[9px] text-[#8a8278]">{stat.label}</div>
          </div>
        ))}
      </div>
    </>
  );
}
