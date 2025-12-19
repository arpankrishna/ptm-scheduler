import React, { useState, useEffect, useMemo } from 'react';
import { Download, CheckCircle, Coffee, Play, Pause, Calendar, User, Lock } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PTMScheduler = () => {
  // Teacher data by grade
  const teacherData = {
    'IX': ['AABHA S', 'AKANSHA G', 'ALISHA N', 'ANCHAL K', 'ANURADHA M', 'ARCHANA S', 'ARTI V', 'ASITA T', 'BHAWNA K', 'CHANDRANEEV D', 'DEBJANI B', 'DEVIKA N', 'DIVYA T', 'DIYA S', 'GEETA K', 'GUNJANH S', 'HEEMAKSHI S', 'HEMA L', 'HEPZIBAH R', 'JAYITA D', 'JUHI', 'KARUNA A', 'KRISHNA G', 'MANISHA A', 'MANPREET K', 'NEELAM G', 'PINKI T', 'POOJA P', 'PRACHI J', 'PRAMIT S', 'PRATIBHA M', 'PRAVEEN R', 'PRITHA C', 'RAJANI R', 'RAJASHREE M', 'RENU S', 'RINKU C', 'ROMYARUP M', 'RUCHI M', 'SANA J', 'SANA N', 'SEEMA S', 'SEEMA V', 'SHIBANI', 'SHREYA N', 'SHRUTI J', 'SNEHA M', 'SUHANA A', 'SWAYTHA S', 'TARUN N', 'TARUNA T', 'VANITA K'],
    'X': ['AABHA S', 'AKANSHA G', 'ALISHA N', 'ANUPMA S', 'ANURADHA M', 'ARPAN D', 'ARPITA H', 'ARTI V', 'ASITA T', 'BHAWNA K', 'DEBJANI B', 'DIYA S', 'EISHWINDER K', 'GOKUL N', 'HEEMAKSHI S', 'HEMA L', 'HEPZIBAH R', 'JAYITA D', 'JUHI M', 'KANICA S', 'KARUNA A', 'KISHAN S', 'MANISHA A', 'MANPREET K', 'MEGHALI R', 'PINKI T', 'PRACHI J', 'PUNEETA S', 'PURNA C', 'RAJANI R', 'RAJASHREE M', 'RAJEEV S', 'RENU S', 'RINKU C', 'ROMYARUP M', 'RUCHI K', 'SANDHYA T', 'SEEMA V', 'SHEFALI M', 'SHRUTI N', 'SMITA K', 'STEPHAN E', 'SUMA S', 'SWARNA J', 'SWAYTHA S', 'VANITA K'],
    'XI': ['ADITI G', 'AKANSHA G', 'APOORVA S', 'ARPAN D', 'ARTI V', 'BHAWNA K', 'DEBJANI B', 'DEEPA G', 'DEVIKA N', 'DIVYA T', 'DIYA S', 'EISHWINDER K', 'GOKUL N', 'HEMA L', 'HEPZIBAH R', 'JAYITA D', 'KARUNA A', 'KK TANWANI', 'MANPREET K', 'NEELAM G', 'NEERA S', 'POOJA P', 'PRAMIT S', 'PRATIBHA M', 'PRAVEEN R', 'PRITHA C', 'PUNEETA S', 'PURNA C', 'RACHNA S', 'RAFIA Z', 'RAJEEV S', 'RENU S', 'ROMYARUP M', 'RUCHI K', 'RUCHI M', 'SANDHYA T', 'SEEMA S', 'SHEFALI M', 'SHREYA N', 'SNEHAL P', 'SUMA S', 'SWAYTHA S', 'TARUN N', 'URMI D', 'VANITA K', 'VIBHOR V'],
    'XII': ['ADITI G', 'ALISHA N', 'ANUBHA P', 'ANURADHA M', 'APOORVA S', 'ARPAN D', 'ARPITA H', 'ASITA T', 'DEEPA G', 'DEVIKA N', 'DIVYA T', 'DIYA S', 'EISHWINDER K', 'GOKUL N', 'GUNJANH S', 'HEEMAKSHI S', 'HEPZIBAH R', 'JAYITA D', 'KANICA S', 'KARUNA A', 'KISHAN S', 'KK TANWANI', 'MAMTA', 'MANISHA A', 'POOJA P', 'PRACHI J', 'PRAMIT S', 'PRATIBHA M', 'PRITHA C', 'PUNEETA S', 'PURNA C', 'RACHNA S', 'RAFIA', 'RAJANI R', 'RAJEEV S', 'REENA B', 'ROMYARUP M', 'RUCHI K', 'RUCHI M', 'SANA N', 'SANDHYA T', 'SEEMA S', 'SHEFALI M', 'SNEHAL P', 'STEPHAN', 'SUMA S', 'SWAYTHA S', 'URMI D', 'VIJAYASHREE R']
  };

  // Phase definitions
  const phases = {
    phase1: { name: 'Phase 1', time: '8:15 AM - 9:40 AM', slots: 16 },
    phase2: { name: 'Phase 2', time: '9:55 AM - 11:20 AM', slots: 16 },
    phase3: { name: 'Phase 3', time: '11:35 AM - 1:00 PM', slots: 16 }
  };

  const sheets = ['IX', 'X', 'XI', 'XII'];
  const sections = ['A', 'B', 'C', 'D', 'E', 'F'];
  const adminPassword = 'SBS-admin_2025';

  // All unique teachers
  const allTeachers = useMemo(() => {
    const teacherSet = new Set();
    Object.values(teacherData).forEach(teachers => {
      teachers.forEach(teacher => teacherSet.add(teacher));
    });
    return Array.from(teacherSet).sort();
  }, []);

  // State
  const [userRole, setUserRole] = useState(null); // null, 'teacher', 'admin'
  const [loggedInTeacher, setLoggedInTeacher] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [loginType, setLoginType] = useState('teacher');
  
  const [bookings, setBookings] = useState({});
  const [teacherStatus, setTeacherStatus] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeSheet, setActiveSheet] = useState('IX');
  const [activePhase, setActivePhase] = useState('phase1');
  const [slideshowMode, setSlideshowMode] = useState(false);
  const [currentSlideGrade, setCurrentSlideGrade] = useState(0);
  
  // Parent booking form state
  const [studentName, setStudentName] = useState('');
  const [studentSection, setStudentSection] = useState('');
  const [selectedTeachers, setSelectedTeachers] = useState([]); // Array of { teacher, grade, phase, slot }
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmations, setConfirmations] = useState([]);

  // Load data
  useEffect(() => {
    loadBookings();
    loadTeacherStatus();
  }, []);

  // Real-time subscriptions
  useEffect(() => {
    const bookingsSubscription = supabase
      .channel('bookings_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'bookings' }, 
        () => loadBookings()
      )
      .subscribe();

    const statusSubscription = supabase
      .channel('teacher_status_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'teacher_status' },
        () => loadTeacherStatus()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsSubscription);
      supabase.removeChannel(statusSubscription);
    };
  }, []);

  // Slideshow auto-advance
  useEffect(() => {
    if (slideshowMode && userRole === 'admin') {
      const interval = setInterval(() => {
        setCurrentSlideGrade(prev => (prev + 1) % sheets.length);
      }, 8000); // 8 seconds per grade
      return () => clearInterval(interval);
    }
  }, [slideshowMode, userRole]);

  useEffect(() => {
    if (slideshowMode) {
      setActiveSheet(sheets[currentSlideGrade]);
    }
  }, [currentSlideGrade, slideshowMode]);

  // Load functions
  const loadBookings = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('*');

    if (error) {
      console.error('Error loading bookings:', error);
      setIsLoading(false);
      return;
    }

    const bookingsMap = {};
    data.forEach(booking => {
      bookingsMap[booking.booking_key] = {
        studentName: booking.student_name,
        studentClass: booking.student_class,
        studentSection: booking.student_section,
        grade: booking.grade,
        teacher: booking.teacher,
        phase: booking.phase,
        slot: booking.slot_number,
        status: booking.status || 'pending'
      };
    });

    setBookings(bookingsMap);
    setIsLoading(false);
  };

  const loadTeacherStatus = async () => {
    const { data, error } = await supabase
      .from('teacher_status')
      .select('*');

    if (error) {
      console.error('Error loading teacher status:', error);
      return;
    }

    const statusMap = {};
    data.forEach(status => {
      statusMap[status.teacher_name] = {
        isOnBreak: status.is_on_break,
        breakStartedAt: status.break_started_at
      };
    });

    setTeacherStatus(statusMap);
  };

  // Authentication
  const handleLogin = () => {
    if (loginType === 'admin') {
      if (loginPassword === adminPassword) {
        setUserRole('admin');
        setShowLogin(false);
        setLoginPassword('');
      } else {
        alert('Incorrect admin password!');
      }
    } else {
      if (allTeachers.includes(loginPassword.toUpperCase())) {
        setUserRole('teacher');
        setLoggedInTeacher(loginPassword.toUpperCase());
        setShowLogin(false);
        setLoginPassword('');
      } else {
        alert('Teacher name not found! Please enter your full name as it appears in the system.');
      }
    }
  };

  const handleLogout = () => {
    setUserRole(null);
    setLoggedInTeacher('');
    setSlideshowMode(false);
  };

  // Booking functions
  const getBookingKey = (grade, teacher, phase, slot) => {
    return `${grade}-${teacher}-${phase}-${slot}`;
  };

  const getAvailableSlotsForTeacher = (teacher, grade, phase) => {
    const availableSlots = [];
    const totalSlots = phases[phase].slots;
    
    for (let slot = 1; slot <= totalSlots; slot++) {
      const key = getBookingKey(grade, teacher, phase, slot);
      if (!bookings[key]) {
        availableSlots.push(slot);
      }
    }
    
    return availableSlots;
  };

  // Parent booking
  const handleAddTeacher = (teacher, grade, phase, slot) => {
    setSelectedTeachers([...selectedTeachers, { teacher, grade, phase, slot }]);
  };

  const handleRemoveTeacher = (index) => {
    setSelectedTeachers(selectedTeachers.filter((_, i) => i !== index));
  };

  const validateAndSubmit = async () => {
    if (!studentName || !studentSection) {
      alert('Please enter student name and section');
      return;
    }

    if (selectedTeachers.length === 0) {
      alert('Please select at least one teacher');
      return;
    }

    // Submit all bookings
    const results = [];
    for (const selection of selectedTeachers) {
      const bookingKey = getBookingKey(selection.grade, selection.teacher, selection.phase, selection.slot);
      
      const { error } = await supabase
        .from('bookings')
        .insert({
          booking_key: bookingKey,
          student_name: studentName,
          student_class: selection.grade, // Use grade as class
          student_section: studentSection,
          grade: selection.grade,
          teacher: selection.teacher,
          phase: selection.phase,
          slot_number: selection.slot,
          time_slot: `${phases[selection.phase].name} - Slot ${selection.slot}`,
          status: 'pending'
        });

      if (!error) {
        results.push({
          teacher: selection.teacher,
          grade: selection.grade,
          phase: phases[selection.phase].name,
          slot: selection.slot
        });
      }
    }

    setConfirmations(results);
    setShowConfirmation(true);
    
    // Don't reset form - let parent see and screenshot
  };

  // Teacher functions
  const updateBookingStatus = async (bookingKey, newStatus) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('booking_key', bookingKey);

    if (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const toggleBreakStatus = async () => {
    const currentStatus = teacherStatus[loggedInTeacher]?.isOnBreak || false;
    
    // Upsert teacher status
    const { error } = await supabase
      .from('teacher_status')
      .upsert({
        teacher_name: loggedInTeacher,
        is_on_break: !currentStatus,
        break_started_at: !currentStatus ? new Date() : null,
        updated_at: new Date()
      }, {
        onConflict: 'teacher_name'
      });

    if (error) {
      console.error('Error updating break status:', error);
    }
  };

  // Export function
  const exportToCSV = () => {
    const csvRows = [];
    csvRows.push('Grade,Teacher,Phase,Slot,Student Name,Class,Section,Status');
    
    Object.entries(bookings).forEach(([key, booking]) => {
      csvRows.push(`${booking.grade},${booking.teacher},${booking.phase},${booking.slot},${booking.studentName},${booking.studentClass},${booking.studentSection},${booking.status}`);
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ptm-schedule-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const clearAllBookings = async () => {
    if (!window.confirm('Clear ALL bookings? This cannot be undone!')) return;
    
    const { error } = await supabase
      .from('bookings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
      
    if (error) {
      console.error('Error clearing bookings:', error);
    }
  };

  // Get teacher grades
  const getTeacherGrades = (teacherName) => {
    const grades = [];
    Object.entries(teacherData).forEach(([grade, teachers]) => {
      if (teachers.includes(teacherName)) {
        grades.push(grade);
      }
    });
    return grades;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
        <div className="text-white text-2xl">Loading PTM Scheduler...</div>
      </div>
    );
  }

  // Login Modal
  if (showLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center">Staff Login</h2>
          
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setLoginType('teacher')}
              className={`flex-1 py-2 rounded-lg font-semibold ${
                loginType === 'teacher' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              <User className="inline mr-2" size={18} />
              Teacher Login
            </button>
            <button
              onClick={() => setLoginType('admin')}
              className={`flex-1 py-2 rounded-lg font-semibold ${
                loginType === 'admin' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              <Lock className="inline mr-2" size={18} />
              Admin Access
            </button>
          </div>

          <input
            type={loginType === 'admin' ? 'password' : 'text'}
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            placeholder={loginType === 'admin' ? 'Admin Password' : 'Your Name (e.g., ARPAN D)'}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-indigo-500"
          />

          <button
            onClick={handleLogin}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700"
          >
            Login
          </button>

          <button
            onClick={() => setShowLogin(false)}
            className="w-full mt-3 text-gray-600 py-2"
          >
            ← Back to Parent Portal
          </button>
        </div>
      </div>
    );
  }

  // PARENT VIEW (Default)
  if (!userRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">PTM Booking System</h1>
                  <p className="text-sm opacity-90 mt-1">Step By Step School - Parent Portal</p>
                </div>
                <button
                  onClick={() => setShowLogin(true)}
                  className="flex items-center gap-2 bg-white text-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-indigo-50"
                >
                  <User size={18} />
                  Staff Login
                </button>
              </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmation && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="text-center mb-6">
                    <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-green-700 mb-2">Bookings Confirmed!</h3>
                    <p className="text-gray-600">📸 Take a screenshot of this confirmation</p>
                  </div>
                  
                  {/* Student Details */}
                  <div className="bg-indigo-50 rounded-lg p-4 mb-6 border-2 border-indigo-200">
                    <h4 className="font-bold text-indigo-900 mb-2">Student Details:</h4>
                    <p className="text-indigo-800"><strong>Name:</strong> {studentName}</p>
                    <p className="text-indigo-800"><strong>Section:</strong> {studentSection}</p>
                  </div>

                  {/* Booking List */}
                  <div className="bg-green-50 rounded-lg p-4 mb-6 border-2 border-green-200">
                    <h4 className="font-bold text-green-900 mb-3">Your PTM Appointments:</h4>
                    {confirmations.map((conf, idx) => (
                      <div key={idx} className="bg-white rounded p-3 mb-2 border border-green-300">
                        <p className="font-bold text-lg text-green-800">✓ {conf.teacher}</p>
                        <p className="text-gray-700">Grade: {conf.grade}</p>
                        <p className="text-gray-700">{conf.phase} - Slot {conf.slot}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                    <p className="text-sm text-yellow-800">
                      <strong>📌 Important:</strong> Please arrive 5 minutes before your slot time. 
                      Watch the display board for teacher status (Green = Ready, Yellow = On break).
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setShowConfirmation(false);
                      // Reset form after closing
                      setStudentName('');
                      setStudentSection('');
                      setSelectedTeachers([]);
                    }}
                    className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700"
                  >
                    Done - Book for Another Student
                  </button>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="p-6 bg-blue-50 border-b">
              <h2 className="font-bold text-blue-800 mb-2">📋 How to Book:</h2>
              <ol className="text-sm text-blue-700 space-y-1">
                <li>1. Enter your child's name and section below</li>
                <li>2. Select teachers (with grade, phase, and slot)</li>
                <li>3. Click "Submit All Bookings"</li>
                <li>4. Take a screenshot of your confirmation</li>
              </ol>
            </div>

            {/* Student Details Form */}
            <div className="p-6 border-b bg-gray-50">
              <h3 className="text-lg font-bold mb-4">Student Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Student Name *</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section *</label>
                  <select
                    value={studentSection}
                    onChange={(e) => setStudentSection(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Section</option>
                    {sections.map(section => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Teacher Selection */}
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4">Select Teachers to Meet</h3>
              
              {/* Selected Teachers List */}
              {selectedTeachers.length > 0 && (
                <div className="mb-6 bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-3">Selected Bookings:</h4>
                  {selectedTeachers.map((selection, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white rounded p-3 mb-2">
                      <div>
                        <p className="font-semibold">{selection.teacher}</p>
                        <p className="text-sm text-gray-600">
                          Grade {selection.grade} • {phases[selection.phase].name} • Slot {selection.slot}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveTeacher(idx)}
                        className="text-red-600 hover:text-red-800 font-semibold"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Teacher Form */}
              <ParentTeacherSelector
                teacherData={teacherData}
                phases={phases}
                bookings={bookings}
                getBookingKey={getBookingKey}
                getAvailableSlotsForTeacher={getAvailableSlotsForTeacher}
                onAddTeacher={handleAddTeacher}
              />

              {/* Submit Button */}
              <button
                onClick={validateAndSubmit}
                disabled={selectedTeachers.length === 0}
                className="w-full mt-6 bg-indigo-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Submit All Bookings ({selectedTeachers.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TEACHER VIEW
  if (userRole === 'teacher') {
    const teacherGrades = getTeacherGrades(loggedInTeacher);
    const isOnBreak = teacherStatus[loggedInTeacher]?.isOnBreak || false;

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h1 className="text-2xl font-bold">Welcome, {loggedInTeacher}</h1>
                  <p className="text-sm opacity-90">Your PTM Schedule</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={toggleBreakStatus}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold ${
                      isOnBreak
                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                        : 'bg-yellow-400 text-gray-800 hover:bg-yellow-500'
                    }`}
                  >
                    <Coffee size={18} />
                    {isOnBreak ? 'End Break' : 'Take Break'}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-indigo-50"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>

            {isOnBreak && (
              <div className="bg-orange-100 border-b-2 border-orange-400 p-3 text-center">
                <p className="text-orange-800 font-semibold">☕ You are currently on break</p>
              </div>
            )}

            {/* Grade tabs */}
            <div className="flex gap-1 p-2 bg-gray-100 border-b overflow-x-auto">
              {teacherGrades.map(grade => {
                const count = Object.values(bookings).filter(b => 
                  b.teacher === loggedInTeacher && b.grade === grade
                ).length;
                return (
                  <button
                    key={grade}
                    onClick={() => setActiveSheet(grade)}
                    className={`px-4 py-2 font-semibold rounded-t whitespace-nowrap ${
                      activeSheet === grade ? 'bg-white text-indigo-600 shadow' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {grade}
                    {count > 0 && <span className="ml-1 bg-indigo-600 text-white px-1.5 py-0.5 rounded-full text-xs">{count}</span>}
                  </button>
                );
              })}
            </div>

            {/* Phase tabs */}
            <div className="flex gap-1 p-2 bg-gray-50 border-b">
              {Object.entries(phases).map(([phaseKey, phaseInfo]) => (
                <button
                  key={phaseKey}
                  onClick={() => setActivePhase(phaseKey)}
                  className={`flex-1 py-2 px-3 rounded font-semibold text-sm ${
                    activePhase === phaseKey ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  <div>{phaseInfo.name}</div>
                  <div className="text-xs opacity-80">{phaseInfo.time}</div>
                </button>
              ))}
            </div>

            {/* Teacher Schedule Grid */}
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {activeSheet} - {phases[activePhase].name}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                {Array.from({ length: phases[activePhase].slots }, (_, i) => i + 1).map(slot => {
                  const key = getBookingKey(activeSheet, loggedInTeacher, activePhase, slot);
                  const booking = bookings[key];
                  
                  return (
                    <div
                      key={slot}
                      className={`p-3 rounded-lg border-2 ${
                        booking
                          ? booking.status === 'done'
                            ? 'bg-green-100 border-green-500'
                            : booking.status === 'not_met'
                            ? 'bg-orange-100 border-orange-500'
                            : 'bg-blue-50 border-blue-500'
                          : 'bg-gray-50 border-gray-300'
                      }`}
                    >
                      <div className="font-bold text-sm mb-2">Slot {slot}</div>
                      {booking ? (
                        <div>
                          <div className="text-sm font-medium mb-2">{booking.studentName}</div>
                          <div className="text-xs text-gray-600 mb-2">
                            {booking.studentClass}-{booking.studentSection}
                          </div>
                          {booking.status === 'pending' && (
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => updateBookingStatus(key, 'done')}
                                className="bg-green-600 text-white text-xs px-2 py-1 rounded hover:bg-green-700"
                              >
                                ✓ Done
                              </button>
                              <button
                                onClick={() => updateBookingStatus(key, 'not_met')}
                                className="bg-orange-600 text-white text-xs px-2 py-1 rounded hover:bg-orange-700"
                              >
                                ✗ Not Met
                              </button>
                            </div>
                          )}
                          {booking.status === 'done' && (
                            <div className="text-green-700 text-xs font-semibold">✓ Completed</div>
                          )}
                          {booking.status === 'not_met' && (
                            <div className="text-orange-700 text-xs font-semibold">✗ Not Met</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 italic">Available</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ADMIN VIEW
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h1 className="text-2xl font-bold">PTM Scheduler - Admin View</h1>
                <p className="text-sm opacity-90">Full Schedule Management</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSlideshowMode(!slideshowMode)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold ${
                    slideshowMode ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-yellow-400 text-gray-800 hover:bg-yellow-500'
                  }`}
                >
                  {slideshowMode ? <Pause size={18} /> : <Play size={18} />}
                  {slideshowMode ? 'Stop Display' : 'Display Mode'}
                </button>
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 bg-white text-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-indigo-50"
                >
                  <Download size={18} />
                  Export
                </button>
                <button
                  onClick={clearAllBookings}
                  className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700"
                >
                  Clear All
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Grade tabs */}
          <div className="flex gap-1 p-2 bg-gray-100 border-b overflow-x-auto">
            {sheets.map(grade => {
              const count = Object.values(bookings).filter(b => b.grade === grade).length;
              return (
                <button
                  key={grade}
                  onClick={() => setActiveSheet(grade)}
                  className={`px-4 py-2 font-semibold rounded-t whitespace-nowrap ${
                    activeSheet === grade ? 'bg-white text-indigo-600 shadow' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {grade}
                  {count > 0 && <span className="ml-1 bg-indigo-600 text-white px-1.5 py-0.5 rounded-full text-xs">{count}</span>}
                </button>
              );
            })}
          </div>

          {/* Phase tabs */}
          <div className="flex gap-1 p-2 bg-gray-50 border-b">
            {Object.entries(phases).map(([phaseKey, phaseInfo]) => (
              <button
                key={phaseKey}
                onClick={() => setActivePhase(phaseKey)}
                className={`flex-1 py-2 px-3 rounded font-semibold text-sm ${
                  activePhase === phaseKey ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                <div>{phaseInfo.name}</div>
                <div className="text-xs opacity-80">{phaseInfo.time}</div>
              </button>
            ))}
          </div>

          {/* Admin Grid */}
          <div className="p-4 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-2 bg-gray-100 sticky left-0 z-10">Teacher</th>
                  {Array.from({ length: phases[activePhase].slots }, (_, i) => i + 1).map(slot => (
                    <th key={slot} className="border p-2 bg-gray-100 text-sm">
                      {slot}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teacherData[activeSheet]?.map(teacher => {
                  const isOnBreak = teacherStatus[teacher]?.isOnBreak || false;
                  
                  return (
                    <tr key={teacher} className={isOnBreak ? 'bg-yellow-100' : ''}>
                      <td className="border p-2 font-medium sticky left-0 bg-white z-10">
                        {teacher}
                        {isOnBreak && <span className="ml-2 text-yellow-600 text-xs">☕ Break</span>}
                      </td>
                      {Array.from({ length: phases[activePhase].slots }, (_, i) => i + 1).map(slot => {
                        const key = getBookingKey(activeSheet, teacher, activePhase, slot);
                        const booking = bookings[key];
                        
                        return (
                          <td
                            key={slot}
                            className={`border p-1 text-xs text-center ${
                              booking
                                ? booking.status === 'done'
                                  ? 'bg-green-200 font-semibold'
                                  : booking.status === 'not_met'
                                  ? 'bg-orange-200 font-semibold'
                                  : 'bg-blue-100'
                                : 'bg-gray-50'
                            }`}
                          >
                            {booking ? (
                              <div className="text-xs">
                                {booking.studentName}
                                <br />
                                <span className="text-gray-600">
                                  {booking.studentClass}-{booking.studentSection}
                                </span>
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="p-4 bg-gray-50 border-t flex gap-4 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-100 border-2 border-blue-500 rounded"></div>
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-200 border-2 border-green-500 rounded"></div>
              <span>Done</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-orange-200 border-2 border-orange-500 rounded"></div>
              <span>Not Met</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-yellow-100 border-2 border-yellow-500 rounded"></div>
              <span>On Break</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Parent Teacher Selector Component
const ParentTeacherSelector = ({ teacherData, phases, bookings, getBookingKey, getAvailableSlotsForTeacher, onAddTeacher }) => {
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');

  const availableSlots = selectedGrade && selectedTeacher && selectedPhase
    ? getAvailableSlotsForTeacher(selectedTeacher, selectedGrade, selectedPhase)
    : [];

  const handleAdd = () => {
    if (!selectedGrade || !selectedTeacher || !selectedPhase || !selectedSlot) {
      alert('Please select grade, teacher, phase, and slot');
      return;
    }

    onAddTeacher(selectedTeacher, selectedGrade, selectedPhase, parseInt(selectedSlot));

    // Reset selections
    setSelectedTeacher('');
    setSelectedPhase('');
    setSelectedSlot('');
  };

  return (
    <div className="border-2 border-gray-300 rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Grade *</label>
          <select
            value={selectedGrade}
            onChange={(e) => {
              setSelectedGrade(e.target.value);
              setSelectedTeacher('');
              setSelectedPhase('');
              setSelectedSlot('');
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select Grade</option>
            {Object.keys(teacherData).map(grade => (
              <option key={grade} value={grade}>{grade}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teacher *</label>
          <select
            value={selectedTeacher}
            onChange={(e) => {
              setSelectedTeacher(e.target.value);
              setSelectedPhase('');
              setSelectedSlot('');
            }}
            disabled={!selectedGrade}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-200"
          >
            <option value="">Select Teacher</option>
            {selectedGrade && teacherData[selectedGrade].map(teacher => (
              <option key={teacher} value={teacher}>{teacher}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phase *</label>
          <select
            value={selectedPhase}
            onChange={(e) => {
              setSelectedPhase(e.target.value);
              setSelectedSlot('');
            }}
            disabled={!selectedTeacher}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-200"
          >
            <option value="">Select Phase</option>
            {Object.entries(phases).map(([key, info]) => (
              <option key={key} value={key}>
                {info.name} ({info.time})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Slot * <span className="text-green-600 text-xs">({availableSlots.length} available)</span>
          </label>
          <select
            value={selectedSlot}
            onChange={(e) => setSelectedSlot(e.target.value)}
            disabled={!selectedPhase || availableSlots.length === 0}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-200"
          >
            <option value="">Select Slot</option>
            {availableSlots.map(slot => (
              <option key={slot} value={slot}>Slot {slot}</option>
            ))}
          </select>
          {selectedPhase && availableSlots.length === 0 && (
            <p className="text-red-600 text-xs mt-1">❌ No slots available</p>
          )}
        </div>
      </div>

      <button
        onClick={handleAdd}
        disabled={!selectedSlot}
        className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        + Add This Teacher
      </button>
    </div>
  );
};

export default PTMScheduler;
