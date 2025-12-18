import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Download, AlertCircle, CheckCircle, Printer, Lock, Unlock, Edit2, Trash2, Share2, Calendar, User, Play, Pause, Monitor } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PTMScheduler = () => {
  const teacherData = {
    'IX': ['AABHA S', 'AKANSHA G', 'ALISHA N', 'ANCHAL K', 'ANURADHA M', 'ARCHANA S', 'ARTI V', 'ASITA T', 'BHAWNA K', 'CHANDRANEEV D', 'DEBJANI B', 'DEVIKA N', 'DIVYA T', 'DIYA S', 'GEETA K', 'GUNJANH S', 'HEEMAKSHI S', 'HEMA L', 'HEPZIBAH R', 'JAYITA D', 'JUHI', 'KARUNA A', 'KRISHNA G', 'MANISHA A', 'MANPREET K', 'NEELAM G', 'PINKI T', 'POOJA P', 'PRACHI J', 'PRAMIT S', 'PRATIBHA M', 'PRAVEEN R', 'PRITHA C', 'RAJANI R', 'RAJASHREE M', 'RENU S', 'RINKU C', 'ROMYARUP M', 'RUCHI M', 'SANA J', 'SANA N', 'SEEMA S', 'SEEMA V', 'SHIBANI', 'SHREYA N', 'SHRUTI J', 'SNEHA M', 'SUHANA A', 'SWAYTHA S', 'TARUN N', 'TARUNA T', 'VANITA K'],
    'X': ['AABHA S', 'AKANSHA G', 'ALISHA N', 'ANUPMA S', 'ANURADHA M', 'ARPAN D', 'ARPITA H', 'ARTI V', 'ASITA T', 'BHAWNA K', 'DEBJANI B', 'DIYA S', 'EISHWINDER K', 'GOKUL N', 'HEEMAKSHI S', 'HEMA L', 'HEPZIBAH R', 'JAYITA D', 'JUHI M', 'KANICA S', 'KARUNA A', 'KISHAN S', 'MANISHA A', 'MANPREET K', 'MEGHALI R', 'PINKI T', 'PRACHI J', 'PUNEETA S', 'PURNA C', 'RAJANI R', 'RAJASHREE M', 'RAJEEV S', 'RENU S', 'RINKU C', 'ROMYARUP M', 'RUCHI K', 'SANDHYA T', 'SEEMA V', 'SHEFALI M', 'SHRUTI N', 'SMITA K', 'STEPHAN E', 'SUMA S', 'SWARNA J', 'SWAYTHA S', 'VANITA K'],
    'XI': ['ADITI G', 'AKANSHA G', 'APOORVA S', 'ARPAN D', 'ARTI V', 'BHAWNA K', 'DEBJANI B', 'DEEPA G', 'DEVIKA N', 'DIVYA T', 'DIYA S', 'EISHWINDER K', 'GOKUL N', 'HEMA L', 'HEPZIBAH R', 'JAYITA D', 'KARUNA A', 'KK TANWANI', 'MANPREET K', 'NEELAM G', 'NEERA S', 'POOJA P', 'PRAMIT S', 'PRATIBHA M', 'PRAVEEN R', 'PRITHA C', 'PUNEETA S', 'PURNA C', 'RACHNA S', 'RAFIA Z', 'RAJEEV S', 'RENU S', 'ROMYARUP M', 'RUCHI K', 'RUCHI M', 'SANDHYA T', 'SEEMA S', 'SHEFALI M', 'SHREYA N', 'SNEHAL P', 'SUMA S', 'SWAYTHA S', 'TARUN N', 'URMI D', 'VANITA K', 'VIBHOR V'],
    'XII': ['ADITI G', 'ALISHA N', 'ANUBHA P', 'ANURADHA M', 'APOORVA S', 'ARPAN D', 'ARPITA H', 'ASITA T', 'DEEPA G', 'DEVIKA N', 'DIVYA T', 'DIYA S', 'EISHWINDER K', 'GOKUL N', 'GUNJANH S', 'HEEMAKSHI S', 'HEPZIBAH R', 'JAYITA D', 'KANICA S', 'KARUNA A', 'KISHAN S', 'KK TANWANI', 'MAMTA', 'MANISHA A', 'POOJA P', 'PRACHI J', 'PRAMIT S', 'PRATIBHA M', 'PRITHA C', 'PUNEETA S', 'PURNA C', 'RACHNA S', 'RAFIA', 'RAJANI R', 'RAJEEV S', 'REENA B', 'ROMYARUP M', 'RUCHI K', 'RUCHI M', 'SANA N', 'SANDHYA T', 'SEEMA S', 'SHEFALI M', 'SNEHAL P', 'STEPHAN', 'SUMA S', 'SWAYTHA S', 'URMI D', 'VIJAYASHREE R']
  };

  const timeSlots = useMemo(() => {
    const slots = [];
    let startMinutes = 8 * 60 + 15;
    let endMinutes = 13 * 60;
    while (startMinutes <= endMinutes) {
      const hours = Math.floor(startMinutes / 60);
      const minutes = startMinutes % 60;
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
      slots.push(`${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`);
      startMinutes += 5;
    }
    return slots;
  }, []);

  const sheets = ['IX', 'X', 'XI', 'XII'];
  
  // Get all unique teachers across all grades
  const allTeachers = useMemo(() => {
    const teacherSet = new Set();
    Object.values(teacherData).forEach(teachers => {
      teachers.forEach(teacher => teacherSet.add(teacher));
    });
    return Array.from(teacherSet).sort();
  }, []);
  
  // State
  const [userRole, setUserRole] = useState(null); // null, 'parent', 'teacher', 'admin'
  const [loggedInTeacher, setLoggedInTeacher] = useState(''); // For teacher view
  const [loginPassword, setLoginPassword] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [loginType, setLoginType] = useState('teacher'); // 'teacher' or 'admin'
  const [bookings, setBookings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Slideshow mode
  const [slideshowMode, setSlideshowMode] = useState(false);
  const [currentSlideGrade, setCurrentSlideGrade] = useState(0);
  
  // PTM Configuration
  const [showPTMConfig, setShowPTMConfig] = useState(false);
  const [ptmDate, setPTMDate] = useState('');
  const [ptmStartTime, setPTMStartTime] = useState('08:15');
  const [ptmEndTime, setPTMEndTime] = useState('13:00');
  const [ptmConfig, setPTMConfig] = useState(null);
  
  // Parent booking form state
  const [parentBookings, setParentBookings] = useState([
    { id: 1, teacher: '', grade: '', time: '', studentName: '', studentClass: '', studentSection: '' }
  ]);
  const [confirmations, setConfirmations] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Admin/Teacher view state
  const [activeSheet, setActiveSheet] = useState('IX');
  const [editingCell, setEditingCell] = useState(null);
  const [pendingValue, setPendingValue] = useState('');
  const [saveStatus, setSaveStatus] = useState('saved');

  // Load bookings
  useEffect(() => {
    loadBookings();
    loadPTMConfig();
  }, []);

  // Real-time subscription
  useEffect(() => {
    const bookingsSubscription = supabase
      .channel('bookings_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'bookings' }, 
        () => loadBookings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsSubscription);
    };
  }, []);

  // Slideshow auto-advance
  useEffect(() => {
    if (slideshowMode && userRole === 'admin') {
      const interval = setInterval(() => {
        setCurrentSlideGrade(prev => (prev + 1) % sheets.length);
      }, 10000); // 10 seconds per grade

      return () => clearInterval(interval);
    }
  }, [slideshowMode, userRole]);

  // Auto-switch active sheet in slideshow mode
  useEffect(() => {
    if (slideshowMode && userRole === 'admin') {
      setActiveSheet(sheets[currentSlideGrade]);
    }
  }, [currentSlideGrade, slideshowMode, userRole]);

  const loadBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('booking_key, student_name');
      
      if (error) throw error;
      
      const bookingsMap = {};
      data.forEach(booking => {
        bookingsMap[booking.booking_key] = booking.student_name;
      });
      
      setBookings(bookingsMap);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading bookings:', error);
      setIsLoading(false);
    }
  };

  const loadPTMConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('ptm_config')
        .select('*')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setPTMConfig(data);
        setPTMDate(data.ptm_date);
        setPTMStartTime(data.start_time);
        setPTMEndTime(data.end_time);
      }
    } catch (error) {
      console.error('Error loading PTM config:', error);
    }
  };

  const savePTMConfig = async () => {
    if (!ptmDate || !ptmStartTime || !ptmEndTime) {
      alert('Please fill all fields');
      return;
    }

    try {
      const configData = {
        ptm_date: ptmDate,
        start_time: ptmStartTime,
        end_time: ptmEndTime,
        updated_at: new Date().toISOString()
      };

      if (ptmConfig) {
        // Update existing
        const { error } = await supabase
          .from('ptm_config')
          .update(configData)
          .eq('id', ptmConfig.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('ptm_config')
          .insert(configData);
        
        if (error) throw error;
      }

      alert('✅ PTM schedule saved successfully!');
      loadPTMConfig();
      setShowPTMConfig(false);
    } catch (error) {
      console.error('Error saving PTM config:', error);
      alert('Error saving PTM schedule');
    }
  };

  const handleLogin = () => {
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';
    
    if (loginType === 'admin') {
      if (loginPassword === adminPassword) {
        setUserRole('admin');
        setShowLogin(false);
        setLoginPassword('');
      } else {
        alert('Incorrect admin password!');
      }
    } else {
      // Teacher login - check if teacher name exists
      if (allTeachers.includes(loginPassword.toUpperCase())) {
        setUserRole('teacher');
        setLoggedInTeacher(loginPassword.toUpperCase());
        setShowLogin(false);
        setLoginPassword('');
      } else {
        alert('Teacher name not found! Please enter your full name as it appears in the system (e.g., AABHA S)');
      }
    }
  };

  const handleLogout = () => {
    setUserRole(null);
    setLoggedInTeacher('');
    setSlideshowMode(false);
  };

  // Get available times for a specific teacher (ENHANCED - only truly available slots)
  const getAvailableTimesForTeacher = (teacher, grade) => {
    if (!teacher || !grade) return [];
    
    return timeSlots.filter(time => {
      // Check if this exact slot is free for this teacher in this grade
      const key = `${grade}-${teacher}-${time}`;
      if (bookings[key]) return false; // Already booked
      
      // Check if teacher is busy in other grades at this time
      const isBusyElsewhere = sheets.some(g => {
        if (g === grade) return false; // Same grade, already checked
        const otherKey = `${g}-${teacher}-${time}`;
        return bookings[otherKey]; // Busy if booked in another grade
      });
      
      return !isBusyElsewhere;
    });
  };

  // Parent booking functions
  const addBookingSlot = () => {
    setParentBookings([...parentBookings, { 
      id: Date.now(), 
      teacher: '', 
      grade: '', 
      time: '', 
      studentName: '', 
      studentClass: '', 
      studentSection: '' 
    }]);
  };

  const removeBookingSlot = (id) => {
    setParentBookings(parentBookings.filter(b => b.id !== id));
  };

  const updateBooking = (id, field, value) => {
    setParentBookings(parentBookings.map(b => 
      b.id === id ? { ...b, [field]: value } : b
    ));
  };

  const validateAndSubmitBookings = async () => {
    const incompleteBookings = parentBookings.filter(b => 
      !b.teacher || !b.grade || !b.time || !b.studentName || !b.studentClass || !b.studentSection
    );

    if (incompleteBookings.length > 0) {
      alert('Please fill all fields for each booking slot');
      return;
    }

    // Check if slots are still available
    await loadBookings(); // Refresh latest data
    
    const conflicts = [];
    const newBookings = [];

    for (const booking of parentBookings) {
      const key = `${booking.grade}-${booking.teacher}-${booking.time}`;
      
      if (bookings[key]) {
        conflicts.push(`${booking.teacher} at ${booking.time}`);
      } else {
        newBookings.push({
          key,
          value: `${booking.studentName}|${booking.studentSection}|${booking.studentClass}`,
          teacher: booking.teacher,
          time: booking.time
        });
      }
    }

    if (conflicts.length > 0) {
      alert(`Sorry, these slots are no longer available:\n${conflicts.join('\n')}\n\nPlease refresh and try again.`);
      return;
    }

    // Save all bookings
    try {
      setSaveStatus('saving');
      
      for (const newBooking of newBookings) {
        const { error } = await supabase
          .from('bookings')
          .insert({
            booking_key: newBooking.key,
            student_name: newBooking.value
          });
        
        if (error) throw error;
      }

      setConfirmations(newBookings);
      setShowConfirmation(true);
      
      setParentBookings([
        { id: Date.now(), teacher: '', grade: '', time: '', studentName: '', studentClass: '', studentSection: '' }
      ]);
      
      setSaveStatus('saved');
    } catch (error) {
      console.error('Error saving bookings:', error);
      alert('Error saving bookings. Please try again.');
      setSaveStatus('error');
    }
  };

  // Admin/Teacher functions
  const handleCellClick = useCallback((teacher, time) => {
    if (!teacher) return;
    const key = `${activeSheet}-${teacher}-${time}`;
    if (bookings[key]?.trim()) return;
    setEditingCell({ teacher, time });
    setPendingValue('');
  }, [activeSheet, bookings]);

  const handleSaveBooking = useCallback(async () => {
    if (!editingCell || !pendingValue.trim()) {
      setEditingCell(null);
      setPendingValue('');
      return;
    }
    const key = `${activeSheet}-${editingCell.teacher}-${editingCell.time}`;
    
    try {
      setSaveStatus('saving');
      const { error } = await supabase
        .from('bookings')
        .insert({
          booking_key: key,
          student_name: pendingValue.trim()
        });
      
      if (error) throw error;
      
      setBookings(prev => ({ ...prev, [key]: pendingValue.trim() }));
      setSaveStatus('saved');
    } catch (error) {
      console.error('Error saving:', error);
      setSaveStatus('error');
    }
    
    setEditingCell(null);
    setPendingValue('');
  }, [editingCell, pendingValue, activeSheet]);

  const handleDeleteBooking = async (e, teacher, time) => {
    e.preventDefault();
    e.stopPropagation();
    
    const key = `${activeSheet}-${teacher}-${time}`;
    const booking = bookings[key];
    
    if (!booking) return;
    
    if (confirm(`Delete booking for ${booking}?`)) {
      try {
        const { error } = await supabase
          .from('bookings')
          .delete()
          .eq('booking_key', key);
        
        if (error) throw error;
        
        setBookings(current => {
          const updated = { ...current };
          delete updated[key];
          return updated;
        });
        
        alert('✅ Deleted!');
      } catch (error) {
        console.error('Error deleting:', error);
        alert('Error deleting booking');
      }
    }
  };

  const clearAllBookings = async () => {
    const totalBookings = Object.keys(bookings).length;
    
    if (totalBookings === 0) {
      alert('No bookings to clear!');
      return;
    }
    
    if (confirm(`⚠️ WARNING: This will delete ALL ${totalBookings} bookings!\n\nAre you sure?`)) {
      try {
        setSaveStatus('saving');
        const { error } = await supabase
          .from('bookings')
          .delete()
          .neq('booking_key', '');
        
        if (error) throw error;
        
        setBookings({});
        setSaveStatus('saved');
        alert(`✅ Cleared ${totalBookings} bookings!`);
      } catch (error) {
        console.error('Error clearing:', error);
        setSaveStatus('error');
      }
    }
  };

  const exportToCSV = () => {
    const rows = [['Teacher', 'Time', 'Student', 'Grade']];
    Object.entries(bookings).forEach(([key, value]) => {
      const parts = key.split('-');
      const grade = parts[0];
      const teacher = parts.slice(1, -2).join('-');
      const time = parts[parts.length - 2] + ' ' + parts[parts.length - 1];
      rows.push([teacher, time, value, grade]);
    });
    
    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ptm-bookings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Get grades where teacher teaches
  const getTeacherGrades = (teacherName) => {
    return sheets.filter(grade => teacherData[grade].includes(teacherName));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-xl">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-center">Loading...</p>
        </div>
      </div>
    );
  }

  // Login Modal
  const LoginModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">
          {loginType === 'admin' ? 'Admin Login' : 'Teacher Login'}
        </h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Login as:</label>
          <div className="flex gap-2">
            <button
              onClick={() => setLoginType('teacher')}
              className={`flex-1 py-2 rounded-lg font-semibold ${
                loginType === 'teacher' ? 'bg-indigo-600 text-white' : 'bg-gray-200'
              }`}
            >
              Teacher
            </button>
            <button
              onClick={() => setLoginType('admin')}
              className={`flex-1 py-2 rounded-lg font-semibold ${
                loginType === 'admin' ? 'bg-indigo-600 text-white' : 'bg-gray-200'
              }`}
            >
              Admin
            </button>
          </div>
        </div>

        <input
          type={loginType === 'admin' ? 'password' : 'text'}
          value={loginPassword}
          onChange={(e) => setLoginPassword(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          placeholder={loginType === 'admin' ? 'Enter admin password' : 'Enter your name (e.g., AABHA S)'}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
          autoFocus
        />
        
        <div className="flex gap-2">
          <button 
            onClick={handleLogin}
            className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700"
          >
            Login
          </button>
          <button 
            onClick={() => { setShowLogin(false); setLoginPassword(''); }}
            className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  // PARENT VIEW
  if (!userRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">PTM Booking System</h1>
                  <p className="text-sm opacity-90 mt-1">Step By Step School - Parent Portal</p>
                </div>
                <button 
                  onClick={() => setShowLogin(true)}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition"
                >
                  <Lock size={18} />
                  <span className="hidden sm:inline">Staff Login</span>
                </button>
              </div>
            </div>

            {showLogin && <LoginModal />}

            {showConfirmation && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full">
                  <div className="text-center mb-4">
                    <CheckCircle className="mx-auto text-green-600 mb-2" size={48} />
                    <h2 className="text-2xl font-bold text-green-600">Booking Confirmed!</h2>
                  </div>
                  <div className="space-y-3 mb-6">
                    {confirmations.map((conf, idx) => (
                      <div key={idx} className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="font-semibold text-green-800">✓ {conf.teacher}</p>
                        <p className="text-green-700">Time: {conf.time}</p>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => { setShowConfirmation(false); setConfirmations([]); }}
                    className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-indigo-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            <div className="p-6 bg-blue-50 border-b">
              <h3 className="font-semibold text-blue-900 mb-2">📋 How to Book:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Select student's grade</li>
                <li>Choose teacher from dropdown</li>
                <li><strong>Select from ONLY the available time slots shown</strong></li>
                <li>Fill in student details</li>
                <li>Add more bookings if needed (max 4)</li>
                <li>Click "Submit All Bookings"</li>
              </ol>
            </div>

            <div className="p-6 space-y-4">
              {parentBookings.map((booking, index) => (
                <div key={booking.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-700">Booking #{index + 1}</h3>
                    {parentBookings.length > 1 && (
                      <button
                        onClick={() => removeBookingSlot(booking.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Grade *</label>
                      <select
                        value={booking.grade}
                        onChange={(e) => {
                          updateBooking(booking.id, 'grade', e.target.value);
                          updateBooking(booking.id, 'teacher', '');
                          updateBooking(booking.id, 'time', '');
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select Grade</option>
                        {sheets.map(grade => (
                          <option key={grade} value={grade}>{grade}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Teacher *</label>
                      <select
                        value={booking.teacher}
                        onChange={(e) => {
                          updateBooking(booking.id, 'teacher', e.target.value);
                          updateBooking(booking.id, 'time', '');
                        }}
                        disabled={!booking.grade}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-200"
                      >
                        <option value="">Select Teacher</option>
                        {booking.grade && teacherData[booking.grade].map(teacher => (
                          <option key={teacher} value={teacher}>{teacher}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Available Time Slots * 
                        <span className="text-xs text-green-600 ml-2">
                          ({booking.teacher && booking.grade ? getAvailableTimesForTeacher(booking.teacher, booking.grade).length : 0} available)
                        </span>
                      </label>
                      <select
                        value={booking.time}
                        onChange={(e) => updateBooking(booking.id, 'time', e.target.value)}
                        disabled={!booking.teacher || !booking.grade}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-200"
                      >
                        <option value="">Select Time</option>
                        {booking.teacher && booking.grade && 
                          getAvailableTimesForTeacher(booking.teacher, booking.grade).map(time => (
                            <option key={time} value={time}>{time}</option>
                          ))
                        }
                      </select>
                      {booking.teacher && booking.grade && getAvailableTimesForTeacher(booking.teacher, booking.grade).length === 0 && (
                        <p className="text-red-600 text-xs mt-1">❌ No slots available for this teacher</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Student Name *</label>
                      <input
                        type="text"
                        value={booking.studentName}
                        onChange={(e) => updateBooking(booking.id, 'studentName', e.target.value)}
                        placeholder="Full Name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
                      <input
                        type="text"
                        value={booking.studentClass}
                        onChange={(e) => updateBooking(booking.id, 'studentClass', e.target.value)}
                        placeholder="e.g., 9"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Section *</label>
                      <input
                        type="text"
                        value={booking.studentSection}
                        onChange={(e) => updateBooking(booking.id, 'studentSection', e.target.value)}
                        placeholder="e.g., A"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {parentBookings.length < 4 && (
                <button
                  onClick={addBookingSlot}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-500 hover:text-indigo-600 font-semibold transition"
                >
                  + Add Another Booking
                </button>
              )}

              <button
                onClick={validateAndSubmitBookings}
                disabled={saveStatus === 'saving'}
                className="w-full bg-indigo-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-indigo-700 disabled:bg-gray-400 transition shadow-lg"
              >
                {saveStatus === 'saving' ? 'Submitting...' : 'Submit All Bookings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TEACHER VIEW (Individual teacher schedule)
  if (userRole === 'teacher') {
    const teacherGrades = getTeacherGrades(loggedInTeacher);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h1 className="text-2xl font-bold">Welcome, {loggedInTeacher}</h1>
                  <p className="text-sm opacity-90 mt-1">Your PTM Schedule</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={exportToCSV}
                    className="flex items-center gap-2 bg-white text-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-indigo-50"
                  >
                    <Download size={18} />
                    Export
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600"
                  >
                    <Unlock size={18} />
                    Logout
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border-b">
              <p className="text-sm text-blue-800">
                📚 You teach in: <strong>{teacherGrades.join(', ')}</strong>
              </p>
            </div>

            <div className="flex gap-1 p-2 bg-gray-100 border-b overflow-x-auto">
              {teacherGrades.map(grade => {
                const count = Object.keys(bookings).filter(k => 
                  k.startsWith(`${grade}-${loggedInTeacher}-`)
                ).length;
                return (
                  <button
                    key={grade}
                    onClick={() => setActiveSheet(grade)}
                    className={`px-4 py-2 font-semibold rounded-t text-sm whitespace-nowrap ${
                      activeSheet === grade ? 'bg-white text-indigo-600 shadow' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {grade}
                    {count > 0 && <span className="ml-1 bg-indigo-600 text-white px-1.5 py-0.5 rounded-full text-xs">{count}</span>}
                  </button>
                );
              })}
            </div>

            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Your Schedule - Grade {activeSheet}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {timeSlots.map(time => {
                  const key = `${activeSheet}-${loggedInTeacher}-${time}`;
                  const booking = bookings[key];
                  
                  return (
                    <div
                      key={time}
                      className={`p-4 rounded-lg border-2 ${
                        booking 
                          ? 'bg-green-50 border-green-500' 
                          : 'bg-gray-50 border-gray-300'
                      }`}
                    >
                      <div className="font-bold text-sm text-gray-700 mb-2">{time}</div>
                      {booking ? (
                        <div className="text-xs text-green-800 font-medium">
                          {booking.split('|')[0]}
                          <div className="text-green-600 mt-1">
                            {booking.split('|')[1]} - {booking.split('|')[2]}
                          </div>
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

  // ADMIN VIEW (Full access + Slideshow)
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h1 className="text-2xl font-bold">PTM Scheduler - Admin View</h1>
                <p className="text-sm opacity-90 mt-1">Full Schedule Management</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button 
                  onClick={() => setSlideshowMode(!slideshowMode)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold ${
                    slideshowMode 
                      ? 'bg-red-500 text-white hover:bg-red-600' 
                      : 'bg-yellow-400 text-gray-800 hover:bg-yellow-500'
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
                  onClick={() => setShowPTMConfig(true)}
                  className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600"
                >
                  <Calendar size={18} />
                  PTM Schedule
                </button>
                <button 
                  onClick={clearAllBookings}
                  className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600"
                >
                  <Trash2 size={18} />
                  Clear All
                </button>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600"
                >
                  <Unlock size={18} />
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* PTM Configuration Modal */}
          {showPTMConfig && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                <h2 className="text-2xl font-bold mb-4 text-indigo-600">PTM Schedule Configuration</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PTM Date *
                    </label>
                    <input
                      type="date"
                      value={ptmDate}
                      onChange={(e) => setPTMDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      value={ptmStartTime}
                      onChange={(e) => setPTMStartTime(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time *
                    </label>
                    <input
                      type="time"
                      value={ptmEndTime}
                      onChange={(e) => setPTMEndTime(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {ptmConfig && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        <strong>Current PTM:</strong> {new Date(ptmConfig.ptm_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-blue-800">
                        <strong>Time:</strong> {ptmConfig.start_time} - {ptmConfig.end_time}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    onClick={savePTMConfig}
                    className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700"
                  >
                    Save PTM Schedule
                  </button>
                  <button
                    onClick={() => setShowPTMConfig(false)}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {slideshowMode && (
            <div className="p-4 bg-yellow-50 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="text-yellow-700" size={20} />
                  <span className="text-yellow-800 font-semibold">
                    Display Mode Active - Auto-switching every 10 seconds
                  </span>
                </div>
                <div className="flex gap-1">
                  {sheets.map((grade, idx) => (
                    <div
                      key={grade}
                      className={`w-3 h-3 rounded-full ${
                        idx === currentSlideGrade ? 'bg-yellow-600' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="p-4 bg-blue-50 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {saveStatus === 'saved' && (
                  <>
                    <CheckCircle className="text-green-600" size={16} />
                    <span className="text-sm text-green-600 font-semibold">All changes saved</span>
                  </>
                )}
                {ptmConfig && (
                  <div className="flex items-center gap-2">
                    <Calendar className="text-blue-600" size={16} />
                    <span className="text-sm text-blue-800 font-semibold">
                      PTM: {new Date(ptmConfig.ptm_date).toLocaleDateString()} | {ptmConfig.start_time} - {ptmConfig.end_time}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-600">
                Click empty cells to book • Green = Booked • Red = Teacher busy
              </div>
            </div>
          </div>

          {!slideshowMode && (
            <div className="flex gap-1 p-2 bg-gray-100 border-b overflow-x-auto">
              {sheets.map(sheet => {
                const count = Object.keys(bookings).filter(k => k.startsWith(`${sheet}-`)).length;
                return (
                  <button
                    key={sheet}
                    onClick={() => setActiveSheet(sheet)}
                    className={`px-4 py-2 font-semibold rounded-t text-sm whitespace-nowrap ${
                      activeSheet === sheet ? 'bg-white text-indigo-600 shadow' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {sheet}
                    {count > 0 && <span className="ml-1 bg-indigo-600 text-white px-1.5 py-0.5 rounded-full text-xs">{count}</span>}
                  </button>
                );
              })}
            </div>
          )}

          <div className="overflow-auto" style={{ maxHeight: slideshowMode ? '80vh' : '60vh' }}>
            <table className="w-full border-collapse" style={{ fontSize: slideshowMode ? '14px' : '11px' }}>
              <thead className="sticky top-0 z-20 bg-indigo-600 text-white">
                <tr>
                  <th className="border border-indigo-500 p-1.5 text-left sticky left-0 bg-indigo-600 z-30" style={{ minWidth: '110px' }}>Teacher</th>
                  {timeSlots.map(time => (
                    <th key={time} className="border border-indigo-500 p-1 text-center" style={{ minWidth: slideshowMode ? '80px' : '65px' }}>{time}</th>
                  ))}
                  {!slideshowMode && (
                    <th className="border border-indigo-500 p-1.5 sticky right-0 bg-indigo-600 z-30" style={{ minWidth: '70px' }}>Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {teacherData[activeSheet].map((teacher, idx) => (
                  <tr key={`${activeSheet}-${idx}`} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-1.5 bg-gray-50 sticky left-0 z-10 font-medium">
                      {teacher}
                    </td>
                    {timeSlots.map(time => {
                      const key = `${activeSheet}-${teacher}-${time}`;
                      const booked = bookings[key] || '';
                      const hasBooking = booked.trim() !== '';
                      const busyElsewhere = sheets.some(s => s !== activeSheet && (bookings[`${s}-${teacher}-${time}`] || '').trim() !== '');
                      const isEditing = !slideshowMode && editingCell?.teacher === teacher && editingCell?.time === time;
                      
                      return (
                        <td
                          key={time}
                          onClick={() => !slideshowMode && !busyElsewhere && !hasBooking && handleCellClick(teacher, time)}
                          className={`border border-gray-300 p-0.5 text-center ${
                            busyElsewhere ? 'bg-red-200 cursor-not-allowed' :
                            hasBooking ? 'bg-green-200 cursor-not-allowed' :
                            slideshowMode ? '' : 'hover:bg-blue-50 cursor-pointer'
                          }`}
                        >
                          {busyElsewhere ? (
                            <span className="text-red-700 font-bold" style={{ fontSize: slideshowMode ? '12px' : '10px' }}>BUSY</span>
                          ) : isEditing ? (
                            <input
                              type="text"
                              value={pendingValue}
                              onChange={(e) => setPendingValue(e.target.value)}
                              onBlur={handleSaveBooking}
                              onKeyPress={(e) => e.key === 'Enter' && handleSaveBooking()}
                              autoFocus
                              className="w-full px-1 py-0.5 border border-indigo-500 rounded"
                              placeholder="Name|Sec|Class"
                              style={{ fontSize: '10px' }}
                            />
                          ) : (
                            <span style={{ fontSize: slideshowMode ? '12px' : '10px' }}>{booked}</span>
                          )}
                        </td>
                      );
                    })}
                    {!slideshowMode && (
                      <td className="border border-gray-300 p-1 bg-yellow-50 sticky right-0 z-10">
                        <div className="flex flex-col gap-1 items-center">
                          {Object.keys(bookings)
                            .filter(k => k.startsWith(`${activeSheet}-${teacher}-`) && bookings[k]?.trim())
                            .map(key => {
                              const parts = key.split('-');
                              const timeStr = parts[parts.length - 2] + ' ' + parts[parts.length - 1];
                              return (
                                <button 
                                  key={key} 
                                  onClick={(e) => handleDeleteBooking(e, teacher, timeStr)}
                                  className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1"
                                >
                                  <Trash2 size={12} />
                                  {timeStr}
                                </button>
                              );
                            })}
                          {Object.keys(bookings).filter(k => k.startsWith(`${activeSheet}-${teacher}-`) && bookings[k]?.trim()).length === 0 && (
                            <span className="text-gray-400 text-xs italic">No bookings</span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PTMScheduler;
