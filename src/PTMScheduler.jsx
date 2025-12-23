import React, { useState, useEffect, useMemo } from 'react';
import { Download, CheckCircle, Coffee, Play, Pause, Calendar, User, Lock, Upload } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PTMScheduler = () => {
  // Teacher data by grade - loaded from database only
  const [teacherData, setTeacherData] = useState({
    'IX': [],
    'X': [],
    'XI': [],
    'XII': []
  });

  // Phase definitions with exact timings and roll number ranges
  const phases = {
    phase1: {
      name: 'Phase 1',
      time: '8:15 AM - 9:40 AM',
      rollNumbers: 'Roll Numbers: 21-30',
      slots: 18,
      timings: ['8:15', '8:20', '8:25', '8:30', '8:35', '8:40', '8:45', '8:50', '8:55', '9:00', '9:05', '9:10', '9:15', '9:20', '9:25', '9:30', '9:35', '9:40']
    },
    phase2: {
      name: 'Phase 2',
      time: '9:55 AM - 11:20 AM',
      rollNumbers: 'Roll Numbers: 1-10',
      slots: 18,
      timings: ['9:55', '10:00', '10:05', '10:10', '10:15', '10:20', '10:25', '10:30', '10:35', '10:40', '10:45', '10:50', '10:55', '11:00', '11:05', '11:10', '11:15', '11:20']
    },
    phase3: {
      name: 'Phase 3',
      time: '11:35 AM - 1:00 PM',
      rollNumbers: 'Roll Numbers: 11-20',
      slots: 18,
      timings: ['11:35', '11:40', '11:45', '11:50', '11:55', '12:00', '12:05', '12:10', '12:15', '12:20', '12:25', '12:30', '12:35', '12:40', '12:45', '12:50', '12:55', '13:00']
    }
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
  }, [teacherData]); // Recompute when teacherData changes!

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
  const [currentSlidePage, setCurrentSlidePage] = useState(0); // For teacher pagination
  const [showTeacherUpload, setShowTeacherUpload] = useState(false); // Teacher upload modal
  const [uploadedTeachers, setUploadedTeachers] = useState(null); // Preview uploaded data
  
  const TEACHERS_PER_PAGE = 10; // Show 10 teachers per screen
  
  // Parent booking form state
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentSection, setStudentSection] = useState('');
  const [selectedTeachers, setSelectedTeachers] = useState([]); // Array of { teacher, grade, phase, slot }
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmations, setConfirmations] = useState([]);
  
  // Parent tracking view state
  const [showTrackingView, setShowTrackingView] = useState(false);
  const [trackingStudentName, setTrackingStudentName] = useState('');
  const [trackingStudentClass, setTrackingStudentClass] = useState('');
  const [trackingStudentSection, setTrackingStudentSection] = useState('');
  const [trackedBookings, setTrackedBookings] = useState([]);
  
  // PTM Date configuration
  const [ptmDate, setPtmDate] = useState('December 24, 2025'); // Default date
  const [showDateEditor, setShowDateEditor] = useState(false);

  // Load data
  useEffect(() => {
    loadBookings();
    loadTeacherStatus();
    loadTeachersFromDatabase();
  }, []);

  const loadTeachersFromDatabase = async () => {
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .order('teacher_name');

      if (error) {
        console.error('Error loading teachers from database:', error);
        console.log('Using default hardcoded teacher list');
        setIsLoading(false);
        return;
      }

      if (data && data.length > 0) {
        // Group teachers by grade
        const grouped = {
          'IX': [],
          'X': [],
          'XI': [],
          'XII': []
        };

        data.forEach(teacher => {
          if (grouped[teacher.grade]) {
            grouped[teacher.grade].push(teacher.teacher_name);
          }
        });

        // Sort each grade's teachers alphabetically
        Object.keys(grouped).forEach(grade => {
          grouped[grade].sort();
        });

        console.log('Loaded teachers from database:', grouped);
        setTeacherData(grouped);
      } else {
        console.log('No teachers in database, using defaults');
      }
    } catch (error) {
      console.error('Exception loading teachers:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  // Slideshow auto-advance with pagination
  useEffect(() => {
    if (slideshowMode && userRole === 'admin') {
      const interval = setInterval(() => {
        const currentGradeTeachers = teacherData[sheets[currentSlideGrade]] || [];
        const totalPages = Math.ceil(currentGradeTeachers.length / TEACHERS_PER_PAGE);
        
        // If there are multiple pages, rotate through them first
        if (totalPages > 1 && currentSlidePage < totalPages - 1) {
          // Move to next page of same grade
          setCurrentSlidePage(prev => prev + 1);
        } else {
          // All pages shown, move to next grade and reset page
          setCurrentSlidePage(0);
          setCurrentSlideGrade(prev => (prev + 1) % sheets.length);
        }
      }, 6000); // 6 seconds per page
      
      return () => clearInterval(interval);
    }
  }, [slideshowMode, userRole, currentSlideGrade, currentSlidePage]);

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
      // Check if teachers have loaded
      if (isLoading) {
        alert('Please wait, loading teacher data...');
        return;
      }
      
      if (allTeachers.length === 0) {
        alert('No teachers found in database. Please contact admin to upload teacher list.');
        return;
      }
      
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

  // Parent tracking lookup
  const handleTrackBookings = async () => {
    if (!trackingStudentName || !trackingStudentClass || !trackingStudentSection) {
      alert('Please enter student name, class, and section');
      return;
    }

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .ilike('student_name', trackingStudentName.trim())
      .ilike('student_class', trackingStudentClass.trim())
      .ilike('student_section', trackingStudentSection.trim())
      .order('phase', { ascending: true })
      .order('slot_number', { ascending: true });

    if (error) {
      console.error('Error fetching bookings:', error);
      alert('Error loading appointments. Please try again.');
      return;
    }

    if (!data || data.length === 0) {
      alert('No appointments found for this student. Please check the name, class, and section.');
      return;
    }

    // Format the bookings with teacher status
    const formattedBookings = data.map(booking => ({
      id: booking.id,
      teacher: booking.teacher,
      grade: booking.grade,
      phase: booking.phase,
      slot: booking.slot_number,
      timing: phases[booking.phase].timings[booking.slot_number - 1],
      phaseName: phases[booking.phase].name,
      status: booking.status,
      teacherStatus: teacherStatus[booking.teacher]?.isOnBreak ? 'break' : 'ready'
    }));

    setTrackedBookings(formattedBookings);
    setShowTrackingView(true);
  };

  // Booking functions
  const getBookingKey = (grade, teacher, phase, slot) => {
    return `${grade}-${teacher}-${phase}-${slot}`;
  };

  const getAvailableSlotsForTeacher = (teacher, grade, phase, studentCurrentBookings = []) => {
    const availableSlots = [];
    const totalSlots = phases[phase].slots;
    
    for (let slot = 1; slot <= totalSlots; slot++) {
      // Check if teacher is busy in ANY grade at this phase/slot
      const teacherIsBusy = sheets.some(g => {
        const key = getBookingKey(g, teacher, phase, slot);
        return bookings[key]; // If booking exists in any grade, teacher is busy
      });
      
      // Check if student already has a booking at this slot in this phase
      const studentHasSlotBooked = studentCurrentBookings.some(booking => 
        booking.phase === phase && booking.slot === slot
      );
      
      if (!teacherIsBusy && !studentHasSlotBooked) {
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
    if (!studentName || !studentClass || !studentSection) {
      alert('Please enter student name, grade, and section');
      return;
    }

    if (selectedTeachers.length === 0) {
      alert('Please select at least one teacher');
      return;
    }

    // Submit all bookings
    const results = [];
    const errors = [];
    
    for (const selection of selectedTeachers) {
      const bookingKey = getBookingKey(selection.grade, selection.teacher, selection.phase, selection.slot);
      
      console.log('Submitting booking:', {
        bookingKey,
        studentName,
        studentClass,
        studentSection,
        selection
      });
      
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          booking_key: bookingKey,
          student_name: studentName,
          student_class: studentClass, // Use parent-entered grade
          student_section: studentSection,
          grade: selection.grade,
          teacher: selection.teacher,
          phase: selection.phase,
          slot_number: selection.slot,
          time_slot: `${phases[selection.phase].name} - Slot ${selection.slot}`,
          status: 'pending'
        })
        .select();

      if (error) {
        console.error('Booking error:', error);
        errors.push({ teacher: selection.teacher, error: error.message });
      } else {
        console.log('Booking success:', data);
        results.push({
          teacher: selection.teacher,
          grade: selection.grade,
          phase: selection.phase, // Store phase key (phase1, phase2, phase3)
          phaseName: phases[selection.phase].name, // Store phase name for display
          slot: selection.slot
        });
      }
    }

    if (errors.length > 0) {
      alert('Some bookings failed:\n' + errors.map(e => `${e.teacher}: ${e.error}`).join('\n'));
    }

    if (results.length > 0) {
      setConfirmations(results);
      setShowConfirmation(true);
    } else {
      alert('No bookings were successful. Please check the console for errors.');
    }
    
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

  // Teacher upload functions
  const handleExcelUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // Parse Excel file using SheetJS (XLSX library loaded via CDN)
        const data = new Uint8Array(e.target.result);
        const workbook = window.XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Parse teacher data
        const grades = ['IX', 'X', 'XI', 'XII'];
        const parsedData = {
          'IX': [],
          'X': [],
          'XI': [],
          'XII': []
        };
        
        // Assuming first row is header with grade names
        const headerRow = jsonData[0];
        const gradeColumns = {};
        
        headerRow.forEach((header, index) => {
          if (grades.includes(header)) {
            gradeColumns[header] = index;
          }
        });
        
        // Parse teachers from each column
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          grades.forEach(grade => {
            const colIndex = gradeColumns[grade];
            if (colIndex !== undefined && row[colIndex]) {
              const teacherName = String(row[colIndex]).trim();
              if (teacherName && !parsedData[grade].includes(teacherName)) {
                parsedData[grade].push(teacherName);
              }
            }
          });
        }
        
        // Sort teachers alphabetically
        Object.keys(parsedData).forEach(grade => {
          parsedData[grade].sort();
        });
        
        setUploadedTeachers(parsedData);
        
      } catch (error) {
        console.error('Error parsing Excel:', error);
        alert('Error parsing Excel file. Please ensure it has columns IX, X, XI, XII with teacher names.');
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  const saveUploadedTeachers = async () => {
    if (!uploadedTeachers) return;
    
    try {
      // Step 1: Clear existing teachers from database
      console.log('Clearing existing teachers from database...');
      const { error: deleteError } = await supabase
        .from('teachers')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (deleteError) {
        console.error('Error clearing teachers:', deleteError);
        alert('Error clearing old teacher data. Please try again.');
        return;
      }
      
      // Step 2: Prepare new teacher records
      const teacherRecords = [];
      const grades = ['IX', 'X', 'XI', 'XII'];
      
      grades.forEach(grade => {
        uploadedTeachers[grade].forEach(teacherName => {
          teacherRecords.push({
            teacher_name: teacherName,
            grade: grade
          });
        });
      });
      
      console.log(`Uploading ${teacherRecords.length} teachers to database...`);
      
      // Step 3: Insert new teachers in batches (Supabase limit is ~1000 per insert)
      const batchSize = 100;
      for (let i = 0; i < teacherRecords.length; i += batchSize) {
        const batch = teacherRecords.slice(i, i + batchSize);
        
        const { error: insertError } = await supabase
          .from('teachers')
          .insert(batch);
        
        if (insertError) {
          console.error('Error inserting batch:', insertError);
          alert(`Error uploading teachers (batch ${Math.floor(i/batchSize) + 1}). Please try again.`);
          return;
        }
      }
      
      console.log('✅ All teachers uploaded successfully!');
      
      // Step 4: Update local state
      setTeacherData(uploadedTeachers);
      
      // Step 5: Close modal and reset
      setShowTeacherUpload(false);
      setUploadedTeachers(null);
      
      // Step 6: Show success message
      alert(`✅ Teacher list updated successfully!\n\n${teacherRecords.length} teachers saved to database.\n\nChanges are now permanent.`);
      
    } catch (error) {
      console.error('Exception saving teachers:', error);
      alert('Unexpected error saving teachers. Check console for details.');
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
            placeholder={loginType === 'admin' ? 'Admin Password' : 'Your Full Name (e.g., ARPAN DEB)'}
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
                  <h1 className="text-3xl font-bold">PTM Scheduling System</h1>
                  <p className="text-sm opacity-90 mt-1">Step By Step School</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowTrackingView(true);
                      setTrackingStudentName('');
                      setTrackingStudentClass('');
                      setTrackingStudentSection('');
                      setTrackedBookings([]);
                    }}
                    className="flex items-center gap-2 bg-yellow-400 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-yellow-500"
                  >
                    <Calendar size={18} />
                    View My Appointments
                  </button>
                  <button
                    onClick={() => setShowLogin(true)}
                    className="flex items-center gap-2 bg-white text-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-indigo-50"
                  >
                    <User size={18} />
                    Staff Login
                  </button>
                </div>
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
                        <p className="text-gray-700">
                          {conf.phaseName} - Slot {conf.slot} ({phases[conf.phase].timings[conf.slot - 1]})
                        </p>
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
                      setStudentClass('');
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

            {/* Tracking View - View My Appointments */}
            {showTrackingView && !trackedBookings.length && (
              <div className="p-6">
                <div className="max-w-md mx-auto">
                  <h2 className="text-2xl font-bold text-indigo-700 mb-4">🔍 View My Appointments</h2>
                  <p className="text-gray-600 mb-6">Enter student details to view your confirmed appointments</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Student Name *</label>
                      <input
                        type="text"
                        value={trackingStudentName}
                        onChange={(e) => setTrackingStudentName(e.target.value)}
                        placeholder="e.g., Meera Vaidya"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Class/Grade *</label>
                      <select
                        value={trackingStudentClass}
                        onChange={(e) => setTrackingStudentClass(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select Class</option>
                        <option value="IX">IX</option>
                        <option value="X">X</option>
                        <option value="XI">XI</option>
                        <option value="XII">XII</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Section *</label>
                      <input
                        type="text"
                        value={trackingStudentSection}
                        onChange={(e) => setTrackingStudentSection(e.target.value)}
                        placeholder="e.g., A"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    
                    <button
                      onClick={handleTrackBookings}
                      className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700"
                    >
                      View My Appointments
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowTrackingView(false);
                        setTrackingStudentName('');
                        setTrackingStudentClass('');
                        setTrackingStudentSection('');
                        setTrackedBookings([]);
                      }}
                      className="w-full bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-400"
                    >
                      Back to Booking
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tracking View - Display Appointments */}
            {showTrackingView && trackedBookings.length > 0 && (
              <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-indigo-700">📋 My Appointments</h2>
                    <p className="text-sm text-gray-600 mt-1">{ptmDate}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowTrackingView(false);
                      setTrackedBookings([]);
                      setTrackingStudentName('');
                      setTrackingStudentClass('');
                      setTrackingStudentSection('');
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-400"
                  >
                    Back
                  </button>
                </div>
                
                <div className="bg-indigo-50 rounded-lg p-4 mb-6">
                  <p className="text-indigo-900"><strong>Student:</strong> {trackingStudentName}</p>
                  <p className="text-indigo-900"><strong>Class:</strong> {trackingStudentClass} - {trackingStudentSection}</p>
                  <p className="text-indigo-900"><strong>Total Appointments:</strong> {trackedBookings.length}</p>
                </div>

                {/* Next Appointment Highlight */}
                {(() => {
                  const now = new Date();
                  const currentHour = now.getHours();
                  const currentMinute = now.getMinutes();
                  const currentTimeInMinutes = currentHour * 60 + currentMinute;
                  
                  // Find next appointment
                  const nextBooking = trackedBookings.find(booking => {
                    const [hour, minute] = booking.timing.split(':').map(Number);
                    const bookingTimeInMinutes = hour * 60 + minute;
                    return bookingTimeInMinutes >= currentTimeInMinutes;
                  });

                  if (nextBooking) {
                    return (
                      <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4 mb-6">
                        <h3 className="font-bold text-yellow-900 mb-2">⏰ NEXT APPOINTMENT:</h3>
                        <p className="text-lg font-bold text-yellow-900">{nextBooking.teacher}</p>
                        <p className="text-yellow-800">
                          {nextBooking.phaseName} - Slot {nextBooking.slot} ({nextBooking.timing})
                        </p>
                        <div className="mt-2">
                          {nextBooking.teacherStatus === 'break' ? (
                            <span className="inline-block bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                              ☕ Teacher on Break
                            </span>
                          ) : (
                            <span className="inline-block bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                              ✓ Teacher Ready
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* All Appointments List */}
                <div className="space-y-4">
                  {trackedBookings.map((booking, idx) => {
                    const now = new Date();
                    const currentHour = now.getHours();
                    const currentMinute = now.getMinutes();
                    const currentTimeInMinutes = currentHour * 60 + currentMinute;
                    const [bookingHour, bookingMinute] = booking.timing.split(':').map(Number);
                    const bookingTimeInMinutes = bookingHour * 60 + bookingMinute;
                    const isPast = bookingTimeInMinutes < currentTimeInMinutes;
                    const isNext = !isPast && trackedBookings.findIndex(b => {
                      const [h, m] = b.timing.split(':').map(Number);
                      return (h * 60 + m) >= currentTimeInMinutes;
                    }) === idx;

                    return (
                      <div 
                        key={booking.id} 
                        className={`border-2 rounded-lg p-4 ${
                          isNext 
                            ? 'border-yellow-400 bg-yellow-50' 
                            : isPast 
                            ? 'border-gray-300 bg-gray-50 opacity-60'
                            : 'border-indigo-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-800">{booking.teacher}</h3>
                            <p className="text-gray-600">Grade {booking.grade}</p>
                            <p className="text-indigo-700 font-semibold">
                              {booking.phaseName} - Slot {booking.slot} • {booking.timing}
                            </p>
                            
                            {/* Meeting Status */}
                            <div className="mt-2 flex items-center gap-2">
                              {booking.status === 'done' && (
                                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                                  ✓ Completed
                                </span>
                              )}
                              {booking.status === 'not_met' && (
                                <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold">
                                  ✗ Not Met
                                </span>
                              )}
                              {booking.status === 'met_later' && (
                                <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
                                  ⏰ Met Later
                                </span>
                              )}
                              {booking.status === 'pending' && !isPast && (
                                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                                  ⏳ Pending
                                </span>
                              )}
                            </div>
                            
                            {/* Teacher Status */}
                            {booking.status === 'pending' && !isPast && (
                              <div className="mt-2">
                                {booking.teacherStatus === 'break' ? (
                                  <span className="inline-flex items-center text-yellow-700 text-sm">
                                    <Coffee size={14} className="mr-1" /> Teacher on Break
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-green-700 text-sm">
                                    <CheckCircle size={14} className="mr-1" /> Teacher Ready
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {isNext && !isPast && (
                            <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold">
                              NEXT
                            </div>
                          )}
                          
                          {isPast && (
                            <div className="bg-gray-400 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">
                              PAST
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Tip:</strong> Arrive 5 minutes before your slot time. Check teacher status above - 
                    Green means ready, Yellow means on break. This page updates in real-time!
                  </p>
                </div>
              </div>
            )}

            {/* Normal Booking Form - Only show if not in tracking view */}
            {!showTrackingView && (
              <>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade *</label>
                  <select
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Grade</option>
                    {sheets.map(grade => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
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
                          Grade {selection.grade} • {phases[selection.phase].name} • Slot {selection.slot} ({phases[selection.phase].timings[selection.slot - 1]})
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
                studentClass={studentClass}
                selectedTeachers={selectedTeachers}
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
              </>
            )}
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
                  <div className="text-xs opacity-70">{phaseInfo.rollNumbers}</div>
                </button>
              ))}
            </div>

            {/* Teacher Schedule Grid */}
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                All Appointments - {phases[activePhase].name}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                {Array.from({ length: phases[activePhase].slots }, (_, i) => i + 1).map(slot => {
                  // Check ALL grades for this teacher at this phase/slot
                  let booking = null;
                  let bookingKey = null;
                  
                  for (const grade of sheets) {
                    const key = getBookingKey(grade, loggedInTeacher, activePhase, slot);
                    if (bookings[key]) {
                      booking = bookings[key];
                      bookingKey = key;
                      break; // Found booking, stop searching
                    }
                  }
                  
                  return (
                    <div
                      key={slot}
                      className={`p-3 rounded-lg border-2 ${
                        booking
                          ? booking.status === 'done'
                            ? 'bg-green-100 border-green-500'
                            : booking.status === 'not_met'
                            ? 'bg-orange-100 border-orange-500'
                            : booking.status === 'met_later'
                            ? 'bg-yellow-100 border-yellow-500'
                            : 'bg-blue-50 border-blue-500'
                          : 'bg-gray-50 border-gray-300'
                      }`}
                    >
                      <div className="font-bold text-sm mb-1">Slot {slot}</div>
                      <div className="text-xs text-gray-600 mb-2">{phases[activePhase].timings[slot - 1]}</div>
                      {booking ? (
                        <div>
                          <div className="text-sm font-medium mb-1">{booking.studentName}</div>
                          <div className="text-xs text-gray-600 mb-2">
                            Grade {booking.studentClass}-{booking.studentSection}
                          </div>
                          {/* Always show buttons - teachers can update status anytime */}
                          <div className="flex flex-col gap-1 mb-2">
                            <button
                              onClick={() => updateBookingStatus(bookingKey, 'done')}
                              className={`text-white text-xs px-2 py-1 rounded ${
                                booking.status === 'done' 
                                  ? 'bg-green-700 font-bold' 
                                  : 'bg-green-600 hover:bg-green-700'
                              }`}
                            >
                              ✓ Done
                            </button>
                            <button
                              onClick={() => updateBookingStatus(bookingKey, 'not_met')}
                              className={`text-white text-xs px-2 py-1 rounded ${
                                booking.status === 'not_met' 
                                  ? 'bg-orange-700 font-bold' 
                                  : 'bg-orange-600 hover:bg-orange-700'
                              }`}
                            >
                              ✗ Not Met
                            </button>
                            <button
                              onClick={() => updateBookingStatus(bookingKey, 'met_later')}
                              className={`text-white text-xs px-2 py-1 rounded ${
                                booking.status === 'met_later' 
                                  ? 'bg-yellow-700 font-bold' 
                                  : 'bg-yellow-600 hover:bg-yellow-700'
                              }`}
                            >
                              ⏰ Met Later
                            </button>
                          </div>
                          {/* Show current status as text */}
                          {booking.status === 'done' && (
                            <div className="text-green-700 text-xs font-semibold">Current: ✓ Completed</div>
                          )}
                          {booking.status === 'not_met' && (
                            <div className="text-orange-700 text-xs font-semibold">Current: ✗ Not Met</div>
                          )}
                          {booking.status === 'met_later' && (
                            <div className="text-yellow-700 text-xs font-semibold">Current: ⏰ Met Later</div>
                          )}
                          {booking.status === 'pending' && (
                            <div className="text-blue-700 text-xs font-semibold">Current: Pending</div>
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
                  onClick={() => setShowDateEditor(true)}
                  className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600"
                >
                  <Calendar size={18} />
                  PTM Date: {ptmDate}
                </button>
                <button
                  onClick={() => setShowTeacherUpload(true)}
                  className="flex items-center gap-2 bg-purple-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-600"
                >
                  <Upload size={18} />
                  Upload Teachers
                </button>
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
                <div className="text-xs opacity-70">{phaseInfo.rollNumbers}</div>
              </button>
            ))}
          </div>

          {/* Admin Grid */}
          <div className="p-4 overflow-x-auto">
            {/* Pagination indicator for slideshow mode */}
            {slideshowMode && (() => {
              const teachers = teacherData[activeSheet] || [];
              const totalPages = Math.ceil(teachers.length / TEACHERS_PER_PAGE);
              return totalPages > 1 ? (
                <div className="mb-3 text-center bg-indigo-100 py-2 rounded-lg">
                  <span className="text-indigo-800 font-semibold text-lg">
                    Page {currentSlidePage + 1} of {totalPages}
                  </span>
                </div>
              ) : null;
            })()}
            
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-2 bg-gray-100 sticky left-0 z-10">Teacher</th>
                  {Array.from({ length: phases[activePhase].slots }, (_, i) => i + 1).map(slot => (
                    <th key={slot} className="border p-2 bg-gray-100 text-xs">
                      <div className="font-bold">{slot}</div>
                      <div className="font-normal text-gray-600">{phases[activePhase].timings[slot - 1]}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const teachers = teacherData[activeSheet] || [];
                  
                  // In slideshow mode, paginate teachers
                  const displayTeachers = slideshowMode
                    ? teachers.slice(
                        currentSlidePage * TEACHERS_PER_PAGE,
                        (currentSlidePage + 1) * TEACHERS_PER_PAGE
                      )
                    : teachers;
                  
                  return displayTeachers.map(teacher => {
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
                                    : booking.status === 'met_later'
                                    ? 'bg-yellow-200 font-semibold'
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
                  });
                })()}
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
              <div className="w-6 h-6 bg-yellow-200 border-2 border-yellow-500 rounded"></div>
              <span>Met Later</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-yellow-100 border-2 border-yellow-400 rounded"></div>
              <span>On Break</span>
            </div>
          </div>

          {/* PTM Date Editor Modal */}
          {showDateEditor && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-8 max-w-md w-full">
                <h2 className="text-2xl font-bold mb-4 text-indigo-700">📅 Set PTM Date</h2>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">PTM Date</label>
                  <input
                    type="text"
                    value={ptmDate}
                    onChange={(e) => setPtmDate(e.target.value)}
                    placeholder="e.g., December 24, 2025"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    This will be displayed on the parent tracking page
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowDateEditor(false);
                      alert('PTM date updated to: ' + ptmDate);
                    }}
                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700"
                  >
                    Save Date
                  </button>
                  <button
                    onClick={() => {
                      setShowDateEditor(false);
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Teacher Upload Modal */}
          {showTeacherUpload && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-4 text-indigo-700">Upload Teacher List</h2>
                
                {!uploadedTeachers ? (
                  <div>
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                      <p className="text-blue-800 mb-2"><strong>📋 Instructions:</strong></p>
                      <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                        <li>Excel file should have columns: <strong>IX, X, XI, XII</strong></li>
                        <li>Each column contains teacher names for that grade</li>
                        <li>First row should be the header (grade names)</li>
                        <li>Teacher names from row 2 onwards</li>
                      </ul>
                    </div>

                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleExcelUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-4"
                    />

                    <div className="mt-6 flex gap-3">
                      <button
                        onClick={() => setShowTeacherUpload(false)}
                        className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
                      <p className="text-green-800 font-semibold mb-2">✅ File parsed successfully!</p>
                      <p className="text-sm text-green-700">Review the teacher list below and click "Save" to update.</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      {['IX', 'X', 'XI', 'XII'].map(grade => (
                        <div key={grade} className="border rounded-lg p-4">
                          <h3 className="font-bold text-lg text-indigo-700 mb-2">Grade {grade}</h3>
                          <p className="text-sm text-gray-600 mb-2">{uploadedTeachers[grade].length} teachers</p>
                          <div className="max-h-48 overflow-y-auto text-xs">
                            {uploadedTeachers[grade].map((teacher, idx) => (
                              <div key={idx} className="py-1 border-b last:border-b-0">{teacher}</div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={saveUploadedTeachers}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700"
                      >
                        ✓ Save Teacher List
                      </button>
                      <button
                        onClick={() => {
                          setUploadedTeachers(null);
                          setShowTeacherUpload(false);
                        }}
                        className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Parent Teacher Selector Component
const ParentTeacherSelector = ({ teacherData, phases, bookings, getBookingKey, getAvailableSlotsForTeacher, onAddTeacher, studentClass, selectedTeachers }) => {
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');

  const availableSlots = studentClass && selectedTeacher && selectedPhase
    ? getAvailableSlotsForTeacher(selectedTeacher, studentClass, selectedPhase, selectedTeachers)
    : [];

  const handleAdd = () => {
    if (!studentClass) {
      alert('Please select grade in Student Details section first');
      return;
    }
    
    if (!selectedTeacher || !selectedPhase || !selectedSlot) {
      alert('Please select teacher, phase, and slot');
      return;
    }

    onAddTeacher(selectedTeacher, studentClass, selectedPhase, parseInt(selectedSlot));

    // Reset selections
    setSelectedTeacher('');
    setSelectedPhase('');
    setSelectedSlot('');
  };

  return (
    <div className="border-2 border-gray-300 rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teacher *</label>
          <select
            value={selectedTeacher}
            onChange={(e) => {
              setSelectedTeacher(e.target.value);
              setSelectedPhase('');
              setSelectedSlot('');
            }}
            disabled={!studentClass}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-200"
          >
            <option value="">Select Teacher</option>
            {studentClass && teacherData[studentClass].map(teacher => (
              <option key={teacher} value={teacher}>{teacher}</option>
            ))}
          </select>
          {!studentClass && (
            <p className="text-xs text-red-600 mt-1">Select grade above first</p>
          )}
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
                {info.name} ({info.time}) - {info.rollNumbers}
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
              <option key={slot} value={slot}>
                Slot {slot} - {phases[selectedPhase]?.timings[slot - 1]}
              </option>
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
