// src/components/ui/Skeleton.jsx
import React from "react";

export const Skeleton = ({ className = "", children, ...props }) => {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      {...props}>
      {children}
    </div>
  );
};

// Text Skeleton
export const SkeletonText = ({ className = "", lines = 1, width = "100%" }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 rounded`}
          style={{
            width:
              i === lines - 1
                ? `${Math.min(80, 60 + Math.random() * 30)}%`
                : width,
          }}
        />
      ))}
    </div>
  );
};

// Avatar Skeleton
export const SkeletonAvatar = ({ className = "", size = 10 }) => {
  return (
    <Skeleton className={`h-${size} w-${size} rounded-full ${className}`} />
  );
};

// Card Skeleton
export const SkeletonCard = ({ className = "" }) => {
  return (
    <div
      className={`bg-white rounded-xl border border-[#e5e2db] p-4 ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-3 w-16 rounded mt-1" />
        </div>
      </div>
      <Skeleton className="h-20 w-full rounded" />
      <div className="flex gap-2 mt-3">
        <Skeleton className="h-8 flex-1 rounded" />
        <Skeleton className="h-8 flex-1 rounded" />
      </div>
    </div>
  );
};

// Stats Card Skeleton
export const SkeletonStatsCard = ({ className = "" }) => {
  return (
    <div
      className={`bg-white border border-[#e5e2db] rounded-xl p-3 text-center ${className}`}>
      <Skeleton className="h-8 w-8 rounded-lg mx-auto mb-1.5" />
      <Skeleton className="h-6 w-16 mx-auto rounded" />
      <Skeleton className="h-3 w-12 mx-auto rounded mt-1" />
    </div>
  );
};

// Revenue Card Skeleton
export const SkeletonRevenueCard = ({ className = "" }) => {
  return (
    <div
      className={`bg-white border border-[#e5e2db] rounded-xl p-3 text-center ${className}`}>
      <Skeleton className="h-8 w-8 rounded-lg mx-auto mb-1.5" />
      <Skeleton className="h-6 w-20 mx-auto rounded" />
      <Skeleton className="h-3 w-16 mx-auto rounded mt-1" />
    </div>
  );
};

// Room Card Skeleton
export const SkeletonRoomCard = ({ className = "" }) => {
  return (
    <div
      className={`bg-white border border-[#e5e2db] rounded-xl overflow-hidden ${className}`}>
      <div className="p-3 flex items-start justify-between border-b border-[#e5e2db]">
        <div>
          <Skeleton className="h-5 w-24 rounded" />
          <Skeleton className="h-3 w-16 rounded mt-1" />
        </div>
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </div>
      <div className="p-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-8 w-24 mx-auto rounded mt-2" />
        </div>
      </div>
      <div className="p-2 bg-[#fafafa] border-t border-[#e5e2db] flex gap-1">
        <Skeleton className="h-8 flex-1 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </div>
  );
};

// Room List Row Skeleton
export const SkeletonRoomRow = ({ className = "" }) => {
  return (
    <tr className={`border-b border-[#e5e2db] ${className}`}>
      <td className="p-2">
        <Skeleton className="h-4 w-20 rounded" />
      </td>
      <td className="p-2">
        <Skeleton className="h-6 w-20 rounded-full" />
      </td>
      <td className="p-2">
        <Skeleton className="h-4 w-8 rounded" />
      </td>
      <td className="p-2">
        <Skeleton className="h-4 w-16 rounded" />
      </td>
      <td className="p-2">
        <Skeleton className="h-4 w-16 rounded" />
      </td>
      <td className="p-2">
        <Skeleton className="h-4 w-16 rounded" />
      </td>
      <td className="p-2">
        <Skeleton className="h-4 w-20 rounded" />
      </td>
      <td className="p-2">
        <div className="flex gap-1">
          <Skeleton className="h-7 w-7 rounded" />
          <Skeleton className="h-7 w-7 rounded" />
          <Skeleton className="h-7 w-7 rounded" />
        </div>
      </td>
    </tr>
  );
};

// Sidebar Skeleton
export const SkeletonSidebar = () => {
  return (
    <div className="fixed lg:sticky top-0 left-0 h-screen w-[240px] bg-[#0f1b2d] z-50 overflow-y-auto">
      <div className="p-6 border-b border-white/10">
        <Skeleton className="h-6 w-32 rounded bg-white/20" />
        <Skeleton className="h-3 w-24 rounded mt-2 bg-white/10" />
      </div>
      <div className="m-4 p-3 bg-white/5 border border-white/10 rounded-xl">
        <Skeleton className="h-5 w-32 rounded bg-white/20" />
        <Skeleton className="h-3 w-20 rounded mt-1 bg-white/10" />
        <Skeleton className="h-1.5 w-full rounded mt-2 bg-white/20" />
        <Skeleton className="h-3 w-16 rounded mt-1 bg-white/10" />
      </div>
      <div className="px-2 py-4 space-y-1">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="px-4 py-2 flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded bg-white/20" />
            <Skeleton className="h-4 flex-1 rounded bg-white/20" />
          </div>
        ))}
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
        <Skeleton className="h-4 w-32 rounded bg-white/20" />
        <Skeleton className="h-9 w-full rounded-lg mt-2 bg-white/20" />
      </div>
    </div>
  );
};

