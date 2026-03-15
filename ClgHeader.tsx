
"use client";
import * as React from "react";

const CollegeHeader = ({
  title = "Unified Grievance Redressal Portal",
}) => {
  return (
    <header className="bg-white shadow-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <img
              src="/dait-logo.png"
              alt="Dhaanish Ahmed Institute of Technology Logo"
              className="h-24 w-auto object-contain drop-shadow-sm"
            />
            <div className="hidden lg:block h-16 w-[1px] bg-slate-200"></div>
            <div className="hidden lg:flex flex-col">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">
                Dhaanish Ahmed Institute of Technology
              </h1>
              <span className="text-sm font-bold text-indigo-600 mt-1 uppercase tracking-[0.2em]">
                {title}
              </span>
            </div>
          </div>

          <div className="lg:hidden text-right">
             <h1 className="text-sm font-black text-slate-900 leading-none">DAIT Redressal</h1>
             <span className="text-[10px] font-bold text-indigo-600 uppercase">ICGRS Portal</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default CollegeHeader;