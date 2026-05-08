import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Download, CheckCircle, Coffee, Play, Pause, Calendar, User, Lock, Upload, LogOut, Key } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

// Initialize Supabase client (anon - for normal operations)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service role client - only used for admin: creating auth users
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ─── Constants ────────────────────────────────────────────────────────────────
const GRADES = ['VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];
const adminPassword = 'SBS-admin_2025';
const TEACHERS_PER_PAGE = 10;

const PTMScheduler = () => {
  // Teacher data by grade - loaded from database
  const [teacherData, setTeacherData] = useState(
    Object.fromEntries(GRADES.map(g => [g, []]))
  );

  // ── Phase config state (loaded from DB, editable by admin) ──
  const [phaseConfig, setPhaseConfig] = useState({
    phase1: { start: '08:15', rolls: 'Roll Numbers: 21-30' },
    phase2: { start: '09:55', rolls: 'Roll Numbers: 1-10' },
    phase3: { start: '11:35', rolls: 'Roll Numbers: 11-20' },
  });
  const [showPhaseEditor, setShowPhaseEditor] = useState(false);
  const [phaseEditorDraft, setPhaseEditorDraft] = useState(null);

  // Helper: generate 18 slot timings from a start time (HH:MM), 5-min intervals
  const generateTimings = (startHHMM) => {
    const [h, m] = startHHMM.split(':').map(Number);
    const timings = [];
    for (let i = 0; i < 18; i++) {
      const total = h * 60 + m + i * 5;
      const hh = Math.floor(total / 60);
      const mm = total % 60;
      timings.push(`${hh}:${mm.toString().padStart(2, '0')}`);
    }
    return timings;
  };

  // Helper: format display time range from start (18 slots × 5 min = 85 min)
  const formatTimeRange = (startHHMM) => {
    const [h, m] = startHHMM.split(':').map(Number);
    const endTotal = h * 60 + m + 85;
    const eh = Math.floor(endTotal / 60);
    const em = endTotal % 60;
    const fmtStart = `${h > 12 ? h - 12 : h}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
    const fmtEnd = `${eh > 12 ? eh - 12 : eh}:${em.toString().padStart(2, '0')} ${eh >= 12 ? 'PM' : 'AM'}`;
    return `${fmtStart} - ${fmtEnd}`;
  };

  // Build phases object dynamically from phaseConfig
  const phases = useMemo(() => ({
    phase1: {
      name: 'Phase 1',
      time: formatTimeRange(phaseConfig.phase1.start),
      rollNumbers: phaseConfig.phase1.rolls,
      slots: 18,
      timings: generateTimings(phaseConfig.phase1.start),
    },
    phase2: {
      name: 'Phase 2',
      time: formatTimeRange(phaseConfig.phase2.start),
      rollNumbers: phaseConfig.phase2.rolls,
      slots: 18,
      timings: generateTimings(phaseConfig.phase2.start),
    },
    phase3: {
      name: 'Phase 3',
      time: formatTimeRange(phaseConfig.phase3.start),
      rollNumbers: phaseConfig.phase3.rolls,
      slots: 18,
      timings: generateTimings(phaseConfig.phase3.start),
    },
  }), [phaseConfig]);

  // All unique teachers
  const allTeachers = useMemo(() => {
    const teacherSet = new Set();
    Object.values(teacherData).forEach(teachers => {
      teachers.forEach(teacher => teacherSet.add(teacher));
    });
    return Array.from(teacherSet).sort();
  }, [teacherData]);

  // ── Auth state ──
  const [authUser, setAuthUser] = useState(null);       // Supabase auth user
  const [userRole, setUserRole] = useState(null);        // 'teacher' | 'admin' | null
  const [loggedInTeacher, setLoggedInTeacher] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [loginType, setLoginType] = useState('teacher'); // 'teacher' | 'admin'
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [adminPwInput, setAdminPwInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Change password modal
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePwError, setChangePwError] = useState('');
  const [changePwSuccess, setChangePwSuccess] = useState('');

  // ── Data state ──
  const [bookings, setBookings] = useState({});
  const [teacherStatus, setTeacherStatus] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // ── Admin/display state ──
  const [activeSheet, setActiveSheet] = useState('IX');
  const [activePhase, setActivePhase] = useState('phase1');
  const [slideshowMode, setSlideshowMode] = useState(false);
  const [currentSlideGrade, setCurrentSlideGrade] = useState(0);
  const [currentSlidePage, setCurrentSlidePage] = useState(0);
  const [showTeacherUpload, setShowTeacherUpload] = useState(false);
  const [uploadedTeachers, setUploadedTeachers] = useState(null);

  // ── Teacher accounts upload state ──
  const [showTeacherAccounts, setShowTeacherAccounts] = useState(false);
  const [uploadedTeacherAccounts, setUploadedTeacherAccounts] = useState(null); // parsed from excel
  const [teacherAccountsLoading, setTeacherAccountsLoading] = useState(false);
  const [teacherAccountsResults, setTeacherAccountsResults] = useState(null); // after save

  // ── Student upload state ──
  const [showStudentUpload, setShowStudentUpload] = useState(false);
  const [studentUploadGrade, setStudentUploadGrade] = useState('');
  const [studentUploadSection, setStudentUploadSection] = useState('');
  const [uploadedStudents, setUploadedStudents] = useState(null);
  const [studentUploadLoading, setStudentUploadLoading] = useState(false);

  // ── Parent booking state ──
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentSection, setStudentSection] = useState('');
  const [studentsList, setStudentsList] = useState([]); // from DB for dropdown
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmations, setConfirmations] = useState([]);

  // ── Tracking state ──
  const [showTrackingView, setShowTrackingView] = useState(false);
  const [trackingStudentName, setTrackingStudentName] = useState('');
  const [trackingStudentClass, setTrackingStudentClass] = useState('');
  const [trackingStudentSection, setTrackingStudentSection] = useState('');
  const [trackingStudentsList, setTrackingStudentsList] = useState([]);
  const [trackingStudentsLoading, setTrackingStudentsLoading] = useState(false);
  const [trackedBookings, setTrackedBookings] = useState([]);
  const [nextUpAlerts, setNextUpAlerts] = useState([]); // booking ids where student is "next up"

  // ── PTM config ──
  const [ptmDate, setPtmDate] = useState('PTM Day');
  const [showDateEditor, setShowDateEditor] = useState(false);

  // ─── On mount: check existing session ─────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuthUser(session.user);
        resolveTeacherFromAuth(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuthUser(session.user);
        resolveTeacherFromAuth(session.user);
      } else {
        setAuthUser(null);
        setUserRole(null);
        setLoggedInTeacher('');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const resolveTeacherFromAuth = async (user) => {
    // Look up teacher by auth_email
    const { data, error } = await supabase
      .from('teachers')
      .select('teacher_name, is_admin')
      .eq('auth_email', user.email)
      .single();

    if (data) {
      setLoggedInTeacher(data.teacher_name);
      setUserRole(data.is_admin ? 'admin' : 'teacher');
    } else {
      // email not linked to any teacher — treat as unlinked (logout)
      await supabase.auth.signOut();
    }
  };

  // ─── Load data on mount ───────────────────────────────────────────────────
  useEffect(() => {
    loadBookings();
    loadTeacherStatus();
    loadTeachersFromDatabase();
    loadPtmConfig();
  }, []);

  // ─── Check next-up alerts for tracked student ────────────────────────────
  // Called whenever bookings change AND a student is viewing their appointments
  const checkNextUpAlerts = useCallback((currentBookings, currentTrackedBookings) => {
    if (!currentTrackedBookings || currentTrackedBookings.length === 0) return;
    const alerts = [];
    currentTrackedBookings.forEach(tracked => {
      if (tracked.status !== 'pending') return;
      // Find the booking immediately before this one for the same teacher
      const prevSlot = tracked.slot - 1;
      if (prevSlot < 1) return;
      // Check if previous slot for this teacher is now 'done'
      for (const grade of GRADES) {
        const prevKey = getBookingKey(grade, tracked.teacher, tracked.phase, prevSlot);
        if (currentBookings[prevKey] && currentBookings[prevKey].status === 'done') {
          alerts.push(tracked.id);
          break;
        }
      }
    });
    setNextUpAlerts(alerts);
  }, []);

  // ─── Real-time subscriptions ──────────────────────────────────────────────
  useEffect(() => {
    const bookingsSub = supabase
      .channel('bookings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => loadBookings())
      .subscribe();

    const statusSub = supabase
      .channel('teacher_status_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teacher_status' }, () => loadTeacherStatus())
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsSub);
      supabase.removeChannel(statusSub);
    };
  }, []);

  // ─── Slideshow ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (slideshowMode && userRole === 'admin') {
      const interval = setInterval(() => {
        const currentGradeTeachers = teacherData[GRADES[currentSlideGrade]] || [];
        const totalPages = Math.ceil(currentGradeTeachers.length / TEACHERS_PER_PAGE);
        if (totalPages > 1 && currentSlidePage < totalPages - 1) {
          setCurrentSlidePage(prev => prev + 1);
        } else {
          setCurrentSlidePage(0);
          setCurrentSlideGrade(prev => (prev + 1) % GRADES.length);
        }
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [slideshowMode, userRole, currentSlideGrade, currentSlidePage, teacherData]);

  useEffect(() => {
    if (slideshowMode) setActiveSheet(GRADES[currentSlideGrade]);
  }, [currentSlideGrade, slideshowMode]);

  // ─── Load students when grade+section changes (parent booking) ────────────
  useEffect(() => {
    if (studentClass && studentSection) {
      loadStudentsForDropdown(studentClass, studentSection, setStudentsList, setStudentsLoading);
      setStudentName(''); // reset name when grade/section changes
    } else {
      setStudentsList([]);
    }
  }, [studentClass, studentSection]);

  // ─── Load students for tracking dropdown ─────────────────────────────────
  useEffect(() => {
    if (trackingStudentClass && trackingStudentSection) {
      loadStudentsForDropdown(trackingStudentClass, trackingStudentSection, setTrackingStudentsList, setTrackingStudentsLoading);
      setTrackingStudentName('');
    } else {
      setTrackingStudentsList([]);
    }
  }, [trackingStudentClass, trackingStudentSection]);

  // ─── Data loaders ─────────────────────────────────────────────────────────
  const loadStudentsForDropdown = async (grade, section, setList, setLoading) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('students')
      .select('name, sid, serial_number')
      .eq('grade', grade)
      .eq('section', section)
      .order('serial_number', { ascending: true });

    if (!error && data) {
      setList(data);
    } else {
      setList([]);
    }
    setLoading(false);
  };

  const loadTeachersFromDatabase = async () => {
    try {
      const { data, error } = await supabase.from('teachers').select('*').order('teacher_name');
      if (error) { setIsLoading(false); return; }
      if (data && data.length > 0) {
        const grouped = Object.fromEntries(GRADES.map(g => [g, []]));
        data.forEach(t => {
          if (grouped[t.grade]) grouped[t.grade].push(t.teacher_name);
        });
        Object.keys(grouped).forEach(g => grouped[g].sort());
        setTeacherData(grouped);
      }
    } catch (e) {
      console.error('Exception loading teachers:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBookings = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('bookings').select('*');
    if (error) { setIsLoading(false); return; }

    const bookingsMap = {};
    data.forEach(booking => {
      const correctKey = getBookingKey(booking.grade, booking.teacher, booking.phase, booking.slot_number);
      bookingsMap[correctKey] = {
        studentName: booking.student_name,
        studentClass: booking.student_class,
        studentSection: booking.student_section,
        grade: booking.grade,
        teacher: booking.teacher,
        phase: booking.phase,
        slot: booking.slot_number,
        status: booking.status || 'pending',
        id: booking.id
      };
    });
    setBookings(bookingsMap);
    setIsLoading(false);

    // Refresh tracked bookings statuses in real-time
    setTrackedBookings(prev => {
      if (!prev || prev.length === 0) return prev;
      const updated = prev.map(tb => {
        // Find this booking in the new map
        for (const grade of GRADES) {
          const key = getBookingKey(grade, tb.teacher, tb.phase, tb.slot);
          if (bookingsMap[key] && bookingsMap[key].studentName === tb.studentName) {
            return { ...tb, status: bookingsMap[key].status };
          }
        }
        return tb;
      });
      checkNextUpAlerts(bookingsMap, updated);
      return updated;
    });
  };

  const loadTeacherStatus = async () => {
    const { data, error } = await supabase.from('teacher_status').select('*');
    if (error) return;
    const statusMap = {};
    data.forEach(s => {
      statusMap[s.teacher_name] = { isOnBreak: s.is_on_break, breakStartedAt: s.break_started_at };
    });
    setTeacherStatus(statusMap);
  };

  const loadPtmConfig = async () => {
    const { data } = await supabase.from('ptm_config').select('*').order('created_at', { ascending: false }).limit(1);
    if (data && data.length > 0) {
      const row = data[0];
      if (row.ptm_date) {
        const d = new Date(row.ptm_date);
        setPtmDate(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }));
      }
      setPhaseConfig({
        phase1: { start: row.phase1_start || '08:15', rolls: row.phase1_rolls || 'Roll Numbers: 21-30' },
        phase2: { start: row.phase2_start || '09:55', rolls: row.phase2_rolls || 'Roll Numbers: 1-10' },
        phase3: { start: row.phase3_start || '11:35', rolls: row.phase3_rolls || 'Roll Numbers: 11-20' },
      });
    }
  };

  // ─── Auth handlers ────────────────────────────────────────────────────────
  const handleTeacherLogin = async () => {
    if (!loginEmail || !loginPassword) {
      setLoginError('Please enter email and password');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    setLoginLoading(false);
    if (error) {
      setLoginError('Invalid email or password. Contact admin if you need help.');
    } else {
      setShowLogin(false);
      setLoginEmail('');
      setLoginPassword('');
    }
  };

  const handleAdminLogin = () => {
    if (adminPwInput === adminPassword) {
      setUserRole('admin');
      setShowLogin(false);
      setAdminPwInput('');
      setLoginError('');
    } else {
      setLoginError('Incorrect admin password!');
    }
  };

  const handleLogout = async () => {
    if (authUser) await supabase.auth.signOut();
    setUserRole(null);
    setLoggedInTeacher('');
    setAuthUser(null);
    setSlideshowMode(false);
  };

  const handleChangePassword = async () => {
    setChangePwError('');
    setChangePwSuccess('');
    if (!newPassword || !confirmPassword) { setChangePwError('Please fill both fields'); return; }
    if (newPassword !== confirmPassword) { setChangePwError('Passwords do not match'); return; }
    if (newPassword.length < 6) { setChangePwError('Password must be at least 6 characters'); return; }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setChangePwError(error.message);
    } else {
      setChangePwSuccess('Password changed successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => { setShowChangePassword(false); setChangePwSuccess(''); }, 2000);
    }
  };

  // ─── Booking helpers ──────────────────────────────────────────────────────
  const getBookingKey = (grade, teacher, phase, slot) => `${grade}-${teacher}-${phase}-${slot}`;

  const getAvailableSlotsForTeacher = async (teacher, grade, phase, sName, sClass, sSection, currentBookings = []) => {
    const availableSlots = [];
    const totalSlots = phases[phase].slots;

    let existingStudentBookings = [];
    if (sName && sClass && sSection) {
      const { data, error } = await supabase
        .from('bookings')
        .select('phase, slot_number')
        .eq('student_name', sName.trim())
        .eq('student_class', sClass.trim())
        .eq('student_section', sSection.trim());
      if (!error && data) existingStudentBookings = data.map(b => ({ phase: b.phase, slot: b.slot_number }));
    }

    const allStudentBookings = [...currentBookings, ...existingStudentBookings];
    const bookedSlotsInPhase = allStudentBookings.filter(b => b.phase === phase).map(b => b.slot);

    const blockedConsecutiveSlots = new Set();
    bookedSlotsInPhase.forEach(s => {
      if (s > 1) blockedConsecutiveSlots.add(s - 1);
      if (s < totalSlots) blockedConsecutiveSlots.add(s + 1);
    });

    for (let slot = 1; slot <= totalSlots; slot++) {
      const teacherIsBusy = GRADES.some(g => bookings[getBookingKey(g, teacher, phase, slot)]);
      if (!teacherIsBusy && !bookedSlotsInPhase.includes(slot) && !blockedConsecutiveSlots.has(slot)) {
        availableSlots.push(slot);
      }
    }
    return availableSlots;
  };

  const handleAddTeacher = (teacher, grade, phase, slot) => {
    setSelectedTeachers([...selectedTeachers, { teacher, grade, phase, slot }]);
  };

  const handleRemoveTeacher = (index) => {
    setSelectedTeachers(selectedTeachers.filter((_, i) => i !== index));
  };

  const validateAndSubmit = async () => {
    if (!studentName || !studentClass || !studentSection) {
      alert('Please select grade, section, and student name');
      return;
    }
    if (selectedTeachers.length === 0) {
      alert('Please select at least one teacher');
      return;
    }

    const { data: existingBookings, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('student_name', studentName.trim())
      .eq('student_class', studentClass.trim())
      .eq('student_section', studentSection.trim());

    if (fetchError) { alert('Error checking existing bookings: ' + fetchError.message); return; }

    const existingSlots = new Set();
    const existingTeachers = new Set();
    const blockedSlots = new Set();

    existingBookings.forEach(b => {
      existingSlots.add(`${b.phase}-${b.slot_number}`);
      existingTeachers.add(b.teacher);
      blockedSlots.add(`${b.phase}-${b.slot_number - 1}`);
      blockedSlots.add(`${b.phase}-${b.slot_number + 1}`);
    });

    const validationErrors = [];
    for (const sel of selectedTeachers) {
      const slotKey = `${sel.phase}-${sel.slot}`;
      if (existingSlots.has(slotKey)) { validationErrors.push(`${sel.teacher}: Student already has a booking at ${phases[sel.phase].name} Slot ${sel.slot}`); continue; }
      if (existingTeachers.has(sel.teacher)) { validationErrors.push(`${sel.teacher}: Already booked this teacher`); continue; }
      existingTeachers.add(sel.teacher);
      if (blockedSlots.has(slotKey)) { validationErrors.push(`${sel.teacher} at Slot ${sel.slot}: Cannot book consecutive slots`); continue; }
    }

    if (validationErrors.length > 0) {
      alert('❌ Booking Validation Failed:\n\n' + validationErrors.join('\n') + '\n\nPlease remove conflicting selections.');
      return;
    }

    const results = [];
    const errors = [];

    for (const sel of selectedTeachers) {
      const bookingKey = getBookingKey(sel.grade, sel.teacher, sel.phase, sel.slot);
      const { data, error } = await supabase.from('bookings').insert({
        booking_key: bookingKey,
        student_name: studentName,
        student_class: studentClass,
        student_section: studentSection,
        grade: sel.grade,
        teacher: sel.teacher,
        phase: sel.phase,
        slot_number: sel.slot,
        time_slot: `${phases[sel.phase].name} - Slot ${sel.slot}`,
        status: 'pending'
      }).select();

      if (error) errors.push({ teacher: sel.teacher, error: error.message });
      else results.push({ teacher: sel.teacher, grade: sel.grade, phase: sel.phase, phaseName: phases[sel.phase].name, slot: sel.slot });
    }

    if (errors.length > 0) alert('Some bookings failed:\n' + errors.map(e => `${e.teacher}: ${e.error}`).join('\n'));
    if (results.length > 0) { setConfirmations(results); setShowConfirmation(true); }
    else alert('No bookings were successful.');
  };

  // ─── Teacher functions ────────────────────────────────────────────────────
  const updateBookingStatus = async (bookingKey, newStatus) => {
    const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('booking_key', bookingKey);
    if (error) alert('Failed to update status');
  };

  const toggleBreakStatus = async () => {
    const currentStatus = teacherStatus[loggedInTeacher]?.isOnBreak || false;
    await supabase.from('teacher_status').upsert({
      teacher_name: loggedInTeacher,
      is_on_break: !currentStatus,
      break_started_at: !currentStatus ? new Date() : null,
      updated_at: new Date()
    }, { onConflict: 'teacher_name' });
  };

  const getTeacherGrades = (teacherName) => {
    return GRADES.filter(g => (teacherData[g] || []).includes(teacherName));
  };

  // ─── Parent tracking ──────────────────────────────────────────────────────
  const handleTrackBookings = async () => {
    if (!trackingStudentName || !trackingStudentClass || !trackingStudentSection) {
      alert('Please select grade, section, and student name');
      return;
    }
    const searchName = trackingStudentName.trim();
    const searchClass = trackingStudentClass.trim();
    const searchSection = trackingStudentSection.trim();

    const { data: data1 } = await supabase.from('bookings').select('*')
      .ilike('student_name', `%${searchName}%`)
      .ilike('student_class', searchClass)
      .ilike('student_section', searchSection);

    const { data: data2 } = await supabase.from('bookings').select('*')
      .ilike('student_name', `%${searchName}%`)
      .ilike('student_class', `${searchClass}-${searchSection}`);

    const allData = [...(data1 || []), ...(data2 || [])];
    const uniqueData = Array.from(new Map(allData.map(item => [item.id, item])).values())
      .sort((a, b) => a.phase !== b.phase ? a.phase.localeCompare(b.phase) : a.slot_number - b.slot_number);

    if (uniqueData.length === 0) {
      alert(`No appointments found for "${searchName}" in ${searchClass}-${searchSection}`);
      return;
    }

    const formattedBookings = uniqueData.map(booking => ({
      id: booking.id,
      teacher: booking.teacher,
      grade: booking.grade,
      phase: booking.phase,
      slot: booking.slot_number,
      timing: phases[booking.phase]?.timings[booking.slot_number - 1] || '',
      phaseName: phases[booking.phase]?.name || '',
      status: booking.status,
      teacherStatus: teacherStatus[booking.teacher]?.isOnBreak ? 'break' : 'ready'
    }));

    setTrackedBookings(formattedBookings);
    setShowTrackingView(true);
  };

  // ─── Admin functions ──────────────────────────────────────────────────────
  const exportToCSV = () => {
    const csvRows = ['Grade,Teacher,Phase,Slot,Student Name,Class,Section,Status'];
    Object.entries(bookings).forEach(([, b]) => {
      csvRows.push(`${b.grade},${b.teacher},${b.phase},${b.slot},${b.studentName},${b.studentClass},${b.studentSection},${b.status}`);
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `ptm-schedule-${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  const clearAllBookings = async () => {
    if (!window.confirm('Clear ALL bookings? This cannot be undone!')) return;
    await supabase.from('bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  };

  const cleanupConflictingBookings = async () => {
    if (!window.confirm('Scan and remove conflicting bookings? First booking is kept.')) return;
    setIsLoading(true);
    try {
      const { data: allBookings, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      const toDelete = [];
      const studentBookings = {};
      for (const booking of allBookings) {
        const key = `${booking.student_name}-${booking.student_class}-${booking.student_section}`.toLowerCase();
        if (!studentBookings[key]) studentBookings[key] = { slots: new Set(), teachers: new Set() };
        const s = studentBookings[key];
        const slotKey = `${booking.phase}-${booking.slot_number}`;
        let shouldDelete = false;
        if (s.slots.has(slotKey)) shouldDelete = true;
        if (s.teachers.has(booking.teacher)) shouldDelete = true;
        const prev = `${booking.phase}-${booking.slot_number - 1}`;
        const next = `${booking.phase}-${booking.slot_number + 1}`;
        if (s.slots.has(prev) || s.slots.has(next)) shouldDelete = true;
        if (shouldDelete) toDelete.push(booking.id);
        else { s.slots.add(slotKey); s.teachers.add(booking.teacher); }
      }
      if (toDelete.length === 0) { alert('✅ No conflicts found!'); setIsLoading(false); return; }
      if (!window.confirm(`Found ${toDelete.length} conflicts. Delete them?`)) { setIsLoading(false); return; }
      await supabase.from('bookings').delete().in('id', toDelete);
      alert(`✅ Deleted ${toDelete.length} conflicting bookings!`);
      await loadBookings();
    } catch (e) { alert('Error: ' + e.message); }
    finally { setIsLoading(false); }
  };

  const normalizeOldData = async () => {
    if (!window.confirm('Fix old bookings where student_class contains "XII-D" format?')) return;
    setIsLoading(true);
    try {
      const { data } = await supabase.from('bookings').select('*');
      const toUpdate = data.filter(b => b.student_class?.includes('-')).map(b => {
        const [cls, sec] = b.student_class.split('-');
        return { id: b.id, newClass: cls, newSection: sec || b.student_section };
      });
      if (toUpdate.length === 0) { alert('✅ Already normalized!'); setIsLoading(false); return; }
      for (const item of toUpdate) {
        await supabase.from('bookings').update({ student_class: item.newClass, student_section: item.newSection }).eq('id', item.id);
      }
      alert(`✅ Normalized ${toUpdate.length} bookings!`);
      await loadBookings();
    } catch (e) { alert('Error: ' + e.message); }
    finally { setIsLoading(false); }
  };

  const diagnoseBookings = async () => {
    if (!window.confirm('Diagnose bookings for key mismatches?')) return;
    setIsLoading(true);
    try {
      const { data } = await supabase.from('bookings').select('*');
      const issues = data.filter(b => {
        const correct = `${b.grade}-${b.teacher}-${b.phase}-${b.slot_number}`;
        return b.booking_key !== correct;
      });
      if (issues.length === 0) { alert('✅ All booking keys are correct!'); setIsLoading(false); return; }
      if (window.confirm(`Found ${issues.length} key mismatches. Fix them?`)) {
        for (const b of issues) {
          const correct = `${b.grade}-${b.teacher}-${b.phase}-${b.slot_number}`;
          await supabase.from('bookings').update({ booking_key: correct }).eq('id', b.id);
        }
        alert(`✅ Fixed ${issues.length} booking keys!`);
        await loadBookings();
      }
    } catch (e) { alert('Error: ' + e.message); }
    finally { setIsLoading(false); }
  };

  // ─── Teacher upload (existing logic, updated for VI-XII) ──────────────────
  const handleTeacherExcelUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const headerRow = jsonData[0];
        const gradeColumns = {};
        headerRow.forEach((h, i) => { if (GRADES.includes(h)) gradeColumns[h] = i; });
        const parsedData = Object.fromEntries(GRADES.map(g => [g, []]));
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          GRADES.forEach(grade => {
            const col = gradeColumns[grade];
            if (col !== undefined && row[col]) {
              const name = String(row[col]).trim();
              if (name && !parsedData[grade].includes(name)) parsedData[grade].push(name);
            }
          });
        }
        GRADES.forEach(g => parsedData[g].sort());
        setUploadedTeachers(parsedData);
      } catch (err) {
        alert('Error parsing Excel. Ensure columns are: VI, VII, VIII, IX, X, XI, XII');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const saveUploadedTeachers = async () => {
    if (!uploadedTeachers) return;
    try {
      await supabase.from('teachers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const records = [];
      GRADES.forEach(grade => {
        uploadedTeachers[grade].forEach(name => records.push({ teacher_name: name, grade }));
      });
      for (let i = 0; i < records.length; i += 100) {
        const { error } = await supabase.from('teachers').insert(records.slice(i, i + 100));
        if (error) { alert('Error uploading batch: ' + error.message); return; }
      }
      setTeacherData(uploadedTeachers);
      setShowTeacherUpload(false);
      setUploadedTeachers(null);
      alert(`✅ ${records.length} teachers saved!`);
    } catch (e) { alert('Error: ' + e.message); }
  };

  // ─── Student upload ───────────────────────────────────────────────────────
  const handleStudentExcelUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Find header row — look for Serial/SID/Name columns
        let headerRow = 0;
        let colSerial = -1, colSid = -1, colName = -1;

        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
          const row = jsonData[i].map(c => String(c || '').toLowerCase().trim());
          const sIdx = row.findIndex(c => c.includes('serial') || c === 's.no' || c === 'sno' || c === 'sr');
          const sidIdx = row.findIndex(c => c.includes('sid') || c.includes('admission') || c.includes('roll'));
          const nameIdx = row.findIndex(c => c.includes('name'));
          if (nameIdx >= 0) { headerRow = i; colSerial = sIdx; colSid = sidIdx; colName = nameIdx; break; }
        }

        if (colName < 0) { alert('Could not find "Name" column. Ensure your Excel has columns: Serial Number, SID Number, Name of Student'); return; }

        const students = [];
        for (let i = headerRow + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          const name = row[colName] ? String(row[colName]).trim() : '';
          if (!name) continue;
          const sid = colSid >= 0 && row[colSid] ? String(row[colSid]).trim() : `${studentUploadGrade}-${studentUploadSection}-${i}`;
          const serial = colSerial >= 0 && row[colSerial] ? parseInt(row[colSerial]) : i;
          students.push({ name, sid, serial });
        }

        setUploadedStudents(students);
      } catch (err) {
        console.error(err);
        alert('Error parsing Excel: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const saveUploadedStudents = async () => {
    if (!uploadedStudents || !studentUploadGrade || !studentUploadSection) return;
    setStudentUploadLoading(true);
    try {
      // Delete existing students for this grade+section
      await supabase.from('students').delete()
        .eq('grade', studentUploadGrade)
        .eq('section', studentUploadSection);

      const records = uploadedStudents.map(s => ({
        sid: s.sid,
        name: s.name,
        grade: studentUploadGrade,
        section: studentUploadSection,
        serial_number: s.serial
      }));

      for (let i = 0; i < records.length; i += 100) {
        const { error } = await supabase.from('students').insert(records.slice(i, i + 100));
        if (error) { alert('Error saving students: ' + error.message); setStudentUploadLoading(false); return; }
      }

      alert(`✅ ${records.length} students saved for Grade ${studentUploadGrade}-${studentUploadSection}!`);
      setUploadedStudents(null);
      setStudentUploadGrade('');
      setStudentUploadSection('');
      setShowStudentUpload(false);
    } catch (e) { alert('Error: ' + e.message); }
    finally { setStudentUploadLoading(false); }
  };

  // ─── Phase config save ────────────────────────────────────────────────────
  const savePhaseConfig = async (draft) => {
    const { data: existing } = await supabase.from('ptm_config').select('id').order('created_at', { ascending: false }).limit(1);
    const payload = {
      phase1_start: draft.phase1.start,
      phase2_start: draft.phase2.start,
      phase3_start: draft.phase3.start,
      phase1_rolls: draft.phase1.rolls,
      phase2_rolls: draft.phase2.rolls,
      phase3_rolls: draft.phase3.rolls,
      updated_at: new Date(),
    };
    if (existing && existing.length > 0) {
      await supabase.from('ptm_config').update(payload).eq('id', existing[0].id);
    } else {
      await supabase.from('ptm_config').insert({ ...payload, ptm_date: new Date().toISOString().split('T')[0], start_time: '08:00', end_time: '13:00' });
    }
    setPhaseConfig(draft);
    setShowPhaseEditor(false);
  };

  // ─── Teacher accounts upload ──────────────────────────────────────────────
  const handleTeacherAccountsExcel = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Find header row - look for Name/Grade/Email columns
        let headerRow = 0;
        let colName = -1, colGrade = -1, colEmail = -1;
        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
          const row = jsonData[i].map(c => String(c || '').toLowerCase().trim());
          const nIdx = row.findIndex(c => c.includes('name') || c === 'teacher');
          const gIdx = row.findIndex(c => c.includes('grade') || c === 'class');
          const eIdx = row.findIndex(c => c.includes('email') || c === 'mail');
          if (nIdx >= 0 && eIdx >= 0) {
            headerRow = i; colName = nIdx; colGrade = gIdx; colEmail = eIdx; break;
          }
        }

        if (colName < 0 || colEmail < 0) {
          alert('Could not find required columns. Excel must have: Teacher Name, Grade, Email');
          return;
        }

        const teachers = [];
        for (let i = headerRow + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          const name = row[colName] ? String(row[colName]).trim().toUpperCase() : '';
          const email = row[colEmail] ? String(row[colEmail]).trim().toLowerCase() : '';
          const grade = colGrade >= 0 && row[colGrade] ? String(row[colGrade]).trim().toUpperCase() : '';
          if (!name || !email) continue;
          if (!email.includes('@')) continue; // basic email check
          teachers.push({ name, grade, email });
        }

        if (teachers.length === 0) {
          alert('No valid teacher records found. Check your Excel format.');
          return;
        }

        setUploadedTeacherAccounts(teachers);
        setTeacherAccountsResults(null);
      } catch (err) {
        alert('Error parsing Excel: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const saveTeacherAccounts = async () => {
    if (!uploadedTeacherAccounts) return;
    setTeacherAccountsLoading(true);
    setTeacherAccountsResults(null);

    const results = { created: [], updated: [], failed: [] };

    for (const teacher of uploadedTeacherAccounts) {
      try {
        // Step 1: Check if auth user already exists by trying to create
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: teacher.email,
          password: 'SBSptm@1234',
          email_confirm: true,  // skip email confirmation
          user_metadata: { teacher_name: teacher.name }
        });

        if (authError) {
          if (authError.message.includes('already been registered') || authError.message.includes('already exists')) {
            // User exists — just update the teachers table
            const { error: updateError } = await supabase
              .from('teachers')
              .update({ auth_email: teacher.email })
              .eq('teacher_name', teacher.name);

            if (updateError) {
              results.failed.push({ name: teacher.name, email: teacher.email, reason: 'Auth exists but DB update failed: ' + updateError.message });
            } else {
              results.updated.push({ name: teacher.name, email: teacher.email });
            }
          } else {
            results.failed.push({ name: teacher.name, email: teacher.email, reason: authError.message });
          }
          continue;
        }

        // Step 2: Update auth_email in teachers table (match by name only)
        await supabase.from('teachers').update({ auth_email: teacher.email }).eq('teacher_name', teacher.name);

        results.created.push({ name: teacher.name, email: teacher.email });

      } catch (err) {
        results.failed.push({ name: teacher.name, email: teacher.email, reason: err.message });
      }
    }

    setTeacherAccountsResults(results);
    setTeacherAccountsLoading(false);

    // Reload teacher data
    await loadTeachersFromDatabase();
  };

  // ─── Loading screen ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
        <div className="text-white text-2xl">Loading PTM Scheduler...</div>
      </div>
    );
  }

  // ─── LOGIN MODAL ──────────────────────────────────────────────────────────
  if (showLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center">Staff Login</h2>

          <div className="flex gap-2 mb-6">
            <button onClick={() => { setLoginType('teacher'); setLoginError(''); }}
              className={`flex-1 py-2 rounded-lg font-semibold ${loginType === 'teacher' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              <User className="inline mr-2" size={18} /> Teacher
            </button>
            <button onClick={() => { setLoginType('admin'); setLoginError(''); }}
              className={`flex-1 py-2 rounded-lg font-semibold ${loginType === 'admin' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              <Lock className="inline mr-2" size={18} /> Admin
            </button>
          </div>

          {loginType === 'teacher' ? (
            <>
              <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                placeholder="your.email@sbs-school.org"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg mb-3 focus:outline-none focus:border-indigo-500" />
              <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleTeacherLogin()}
                placeholder="Password"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-indigo-500" />
              {loginError && <p className="text-red-600 text-sm mb-3">{loginError}</p>}
              <button onClick={handleTeacherLogin} disabled={loginLoading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 disabled:bg-gray-400">
                {loginLoading ? 'Signing in...' : 'Login'}
              </button>
              <p className="text-xs text-gray-500 mt-3 text-center">Contact admin if you need your login credentials set up.</p>
            </>
          ) : (
            <>
              <input type="password" value={adminPwInput} onChange={e => setAdminPwInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleAdminLogin()}
                placeholder="Admin Password"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-indigo-500" />
              {loginError && <p className="text-red-600 text-sm mb-3">{loginError}</p>}
              <button onClick={handleAdminLogin}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700">
                Login as Admin
              </button>
            </>
          )}

          <button onClick={() => { setShowLogin(false); setLoginError(''); }}
            className="w-full mt-3 text-gray-600 py-2">← Back to Parent Portal</button>
        </div>
      </div>
    );
  }

  // ─── CHANGE PASSWORD MODAL ────────────────────────────────────────────────
  const ChangePasswordModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <h2 className="text-xl font-bold mb-6 text-indigo-700 flex items-center gap-2"><Key size={20} /> Change Password</h2>
        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
          placeholder="New password (min 6 characters)"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg mb-3 focus:outline-none focus:border-indigo-500" />
        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-indigo-500" />
        {changePwError && <p className="text-red-600 text-sm mb-3">{changePwError}</p>}
        {changePwSuccess && <p className="text-green-600 text-sm mb-3">{changePwSuccess}</p>}
        <div className="flex gap-2">
          <button onClick={handleChangePassword}
            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700">Save Password</button>
          <button onClick={() => { setShowChangePassword(false); setChangePwError(''); setNewPassword(''); setConfirmPassword(''); }}
            className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold">Cancel</button>
        </div>
      </div>
    </div>
  );

  // ─── PARENT VIEW ──────────────────────────────────────────────────────────
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
                  <p className="text-sm opacity-90 mt-1">Step By Step School • {ptmDate}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setShowTrackingView(true); setTrackingStudentName(''); setTrackingStudentClass(''); setTrackingStudentSection(''); setTrackedBookings([]); }}
                    className="flex items-center gap-2 bg-yellow-400 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-yellow-500">
                    <Calendar size={18} /> View My Appointments
                  </button>
                  <button onClick={() => setShowLogin(true)}
                    className="flex items-center gap-2 bg-white text-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-indigo-50">
                    <User size={18} /> Staff Login
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
                  <div className="bg-indigo-50 rounded-lg p-4 mb-6 border-2 border-indigo-200">
                    <h4 className="font-bold text-indigo-900 mb-2">Student Details:</h4>
                    <p className="text-indigo-800"><strong>Name:</strong> {studentName}</p>
                    <p className="text-indigo-800"><strong>Class:</strong> {studentClass}-{studentSection}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 mb-6 border-2 border-green-200">
                    <h4 className="font-bold text-green-900 mb-3">Your PTM Appointments:</h4>
                    {confirmations.map((conf, idx) => (
                      <div key={idx} className="bg-white rounded p-3 mb-2 border border-green-300">
                        <p className="font-bold text-lg text-green-800">✓ {conf.teacher}</p>
                        <p className="text-gray-700">Grade {conf.grade}</p>
                        <p className="text-gray-700">{conf.phaseName} - Slot {conf.slot} ({phases[conf.phase]?.timings[conf.slot - 1]})</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                    <p className="text-sm text-yellow-800"><strong>📌 Important:</strong> Please arrive 5 minutes before your slot time.</p>
                  </div>
                  <button onClick={() => { setShowConfirmation(false); setStudentName(''); setStudentClass(''); setStudentSection(''); setSelectedTeachers([]); }}
                    className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700">
                    Done - Book for Another Student
                  </button>
                </div>
              </div>
            )}

            {/* Tracking View */}
            {showTrackingView && !trackedBookings.length && (
              <div className="p-6">
                <div className="max-w-md mx-auto">
                  <h2 className="text-2xl font-bold text-indigo-700 mb-4">🔍 View My Appointments</h2>
                  <p className="text-gray-600 mb-6">Select your child's class and section to find their appointments</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Grade *</label>
                      <select value={trackingStudentClass} onChange={e => setTrackingStudentClass(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                        <option value="">Select Grade</option>
                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Section *</label>
                      <select value={trackingStudentSection} onChange={e => setTrackingStudentSection(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        disabled={!trackingStudentClass}>
                        <option value="">Select Section</option>
                        {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Student Name *</label>
                      {trackingStudentsLoading ? (
                        <div className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-400">Loading students...</div>
                      ) : (
                        <select value={trackingStudentName} onChange={e => setTrackingStudentName(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          disabled={!trackingStudentClass || !trackingStudentSection}>
                          <option value="">Select Student</option>
                          {trackingStudentsList.map(s => <option key={s.sid} value={s.name}>{s.name}</option>)}
                          {trackingStudentsList.length === 0 && trackingStudentClass && trackingStudentSection && (
                            <option disabled>No students found for this class</option>
                          )}
                        </select>
                      )}
                    </div>
                    <button onClick={handleTrackBookings}
                      className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700">
                      View My Appointments
                    </button>
                    <button onClick={() => { setShowTrackingView(false); setTrackingStudentName(''); setTrackingStudentClass(''); setTrackingStudentSection(''); setTrackedBookings([]); }}
                      className="w-full bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-400">
                      Back to Booking
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tracking Results */}
            {showTrackingView && trackedBookings.length > 0 && (
              <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-indigo-700">📋 My Appointments</h2>
                    <p className="text-sm text-gray-600 mt-1">{ptmDate}</p>
                  </div>
                  <button onClick={() => { setShowTrackingView(false); setTrackedBookings([]); setTrackingStudentName(''); setTrackingStudentClass(''); setTrackingStudentSection(''); }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-400">Back</button>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4 mb-6">
                  <p className="text-indigo-900"><strong>Student:</strong> {trackingStudentName}</p>
                  <p className="text-indigo-900"><strong>Class:</strong> {trackingStudentClass}-{trackingStudentSection}</p>
                  <p className="text-indigo-900"><strong>Total Appointments:</strong> {trackedBookings.length}</p>
                </div>
                <div className="space-y-4">
                  {trackedBookings.map((booking, idx) => {
                    const now = new Date();
                    const currentMins = now.getHours() * 60 + now.getMinutes();
                    const [bh, bm] = (booking.timing || '0:0').split(':').map(Number);
                    const bookingMins = bh * 60 + bm;
                    const isPast = bookingMins < currentMins;
                    const isNext = !isPast && trackedBookings.findIndex(b => { const [h, m] = (b.timing || '0:0').split(':').map(Number); return h * 60 + m >= currentMins; }) === idx;
                    const isNextUp = nextUpAlerts.includes(booking.id);
                    return (
                      <div key={booking.id} className={`border-2 rounded-lg p-4 ${isNextUp ? 'border-green-500 bg-green-50 shadow-lg' : isNext ? 'border-yellow-400 bg-yellow-50' : isPast ? 'border-gray-300 bg-gray-50 opacity-60' : 'border-indigo-300 bg-white'}`}>

                        {/* Next-up alert banner */}
                        {isNextUp && (
                          <div className="bg-green-500 text-white rounded-lg p-3 mb-3 flex items-center gap-2 animate-pulse">
                            <span className="text-2xl">🔔</span>
                            <div>
                              <p className="font-bold text-lg">Your turn is next!</p>
                              <p className="text-sm opacity-90">Please proceed to {booking.teacher}'s desk now.</p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-800">{booking.teacher}</h3>
                            <p className="text-gray-600">Grade {booking.grade}</p>
                            <p className="text-indigo-700 font-semibold">{booking.phaseName} - Slot {booking.slot} • {booking.timing}</p>
                            <div className="mt-2 flex items-center gap-2">
                              {booking.status === 'done' && <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">✓ Completed</span>}
                              {booking.status === 'not_met' && <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold">✗ Not Met</span>}
                              {booking.status === 'met_later' && <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">⏰ Met Later</span>}
                              {booking.status === 'pending' && !isPast && <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">⏳ Pending</span>}
                            </div>
                            {booking.status === 'pending' && !isPast && (
                              <div className="mt-2">
                                {booking.teacherStatus === 'break'
                                  ? <span className="inline-flex items-center text-yellow-700 text-sm"><Coffee size={14} className="mr-1" /> Teacher on Break</span>
                                  : <span className="inline-flex items-center text-green-700 text-sm"><CheckCircle size={14} className="mr-1" /> Teacher Ready</span>}
                              </div>
                            )}
                          </div>
                          {isNextUp && <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">GO NOW</div>}
                          {!isNextUp && isNext && !isPast && <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold">NEXT</div>}
                          {isPast && <div className="bg-gray-400 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">PAST</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Parent Booking Form */}
            {!showTrackingView && (
              <>
                <div className="p-6 bg-blue-50 border-b">
                  <h2 className="font-bold text-blue-800 mb-2">📋 How to Book:</h2>
                  <ol className="text-sm text-blue-700 space-y-1">
                    <li>1. Select your child's grade and section</li>
                    <li>2. Choose your child's name from the list</li>
                    <li>3. Select teachers to meet (with phase and slot)</li>
                    <li>4. Click "Submit All Bookings" and screenshot the confirmation</li>
                  </ol>
                </div>

                {/* Student Details - dropdowns */}
                <div className="p-6 border-b bg-gray-50">
                  <h3 className="text-lg font-bold mb-4">Student Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Grade *</label>
                      <select value={studentClass} onChange={e => setStudentClass(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                        <option value="">Select Grade</option>
                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Section *</label>
                      <select value={studentSection} onChange={e => setStudentSection(e.target.value)}
                        disabled={!studentClass}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-200">
                        <option value="">Select Section</option>
                        {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Student Name *</label>
                      {studentsLoading ? (
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-400 bg-gray-50">Loading...</div>
                      ) : (
                        <select value={studentName} onChange={e => setStudentName(e.target.value)}
                          disabled={!studentClass || !studentSection}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-200">
                          <option value="">Select Student</option>
                          {studentsList.map(s => <option key={s.sid} value={s.name}>{s.name}</option>)}
                          {studentsList.length === 0 && studentClass && studentSection && (
                            <option disabled>No students found — contact admin</option>
                          )}
                        </select>
                      )}
                    </div>
                  </div>
                </div>

                {/* Teacher Selection */}
                <div className="p-6">
                  <h3 className="text-lg font-bold mb-4">Select Teachers to Meet</h3>
                  {selectedTeachers.length > 0 && (
                    <div className="mb-6 bg-green-50 border-2 border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-800 mb-3">Selected Bookings:</h4>
                      {selectedTeachers.map((sel, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white rounded p-3 mb-2">
                          <div>
                            <p className="font-semibold">{sel.teacher}</p>
                            <p className="text-sm text-gray-600">Grade {sel.grade} • {phases[sel.phase].name} • Slot {sel.slot} ({phases[sel.phase].timings[sel.slot - 1]})</p>
                          </div>
                          <button onClick={() => handleRemoveTeacher(idx)} className="text-red-600 hover:text-red-800 font-semibold">Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <ParentTeacherSelector
                    teacherData={teacherData}
                    phases={phases}
                    bookings={bookings}
                    getBookingKey={getBookingKey}
                    getAvailableSlotsForTeacher={getAvailableSlotsForTeacher}
                    onAddTeacher={handleAddTeacher}
                    studentName={studentName}
                    studentClass={studentClass}
                    studentSection={studentSection}
                    selectedTeachers={selectedTeachers}
                    grades={GRADES}
                  />
                  <button onClick={validateAndSubmit} disabled={selectedTeachers.length === 0 || !studentName}
                    className="w-full mt-6 bg-indigo-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
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

  // ─── TEACHER VIEW ─────────────────────────────────────────────────────────
  if (userRole === 'teacher') {
    const isOnBreak = teacherStatus[loggedInTeacher]?.isOnBreak || false;
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
        {showChangePassword && <ChangePasswordModal />}
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h1 className="text-2xl font-bold">Welcome, {loggedInTeacher}</h1>
                  <p className="text-sm opacity-90">Your PTM Schedule • {ptmDate}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={toggleBreakStatus}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold ${isOnBreak ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-yellow-400 text-gray-800 hover:bg-yellow-500'}`}>
                    <Coffee size={18} /> {isOnBreak ? 'End Break' : 'Take Break'}
                  </button>
                  <button onClick={() => setShowChangePassword(true)}
                    className="flex items-center gap-2 bg-white text-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-indigo-50">
                    <Key size={18} /> Change Password
                  </button>
                  <button onClick={handleLogout}
                    className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600">
                    <LogOut size={18} /> Logout
                  </button>
                </div>
              </div>
            </div>

            {isOnBreak && (
              <div className="bg-orange-100 border-b-2 border-orange-400 p-3 text-center">
                <p className="text-orange-800 font-semibold">☕ You are currently on break</p>
              </div>
            )}

            <div className="flex gap-1 p-2 bg-gray-50 border-b">
              {Object.entries(phases).map(([phaseKey, phaseInfo]) => (
                <button key={phaseKey} onClick={() => setActivePhase(phaseKey)}
                  className={`flex-1 py-2 px-3 rounded font-semibold text-sm ${activePhase === phaseKey ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  <div>{phaseInfo.name}</div>
                  <div className="text-xs opacity-80">{phaseInfo.time}</div>
                </button>
              ))}
            </div>

            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">All Appointments - {phases[activePhase].name}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                {Array.from({ length: phases[activePhase].slots }, (_, i) => i + 1).map(slot => {
                  let booking = null, bookingKey = null;
                  for (const grade of GRADES) {
                    const key = getBookingKey(grade, loggedInTeacher, activePhase, slot);
                    if (bookings[key]) { booking = bookings[key]; bookingKey = key; break; }
                  }
                  return (
                    <div key={slot} className={`p-3 rounded-lg border-2 ${booking ? (booking.status === 'done' ? 'bg-green-100 border-green-500' : booking.status === 'not_met' ? 'bg-orange-100 border-orange-500' : booking.status === 'met_later' ? 'bg-yellow-100 border-yellow-500' : 'bg-blue-50 border-blue-500') : 'bg-gray-50 border-gray-300'}`}>
                      <div className="font-bold text-sm mb-1">Slot {slot}</div>
                      <div className="text-xs text-gray-600 mb-2">{phases[activePhase].timings[slot - 1]}</div>
                      {booking ? (
                        <div>
                          <div className="text-sm font-medium mb-1">{booking.studentName}</div>
                          <div className="text-xs text-gray-600 mb-2">Gr {booking.studentClass}-{booking.studentSection}</div>
                          <div className="flex flex-col gap-1">
                            {['done', 'not_met', 'met_later'].map(status => (
                              <button key={status} onClick={() => updateBookingStatus(bookingKey, status)}
                                className={`text-white text-xs px-2 py-1 rounded ${booking.status === status ? (status === 'done' ? 'bg-green-700 font-bold' : status === 'not_met' ? 'bg-orange-700 font-bold' : 'bg-yellow-700 font-bold') : (status === 'done' ? 'bg-green-600 hover:bg-green-700' : status === 'not_met' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-yellow-600 hover:bg-yellow-700')}`}>
                                {status === 'done' ? '✓ Done' : status === 'not_met' ? '✗ Not Met' : '⏰ Met Later'}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : <div className="text-xs text-gray-400 italic">Available</div>}
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

  // ─── ADMIN VIEW ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
          {/* Admin Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h1 className="text-2xl font-bold">PTM Scheduler — Admin</h1>
                <p className="text-sm opacity-90">{ptmDate}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setShowDateEditor(true)}
                  className="flex items-center gap-2 bg-blue-500 text-white px-3 py-2 rounded-lg font-semibold hover:bg-blue-600 text-sm">
                  <Calendar size={16} /> Set Date
                </button>
                <button onClick={() => { setPhaseEditorDraft(JSON.parse(JSON.stringify(phaseConfig))); setShowPhaseEditor(true); }}
                  className="flex items-center gap-2 bg-cyan-500 text-white px-3 py-2 rounded-lg font-semibold hover:bg-cyan-600 text-sm">
                  ⏱ Phase Timings
                </button>
                <button onClick={() => setShowTeacherUpload(true)}
                  className="flex items-center gap-2 bg-purple-500 text-white px-3 py-2 rounded-lg font-semibold hover:bg-purple-600 text-sm">
                  <Upload size={16} /> Teachers
                </button>
                <button onClick={() => { setShowTeacherAccounts(true); setUploadedTeacherAccounts(null); setTeacherAccountsResults(null); }}
                  className="flex items-center gap-2 bg-indigo-500 text-white px-3 py-2 rounded-lg font-semibold hover:bg-indigo-600 text-sm">
                  <User size={16} /> Teacher Accounts
                </button>
                <button onClick={() => setShowStudentUpload(true)}
                  className="flex items-center gap-2 bg-teal-500 text-white px-3 py-2 rounded-lg font-semibold hover:bg-teal-600 text-sm">
                  <Upload size={16} /> Students
                </button>
                <button onClick={() => setSlideshowMode(!slideshowMode)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm ${slideshowMode ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-yellow-400 text-gray-800 hover:bg-yellow-500'}`}>
                  {slideshowMode ? <Pause size={16} /> : <Play size={16} />}
                  {slideshowMode ? 'Stop Display' : 'Display Mode'}
                </button>
                <button onClick={exportToCSV}
                  className="flex items-center gap-2 bg-white text-indigo-600 px-3 py-2 rounded-lg font-semibold hover:bg-indigo-50 text-sm">
                  <Download size={16} /> Export
                </button>
                <button onClick={cleanupConflictingBookings}
                  className="bg-orange-600 text-white px-3 py-2 rounded-lg font-semibold hover:bg-orange-700 text-sm">🧹 Fix Conflicts</button>
                <button onClick={normalizeOldData}
                  className="bg-blue-600 text-white px-3 py-2 rounded-lg font-semibold hover:bg-blue-700 text-sm">🔧 Normalize</button>
                <button onClick={diagnoseBookings}
                  className="bg-purple-600 text-white px-3 py-2 rounded-lg font-semibold hover:bg-purple-700 text-sm">🔍 Diagnose</button>
                <button onClick={clearAllBookings}
                  className="bg-red-600 text-white px-3 py-2 rounded-lg font-semibold hover:bg-red-700 text-sm">Clear All</button>
                <button onClick={handleLogout}
                  className="flex items-center gap-2 bg-green-500 text-white px-3 py-2 rounded-lg font-semibold hover:bg-green-600 text-sm">
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </div>
          </div>

          {/* Grade tabs */}
          <div className="flex gap-1 p-2 bg-gray-100 border-b overflow-x-auto">
            {GRADES.map(grade => {
              const count = Object.values(bookings).filter(b => b.grade === grade).length;
              return (
                <button key={grade} onClick={() => setActiveSheet(grade)}
                  className={`px-4 py-2 font-semibold rounded-t whitespace-nowrap ${activeSheet === grade ? 'bg-white text-indigo-600 shadow' : 'bg-gray-200 text-gray-600'}`}>
                  {grade}
                  {count > 0 && <span className="ml-1 bg-indigo-600 text-white px-1.5 py-0.5 rounded-full text-xs">{count}</span>}
                </button>
              );
            })}
          </div>

          {/* Phase tabs */}
          <div className="flex gap-1 p-2 bg-gray-50 border-b">
            {Object.entries(phases).map(([phaseKey, phaseInfo]) => (
              <button key={phaseKey} onClick={() => setActivePhase(phaseKey)}
                className={`flex-1 py-2 px-3 rounded font-semibold text-sm ${activePhase === phaseKey ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                <div>{phaseInfo.name}</div>
                <div className="text-xs opacity-80">{phaseInfo.time}</div>
              </button>
            ))}
          </div>

          {/* Admin Grid */}
          <div className="p-4 overflow-x-auto">
            {slideshowMode && (() => {
              const teachers = teacherData[activeSheet] || [];
              const totalPages = Math.ceil(teachers.length / TEACHERS_PER_PAGE);
              return totalPages > 1 ? (
                <div className="mb-3 text-center bg-indigo-100 py-2 rounded-lg">
                  <span className="text-indigo-800 font-semibold text-lg">Page {currentSlidePage + 1} of {totalPages}</span>
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
                  const displayTeachers = slideshowMode
                    ? teachers.slice(currentSlidePage * TEACHERS_PER_PAGE, (currentSlidePage + 1) * TEACHERS_PER_PAGE)
                    : teachers;
                  return displayTeachers.map(teacher => {
                    const onBreak = teacherStatus[teacher]?.isOnBreak || false;
                    return (
                      <tr key={teacher} className={onBreak ? 'bg-yellow-100' : ''}>
                        <td className="border p-2 font-medium sticky left-0 bg-white z-10">
                          {teacher}{onBreak && <span className="ml-2 text-yellow-600 text-xs">☕ Break</span>}
                        </td>
                        {Array.from({ length: phases[activePhase].slots }, (_, i) => i + 1).map(slot => {
                          const key = getBookingKey(activeSheet, teacher, activePhase, slot);
                          const booking = bookings[key];
                          return (
                            <td key={slot} className={`border p-1 text-xs text-center ${booking ? (booking.status === 'done' ? 'bg-green-200 font-semibold' : booking.status === 'not_met' ? 'bg-orange-200 font-semibold' : booking.status === 'met_later' ? 'bg-yellow-200 font-semibold' : 'bg-blue-100') : 'bg-gray-50'}`}>
                              {booking ? (
                                <div className="text-xs">{booking.studentName}<br />
                                  <span className="text-gray-600">{booking.studentClass}-{booking.studentSection}</span>
                                </div>
                              ) : '-'}
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
            {[['bg-blue-100 border-blue-500', 'Pending'], ['bg-green-200 border-green-500', 'Done'], ['bg-orange-200 border-orange-500', 'Not Met'], ['bg-yellow-200 border-yellow-500', 'Met Later'], ['bg-yellow-100 border-yellow-400', 'On Break']].map(([cls, label]) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-6 h-6 ${cls} border-2 rounded`}></div><span>{label}</span>
              </div>
            ))}
          </div>

          {/* PTM Date Editor */}
          {showDateEditor && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-8 max-w-md w-full">
                <h2 className="text-2xl font-bold mb-4 text-indigo-700">📅 Set PTM Date</h2>
                <input type="text" value={ptmDate} onChange={e => setPtmDate(e.target.value)}
                  placeholder="e.g., 24 December 2025"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 mb-6" />
                <div className="flex gap-2">
                  <button onClick={() => setShowDateEditor(false)}
                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-semibold">Save</button>
                  <button onClick={() => setShowDateEditor(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold">Cancel</button>
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
                        <li>Excel columns should be: <strong>VI, VII, VIII, IX, X, XI, XII</strong></li>
                        <li>Each column lists teacher names for that grade</li>
                        <li>Row 1 = headers, Row 2 onwards = teacher names</li>
                      </ul>
                    </div>
                    <input type="file" accept=".xlsx,.xls" onChange={handleTeacherExcelUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-4" />
                    <button onClick={() => setShowTeacherUpload(false)} className="mt-4 px-6 py-2 bg-gray-300 text-gray-700 rounded-lg">Cancel</button>
                  </div>
                ) : (
                  <div>
                    <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
                      <p className="text-green-800 font-semibold">✅ File parsed! Review and save.</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      {GRADES.map(grade => (
                        <div key={grade} className="border rounded-lg p-4">
                          <h3 className="font-bold text-lg text-indigo-700 mb-1">Grade {grade}</h3>
                          <p className="text-sm text-gray-600 mb-2">{uploadedTeachers[grade].length} teachers</p>
                          <div className="max-h-48 overflow-y-auto text-xs">
                            {uploadedTeachers[grade].map((t, i) => <div key={i} className="py-1 border-b last:border-b-0">{t}</div>)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={saveUploadedTeachers} className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold">✓ Save</button>
                      <button onClick={() => { setUploadedTeachers(null); setShowTeacherUpload(false); }} className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Student Upload Modal */}
          {showStudentUpload && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-4 text-teal-700">📥 Upload Student List</h2>

                {!uploadedStudents ? (
                  <div>
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                      <p className="text-blue-800 mb-2"><strong>📋 Instructions:</strong></p>
                      <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                        <li>Upload one Excel file per class section</li>
                        <li>Columns expected: <strong>Serial Number, SID Number, Name of Student</strong></li>
                        <li>This will replace the existing list for the selected grade + section</li>
                      </ul>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Grade *</label>
                        <select value={studentUploadGrade} onChange={e => setStudentUploadGrade(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500">
                          <option value="">Select Grade</option>
                          {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Section *</label>
                        <select value={studentUploadSection} onChange={e => setStudentUploadSection(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500">
                          <option value="">Select Section</option>
                          {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>

                    <input type="file" accept=".xlsx,.xls"
                      disabled={!studentUploadGrade || !studentUploadSection}
                      onChange={handleStudentExcelUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-4 disabled:opacity-50" />

                    <button onClick={() => { setShowStudentUpload(false); setStudentUploadGrade(''); setStudentUploadSection(''); setUploadedStudents(null); }}
                      className="mt-4 px-6 py-2 bg-gray-300 text-gray-700 rounded-lg">Cancel</button>
                  </div>
                ) : (
                  <div>
                    <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
                      <p className="text-green-800 font-semibold">✅ {uploadedStudents.length} students parsed for Grade {studentUploadGrade}-{studentUploadSection}</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto border rounded-lg mb-6">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="p-2 text-left">#</th>
                            <th className="p-2 text-left">SID</th>
                            <th className="p-2 text-left">Name</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uploadedStudents.map((s, i) => (
                            <tr key={i} className="border-t hover:bg-gray-50">
                              <td className="p-2">{s.serial}</td>
                              <td className="p-2 text-gray-500">{s.sid}</td>
                              <td className="p-2 font-medium">{s.name}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={saveUploadedStudents} disabled={studentUploadLoading}
                        className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 disabled:bg-gray-400">
                        {studentUploadLoading ? 'Saving...' : `✓ Save ${uploadedStudents.length} Students`}
                      </button>
                      <button onClick={() => setUploadedStudents(null)}
                        className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg">Back</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Phase Timing Editor Modal */}
          {showPhaseEditor && phaseEditorDraft && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowPhaseEditor(false)}>
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-bold text-cyan-700">⏱ Phase Timings</h2>
                  <button onClick={() => setShowPhaseEditor(false)} className="text-gray-400 hover:text-gray-700 text-3xl font-bold leading-none">×</button>
                </div>
                <h2 className="text-2xl font-bold mb-2 text-cyan-700">⏱ Phase Timings</h2>
                <p className="text-gray-500 text-sm mb-6">Set the start time for each phase. All 18 slots will be auto-calculated at 5-minute intervals.</p>

                <div className="space-y-6">
                  {['phase1', 'phase2', 'phase3'].map((pk, idx) => {
                    const preview = generateTimings(phaseEditorDraft[pk].start);
                    return (
                      <div key={pk} className="border-2 border-gray-200 rounded-lg p-4">
                        <h3 className="font-bold text-lg text-indigo-700 mb-3">Phase {idx + 1}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                            <input type="time" value={phaseEditorDraft[pk].start}
                              onChange={e => setPhaseEditorDraft(d => ({ ...d, [pk]: { ...d[pk], start: e.target.value } }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-lg font-mono" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number Label</label>
                            <input type="text" value={phaseEditorDraft[pk].rolls}
                              onChange={e => setPhaseEditorDraft(d => ({ ...d, [pk]: { ...d[pk], rolls: e.target.value } }))}
                              placeholder="e.g. Roll Numbers: 1-10"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500" />
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-2 font-medium">SLOT PREVIEW ({formatTimeRange(phaseEditorDraft[pk].start)})</p>
                          <div className="flex flex-wrap gap-1">
                            {preview.map((t, i) => (
                              <span key={i} className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded font-mono">
                                {i + 1}: {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => savePhaseConfig(phaseEditorDraft)}
                    className="flex-1 bg-cyan-600 text-white py-3 rounded-lg font-bold hover:bg-cyan-700">
                    ✓ Save Phase Timings
                  </button>
                  <button onClick={() => setShowPhaseEditor(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Teacher Accounts Upload Modal */}
          {showTeacherAccounts && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-2 text-indigo-700 flex items-center gap-2">
                  <User size={24} /> Teacher Login Accounts
                </h2>
                <p className="text-gray-500 text-sm mb-6">
                  Upload an Excel file to create Supabase login accounts for teachers. Default password: <code className="bg-gray-100 px-2 py-0.5 rounded font-mono">SBSptm@1234</code>
                </p>

                {/* Results screen */}
                {teacherAccountsResults && (
                  <div className="mb-6">
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 text-center">
                        <div className="text-3xl font-bold text-green-700">{teacherAccountsResults.created.length}</div>
                        <div className="text-green-600 font-semibold">Created</div>
                      </div>
                      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 text-center">
                        <div className="text-3xl font-bold text-blue-700">{teacherAccountsResults.updated.length}</div>
                        <div className="text-blue-600 font-semibold">Updated</div>
                      </div>
                      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 text-center">
                        <div className="text-3xl font-bold text-red-700">{teacherAccountsResults.failed.length}</div>
                        <div className="text-red-600 font-semibold">Failed</div>
                      </div>
                    </div>

                    {teacherAccountsResults.created.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-bold text-green-700 mb-2">✅ Created ({teacherAccountsResults.created.length})</h4>
                        <div className="max-h-32 overflow-y-auto bg-green-50 rounded-lg p-3 text-sm">
                          {teacherAccountsResults.created.map((t, i) => (
                            <div key={i} className="py-1 border-b border-green-200 last:border-0">{t.name} — {t.email}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {teacherAccountsResults.updated.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-bold text-blue-700 mb-2">🔄 Already existed, email linked ({teacherAccountsResults.updated.length})</h4>
                        <div className="max-h-32 overflow-y-auto bg-blue-50 rounded-lg p-3 text-sm">
                          {teacherAccountsResults.updated.map((t, i) => (
                            <div key={i} className="py-1 border-b border-blue-200 last:border-0">{t.name} — {t.email}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {teacherAccountsResults.failed.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-bold text-red-700 mb-2">❌ Failed ({teacherAccountsResults.failed.length})</h4>
                        <div className="max-h-32 overflow-y-auto bg-red-50 rounded-lg p-3 text-sm">
                          {teacherAccountsResults.failed.map((t, i) => (
                            <div key={i} className="py-1 border-b border-red-200 last:border-0">
                              <span className="font-medium">{t.name}</span> — {t.email}
                              <br /><span className="text-red-500 text-xs">{t.reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 mt-4">
                      <button onClick={() => { setUploadedTeacherAccounts(null); setTeacherAccountsResults(null); }}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700">
                        Upload Another File
                      </button>
                      <button onClick={() => { setShowTeacherAccounts(false); setUploadedTeacherAccounts(null); setTeacherAccountsResults(null); }}
                        className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold">
                        Close
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload / preview screen */}
                {!teacherAccountsResults && (
                  <>
                    {!uploadedTeacherAccounts ? (
                      <div>
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                          <p className="text-blue-800 font-semibold mb-2">📋 Excel Format Required:</p>
                          <div className="overflow-x-auto">
                            <table className="text-sm text-blue-700 border-collapse">
                              <thead>
                                <tr>
                                  <th className="border border-blue-300 px-3 py-1 bg-blue-100">Teacher Name</th>
                                  <th className="border border-blue-300 px-3 py-1 bg-blue-100">Grade</th>
                                  <th className="border border-blue-300 px-3 py-1 bg-blue-100">Email</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="border border-blue-200 px-3 py-1">ARPAN KRISHNA DEB</td>
                                  <td className="border border-blue-200 px-3 py-1">XII</td>
                                  <td className="border border-blue-200 px-3 py-1">arpan.deb@sbs-school.org</td>
                                </tr>
                                <tr>
                                  <td className="border border-blue-200 px-3 py-1">MEERA SHARMA</td>
                                  <td className="border border-blue-200 px-3 py-1">X</td>
                                  <td className="border border-blue-200 px-3 py-1">meera.sharma@sbs-school.org</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          <ul className="text-sm text-blue-700 list-disc list-inside mt-3 space-y-1">
                            <li>Teacher names must be in <strong>UPPERCASE</strong> (must match exactly what's in the teachers table)</li>
                            <li>Grade column is optional if teacher already exists in DB</li>
                            <li>All teachers get initial password: <strong>SBSptm@1234</strong></li>
                            <li>Teachers can change their password after first login</li>
                          </ul>
                        </div>

                        <input type="file" accept=".xlsx,.xls" onChange={handleTeacherAccountsExcel}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-4" />

                        <button onClick={() => { setShowTeacherAccounts(false); }}
                          className="mt-4 px-6 py-2 bg-gray-300 text-gray-700 rounded-lg">Cancel</button>
                      </div>
                    ) : (
                      <div>
                        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
                          <p className="text-green-800 font-semibold">✅ {uploadedTeacherAccounts.length} teachers parsed. Review and confirm.</p>
                        </div>

                        <div className="max-h-64 overflow-y-auto border rounded-lg mb-6">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-100 sticky top-0">
                              <tr>
                                <th className="p-2 text-left">#</th>
                                <th className="p-2 text-left">Teacher Name</th>
                                <th className="p-2 text-left">Grade</th>
                                <th className="p-2 text-left">Email</th>
                              </tr>
                            </thead>
                            <tbody>
                              {uploadedTeacherAccounts.map((t, i) => (
                                <tr key={i} className="border-t hover:bg-gray-50">
                                  <td className="p-2 text-gray-400">{i + 1}</td>
                                  <td className="p-2 font-medium">{t.name}</td>
                                  <td className="p-2 text-gray-600">{t.grade || '—'}</td>
                                  <td className="p-2 text-blue-600">{t.email}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-6">
                          <p className="text-yellow-800 text-sm">
                            <strong>⚠️ This will:</strong> Create Supabase Auth accounts for each teacher with password <code className="bg-yellow-100 px-1 rounded">SBSptm@1234</code>.
                            If an account already exists, it will just link the email. This may take a minute for large lists.
                          </p>
                        </div>

                        <div className="flex gap-3">
                          <button onClick={saveTeacherAccounts} disabled={teacherAccountsLoading}
                            className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:bg-gray-400">
                            {teacherAccountsLoading
                              ? `Creating accounts... (this may take a while)`
                              : `✓ Create ${uploadedTeacherAccounts.length} Teacher Accounts`}
                          </button>
                          <button onClick={() => setUploadedTeacherAccounts(null)}
                            className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg">Back</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── ParentTeacherSelector Component ─────────────────────────────────────────
const ParentTeacherSelector = ({ teacherData, phases, bookings, getBookingKey, getAvailableSlotsForTeacher, onAddTeacher, studentName, studentClass, studentSection, selectedTeachers, grades }) => {
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const bookedTeachers = selectedTeachers.map(st => st.teacher);

  // Use studentClass as default grade but allow override
  const effectiveGrade = selectedGrade || studentClass;
  const availableTeachers = (teacherData[effectiveGrade] || []).filter(t => !bookedTeachers.includes(t));

  useEffect(() => {
    const fetchSlots = async () => {
      if (studentName && studentClass && studentSection && selectedTeacher && selectedPhase && effectiveGrade) {
        setLoadingSlots(true);
        const slots = await getAvailableSlotsForTeacher(selectedTeacher, effectiveGrade, selectedPhase, studentName, studentClass, studentSection, selectedTeachers);
        setAvailableSlots(slots);
        setLoadingSlots(false);
      } else {
        setAvailableSlots([]);
      }
    };
    fetchSlots();
  }, [selectedTeacher, selectedPhase, studentName, studentClass, studentSection, selectedTeachers, effectiveGrade]);

  const handleAdd = () => {
    if (!studentClass) { alert('Please select grade in Student Details first'); return; }
    if (!selectedTeacher || !selectedPhase || !selectedSlot) { alert('Please select teacher, phase, and slot'); return; }
    onAddTeacher(selectedTeacher, effectiveGrade, selectedPhase, parseInt(selectedSlot));
    setSelectedTeacher(''); setSelectedPhase(''); setSelectedSlot(''); setAvailableSlots([]);
  };

  return (
    <div className="border-2 border-gray-300 rounded-lg p-4">
      {/* Grade selector — allows booking teachers from other grades (e.g. extracurricular) */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Teacher's Grade <span className="text-gray-400 font-normal">(defaults to your child's grade)</span>
        </label>
        <select value={selectedGrade} onChange={e => { setSelectedGrade(e.target.value); setSelectedTeacher(''); setSelectedPhase(''); setSelectedSlot(''); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
          <option value="">Same as student ({studentClass || 'select grade first'})</option>
          {(grades || []).map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teacher *</label>
          <select value={selectedTeacher} onChange={e => { setSelectedTeacher(e.target.value); setSelectedPhase(''); setSelectedSlot(''); }}
            disabled={!effectiveGrade}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-200">
            <option value="">Select Teacher</option>
            {availableTeachers.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {effectiveGrade && availableTeachers.length === 0 && <p className="text-xs text-orange-600 mt-1">All teachers already selected</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phase *</label>
          <select value={selectedPhase} onChange={e => { setSelectedPhase(e.target.value); setSelectedSlot(''); }}
            disabled={!selectedTeacher}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-200">
            <option value="">Select Phase</option>
            {Object.entries(phases).map(([key, info]) => (
              <option key={key} value={key}>{info.name} ({info.time})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Slot * {loadingSlots ? <span className="text-blue-600 text-xs">(Loading...)</span> : <span className="text-green-600 text-xs">({availableSlots.length} available)</span>}
          </label>
          <select value={selectedSlot} onChange={e => setSelectedSlot(e.target.value)}
            disabled={!selectedPhase || availableSlots.length === 0 || loadingSlots}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-200">
            <option value="">Select Slot</option>
            {availableSlots.map(slot => (
              <option key={slot} value={slot}>Slot {slot} - {phases[selectedPhase]?.timings[slot - 1]}</option>
            ))}
          </select>
          {selectedPhase && availableSlots.length === 0 && !loadingSlots && <p className="text-red-600 text-xs mt-1">❌ No slots available</p>}
        </div>
      </div>

      <button onClick={handleAdd} disabled={!selectedSlot}
        className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
        + Add This Teacher
      </button>
    </div>
  );
};

export default PTMScheduler;
