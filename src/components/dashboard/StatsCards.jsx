// src/components/dashboard/StatsCards.jsx
import React from "react";

export default function StatsCards({ stats, revenue }) {
  const statItems = [
    {
      key: "totalRevenue",
      label: "Dashboard Revenue",
      icon: "fa-coins",
      value: `₱${revenue.total || 0}`,
      subtitle: "Operational counter",
    },
    {
      key: "totalCheckins",
      label: "Active Check-ins",
      icon: "fa-users",
      value: revenue.totalCheckins || 0,
      subtitle: "Currently checked in",
    },
    {
      key: "totalBookings",
      label: "Active Bookings",
      icon: "fa-clock",
      value: revenue.totalBookings || 0,
      subtitle: "Current active stays",
    },
    {
      key: "occupancyRate",
      label: "Occupancy Rate",
      icon: "fa-chart-line",
      value: `${revenue.occupancyRate || 0}%`,
      subtitle: "Current occupancy",
    },
  ];

  const statCards = [
    {
      key: "available",
      label: "Available",
      icon: "fa-check",
      value: stats.available,
    },
    {
      key: "booked",
      label: "Booked",
      icon: "fa-calendar-check",
      value: stats.booked || 0,
    },
    {
      key: "occupied",
      label: "Occupied",
      icon: "fa-bed",
      value: stats.occupied,
    },
    {
      key: "expiring",
      label: "Expiring",
      icon: "fa-hourglass-half",
      value: stats.expiring,
    },
    {
      key: "expired",
      label: "Expired",
      icon: "fa-clock",
      value: stats.expired,
    },
    {
      key: "cleaning",
      label: "Cleaning",
      icon: "fa-broom",
      value: stats.cleaning,
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
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mx-auto mb-1.5 bg-[#c9a84c]/10 border border-[#c9a84c]/20">
              <i className={`fas ${item.icon} text-[#c9a84c] text-base`}></i>
            </div>
            <div className="text-lg font-bold text-[#0f1b2d]">{item.value}</div>
            <div className="text-[10px] text-[#8a8278]">{item.label}</div>
            {item.subtitle && (
              <div className="text-[8px] text-[#8a8278]/50 mt-0.5">
                {item.subtitle}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Status Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
        {statCards.map((stat) => (
          <div
            key={stat.key}
            className="bg-white border border-[#e5e2db] rounded-xl p-2.5 text-center hover:shadow-md transition cursor-pointer">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1 bg-[#c9a84c]/10 border border-[#c9a84c]/20">
              <i className={`fas ${stat.icon} text-[#c9a84c] text-sm`}></i>
            </div>
            <div className="text-base font-bold text-[#0f1b2d]">
              {stat.value}
            </div>
            <div className="text-[9px] text-[#8a8278]">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* System Status Note */}
      <div className="text-[9px] text-[#8a8278] text-center border-t border-[#e5e2db] pt-2 mt-1">
        <i className="fas fa-info-circle mr-1"></i>
        Dashboard shows operational data • Analytics for historical reporting
      </div>
    </>
  );
}
