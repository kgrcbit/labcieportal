import React, { useEffect, useState, useRef } from "react";
import API from "../api/api";
import dayjs from "dayjs";
import { useReactToPrint } from "react-to-print";

export default function FacultyEnterMarks(){
  const [assignments, setAssignments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [date, setDate] = useState("");
  const [students, setStudents] = useState([]);
  const [marksMap, setMarksMap] = useState({});
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [marksHistory, setMarksHistory] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [editingWeek, setEditingWeek] = useState(null);
  const [editMarks, setEditMarks] = useState({});

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
      fetchStudents();
      fetchMarksHistory();
    }
  }, [selected]);

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

      const res = await API.get(`/faculty/labs/${selected}/students?section=${assignment.section}`);
      setStudents(res.data.students || []);
      
      // Initialize marks map
      const initialMarks = {};
      (res.data.students || []).forEach(s => {
        initialMarks[s._id] = "";
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

  const handleChange = (sid, value) => {
    setMarksMap(prev => ({ ...prev, [sid]: value }));
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
        marks: Object.entries(marksMap).map(([studentId, mark]) => ({
          studentId,
          marks: Number(mark) || null
        }))
      };

      await API.post("/faculty/labs/enter-marks", payload);
      setMsg({ type: "success", text: "Marks submitted successfully!" });
      
      // Reset marks
      const resetMarks = {};
      students.forEach(s => {
        resetMarks[s._id] = "";
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
      console.log(`Processing mark for date ${weekDate}, student ${mark.studentId}, marks ${mark.marks}`);
      if (weeks[weekDate]) {
        weeks[weekDate].students[mark.studentId] = mark.marks;
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
      initialEditMarks[student._id] = existingMarks || '';
    });
    setEditMarks(initialEditMarks);
  };

  const handleEditChange = (studentId, value) => {
    setEditMarks(prev => ({
      ...prev,
      [studentId]: value
    }));
  };

  const saveEditMarks = async () => {
    if (!selectedWeek) return;
    
    try {
      setLoading(true);
      const payload = {
        labAssignmentId: selected,
        date: selectedWeek,
        marks: Object.entries(editMarks).map(([studentId, mark]) => ({
          studentId,
          marks: Number(mark) || null
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
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Enter Lab CIE Marks</h1>
          <p className="mt-2 text-gray-600">Enter and manage Continuous Internal Evaluation marks for your assigned labs</p>
        </div>

        {/* Lab Selection and Date */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Select Lab and Session</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Lab</label>
              <select 
                value={selected || ""} 
                onChange={e => setSelected(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select lab --</option>
                {assignments.map(a => (
                  <option key={a._id} value={a._id}>
                    {a.labId?.labName} - {a.section} ({a.labId?.labCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Session Date</label>
              <select 
                value={date} 
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select session --</option>
                {getLabWeekDates().map(week => (
                  <option key={week.date} value={week.date}>
                    Week {week.weekNumber} - {week.displayDate}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button 
                onClick={submit} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Enter Marks for {getLabWeekDates().find(w => w.date === date)?.displayDate || date}</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 font-medium text-gray-700 w-20">Roll No</th>
                    <th className="text-left py-3 font-medium text-gray-700">Student Name</th>
                    <th className="text-left py-3 font-medium text-gray-700 w-32">CIE Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                    <tr key={student._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 font-medium text-gray-900">{student.username}</td>
                      <td className="py-4 text-gray-900">{student.name}</td>
                      <td className="py-4">
                        <input 
                          type="number"
                          min="0"
                          max="100"
                          value={marksMap[student._id] || ""} 
                          onChange={e => handleChange(student._id, e.target.value)}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                          placeholder="Enter marks"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Marks Overview Table */}
        {weekDates.length > 0 && students.length > 0 && (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Lab Marks Overview</h2>
                <p className="text-gray-600 mt-1">Click on any week to edit marks</p>
              </div>
              <button
                onClick={handlePrint}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print Overview</span>
              </button>
            </div>
            
            <div className="overflow-x-auto" ref={printRef}>
              {/* Print Header - Only visible when printing */}
              <div className="hidden print:block">
                <h1 className="text-2xl font-bold text-center mb-2">Lab Marks Overview</h1>
                <div className="text-center mb-4">
                  <p className="font-medium">{getCurrentAssignment()?.labId?.labName} - {getCurrentAssignment()?.section}</p>
                  <p className="text-gray-600">Generated on {dayjs().format('MMMM DD, YYYY')}</p>
                </div>
              </div>

              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 font-medium text-gray-700 w-20">Roll</th>
                    <th className="text-left py-3 font-medium text-gray-700 min-w-32">Name</th>
                    {weekDates.map(weekDate => {
                      const weekData = marksByWeek[weekDate];
                      return (
                        <th 
                          key={weekDate} 
                          className="text-center py-3 font-medium text-gray-700 w-32 cursor-pointer hover:bg-gray-50 transition-colors print:cursor-default"
                          onClick={() => handleEditWeek(weekDate)}
                          title={`Click to edit Week ${weekData.weekNumber} marks`}
                        >
                          <div className="text-sm">
                            <div className="font-medium">Week {weekData.weekNumber}</div>
                            <div className="text-gray-500 text-xs">{weekData.displayDate}</div>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                    <tr key={student._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 font-medium text-gray-900">{student.username}</td>
                      <td className="py-4 text-gray-900">{student.name}</td>
                      {weekDates.map(weekDate => {
                        const weekData = marksByWeek[weekDate];
                        const studentMarks = weekData.students[student._id];
                        
                        return (
                          <td 
                            key={weekDate} 
                            className="text-center py-4 cursor-pointer hover:bg-gray-50 transition-colors print:cursor-default"
                            onClick={() => handleEditWeek(weekDate)}
                          >
                            <span className={`inline-flex items-center justify-center w-12 h-8 rounded-full text-sm font-medium ${
                              studentMarks !== undefined && studentMarks !== null && studentMarks !== ''
                                ? 'bg-green-100 text-green-800 print:bg-white print:border print:border-green-300'
                                : 'bg-gray-100 text-gray-500 print:bg-white print:border print:border-gray-300'
                            }`}>
                              {studentMarks !== undefined && studentMarks !== null && studentMarks !== '' 
                                ? studentMarks 
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

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 font-medium text-gray-700 w-20">Roll</th>
                      <th className="text-left py-3 font-medium text-gray-700">Name</th>
                      <th className="text-left py-3 font-medium text-gray-700 w-32">CIE Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(student => {
                      const originalMarks = marksByWeek[selectedWeek]?.students[student._id];
                      
                      return (
                        <tr key={student._id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 font-medium text-gray-900">{student.username}</td>
                          <td className="py-4 text-gray-900">{student.name}</td>
                          <td className="py-4">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={editMarks[student._id] || ''}
                              onChange={e => handleEditChange(student._id, e.target.value)}
                              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                              placeholder="Enter marks"
                            />
                            {originalMarks !== undefined && originalMarks !== null && originalMarks !== '' && (
                              <div className="text-xs text-gray-500 mt-1 text-center">
                                Previous: {originalMarks}
                              </div>
                            )}
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