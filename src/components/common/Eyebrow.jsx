// src/components/common/Eyebrow.jsx
export function Eyebrow({ children, light = false }) {
  return (
    <div className="flex items-center gap-3 mb-5 justify-center md:justify-start">
      <span className="h-px w-8 bg-[#c9a84c]" />
      <span
        className={`text-xs tracking-[0.25em] uppercase font-semibold ${
          light ? "text-[#0f1b2d]/70" : "text-[#c9a84c]"
        }`}>
        {children}
      </span>
    </div>
  );
}
