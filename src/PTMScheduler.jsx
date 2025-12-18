import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Download, AlertCircle, CheckCircle, Printer, Lock, Unlock, Edit2, Trash2, Share2, QrCode } from 'lucide-react';
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
  
  const [activeSheet, setActiveSheet] = useState('IX');
  const [bookings, setBookings] = useState({});
  const [editingCell, setEditingCell] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [customTeachers, setCustomTeachers] = useState({
    IX: ['', '', '', '', ''],
    X: ['', '', '', '', ''],
    XI: ['', '', '', '', ''],
    XII: ['', '', '', '', '']
  });
  const [showQRCode, setShowQRCode] = useState(false);
  const [pendingValue, setPendingValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saving', 'saved', 'error'

  // Load bookings from Supabase on mount
  useEffect(() => {
    loadBookings();
    loadCustomTeachers();
  }, []);

  // Subscribe to real-time changes
  useEffect(() => {
    const bookingsSubscription = supabase
      .channel('bookings_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'bookings' }, 
        (payload) => {
          console.log('Booking change received!', payload);
          loadBookings();
        }
      )
      .subscribe();

    const teachersSubscription = supabase
      .channel('teachers_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'custom_teachers' }, 
        (payload) => {
          console.log('Teacher change received!', payload);
          loadCustomTeachers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsSubscription);
      supabase.removeChannel(teachersSubscription);
    };
  }, []);

  // Load all bookings from database
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
      alert('Error loading bookings. Please refresh the page.');
      setIsLoading(false);
    }
  };

  // Load custom teachers from database
  const loadCustomTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_teachers')
        .select('*')
        .order('position');
      
      if (error) throw error;
      
      const teachersMap = {
        IX: ['', '', '', '', ''],
        X: ['', '', '', '', ''],
        XI: ['', '', '', '', ''],
        XII: ['', '', '', '', '']
      };
      
      data.forEach(teacher => {
        if (teachersMap[teacher.grade] && teacher.position < 5) {
          teachersMap[teacher.grade][teacher.position] = teacher.teacher_name;
        }
      });
      
      setCustomTeachers(teachersMap);
    } catch (error) {
      console.error('Error loading custom teachers:', error);
    }
  };

  // Save booking to database
  const saveBookingToDatabase = async (key, value) => {
    setSaveStatus('saving');
    try {
      const { error } = await supabase
        .from('bookings')
        .upsert({ 
          booking_key: key, 
          student_name: value,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'booking_key'
        });
      
      if (error) throw error;
      setSaveStatus('saved');
    } catch (error) {
      console.error('Error saving booking:', error);
      setSaveStatus('error');
      alert('Error saving booking. Please try again.');
    }
  };

  // Delete booking from database
  const deleteBookingFromDatabase = async (key) => {
    setSaveStatus('saving');
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('booking_key', key);
      
      if (error) throw error;
      setSaveStatus('saved');
    } catch (error) {
      console.error('Error deleting booking:', error);
      setSaveStatus('error');
      alert('Error deleting booking. Please try again.');
    }
  };

  // Save custom teacher to database
  const saveCustomTeacherToDatabase = async (grade, position, name) => {
    try {
      if (name.trim() === '') {
        // Delete if empty
        await supabase
          .from('custom_teachers')
          .delete()
          .eq('grade', grade)
          .eq('position', position);
      } else {
        // Upsert if has value
        const { error } = await supabase
          .from('custom_teachers')
          .upsert({
            grade,
            position,
            teacher_name: name
          }, {
            onConflict: 'grade,position'
          });
        
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error saving custom teacher:', error);
      alert('Error saving teacher. Please try again.');
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const teachers = useMemo(() => 
    [...teacherData[activeSheet], ...customTeachers[activeSheet]], 
    [activeSheet, customTeachers, teacherData]
  );

  const stats = useMemo(() => {
    const s = {};
    sheets.forEach(sheet => {
      s[sheet] = Object.keys(bookings).filter(k => k.startsWith(`${sheet}-`)).length;
    });
    return s;
  }, [bookings, sheets]);

  const isTimePassed = useCallback((timeSlot) => {
    const [time, period] = timeSlot.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let slotHours = hours;
    if (period === 'PM' && hours !== 12) slotHours = hours + 12;
    else if (period === 'AM' && hours === 12) slotHours = 0;
    const slotTime = new Date();
    slotTime.setHours(slotHours, minutes, 0, 0);
    return currentTime > slotTime;
  }, [currentTime]);

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
    
    // Update local state immediately for responsiveness
    setBookings(prev => ({ ...prev, [key]: pendingValue.trim() }));
    
    // Save to database
    await saveBookingToDatabase(key, pendingValue.trim());
    
    setEditingCell(null);
    setPendingValue('');
  }, [editingCell, pendingValue, activeSheet]);

  const handleAdminLogin = () => {
    const correctPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';
    if (adminPassword === correctPassword) {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPassword('');
    } else {
      alert('Incorrect password!');
    }
  };

  const clearAllBookings = async () => {
    if (!isAdmin) {
      alert('Admin access required!');
      return;
    }
    
    const totalBookings = Object.keys(bookings).length;
    
    if (totalBookings === 0) {
      alert('No bookings to clear!');
      return;
    }
    
    if (confirm(`⚠️ WARNING: This will delete ALL ${totalBookings} bookings permanently!\n\nThis action CANNOT be undone!\n\nAre you absolutely sure?`)) {
      try {
        setSaveStatus('saving');
        const { error } = await supabase
          .from('bookings')
          .delete()
          .neq('booking_key', ''); // Delete all records
        
        if (error) throw error;
        
        setBookings({});
        setSaveStatus('saved');
        alert(`✅ Successfully cleared ${totalBookings} bookings!`);
      } catch (error) {
        console.error('Error clearing bookings:', error);
        setSaveStatus('error');
        alert('Error clearing bookings. Please try again.');
      }
    }
  };

  const handleDeleteBooking = async (e, teacher, time) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAdmin) {
      alert('You must be logged in as admin to delete bookings!');
      return;
    }
    
    const key = `${activeSheet}-${teacher}-${time}`;
    const booking = bookings[key];
    
    if (!booking) {
      alert(`No booking found!\nKey: ${key}`);
      return;
    }
    
    const confirmMsg = `DELETE BOOKING?\n\nStudent: ${booking}\nTeacher: ${teacher}\nTime: ${time}\nClass: ${activeSheet}\n\nClick OK to delete`;
    
    if (confirm(confirmMsg)) {
      // Update local state immediately
      setBookings(currentBookings => {
        const updated = { ...currentBookings };
        delete updated[key];
        return updated;
      });
      
      // Delete from database
      await deleteBookingFromDatabase(key);
      alert('✅ Deleted!');
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

  const printSchedule = () => {
    window.print();
  };

  const generateQRCode = () => {
    const url = window.location.href;
    setShowQRCode(true);
    // In production, you'd use a QR code library here
    alert(`Share this URL:\n${url}\n\nOr scan the QR code (feature coming soon)`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-xl">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-center">Loading scheduler...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-4 print:p-0 print:bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden print:shadow-none">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 print:bg-gray-800">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h1 className="text-2xl font-bold">PTM Scheduler - Step By Step School</h1>
                <p className="text-sm opacity-90 mt-1">Parent-Teacher Meeting Booking System</p>
              </div>
              <div className="flex gap-2 flex-wrap print:hidden">
                <button onClick={generateQRCode} className="flex items-center gap-2 bg-white text-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-indigo-50 transition">
                  <Share2 size={18} />
                  Share
                </button>
                <button onClick={exportToCSV} className="flex items-center gap-2 bg-white text-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-indigo-50 transition">
                  <Download size={18} />
                  Export
                </button>
                <button onClick={printSchedule} className="flex items-center gap-2 bg-white text-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-indigo-50 transition">
                  <Printer size={18} />
                  Print
                </button>
                {isAdmin ? (
                  <>
                    <button onClick={() => setIsAdmin(false)} className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600 transition">
                      <Unlock size={18} />
                      Logout Admin
                    </button>
                    <button onClick={clearAllBookings} className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600 transition">
                      <Trash2 size={18} />
                      Clear All
                    </button>
                  </>
                ) : (
                  <button onClick={() => setShowAdminLogin(true)} className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-yellow-600 transition">
                    <Lock size={18} />
                    Admin
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Admin Login Modal */}
          {showAdminLogin && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                <h2 className="text-xl font-bold mb-4">Admin Login</h2>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                  placeholder="Enter admin password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={handleAdminLogin} className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700">
                    Login
                  </button>
                  <button onClick={() => { setShowAdminLogin(false); setAdminPassword(''); }} className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-400">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Status and Instructions */}
          <div className="p-4 bg-blue-50 border-b print:hidden">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {saveStatus === 'saving' && (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                    <span className="text-sm text-indigo-600 font-semibold">Saving...</span>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <CheckCircle className="text-green-600" size={16} />
                    <span className="text-sm text-green-600 font-semibold">All changes saved • Live updates enabled</span>
                  </>
                )}
                {saveStatus === 'error' && (
                  <>
                    <AlertCircle className="text-red-600" size={16} />
                    <span className="text-sm text-red-600 font-semibold">Error saving changes</span>
                  </>
                )}
              </div>
              <div className="text-xs text-gray-600">
                <ul className="list-none">
                  <li>• Click empty cells to book • Format: Name|Section|Class</li>
                  <li>• Green = Booked | Red = Teacher busy elsewhere | Gray = Time passed</li>
                  {isAdmin && <li className="text-green-700 font-bold">• 👑 ADMIN: Trash icons delete | Clear All resets</li>}
                </ul>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-2 bg-gray-100 border-b overflow-x-auto">
            {sheets.map(sheet => (
              <button
                key={sheet}
                onClick={() => setActiveSheet(sheet)}
                className={`px-4 py-2 font-semibold rounded-t text-sm whitespace-nowrap ${
                  activeSheet === sheet ? 'bg-white text-indigo-600 shadow' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {sheet}
                {stats[sheet] > 0 && <span className="ml-1 bg-indigo-600 text-white px-1.5 py-0.5 rounded-full text-xs">{stats[sheet]}</span>}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-auto" style={{ maxHeight: '60vh' }}>
            <table className="w-full border-collapse" style={{ fontSize: '11px' }}>
              <thead className="sticky top-0 z-20 bg-indigo-600 text-white">
                <tr>
                  <th className="border border-indigo-500 p-1.5 text-left sticky left-0 bg-indigo-600 z-30" style={{ minWidth: '110px' }}>Teacher</th>
                  {timeSlots.map(time => (
                    <th key={time} className="border border-indigo-500 p-1 text-center" style={{ minWidth: '65px' }}>{time}</th>
                  ))}
                  {isAdmin && <th className="border border-indigo-500 p-1.5 sticky right-0 bg-indigo-600 z-30" style={{ minWidth: '70px' }}>Del</th>}
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher, idx) => {
                  const isCustom = idx >= teacherData[activeSheet].length;
                  const customIdx = idx - teacherData[activeSheet].length;
                  
                  return (
                    <tr key={`${activeSheet}-${idx}`} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-1.5 bg-gray-50 sticky left-0 z-10">
                        {editingTeacher === `${activeSheet}-${idx}` && isAdmin ? (
                          <input
                            type="text"
                            defaultValue={teacher}
                            onBlur={(e) => { 
                              const newName = e.target.value;
                              setCustomTeachers(prev => ({
                                ...prev,
                                [activeSheet]: prev[activeSheet].map((t, i) => i === customIdx ? newName : t)
                              }));
                              saveCustomTeacherToDatabase(activeSheet, customIdx, newName);
                              setEditingTeacher(null);
                            }}
                            onKeyPress={(e) => e.key === 'Enter' && e.target.blur()}
                            autoFocus
                            className="w-full px-1 py-0.5 border border-indigo-500 rounded"
                            style={{ fontSize: '11px' }}
                          />
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className={isCustom && !teacher ? 'text-gray-400 italic' : ''} style={{ fontSize: '11px' }}>
                              {teacher || (isCustom ? 'Add...' : '')}
                            </span>
                            {isAdmin && isCustom && (
                              <button onClick={() => setEditingTeacher(`${activeSheet}-${idx}`)} className="text-indigo-600">
                                <Edit2 size={10} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      {timeSlots.map(time => {
                        const key = `${activeSheet}-${teacher}-${time}`;
                        const booked = bookings[key] || '';
                        const hasBooking = booked.trim() !== '';
                        const busyElsewhere = sheets.some(s => s !== activeSheet && (bookings[`${s}-${teacher}-${time}`] || '').trim() !== '');
                        const isEditing = editingCell?.teacher === teacher && editingCell?.time === time;
                        const timePassed = isTimePassed(time);
                        
                        return (
                          <td
                            key={time}
                            onClick={() => !busyElsewhere && !hasBooking && !timePassed && teacher && handleCellClick(teacher, time)}
                            className={`border border-gray-300 p-0.5 text-center ${
                              !teacher ? 'bg-gray-100 cursor-not-allowed' :
                              timePassed ? 'bg-gray-200 cursor-not-allowed' :
                              busyElsewhere ? 'bg-red-200 cursor-not-allowed' :
                              hasBooking ? 'bg-green-200 cursor-not-allowed' :
                              'hover:bg-blue-50 cursor-pointer'
                            }`}
                          >
                            {busyElsewhere ? (
                              <span className="text-red-700 font-bold" style={{ fontSize: '10px' }}>BUSY</span>
                            ) : isEditing ? (
                              <input
                                type="text"
                                value={pendingValue}
                                onChange={(e) => setPendingValue(e.target.value)}
                                onBlur={handleSaveBooking}
                                onKeyPress={(e) => e.key === 'Enter' && handleSaveBooking()}
                                autoFocus
                                className="w-full px-1 py-0.5 border border-indigo-500 rounded"
                                placeholder="Name|Sur|Class"
                                style={{ fontSize: '10px' }}
                              />
                            ) : (
                              <span className={timePassed && hasBooking ? 'line-through text-gray-500' : ''} style={{ fontSize: '10px' }}>{booked}</span>
                            )}
                          </td>
                        );
                      })}
                      {isAdmin && (
                        <td className="border border-gray-300 p-1 bg-yellow-50 sticky right-0 z-10">
                          <div className="flex flex-col gap-1 items-center">
                            {Object.keys(bookings)
                              .filter(k => {
                                const matches = k.startsWith(`${activeSheet}-${teacher}-`);
                                const hasValue = bookings[k]?.trim();
                                return matches && hasValue;
                              })
                              .map(key => {
                                const parts = key.split('-');
                                const timeStr = parts[parts.length - 2] + ' ' + parts[parts.length - 1];
                                return (
                                  <button 
                                    key={key} 
                                    onClick={(e) => handleDeleteBooking(e, teacher, timeStr)}
                                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1"
                                    type="button"
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
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="p-2 bg-gray-50 text-center text-xs text-gray-600 border-t">
            <CheckCircle className="inline mr-1 text-green-600" size={12} />
            Real-time sync enabled • Changes visible to all users instantly
          </div>
        </div>
      </div>
    </div>
  );
};

export default PTMScheduler;