// TopBar Skeleton
export const SkeletonTopBar = () => {
  return (
    <header className="bg-white border-b border-[#e5e2db] sticky top-0 z-30 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-6 rounded lg:hidden" />
        <div>
          <Skeleton className="h-5 w-24 rounded" />
          <Skeleton className="h-3 w-32 rounded mt-1" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-16 rounded" />
        <Skeleton className="h-8 w-16 rounded" />
      </div>
    </header>
  );
};

// Full Dashboard Skeleton
export const DashboardSkeleton = () => {
  return (
    <div className="min-h-screen bg-[#f7f3ee] flex">
      <SkeletonSidebar />
      <div className="flex-1 min-w-0">
        <SkeletonTopBar />
        <div className="p-4">
          {/* Revenue Stats Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonRevenueCard key={i} />
            ))}
          </div>

          {/* Status Stats Skeleton */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonStatsCard key={i} />
            ))}
          </div>

          {/* Filter Bar Skeleton */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-7 w-16 rounded-full" />
            ))}
            <Skeleton className="h-7 w-32 rounded-full ml-auto" />
          </div>

          {/* Room Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonRoomCard key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Table Skeleton
export const SkeletonTable = ({ rows = 5, columns = 7 }) => {
  return (
    <div className="bg-white border border-[#e5e2db] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#fafafa] border-b border-[#e5e2db]">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="p-2">
                  <Skeleton className="h-3 w-16 rounded" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <SkeletonRoomRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Guest Portal Skeleton
export const GuestPortalSkeleton = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="max-w-md mx-auto p-4">
        {/* Header Skeleton */}
        <div className="text-center mb-6">
          <Skeleton className="h-14 w-14 rounded-2xl mx-auto mb-3" />
          <Skeleton className="h-6 w-32 mx-auto rounded" />
          <Skeleton className="h-4 w-24 mx-auto rounded mt-1" />
        </div>

        {/* Room Card Skeleton */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-6 text-center">
            <Skeleton className="h-3 w-16 mx-auto rounded bg-indigo-300/50" />
            <Skeleton className="h-8 w-32 mx-auto rounded mt-2 bg-indigo-300/50" />
            <Skeleton className="h-3 w-24 mx-auto rounded mt-1 bg-indigo-300/50" />
          </div>

          <div className="p-4">
            {/* Timer Skeleton */}
            <div className="text-center mb-4">
              <Skeleton className="h-3 w-24 mx-auto rounded" />
              <Skeleton className="h-10 w-32 mx-auto rounded mt-2" />
              <Skeleton className="h-3 w-20 mx-auto rounded mt-1" />
            </div>

            {/* Booking Info Skeleton */}
            <div className="border-t border-gray-100 pt-3 space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-4 w-20 rounded" />
                </div>
              ))}
            </div>

            {/* WiFi Button Skeleton */}
            <div className="mt-4">
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>

            {/* Menu Button Skeleton */}
            <div className="mt-4">
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>

            {/* Chat Skeleton */}
            <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-4 w-32 rounded" />
              </div>
              <div className="bg-white rounded-lg p-2 border">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-3/4 rounded-lg" />
                  <Skeleton className="h-8 w-1/2 rounded-lg ml-auto" />
                  <Skeleton className="h-8 w-2/3 rounded-lg" />
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <Skeleton className="h-9 flex-1 rounded-lg" />
                <Skeleton className="h-9 w-12 rounded-lg" />
              </div>
            </div>

            {/* QR Code Skeleton */}
            <div className="mt-4 text-center">
              <Skeleton className="h-24 w-24 rounded-lg mx-auto" />
              <Skeleton className="h-3 w-32 mx-auto rounded mt-2" />
            </div>
          </div>
        </div>

        {/* Footer Skeleton */}
        <div className="text-center mt-4">
          <Skeleton className="h-3 w-48 mx-auto rounded" />
        </div>
      </div>
    </div>
  );
};

// Room Not Found Skeleton
export const RoomNotFoundSkeleton = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center p-8">
        <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
        <Skeleton className="h-6 w-32 mx-auto rounded" />
        <Skeleton className="h-4 w-48 mx-auto rounded mt-2" />
        <Skeleton className="h-10 w-32 mx-auto rounded mt-4" />
      </div>
    </div>
  );
};

// Full Guest Portal Loading
export const GuestPortalLoading = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <Skeleton className="h-4 w-32 mx-auto rounded mt-4" />
      </div>
    </div>
  );
};

// Report Panel Skeleton
export const SkeletonReportPanel = () => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
      <div className="bg-white w-full max-w-4xl h-full overflow-y-auto">
        <div className="sticky top-0 bg-[#0f1b2d] text-white p-4 flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-48 rounded bg-white/20" />
            <Skeleton className="h-3 w-32 rounded mt-1 bg-white/10" />
          </div>
          <Skeleton className="h-6 w-6 rounded bg-white/20" />
        </div>
        <div className="p-4">
          <div className="bg-[#f7f3ee] rounded-xl p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-10 w-40 rounded mt-1" />
              </div>
              <div>
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-10 w-40 rounded mt-1" />
              </div>
              <div className="flex gap-2 mt-auto">
                <Skeleton className="h-9 w-20 rounded" />
                <Skeleton className="h-9 w-20 rounded" />
                <Skeleton className="h-9 w-20 rounded" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white border border-[#e5e2db] rounded-xl p-4 text-center">
                <Skeleton className="h-8 w-24 mx-auto rounded" />
                <Skeleton className="h-3 w-16 mx-auto rounded mt-1" />
              </div>
            ))}
          </div>
          <SkeletonTable rows={4} columns={7} />
        </div>
      </div>
    </div>
  );
};
