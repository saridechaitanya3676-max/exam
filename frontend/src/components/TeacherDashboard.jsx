import React, { useState, useEffect } from 'react';
import { teacherApi } from '../api';
import { 
  Trash2, Plus, ArrowLeft, BarChart2, BookOpen, LogOut, Share2, Copy, 
  CheckCircle, Edit2, Eye, EyeOff, Play, Square, Download, Users, 
  Clock, ShieldAlert, Monitor, ChevronRight, Settings,
  Bot, Zap, Rocket, Cpu, Brain, Loader2, Sparkles, Wand2
} from 'lucide-react';

function TeacherDashboard({ onBack }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSetup, setIsSetup] = useState(true);
  const [teacherId, setTeacherId] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // login, register, forgot
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState(1);
  const [tab, setTab] = useState('questions'); // questions, results, live, history, ai
  const [questions, setQuestions] = useState([]);
  const [results, setResults] = useState([]);
  const [tests, setTests] = useState([]);
  const [joinedStudents, setJoinedStudents] = useState([]);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [editId, setEditId] = useState(null);

  // New Question Form
  const [testName, setTestName] = useState('Midterm-1');
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [timerMin, setTimerMin] = useState(0);
  const [timerSec, setTimerSec] = useState(30);
  const [newQ, setNewQ] = useState({ text: '', options: ['', '', '', ''], correct_index: 0, timer_seconds: 30 });

  const [examStatus, setExamStatus] = useState('waiting');
  const [showResultsToggle, setShowResultsToggle] = useState(false);
  const [publicBaseUrl, setPublicBaseUrl] = useState(localStorage.getItem('publicBaseUrl') || '');
  const [filterTestName, setFilterTestName] = useState('All');
  
  // AI Bot State
  const [syllabus, setSyllabus] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [generatedQs, setGeneratedQs] = useState([]);
  const [aiError, setAiError] = useState('');
  const [aiProvider, setAiProvider] = useState('gemini'); // gemini, openai, anthropic

  useEffect(() => {
    if (publicBaseUrl) {
      localStorage.setItem('publicBaseUrl', publicBaseUrl);
    }
  }, [publicBaseUrl]);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  useEffect(() => {
    checkSetup();
    // Load persisted session from sessionStorage (per-tab isolation)
    const savedId = sessionStorage.getItem('teacherId');
    const savedUser = sessionStorage.getItem('username');
    if (savedId && savedUser) {
      setTeacherId(parseInt(savedId));
      setUsername(savedUser);
      setIsAuthenticated(true);
    }
  }, []);

  const checkSetup = async () => {
    try {
      const res = await teacherApi.getSetupStatus();
      setIsSetup(res.data.is_setup);
      if (!res.data.is_setup) setAuthMode('register');
    } catch (err) {
      console.error("Error checking setup status", err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
      syncSettings();
    }
  }, [isAuthenticated, tab, teacherId, testName]);

  const syncSettings = async () => {
    try {
      const res = await teacherApi.getSettings(teacherId);
      setExamStatus(res.data.exam_status);
      setShowResultsToggle(res.data.show_results);
    } catch (err) {
      console.error("Error syncing settings", err);
    }
  };

  useEffect(() => {
    let interval;
    if (isAuthenticated && tab === 'live') {
      loadJoinedStudents();
      interval = setInterval(loadJoinedStudents, 3000);
    }
    return () => clearInterval(interval);
  }, [isAuthenticated, tab, teacherId]);

  const loadData = async () => {
    try {
      if (tab === 'questions') {
        const res = await teacherApi.getQuestions(teacherId, showAllQuestions ? '' : testName);
        setQuestions(res.data);
      } else if (tab === 'results') {
        const res = await teacherApi.getSubmissions(teacherId);
        setResults(res.data);
      } else if (tab === 'history') {
        const res = await teacherApi.getTests(teacherId);
        setTests(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadJoinedStudents = async () => {
    try {
      const res = await teacherApi.getJoinedStudents(teacherId);
      setJoinedStudents(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await teacherApi.login(username, password);
      setTeacherId(res.data.teacher_id);
      setExamStatus(res.data.exam_status);
      setShowResultsToggle(res.data.show_results);
      setIsAuthenticated(true);
      // Persist session in sessionStorage
      sessionStorage.setItem('teacherId', res.data.teacher_id);
      sessionStorage.setItem('username', username);
      setError(''); setMsg('');
    } catch (err) {
      if (err.response?.status === 404) {
        setMsg("Account not found. Please set a security question to complete registration.");
        setAuthMode('register');
        setError('');
      } else {
        setError(err.response?.data?.detail || err.response?.data?.error || 'Invalid credentials');
      }
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setTeacherId(null);
    sessionStorage.removeItem('teacherId');
    sessionStorage.removeItem('username');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await teacherApi.register({ username, password, security_question: securityQuestion, security_answer: securityAnswer });
      setMsg('Registration successful! Please login.');
      setAuthMode('login');
      setError('');
      setUsername('');
      setPassword('');
      setSecurityQuestion('');
      setSecurityAnswer('');
      if (!isSetup) setIsSetup(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  const handleGetQuestion = async (e) => {
    e.preventDefault();
    try {
      const res = await teacherApi.getSecurityQuestion(username);
      setSecurityQuestion(res.data.security_question);
      setForgotStep(2);
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Username not found');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await teacherApi.resetPassword({ username, security_answer: securityAnswer, new_password: newPassword });
      setMsg('Password reset successful! Please login.');
      setAuthMode('login');
      setForgotStep(1);
      setError('');
      setPassword('');
      setNewPassword('');
      setSecurityAnswer('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed');
    }
  };

  const handleSaveExam = async () => {
    if (!testName) return alert('Please enter a test name');
    try {
      await teacherApi.createTest(teacherId, testName);
      alert(`Exam "${testName}" saved successfully!`);
      if (tab === 'history') loadData();
    } catch (err) {
      alert('Failed to save exam');
    }
  };

  const deleteTest = async (id) => {
    console.log("EXECUTE: Deleting test ID:", id);
    try {
      const res = await teacherApi.deleteTest(id);
      console.log("Delete response:", res.data);
      // alert('Test record deleted successfully');
      setDeleteConfirmId(null);
      await loadData(); // Explicitly await refresh
    } catch (err) {
      console.error("Delete error details:", err);
      const errMsg = err.response?.data?.error || err.message;
      alert('Failed to delete test: ' + errMsg);
    }
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    const totalSeconds = timerEnabled ? (parseInt(timerMin) * 60 + parseInt(timerSec)) : 0;
    const payload = { ...newQ, timer_seconds: totalSeconds, teacher_id: teacherId, test_name: testName };
    try {
      if (editId) {
        await teacherApi.updateQuestion(editId, payload);
        alert('Question updated successfully');
      } else {
        await teacherApi.createQuestion(payload);
        alert('Question added successfully');
      }
      setNewQ({ text: '', options: ['', '', '', ''], correct_index: 0, timer_seconds: 30 });
      setEditId(null);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Error saving question');
    }
  };

  const startExam = async () => {
    try {
      await teacherApi.startExam(teacherId, testName);
      setExamStatus('started');
    } catch (err) {
      alert('Failed to start exam');
    }
  };

  const endExam = async () => {
    try {
      await teacherApi.endExam(teacherId);
      setExamStatus('ended');
    } catch (err) {
      alert('Failed to end exam');
    }
  };

  const toggleExamStatus = async (active) => {
    if (active) {
      await startExam();
    } else {
      await endExam();
    }
  };

  const toggleResults = async (val) => {
    try {
      await teacherApi.toggleResults(teacherId, val);
      setShowResultsToggle(val);
    } catch (err) {
      alert('Failed to update result visibility');
    }
  };

  const exportToExcel = () => {
    const filteredResults = filterTestName === 'All' 
      ? results 
      : results.filter(r => r.test_name === filterTestName);

    if (filteredResults.length === 0) return alert('No results to export');
    
    const headers = ['Student Name', 'Roll No', 'Test Name', 'Score', 'Total Questions', 'Tab Switches', 'Timestamp'];
    const csvContent = [
      headers.join(','),
      ...filteredResults.map(r => [
        `"${r.student_name}"`,
        `"${r.roll_no}"`,
        `"${r.test_name}"`,
        r.score,
        r.total_questions,
        r.tab_switches,
        new Date(r.timestamp).toLocaleString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Results_${filterTestName}_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEditClick = (q) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setEditId(q.id);
    setTestName(q.test_name || 'General');
    const min = Math.floor((q.timer_seconds || 30) / 60);
    const sec = (q.timer_seconds || 30) % 60;
    setTimerMin(min);
    setTimerSec(sec);
    setTimerEnabled(q.timer_seconds > 0);
    setNewQ({
      text: q.text,
      options: [...q.options],
      correct_index: q.correct_index,
      timer_seconds: q.timer_seconds || 30
    });
  };

  const handleDeleteQuestion = async (id) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        await teacherApi.deleteQuestion(id);
        alert('Question deleted successfully');
        loadData();
      } catch (err) {
        alert('Failed to delete question. Please check backend connection.');
      }
    }
  };
  const handleGenerateAI = async (botType) => {
    if (!syllabus.trim()) return alert('Please enter a syllabus or topic description');
    setAiLoading(true);
    setAiError('');
    setGeneratedQs([]);
    try {
      const res = await teacherApi.generateAIQuestions({ syllabus, botType, teacher_id: teacherId, provider: aiProvider });
      setGeneratedQs(res.data.questions);
      setMsg(`Successfully generated ${res.data.questions.length} questions using ${res.data.botName}!`);
    } catch (err) {
      setAiError(err.response?.data?.error || 'Failed to generate questions. Please check if GEMINI_API_KEY is set.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleBulkImport = async () => {
    if (generatedQs.length === 0) return;
    if (!testName) return alert('Please provide a Test Name for these questions');
    
    try {
      for (const q of generatedQs) {
        await teacherApi.createQuestion({
          ...q,
          teacher_id: teacherId,
          test_name: testName
        });
      }
      alert(`Imported ${generatedQs.length} questions into "${testName}"!`);
      setGeneratedQs([]);
      setTab('questions');
      loadData();
    } catch (err) {
      alert('Error importing some questions');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container animate-fade-in" style={{ maxWidth: '500px', marginTop: '10vh' }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: '2rem' }}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="card">
          <h2 style={{ marginBottom: '0.5rem', textAlign: 'center' }}>
            {!isSetup ? 'System Initialization' : 
             authMode === 'login' ? 'Teacher Access' : 
             authMode === 'register' ? 'Register Teacher' : 'Reset Password'}
          </h2>
          
          {msg && <p style={{ color: 'var(--success)', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center', background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '0.5rem' }}>{msg}</p>}

          <div style={{ marginTop: '1rem' }}>
            {authMode === 'login' && (
              <form onSubmit={handleLogin}>
                <input className="input" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
                <div className="input-group">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    className="input" 
                    placeholder="Password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                  />
                  <button type="button" className="input-icon" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {error && <p style={{ color: 'var(--error)', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>}
                <button className="btn btn-primary" style={{ width: '100%', marginBottom: '1rem', justifyContent: 'center' }}>Login</button>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => {setAuthMode('forgot'); setForgotStep(1); setError(''); setMsg('');}}>Forgot Password?</span>
                  <span style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => {setAuthMode('register'); setError(''); setMsg('');}}>Register New Teacher</span>
                </div>
              </form>
            )}

            {authMode === 'register' && (
              <form onSubmit={handleRegister}>
                {!isSetup && <p style={{ color: 'var(--primary)', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>Create the first Master Administrator account.</p>}
                <input className="input" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
                <div className="input-group">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    className="input" 
                    placeholder="Password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                  />
                  <button type="button" className="input-icon" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <input className="input" placeholder="Security Question (e.g., First pet?)" value={securityQuestion} onChange={e => setSecurityQuestion(e.target.value)} required />
                <input className="input" placeholder="Security Answer" value={securityAnswer} onChange={e => setSecurityAnswer(e.target.value)} required />
                {error && <p style={{ color: 'var(--error)', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>}
                <button className="btn btn-primary" style={{ width: '100%', marginBottom: '1rem', justifyContent: 'center' }}>Register</button>
                {isSetup && (
                  <div style={{ textAlign: 'center', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Already have an account? </span>
                    <span style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => {setAuthMode('login'); setError(''); setMsg('');}}>Back to Login</span>
                  </div>
                )}
              </form>
            )}

            {authMode === 'forgot' && (
              <div>
                {forgotStep === 1 ? (
                  <form onSubmit={handleGetQuestion}>
                    <input className="input" placeholder="Enter Username" value={username} onChange={e => setUsername(e.target.value)} required />
                    {error && <p style={{ color: 'var(--error)', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>}
                    <button className="btn btn-primary" style={{ width: '100%', marginBottom: '1rem', justifyContent: 'center' }}>Get Security Question</button>
                  </form>
                ) : (
                  <form onSubmit={handleResetPassword}>
                    <p style={{ marginBottom: '1rem', fontWeight: 600, background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '0.5rem' }}>Q: {securityQuestion}</p>
                    <input className="input" placeholder="Your Answer" value={securityAnswer} onChange={e => setSecurityAnswer(e.target.value)} required />
                    <input type="password" className="input" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                    {error && <p style={{ color: 'var(--error)', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>}
                    <button className="btn btn-primary" style={{ width: '100%', marginBottom: '1rem', justifyContent: 'center' }}>Reset Password</button>
                  </form>
                )}
                <div style={{ textAlign: 'center', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => {setAuthMode('login'); setError(''); setMsg('');}}>Back to Login</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div>
          <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: '1rem' }}>
            <ArrowLeft size={18} /> Home
          </button>
          <h1>Teacher <span style={{ color: 'var(--primary)' }}>Control Panel</span></h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => {
            const base = publicBaseUrl || window.location.origin;
            const studentUrl = `${base}/?role=student&teacher=${username}&test=${encodeURIComponent(testName)}`;
            navigator.clipboard.writeText(studentUrl);
            alert(`Share link for "${testName}" copied to clipboard!${!publicBaseUrl && window.location.hostname === 'localhost' ? '\n\nNote: You are on localhost. External devices may need a Public URL.' : ''}`);
          }}>
            <Share2 size={18} /> Share Link
          </button>
          <button className={`btn ${tab === 'questions' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('questions')}>
            <BookOpen size={18} /> Bank
          </button>
          <button className={`btn ${tab === 'live' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('live')}>
            <Play size={18} /> Live Exam
          </button>
          <button className={`btn ${tab === 'monitoring' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => {
            setTab('monitoring');
            loadData();
          }}>
            <ShieldAlert size={18} /> Live Monitoring
          </button>
          <button className={`btn ${tab === 'results' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('results')}>
            <BarChart2 size={18} /> Reports
          </button>
          <button className={`btn ${tab === 'ai' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('ai')}>
            <Sparkles size={18} /> AI Generator
          </button>
          <button className={`btn ${tab === 'history' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('history')}>
            <BookOpen size={18} /> Previous Exams
          </button>
          <button className="btn btn-secondary" onClick={handleLogout}>
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {tab === 'questions' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          <div className="card" style={{ alignSelf: 'start', position: 'sticky', top: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {editId ? <Edit2 size={20} color="var(--primary)" /> : <Plus size={20} color="var(--primary)" />}
                {editId ? 'Edit Question' : 'Add Question'}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Show All</span>
                <label className="switch" style={{ transform: 'scale(0.8)' }}>
                  <input type="checkbox" checked={showAllQuestions} onChange={e => setShowAllQuestions(e.target.checked)} />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
            <form onSubmit={handleAddQuestion}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.3rem' }}>Test / Category Name</p>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input 
                  className="input" 
                  style={{ marginBottom: 0, flex: 1 }}
                  placeholder="e.g. Unit 1 Test" 
                  value={testName} 
                  onChange={e => setTestName(e.target.value)} 
                  required 
                />
                <button type="button" className="btn btn-secondary" onClick={() => {
                  const studentUrl = `${window.location.origin}/?role=student&teacher=${username}&test=${encodeURIComponent(testName)}`;
                  navigator.clipboard.writeText(studentUrl);
                  alert(`Share link for "${testName}" copied!`);
                }}>
                  <Share2 size={16} />
                </button>
              </div>

              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.3rem' }}>Question Content</p>
              <textarea 
                className="input" 
                style={{ minHeight: '100px', resize: 'vertical' }}
                placeholder="What is the result of 8051 MOV A, #55h?" 
                value={newQ.text} 
                onChange={e => setNewQ({...newQ, text: e.target.value})} 
                required 
              />
              
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.3rem' }}>Options (Select correct one)</p>
              {newQ.options.map((opt, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <input 
                    type="radio" 
                    name="correct" 
                    checked={newQ.correct_index === i} 
                    onChange={() => setNewQ({...newQ, correct_index: i})} 
                  />
                  <input 
                    className="input" 
                    style={{ marginBottom: 0 }} 
                    placeholder={`Option ${i+1}`} 
                    value={opt} 
                    onChange={e => {
                      const opts = [...newQ.options];
                      opts[i] = e.target.value;
                      setNewQ({...newQ, options: opts});
                    }} 
                    required 
                  />
                </div>
              ))}

              <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>⏱️ Question Timer</p>
                  <label className="switch">
                    <input type="checkbox" checked={timerEnabled} onChange={e => setTimerEnabled(e.target.checked)} />
                    <span className="slider"></span>
                  </label>
                </div>
                
                {timerEnabled && (
                  <div className="timer-controls animate-fade-in">
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Min</p>
                      <select className="select" style={{ width: '100%' }} value={timerMin} onChange={e => setTimerMin(e.target.value)}>
                        {[0,1,2,3,4,5,10,15].map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Sec</p>
                      <select className="select" style={{ width: '100%' }} value={timerSec} onChange={e => setTimerSec(e.target.value)}>
                        {[0,5,10,15,20,25,30,35,40,45,50,55].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1.5 }}>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Manual (s)</p>
                      <input 
                        type="number" 
                        className="input" 
                        style={{ marginBottom: 0, padding: '0.4rem' }} 
                        value={parseInt(timerMin) * 60 + parseInt(timerSec)} 
                        readOnly
                      />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  {editId ? <CheckCircle size={18} /> : <Plus size={18} />}
                  {editId ? 'Save Changes' : 'Add Question'}
                </button>
                <button type="button" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', background: 'var(--success)' }} onClick={handleSaveExam}>
                   <CheckCircle size={18} /> Save Exam to History
                </button>
                {editId && (
                  <button type="button" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => {
                    setEditId(null);
                    setNewQ({ text: '', options: ['', '', '', ''], correct_index: 0, timer_seconds: 30 });
                  }}>
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1.5rem' }}>Question Bank ({questions.length})</h3>
            {questions.map((q, qidx) => (
              <div key={q.id} style={{ padding: '1.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <div>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      background: 'rgba(99, 102, 241, 0.1)', 
                      color: 'var(--primary)', 
                      padding: '0.2rem 0.5rem', 
                      borderRadius: '0.4rem',
                      display: 'inline-block',
                      marginBottom: '0.5rem'
                    }}>
                      ⏱️ {q.timer_seconds}s Limit
                    </span>
                    <p style={{ fontWeight: 600 }}>{qidx + 1}. {q.text}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleEditClick(q)} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDeleteQuestion(q.id)} style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '1rem' }}>
                  {q.options.map((opt, i) => (
                    <div key={i} style={{ 
                      fontSize: '0.9rem', 
                      padding: '0.5rem', 
                      borderRadius: '0.5rem',
                      background: i === q.correct_index ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)',
                      color: i === q.correct_index ? 'var(--success)' : 'var(--text-muted)',
                      border: i === q.correct_index ? '1px solid var(--success)' : '1px solid transparent'
                    }}>
                      {opt}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : tab === 'live' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3>Live Exam: {testName}</h3>
              <div className={`badge ${examStatus === 'started' ? 'badge-success' : 'badge-warning'}`}>
                {examStatus === 'started' ? 'Exam In Progress' : 'Waiting for Teacher'}
              </div>
            </div>

            <div style={{ marginBottom: '2rem', background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '1rem' }}>Active Exam Status</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {examStatus === 'started' ? 'Exam is LIVE and receiving submissions.' : 'Exam is CLOSED. Students cannot start or submit.'}
                </p>
              </div>
              <label className="switch" style={{ width: '80px', height: '40px' }}>
                <input type="checkbox" checked={examStatus === 'started'} onChange={e => toggleExamStatus(e.target.checked)} />
                <span className="slider" style={{ borderRadius: '40px' }}></span>
              </label>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '1rem' }}>
              <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} color="var(--primary)" /> Joined Students ({joinedStudents.length})
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {joinedStudents.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No students have joined the waiting room yet.</p>
                ) : (
                  joinedStudents.map(s => (
                    <div key={s.id} className="animate-fade-in" style={{ 
                      background: 'var(--bg-card)', 
                      padding: '1rem', 
                      borderRadius: '0.75rem', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 10px var(--success)' }}></div>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.student_name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.roll_no}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={20} color="var(--primary)" /> Session Settings
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Public Base URL (Optional)</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Set this to your Pinggy or Vercel URL (e.g. https://xxxx.pinggy.link) so share links work on all networks.
                </p>
                <input 
                  className="input" 
                  placeholder="https://your-public-url.com" 
                  value={publicBaseUrl} 
                  onChange={e => setPublicBaseUrl(e.target.value)} 
                  style={{ marginBottom: '0.5rem' }}
                />
                {window.location.hostname === 'localhost' && !publicBaseUrl && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--warning)', fontStyle: 'italic' }}>
                    ⚠️ Currently using 'localhost'. Links won't work on other devices.
                  </p>
                )}
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Student Results Visibility</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  If ON, students can see their final score immediately after the exam.
                </p>
                <label className="switch" style={{ width: '60px', height: '30px' }}>
                  <input type="checkbox" checked={showResultsToggle} onChange={e => toggleResults(e.target.checked)} />
                  <span className="slider" style={{ borderRadius: '30px' }}></span>
                </label>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Proctoring Status</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
                  <ShieldAlert size={16} />
                  <span style={{ fontSize: '0.8rem' }}>Tab Switch Detection Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : tab === 'ai' ? (
        <div className="animate-fade-in">
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'var(--primary)', padding: '1rem', borderRadius: '1rem', color: 'white' }}>
                <Sparkles size={32} />
              </div>
              <div>
                <h2 style={{ margin: 0 }}>AI Question <span style={{ color: 'var(--primary)' }}>Paper Generator</span></h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Paste your syllabus below and select a bot to generate a full question paper automatically.</p>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.8rem' }}>AI Model Provider</p>
              <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.3rem', borderRadius: '0.75rem', width: 'fit-content' }}>
                {[
                  { id: 'gemini', name: 'Google Gemini', color: '#6366f1' },
                  { id: 'openai', name: 'ChatGPT (OpenAI)', color: '#10b981' },
                  { id: 'anthropic', name: 'Claude (Anthropic)', color: '#d97706' }
                ].map(p => (
                  <button 
                    key={p.id}
                    onClick={() => setAiProvider(p.id)}
                    style={{ 
                      padding: '0.6rem 1.2rem', 
                      borderRadius: '0.5rem', 
                      border: 'none', 
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      transition: 'all 0.2s',
                      background: aiProvider === p.id ? p.color : 'transparent',
                      color: aiProvider === p.id ? 'white' : 'var(--text-muted)'
                    }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Syllabus / Topics</p>
              <textarea 
                className="input" 
                style={{ minHeight: '150px', fontSize: '1rem', padding: '1rem' }}
                placeholder="e.g. Unit 1: Introduction to 8051, Architecture, Pin Diagram, Memory Organization, Addressing Modes..."
                value={syllabus}
                onChange={e => setSyllabus(e.target.value)}
              />
            </div>

            <p style={{ fontWeight: 600, marginBottom: '1rem' }}>Select AI Bot Personality</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {[
                { id: 'standard', name: 'Standard Bot', style: 'Balanced & Clear', icon: <Bot size={24} />, color: '#6366f1' },
                { id: 'expert', name: 'Expert Bot', style: 'Hard & Conceptual', icon: <Zap size={24} />, color: '#f59e0b' },
                { id: 'speedster', name: 'Speedster Bot', style: 'Fast & Direct', icon: <Rocket size={24} />, color: '#ec4899' },
                { id: 'practical', name: 'Practical Bot', style: 'Code & Hardware', icon: <Cpu size={24} />, color: '#10b981' },
                { id: 'guru', name: 'Guru Bot', style: 'Deep & Detailed', icon: <Brain size={24} />, color: '#8b5cf6' },
              ].map(bot => (
                <button 
                  key={bot.id}
                  onClick={() => handleGenerateAI(bot.id)}
                  disabled={aiLoading}
                  className="card bot-card"
                  style={{ 
                    cursor: 'pointer', 
                    textAlign: 'center', 
                    border: '2px solid transparent',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '1.5rem'
                  }}
                >
                  <div style={{ color: bot.color, marginBottom: '0.5rem' }}>{bot.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{bot.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{bot.style}</div>
                </button>
              ))}
            </div>

            {aiLoading && (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <Loader2 size={48} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
                <p style={{ fontWeight: 600 }}>Bot is thinking and generating questions...</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>This may take 10-20 seconds.</p>
              </div>
            )}

            {aiError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', padding: '1rem', borderRadius: '0.75rem', color: 'var(--error)', marginBottom: '2rem', textAlign: 'center' }}>
                <p style={{ fontWeight: 600 }}>Error: {aiError}</p>
                <p style={{ fontSize: '0.85rem' }}>Make sure the server has GEMINI_API_KEY set correctly.</p>
              </div>
            )}
          </div>

          {generatedQs.length > 0 && (
            <div className="animate-slide-up">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3>Preview Generated Questions ({generatedQs.length})</h3>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <input 
                    className="input" 
                    style={{ marginBottom: 0, width: '200px' }} 
                    placeholder="New Test Name" 
                    value={testName} 
                    onChange={e => setTestName(e.target.value)} 
                  />
                  <button className="btn btn-primary" onClick={handleBulkImport}>
                    <Download size={18} /> Bulk Import to Bank
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {generatedQs.map((q, i) => (
                  <div key={i} className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                       <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>Question {i+1}</span>
                       <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>⏱️ {q.timer_seconds}s</span>
                    </div>
                    <p style={{ fontWeight: 600, marginBottom: '1rem' }}>{q.text}</p>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      {q.options.map((opt, oidx) => (
                        <div key={oidx} style={{ 
                          padding: '0.75rem', 
                          borderRadius: '0.5rem', 
                          background: oidx === q.correct_index ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)',
                          border: oidx === q.correct_index ? '1px solid var(--success)' : '1px solid transparent',
                          color: oidx === q.correct_index ? 'var(--success)' : 'var(--text-muted)',
                          fontSize: '0.9rem'
                        }}>
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : tab === 'history' ? (
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>Previous Exams History</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
            List of all saved exams. You can copy unique share links or load them back into the editor.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Exam Name</th>
                  <th>Created Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tests.length === 0 ? (
                  <tr><td colSpan="3" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No saved exams found.</td></tr>
                ) : (
                  tests.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.name}</td>
                      <td>{new Date(t.created_at).toLocaleDateString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button className="btn btn-secondary" title="Copy Share Link" onClick={() => {
                            const base = publicBaseUrl || window.location.origin;
                            const studentUrl = `${base}/?role=student&teacher=${username}&test=${encodeURIComponent(t.name)}`;
                            navigator.clipboard.writeText(studentUrl);
                            alert(`Link for "${t.name}" copied!`);
                          }}>
                            <Copy size={16} />
                          </button>
                          <button className="btn btn-secondary" title="Load/Edit Questions" onClick={() => {
                            setTestName(t.name);
                            setTab('questions');
                            loadData();
                          }}>
                            <Edit2 size={16} />
                          </button>
                          {deleteConfirmId === t.id ? (
                            <button 
                              type="button"
                              className="btn" 
                              style={{ background: 'var(--error)', color: 'white', gap: '0.5rem' }} 
                              onClick={() => deleteTest(t.id)}
                            >
                              <CheckCircle size={16} />
                              <span>Confirm?</span>
                            </button>
                          ) : (
                            <button 
                              type="button"
                              className="btn btn-secondary" 
                              title="Delete Record" 
                              style={{ color: 'var(--error)', gap: '0.5rem' }} 
                              onClick={() => setDeleteConfirmId(t.id)}
                            >
                              <Trash2 size={16} />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'monitoring' ? (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h3>Real-time Proctoring Dashboard</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Monitor student activity and tab-switching in real-time during the active exam.</p>
            </div>
            <div className="badge badge-success animate-pulse">Monitoring Active</div>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Roll No</th>
                  <th>Status</th>
                  <th>Tab Switches</th>
                  <th>Alert</th>
                </tr>
              </thead>
              <tbody>
                {joinedStudents.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No students are currently connected.</td></tr>
                ) : (
                  joinedStudents.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.student_name}</td>
                      <td>{s.roll_no}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></div>
                          <span style={{ fontSize: '0.8rem' }}>Connected</span>
                        </div>
                      </td>
                      <td style={{ fontSize: '1.2rem', fontWeight: 700, color: (s.tab_switches || 0) > 0 ? 'var(--error)' : 'inherit' }}>
                        {s.tab_switches || 0}
                      </td>
                      <td>
                        {(s.tab_switches || 0) > 0 ? (
                          <span style={{ 
                            background: 'rgba(244, 63, 94, 0.1)', 
                            color: 'var(--error)', 
                            padding: '0.3rem 0.6rem', 
                            borderRadius: '0.4rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}>
                            <ShieldAlert size={14} /> Potential Cheating
                          </span>
                        ) : (
                          <span style={{ color: 'var(--success)', fontSize: '0.75rem' }}>Secured</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3>Student Performance Report</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Detailed results for all tests managed by you.</p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Filter:</span>
                <select 
                  className="input" 
                  style={{ margin: 0, padding: '0.4rem 2rem 0.4rem 1rem', width: 'auto' }}
                  value={filterTestName}
                  onChange={(e) => setFilterTestName(e.target.value)}
                >
                  <option value="All">All Tests</option>
                  {Array.from(new Set(results.map(r => r.test_name))).filter(Boolean).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <button className="btn btn-primary" onClick={exportToExcel} style={{ background: 'var(--success)' }}>
                <Download size={18} /> Export to CSV
              </button>
            </div>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Roll No</th>
                  <th>Test Name</th>
                  <th>Score</th>
                  <th>Switches</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No results found yet.</td></tr>
                ) : (
                  results
                    .filter(r => filterTestName === 'All' || r.test_name === filterTestName)
                    .map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.student_name}</td>
                        <td>{r.roll_no}</td>
                        <td><span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{r.test_name || 'N/A'}</span></td>
                        <td style={{ fontSize: '1.1rem', fontWeight: 700 }}>{r.score} / {r.total_questions}</td>
                        <td>
                          <span style={{ 
                            color: (r.tab_switches || 0) > 0 ? 'var(--error)' : 'var(--success)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontWeight: 600
                          }}>
                            {(r.tab_switches || 0) > 0 ? <ShieldAlert size={14} /> : <Monitor size={14} />}
                            {r.tab_switches || 0}
                          </span>
                        </td>
                        <td>{new Date(r.timestamp).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge ${r.score / r.total_questions >= 0.5 ? 'badge-success' : 'badge-error'}`}>
                            {r.score / r.total_questions >= 0.5 ? 'Passed' : 'Failed'}
                          </span>
                        </td>
                      </tr>
                    ))
                )}
                {results.length > 0 && results.filter(r => filterTestName === 'All' || r.test_name === filterTestName).length === 0 && (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No results match this filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeacherDashboard;
