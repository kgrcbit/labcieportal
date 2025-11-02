import React, { useEffect, useState, useRef } from "react";
import API from "../api/api";
import dayjs from "dayjs";
import { useReactToPrint } from "react-to-print";

export default function FacultyEnterMarks(){
  const [assignments, setAssignments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [date, setDate] = useState("");
  const [students, setStudents] = useState([]);
  const [marksMap, setMarksMap] = useState({}); // Format: { studentId: { Pr, PE, P, R, C, T } }
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [marksHistory, setMarksHistory] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [editingWeek, setEditingWeek] = useState(null);
  const [editMarks, setEditMarks] = useState({});
  const [batch, setBatch] = useState("All");
  const [showMarksOverview, setShowMarksOverview] = useState(false);

  const printRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Lab_Marks_Overview_${selected}_${dayjs().format('YYYY-MM-DD')}`,
  });

  useEffect(() => {
    fetchAssignments();
  }, []);

  useEffect(() => {
    if (selected) {
      const assignment = assignments.find(a => a._id === selected);
      if (assignment) {
        setBatch(assignment.batch || "All");
      }
      fetchStudents();
      fetchMarksHistory();
    }
  }, [selected]);

  useEffect(() => {
    if (selected && batch) {
      fetchStudents();
    }
  }, [batch]);

  const fetchAssignments = async () => {
    try {
      const res = await API.get("/faculty/labs");
      setAssignments(res.data.labs || []);
    } catch (err) {
      console.error("Error fetching assignments:", err);
      setMsg({ type: "error", text: "Failed to load lab assignments" });
    }
  };

  const fetchStudents = async () => {
    try {
      const assignment = assignments.find(a => a._id === selected);
      if (!assignment) return;

      const res = await API.get(`/faculty/labs/${selected}/students?section=${assignment.section}&batch=${batch}`);
      setStudents(res.data.students || []);
      
      // Initialize marks map with new structure
      const initialMarks = {};
      (res.data.students || []).forEach(s => {
        initialMarks[s._id] = {
          Pr: "",
          PE: "",
          P: "",
          R: "",
          C: "",
          T: ""
        };
      });
      setMarksMap(initialMarks);
      
      // Set default date to first available lab date
      const labWeekDates = getLabWeekDates();
      if (labWeekDates.length > 0) {
        setDate(labWeekDates[0].date);
      } else {
        setDate(dayjs().format("YYYY-MM-DD"));
      }
    } catch (err) {
      console.error("Error fetching students:", err);
      setMsg({ type: "error", text: "Failed to load students" });
    }
  };

  const fetchMarksHistory = async () => {
    try {
      const res = await API.get(`/faculty/labs/${selected}/marks`);
      console.log("Marks history response:", res.data.marks);
      setMarksHistory(res.data.marks || []);
    } catch (err) {
      console.error("Error fetching marks history:", err);
    }
  };

  const calculateTotal = (pr, pe, p, r, c) => {
    const prVal = Number(pr) || 0;
    const peVal = Number(pe) || 0;
    const pVal = Number(p) || 0;
    const rVal = Number(r) || 0;
    const cVal = Number(c) || 0;
    return prVal + peVal + pVal + rVal + cVal;
  };

  const handleChange = (sid, field, value) => {
    setMarksMap(prev => {
      const current = prev[sid] || { Pr: "", PE: "", P: "", R: "", C: "", T: "" };
      const updated = { ...current, [field]: value };
      
      // Auto-calculate total if any of Pr, PE, P, R, C changes
      if (['Pr', 'PE', 'P', 'R', 'C'].includes(field)) {
        updated.T = calculateTotal(updated.Pr, updated.PE, updated.P, updated.R, updated.C);
      }
      
      return { ...prev, [sid]: updated };
    });
  };

  const submit = async () => {
    setMsg(null);
    setLoading(true);
    
    try {
      const assignment = assignments.find(a => a._id === selected);
      if (!assignment) throw new Error("Assignment not found");

      const payload = {
        labAssignmentId: selected,
        date,
        marks: Object.entries(marksMap).map(([studentId, markData]) => ({
          studentId,
          Pr: markData.Pr ? Number(markData.Pr) : null,
          PE: markData.PE ? Number(markData.PE) : null,
          P: markData.P ? Number(markData.P) : null,
          R: markData.R ? Number(markData.R) : null,
          C: markData.C ? Number(markData.C) : null,
          T: markData.T ? Number(markData.T) : null
        }))
      };

      await API.post("/faculty/labs/enter-marks", payload);
      setMsg({ type: "success", text: "Marks submitted successfully!" });
      
      // Reset marks
      const resetMarks = {};
      students.forEach(s => {
        resetMarks[s._id] = {
          Pr: "",
          PE: "",
          P: "",
          R: "",
          C: "",
          T: ""
        };
      });
      setMarksMap(resetMarks);
      
      // Refresh history to show updated marks in overview
      fetchMarksHistory();
    } catch (err) {
      setMsg({ type: "error", text: err?.response?.data?.message || "Failed to submit marks" });
    } finally {
      setLoading(false);
    }
  };

  // Get lab assignment details to generate proper week dates
  const getLabWeekDates = () => {
    if (!selected) return [];
    
    const assignment = assignments.find(a => a._id === selected);
    console.log("Selected assignment:", assignment);
    
    if (!assignment || !assignment.generatedDates) {
      console.log("No assignment or generatedDates found");
      return [];
    }
    
    const weekDates = assignment.generatedDates.map((date, index) => ({
      weekNumber: index + 1,
      date: dayjs(date).format('YYYY-MM-DD'),
      displayDate: dayjs(date).format('MMM DD, YYYY')
    }));
    
    console.log("Generated week dates:", weekDates);
    return weekDates;
  };

  // Group marks by week for grid display
  const getMarksByWeek = () => {
    const weeks = {};
    const labWeekDates = getLabWeekDates();
    
    console.log("Lab week dates:", labWeekDates);
    console.log("Marks history:", marksHistory);
    
    // Initialize all weeks from lab schedule
    labWeekDates.forEach(week => {
      weeks[week.date] = {
        weekNumber: week.weekNumber,
        date: week.date,
        displayDate: week.displayDate,
        students: {}
      };
    });
    
    // Populate with existing marks
    marksHistory.forEach(mark => {
      const weekDate = dayjs(mark.date).format('YYYY-MM-DD');
      console.log(`Processing mark for date ${weekDate}, student ${mark.studentId}, marks ${mark.T || mark.marks}`);
      if (weeks[weekDate]) {
        weeks[weekDate].students[mark.studentId] = {
          Pr: mark.Pr !== null && mark.Pr !== undefined ? mark.Pr : null,
          PE: mark.PE !== null && mark.PE !== undefined ? mark.PE : null,
          P: mark.P !== null && mark.P !== undefined ? mark.P : null,
          R: mark.R !== null && mark.R !== undefined ? mark.R : null,
          C: mark.C !== null && mark.C !== undefined ? mark.C : null,
          T: mark.T !== null && mark.T !== undefined ? mark.T : (mark.marks || null)
        };
      } else {
        console.log(`Week date ${weekDate} not found in lab schedule`);
      }
    });
    
    console.log("Final weeks object:", weeks);
    return weeks;
  };

  const marksByWeek = getMarksByWeek();
  const weekDates = Object.keys(marksByWeek).sort();

  // Edit functions
  const handleEditWeek = (weekDate) => {
    setSelectedWeek(weekDate);
    setEditingWeek(true);
    const weekData = marksByWeek[weekDate];
    
    // Initialize edit marks with existing data
    const initialEditMarks = {};
    students.forEach(student => {
      const existingMarks = weekData.students[student._id];
      initialEditMarks[student._id] = existingMarks || {
        Pr: "",
        PE: "",
        P: "",
        R: "",
        C: "",
        T: ""
      };
    });
    setEditMarks(initialEditMarks);
  };

  const handleEditChange = (studentId, field, value) => {
    setEditMarks(prev => {
      const current = prev[studentId] || { Pr: "", PE: "", P: "", R: "", C: "", T: "" };
      const updated = { ...current, [field]: value };
      
      // Auto-calculate total if any of Pr, PE, P, R, C changes
      if (['Pr', 'PE', 'P', 'R', 'C'].includes(field)) {
        updated.T = calculateTotal(updated.Pr, updated.PE, updated.P, updated.R, updated.C);
      }
      
      return { ...prev, [studentId]: updated };
    });
  };

  const saveEditMarks = async () => {
    if (!selectedWeek) return;
    
    try {
      setLoading(true);
      const payload = {
        labAssignmentId: selected,
        date: selectedWeek,
        marks: Object.entries(editMarks).map(([studentId, markData]) => ({
          studentId,
          Pr: markData.Pr ? Number(markData.Pr) : null,
          PE: markData.PE ? Number(markData.PE) : null,
          P: markData.P ? Number(markData.P) : null,
          R: markData.R ? Number(markData.R) : null,
          C: markData.C ? Number(markData.C) : null,
          T: markData.T ? Number(markData.T) : null
        }))
      };

      await API.post("/faculty/labs/enter-marks", payload);
      setMsg({ type: "success", text: `Week ${marksByWeek[selectedWeek].weekNumber} marks updated successfully!` });
      setEditingWeek(false);
      setSelectedWeek(null);
      fetchMarksHistory();
    } catch (err) {
      setMsg({ type: "error", text: err?.response?.data?.message || "Failed to update marks" });
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingWeek(false);
    setSelectedWeek(null);
    setEditMarks({});
  };

  // Get current assignment details
  const getCurrentAssignment = () => {
    return assignments.find(a => a._id === selected);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">

        {/* Lab Selection and Date */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Select Lab and Session</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Lab</label>
              <select 
                value={selected || ""} 
                onChange={e => setSelected(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select lab --</option>
                {assignments.map(a => (
                  <option key={a._id} value={a._id}>
                    {a.labId?.labName} - {a.section} ({a.labId?.labCode})
                  </option>
                ))}
              </select>
            </div>

            {selected && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Batch</label>
                <select 
                  value={batch} 
                  onChange={e => setBatch(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="All">All Batches</option>
                  <option value="Batch-1">Batch-1</option>
                  <option value="Batch-2">Batch-2</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Session Date</label>
              <select 
                value={date} 
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select session --</option>
                {getLabWeekDates().map(week => (
                  <option key={week.date} value={week.date}>
                    Week {week.weekNumber} - {week.displayDate}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-end">
            <button 
              onClick={submit} 
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white py-3 px-8 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !selected || students.length === 0}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </div>
              ) : (
                "Submit Marks"
              )}
            </button>
          </div>

          {msg && (
            <div className={`mt-4 p-4 rounded-md ${
              msg.type === "success" 
                ? "bg-green-50 text-green-800 border border-green-200" 
                : "bg-red-50 text-red-800 border border-red-200"
            }`}>
              {msg.text}
            </div>
          )}
        </div>

        {/* Current Session Marks Entry */}
        {students.length > 0 && (
          <div className="bg-white p-2 rounded-sm shadow-sm border border-gray-200">
            <h2 className="text-xs font-semibold text-gray-900 mb-2">Enter Marks for {getLabWeekDates().find(w => w.date === date)?.displayDate || date}</h2>
            
            {/* Multi-Column Layout - Students displayed side by side */}
            <div className="overflow-x-auto">
              <div className="inline-flex gap-2">
                {/* Calculate how many columns can fit (2-3 columns typically) */}
                {(() => {
                  const studentsPerColumn = Math.ceil(students.length / 2);
                  const columns = [];
                  
                  for (let col = 0; col < 2; col++) {
                    const columnStudents = students.slice(col * studentsPerColumn, (col + 1) * studentsPerColumn);
                    
                    columns.push(
                      <div key={col} className="flex-shrink-0">
                        <table className="text-[10px] border-r border-gray-300 pr-2">
                          <thead className="sticky top-0 bg-white z-10">
                            <tr className="border-b-2 border-gray-400">
                              <th className="text-left py-1 px-0.5 font-semibold text-gray-700 w-[50px]">Roll</th>
                              <th className="text-left py-1 px-0.5 font-semibold text-gray-700 w-[60px]">Name</th>
                              <th className="text-center py-1 px-0 font-semibold text-gray-700 w-[35px]" title="Preparation (5 marks)">Pr</th>
                              <th className="text-center py-1 px-0 font-semibold text-gray-700 w-[35px]" title="Program Execution (5 marks)">PE</th>
                              <th className="text-center py-1 px-0 font-semibold text-gray-700 w-[35px]" title="Viva/Questions (10 marks)">P</th>
                              <th className="text-center py-1 px-0 font-semibold text-gray-700 w-[35px]" title="Record/Notes (5 marks)">R</th>
                              <th className="text-center py-1 px-0 font-semibold text-gray-700 w-[35px]" title="Regularity/Copy (5 marks)">C</th>
                              <th className="text-center py-1 px-0 font-semibold text-gray-700 w-[38px] bg-blue-100" title="Total (30 marks)">T</th>
                            </tr>
                          </thead>
                          <tbody>
                            {columnStudents.map(student => {
                              const studentMarks = marksMap[student._id] || { Pr: "", PE: "", P: "", R: "", C: "", T: "" };
                              return (
                                <tr key={student._id} className="border-b border-gray-200 hover:bg-gray-50">
                                  <td className="py-0.5 px-0.5 text-[10px] font-medium text-gray-900">{student.username}</td>
                                  <td className="py-0.5 px-0.5 text-[10px] text-gray-900 truncate max-w-[60px]" title={student.name}>{student.name}</td>
                                  <td className="py-0.5 px-0">
                                    <input 
                                      type="number"
                                      min="0"
                                      max="5"
                                      value={studentMarks.Pr || ""} 
                                      onChange={e => handleChange(student._id, "Pr", e.target.value)}
                                      className="w-full px-0.5 py-0.5 border border-gray-300 rounded text-center text-[10px] h-5"
                                      placeholder="0"
                                    />
                                  </td>
                                  <td className="py-0.5 px-0">
                                    <input 
                                      type="number"
                                      min="0"
                                      max="5"
                                      value={studentMarks.PE || ""} 
                                      onChange={e => handleChange(student._id, "PE", e.target.value)}
                                      className="w-full px-0.5 py-0.5 border border-gray-300 rounded text-center text-[10px] h-5"
                                      placeholder="0"
                                    />
                                  </td>
                                  <td className="py-0.5 px-0">
                                    <input 
                                      type="number"
                                      min="0"
                                      max="10"
                                      value={studentMarks.P || ""} 
                                      onChange={e => handleChange(student._id, "P", e.target.value)}
                                      className="w-full px-0.5 py-0.5 border border-gray-300 rounded text-center text-[10px] h-5"
                                      placeholder="0"
                                    />
                                  </td>
                                  <td className="py-0.5 px-0">
                                    <input 
                                      type="number"
                                      min="0"
                                      max="5"
                                      value={studentMarks.R || ""} 
                                      onChange={e => handleChange(student._id, "R", e.target.value)}
                                      className="w-full px-0.5 py-0.5 border border-gray-300 rounded text-center text-[10px] h-5"
                                      placeholder="0"
                                    />
                                  </td>
                                  <td className="py-0.5 px-0">
                                    <input 
                                      type="number"
                                      min="0"
                                      max="5"
                                      value={studentMarks.C || ""} 
                                      onChange={e => handleChange(student._id, "C", e.target.value)}
                                      className="w-full px-0.5 py-0.5 border border-gray-300 rounded text-center text-[10px] h-5"
                                      placeholder="0"
                                    />
                                  </td>
                                  <td className="py-0.5 px-0 bg-blue-50">
                                    <input 
                                      type="number"
                                      min="0"
                                      max="30"
                                      value={studentMarks.T || ""} 
                                      onChange={e => handleChange(student._id, "T", e.target.value)}
                                      className="w-full px-0.5 py-0.5 border border-blue-300 rounded text-center text-[10px] font-semibold h-5"
                                      placeholder="0"
                                      readOnly
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  }
                  return columns;
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Marks Overview Section */}
        {weekDates.length > 0 && students.length > 0 && (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Lab Marks Overview</h2>
                <p className="text-gray-600 mt-1">View all weeks marks for students</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowMarksOverview(!showMarksOverview)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showMarksOverview ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                  </svg>
                  <span>{showMarksOverview ? "Hide Details" : "Show Details"}</span>
                </button>
                {showMarksOverview && (
                  <button
                    onClick={handlePrint}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span>Print Overview</span>
                  </button>
                )}
              </div>
            </div>
            
            {showMarksOverview && (
              <div className="overflow-x-auto" ref={printRef}>
              {/* Print Header - Only visible when printing */}
              <div className="hidden print:block mb-4">
                <h1 className="text-xl font-bold text-center mb-1">Lab Marks Overview</h1>
                <div className="text-center mb-2">
                  <p className="text-sm font-medium">{getCurrentAssignment()?.labId?.labName} - {getCurrentAssignment()?.section} {batch && batch !== "All" ? `(${batch})` : ""}</p>
                  <p className="text-xs text-gray-600">Generated on {dayjs().format('MMMM DD, YYYY')}</p>
                </div>
                <div className="text-xs text-center mb-2">
                  <p className="font-semibold">Legend: Pr(5) = Preparation | PE(5) = Program Execution | P(10) = Viva | R(5) = Record | C(5) = Regularity | T(30) = Total</p>
                </div>
              </div>

              <table className="w-full text-xs print:text-xs">
                <thead>
                  <tr className="border-b-2 border-gray-300 print:border-gray-600">
                    <th className="text-left py-2 px-2 font-semibold text-gray-700 w-16 print:text-xs">Roll</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700 min-w-32 print:text-xs">Name</th>
                    {weekDates.map(weekDate => {
                      const weekData = marksByWeek[weekDate];
                      return (
                        <th 
                          key={weekDate} 
                          className="text-center py-2 px-1 font-semibold text-gray-700 w-16 cursor-pointer hover:bg-gray-50 transition-colors print:cursor-default print:text-xs"
                          onClick={() => handleEditWeek(weekDate)}
                          title={`Click to edit Week ${weekData.weekNumber} marks`}
                        >
                          <div>
                            <div className="font-medium text-xs">W{weekData.weekNumber}</div>
                            <div className="text-gray-500 text-[10px] print:text-[8px]">{weekData.displayDate}</div>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                    <tr key={student._id} className="border-b border-gray-200 hover:bg-gray-50 print:border-gray-300">
                      <td className="py-2 px-2 font-medium text-gray-900 print:text-xs">{student.username}</td>
                      <td className="py-2 px-2 text-gray-900 print:text-xs">{student.name}</td>
                      {weekDates.map(weekDate => {
                        const weekData = marksByWeek[weekDate];
                        const studentMarks = weekData.students[student._id];
                        const total = studentMarks && studentMarks.T !== null && studentMarks.T !== undefined ? studentMarks.T : null;
                        
                        return (
                          <td 
                            key={weekDate} 
                            className="text-center py-2 px-1 cursor-pointer hover:bg-gray-50 transition-colors print:cursor-default"
                            onClick={() => handleEditWeek(weekDate)}
                          >
                            <span className={`inline-flex items-center justify-center w-10 h-6 rounded text-xs font-semibold print:border print:border-gray-400 ${
                              total !== null && total !== undefined && total !== ''
                                ? 'bg-green-100 text-green-800 print:bg-white print:text-gray-900'
                                : 'bg-gray-100 text-gray-500 print:bg-white print:text-gray-500'
                            }`}>
                              {total !== null && total !== undefined && total !== '' 
                                ? total 
                                : '-'
                              }
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        )}

        {/* Edit Marks Modal */}
        {editingWeek && selectedWeek && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">
                  Edit Marks - Week {marksByWeek[selectedWeek]?.weekNumber} ({marksByWeek[selectedWeek]?.displayDate})
                </h3>
                <button
                  onClick={cancelEdit}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6 bg-blue-50 p-4 rounded-lg">
                <p className="text-blue-800 text-sm">
                  Editing marks for <strong>Week {marksByWeek[selectedWeek]?.weekNumber}</strong>. 
                  Update the marks below and click Save Changes.
                </p>
              </div>

              <div className="overflow-x-auto max-h-[60vh]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-2 px-2 font-semibold text-gray-700 w-16">Roll</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700 min-w-32">Name</th>
                      <th className="text-center py-2 px-1 font-semibold text-gray-700 w-14" title="Preparation (5 marks)">Pr(5)</th>
                      <th className="text-center py-2 px-1 font-semibold text-gray-700 w-14" title="Program Execution (5 marks)">PE(5)</th>
                      <th className="text-center py-2 px-1 font-semibold text-gray-700 w-14" title="Viva/Questions (10 marks)">P(10)</th>
                      <th className="text-center py-2 px-1 font-semibold text-gray-700 w-14" title="Record/Notes (5 marks)">R(5)</th>
                      <th className="text-center py-2 px-1 font-semibold text-gray-700 w-14" title="Regularity/Copy (5 marks)">C(5)</th>
                      <th className="text-center py-2 px-1 font-semibold text-gray-700 w-14 bg-blue-50" title="Total (30 marks)">T(30)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(student => {
                      const studentMarks = editMarks[student._id] || { Pr: "", PE: "", P: "", R: "", C: "", T: "" };
                      const originalMarks = marksByWeek[selectedWeek]?.students[student._id];
                      
                      return (
                        <tr key={student._id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="py-1.5 px-2 font-medium text-gray-900">{student.username}</td>
                          <td className="py-1.5 px-2 text-gray-900">{student.name}</td>
                          <td className="py-1.5 px-1">
                            <input
                              type="number"
                              min="0"
                              max="5"
                              value={studentMarks.Pr || ''}
                              onChange={e => handleEditChange(student._id, "Pr", e.target.value)}
                              className="w-full px-1 py-1 border border-gray-300 rounded text-center text-xs"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-1.5 px-1">
                            <input
                              type="number"
                              min="0"
                              max="5"
                              value={studentMarks.PE || ''}
                              onChange={e => handleEditChange(student._id, "PE", e.target.value)}
                              className="w-full px-1 py-1 border border-gray-300 rounded text-center text-xs"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-1.5 px-1">
                            <input
                              type="number"
                              min="0"
                              max="10"
                              value={studentMarks.P || ''}
                              onChange={e => handleEditChange(student._id, "P", e.target.value)}
                              className="w-full px-1 py-1 border border-gray-300 rounded text-center text-xs"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-1.5 px-1">
                            <input
                              type="number"
                              min="0"
                              max="5"
                              value={studentMarks.R || ''}
                              onChange={e => handleEditChange(student._id, "R", e.target.value)}
                              className="w-full px-1 py-1 border border-gray-300 rounded text-center text-xs"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-1.5 px-1">
                            <input
                              type="number"
                              min="0"
                              max="5"
                              value={studentMarks.C || ''}
                              onChange={e => handleEditChange(student._id, "C", e.target.value)}
                              className="w-full px-1 py-1 border border-gray-300 rounded text-center text-xs"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-1.5 px-1 bg-blue-50">
                            <input
                              type="number"
                              min="0"
                              max="30"
                              value={studentMarks.T || ''}
                              onChange={e => handleEditChange(student._id, "T", e.target.value)}
                              className="w-full px-1 py-1 border border-blue-300 rounded text-center text-xs font-semibold"
                              placeholder="0"
                              readOnly
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end space-x-4 mt-6 pt-6 border-t">
                <button
                  onClick={cancelEdit}
                  className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditMarks}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </div>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No Data States */}
        {assignments.length === 0 && (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center">
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Lab Assignments</h3>
              <p className="mt-1 text-sm text-gray-500">You haven't been assigned to any labs yet.</p>
            </div>
          </div>
        )}

        {selected && students.length === 0 && (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center">
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Students Found</h3>
              <p className="mt-1 text-sm text-gray-500">No students are enrolled in this lab section.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}