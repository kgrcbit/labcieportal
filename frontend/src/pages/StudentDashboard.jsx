import React, { useEffect, useRef, useState } from "react";
import API from "../api/api";
import dayjs from "dayjs";
import { useReactToPrint } from "react-to-print";

export default function StudentDashboard(){
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLabId, setSelectedLabId] = useState("");
  const printRef = useRef();
  const handlePrint = useReactToPrint({ content: () => printRef.current, documentTitle: "Lab_Marks_Report" });

  useEffect(() => {
    fetchMarks();
  }, []);

  const fetchMarks = async () => {
    try {
      setLoading(true);
      const res = await API.get("/student/me/marks");
      setData(res.data);
    } catch (err) {
      console.error("Error fetching marks:", err);
      setError("Failed to load marks");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="loading">
          <div className="flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading your marks...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="error">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      </div>
    );
  }

  const labs = data?.labs || [];
  const selectedLab = labs.find(l => (l.labId || "") === selectedLabId);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Lab Marks</h1>

      {/* No labs */}
      {labs.length === 0 && (
        <div className="text-center text-gray-600">No lab assignments found.</div>
      )}

      {/* Lab Filter */}
      {labs.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Lab</label>
          <select
            value={selectedLabId}
            onChange={(e) => setSelectedLabId(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Choose a lab --</option>
            {labs.map((l, idx) => (
              <option key={l.labId || idx} value={l.labId || ""}>
                {l.labName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Selected Lab Report */}
      {selectedLab && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          {/* Actions */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xl font-semibold text-gray-900">{selectedLab.labName}</div>
              <div className="text-sm text-gray-600">Faculty: {selectedLab.faculty || "TBD"}</div>
            </div>
            <button
              onClick={handlePrint}
              className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm"
            >
              Download Report
            </button>
          </div>

          {/* Printable content */}
          <div ref={printRef}>
            {/* Print header */}
            <div className="hidden print:block mb-4">
              <h2 className="text-xl font-bold text-center">Lab Marks Report</h2>
              <p className="text-center text-sm">{selectedLab.labName} • Faculty: {selectedLab.faculty || "TBD"}</p>
            </div>

            {/* Marks Table - Minimal */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 font-medium text-gray-700">Week</th>
                    <th className="text-left py-3 font-medium text-gray-700">Date</th>
                    <th className="text-left py-3 font-medium text-gray-700">CIE Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedLab.sessions?.map((s, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-3 text-gray-900">Week {i + 1}</td>
                      <td className="py-3 text-gray-900">{dayjs(s.date).format("DD MMM YYYY")}</td>
                      <td className="py-3 text-gray-900">{s.marks ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
