import React, { useEffect, useState } from "react";
import API from "../api/api";
import dayjs from "dayjs";

export default function StudentDashboard(){
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const calculateAverage = (sessions) => {
    if (!sessions || sessions.length === 0) return { CIE1: 0, CIE2: 0, CIE3: 0 };
    
    const totals = sessions.reduce((acc, session) => {
      if (session.marks) {
        acc.CIE1 += session.marks.CIE1 || 0;
        acc.CIE2 += session.marks.CIE2 || 0;
        acc.CIE3 += session.marks.CIE3 || 0;
        acc.count += 1;
      }
      return acc;
    }, { CIE1: 0, CIE2: 0, CIE3: 0, count: 0 });

    if (totals.count === 0) return { CIE1: 0, CIE2: 0, CIE3: 0 };

    return {
      CIE1: Math.round(totals.CIE1 / totals.count),
      CIE2: Math.round(totals.CIE2 / totals.count),
      CIE3: Math.round(totals.CIE3 / totals.count)
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">My Lab Marks</h1>
          <p className="mt-2 text-gray-600">View your Continuous Internal Evaluation marks for all assigned labs</p>
        </div>

        {/* No Data State */}
        {(!data || !data.labs || data.labs.length === 0) && (
          <div className="card p-8 text-center">
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Lab Assignments</h3>
              <p className="mt-1 text-sm text-gray-500">You haven't been assigned to any labs yet.</p>
            </div>
          </div>
        )}

        {/* Lab Marks Cards */}
        <div className="space-y-6">
          {data?.labs?.map((lab, index) => {
            const average = calculateAverage(lab.sessions);
            const totalSessions = lab.sessions?.length || 0;
            const completedSessions = lab.sessions?.filter(s => s.marks && (s.marks.CIE1 || s.marks.CIE2 || s.marks.CIE3)).length || 0;

            return (
              <div key={lab.labId || index} className="card p-8 fade-in">
                {/* Lab Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{lab.labName}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {lab.dayOfWeek} • Faculty: {lab.faculty || "TBD"}
                    </p>
                  </div>
                  
                  {/* Progress Indicator */}
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Progress</div>
                    <div className="text-lg font-semibold text-blue-600">
                      {completedSessions}/{totalSessions} sessions
                    </div>
                    <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Average Marks Summary */}
                {completedSessions > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-medium text-blue-900 mb-3">Average Marks</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{average.CIE1}</div>
                        <div className="text-xs text-blue-700">CIE1</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{average.CIE2}</div>
                        <div className="text-xs text-blue-700">CIE2</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{average.CIE3}</div>
                        <div className="text-xs text-blue-700">CIE3</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Marks Table */}
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Week</th>
                        <th>Date</th>
                        <th>CIE1</th>
                        <th>CIE2</th>
                        <th>CIE3</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lab.sessions?.map((session, sessionIndex) => {
                        const hasMarks = session.marks && (session.marks.CIE1 || session.marks.CIE2 || session.marks.CIE3);
                        return (
                          <tr key={sessionIndex}>
                            <td className="font-medium">Week {sessionIndex + 1}</td>
                            <td>{dayjs(session.date || session).format("DD MMM YYYY")}</td>
                            <td className="text-center">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                session.marks?.CIE1 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-500'
                              }`}>
                                {session.marks?.CIE1 ?? "-"}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                session.marks?.CIE2 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-500'
                              }`}>
                                {session.marks?.CIE2 ?? "-"}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                session.marks?.CIE3 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-500'
                              }`}>
                                {session.marks?.CIE3 ?? "-"}
                              </span>
                            </td>
                            <td>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                hasMarks 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {hasMarks ? 'Completed' : 'Pending'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Lab Summary */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{totalSessions}</div>
                      <div className="text-sm text-gray-500">Total Sessions</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{completedSessions}</div>
                      <div className="text-sm text-gray-500">Completed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0}%
                      </div>
                      <div className="text-sm text-gray-500">Completion</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
