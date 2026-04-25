import React, { useState, useEffect } from 'react';
import { studentApi } from '../api';
import { ArrowLeft, Send, CheckCircle, GraduationCap, Award, ShieldAlert, Clock, Play } from 'lucide-react';

function StudentPortal({ onBack, teacherUsername: initialTeacherUsername, initialTestName }) {
  const [step, setStep] = useState('login'); // login, waiting, quiz, results
  const [studentInfo, setStudentInfo] = useState({ name: '', roll_no: '' });
  const [teacherUsername, setTeacherUsername] = useState(initialTeacherUsername || '');
  const [teacherId, setTeacherId] = useState(null);
  const [examStatus, setExamStatus] = useState('waiting');
  const [testName, setTestName] = useState(initialTestName || '');
  const [showResults, setShowResults] = useState(false);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [finalScore, setFinalScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  // Proctoring: Detect Tab Switches
  useEffect(() => {
    if (step !== 'quiz') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches(prev => prev + 1);
        console.warn("Tab switch detected!");
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [step]);

  // Polling for Exam Status (Start/End/Results Visibility)
  useEffect(() => {
    let interval;
    const checkStatus = async () => {
      if (!teacherUsername) return; 
      try {
        const res = await studentApi.getExamStatus(teacherUsername);
        if (res.data) {
          setExamStatus(res.data.status);
          setTestName(res.data.test_name);
          setTeacherId(res.data.teacher_id);
          setShowResults(res.data.show_results === true || res.data.show_results === 1);
          
          // Handle Exam Start
          if (step === 'waiting' && res.data.status === 'started') {
            const qRes = await studentApi.getQuestions(res.data.teacher_id, res.data.test_name);
            setQuestions(qRes.data);
            if (qRes.data.length > 0) {
              setTimeLeft(qRes.data[0].timer_seconds || 30);
              setStep('quiz');
            }
          }
          
          // Handle Exam End (Force Submit)
          if (step === 'quiz' && res.data.status === 'ended') {
            alert('The teacher has ended the exam. Your current progress is being submitted.');
            submitQuiz();
          }
        }
      } catch (err) {
        console.error("Error checking exam status", err);
      }
    };
    
    checkStatus();
    interval = setInterval(checkStatus, 3000);
    
    return () => clearInterval(interval);
  }, [step, teacherUsername]);

  // Timer Logic
  useEffect(() => {
    if (step !== 'quiz' || questions.length === 0) return;

    if (timeLeft === 0) {
      if (currentIndex === questions.length - 1) {
        submitQuiz();
      } else {
        setCurrentIndex(currentIndex + 1);
        setTimeLeft(30);
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [step, timeLeft, currentIndex, questions.length]);

  // Reset timer on question change
  useEffect(() => {
    if (questions[currentIndex]) {
      setTimeLeft(questions[currentIndex].timer_seconds || 30);
    }
  }, [currentIndex, questions]);

  const joinWaitingRoom = async (e) => {
    e.preventDefault();
    if (!studentInfo.name || !studentInfo.roll_no) return;
    if (!teacherUsername) return alert('No teacher specified. Please use the link shared by your teacher.');
    
    setLoading(true);
    try {
      const statusRes = await studentApi.getExamStatus(teacherUsername);
      setTeacherId(statusRes.data.teacher_id);
      
      await studentApi.joinExam({
        student_name: studentInfo.name,
        roll_no: studentInfo.roll_no,
        teacher_id: statusRes.data.teacher_id
      });
      
      setStep('waiting');
    } catch (err) {
      alert(err.response?.data?.error || 'Could not join. Please check teacher username.');
    }
    setLoading(false);
  };

  const handleAnswer = (optionIndex) => {
    setAnswers({ ...answers, [currentIndex]: optionIndex });
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const submitQuiz = async () => {
    let score = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correct_index) {
        score++;
      }
    });

    try {
      await studentApi.submitQuiz({
        student_name: studentInfo.name,
        roll_no: studentInfo.roll_no,
        score: score,
        total_questions: questions.length,
        teacher_id: teacherId,
        test_name: testName,
        tab_switches: tabSwitches
      });
      setFinalScore(score);
      setStep('results');
    } catch (err) {
      console.error(err);
      alert('Failed to submit results. Please take a screenshot of your score!');
      setFinalScore(score);
      setStep('results');
    }
  };

  if (step === 'login') {
    return (
      <div className="container animate-fade-in" style={{ maxWidth: '500px', marginTop: '10vh' }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: '2rem' }}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="card" style={{ textAlign: 'center' }}>
          <GraduationCap size={48} color="var(--primary)" style={{ marginBottom: '1.5rem', marginInline: 'auto' }} />
          <h2 style={{ marginBottom: '0.5rem' }}>Student Identification</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Please enter your real name and roll number for the teacher's record.</p>
          <form onSubmit={joinWaitingRoom}>
            <input 
              className="input" 
              placeholder="Full Name" 
              value={studentInfo.name} 
              onChange={e => setStudentInfo({...studentInfo, name: e.target.value})} 
              required 
            />
            <input 
              className="input" 
              placeholder="Roll Number (e.g. 21CS01)" 
              value={studentInfo.roll_no} 
              onChange={e => setStudentInfo({...studentInfo, roll_no: e.target.value})} 
              required 
            />
            {!initialTeacherUsername && (
              <input 
                type="text" 
                placeholder="Teacher ID / Username" 
                className="input"
                value={teacherUsername}
                onChange={(e) => setTeacherUsername(e.target.value)}
                required 
              />
            )}
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Joining Room...' : 'Enter Waiting Room'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === 'waiting') {
    return (
      <div className="container animate-fade-in" style={{ maxWidth: '500px', textAlign: 'center', marginTop: '10vh' }}>
        <div className="card">
          <div className="animate-pulse" style={{ 
            width: '80px', 
            height: '80px', 
            background: 'rgba(129, 140, 248, 0.1)', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 2rem'
          }}>
            <Clock size={40} color="var(--primary)" />
          </div>
          <h2>Joined Waiting Room</h2>
          <p style={{ color: 'var(--text-muted)', margin: '1rem 0 2rem' }}>
            Hello <strong>{studentInfo.name}</strong>, you are successfully joined. Please wait for your teacher to start the exam.
          </p>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Scheduled Test</p>
            <p style={{ fontWeight: 600, fontSize: '1.1rem', marginTop: '0.2rem' }}>{testName || 'Loading test details...'}</p>
          </div>
          <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <div className="dot-flashing"></div>
            <span style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>Waiting for teacher...</span>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'quiz') {
    const q = questions[currentIndex];
    const isLast = currentIndex === questions.length - 1;
    const progress = ((currentIndex + 1) / questions.length) * 100;

    return (
      <div className="container animate-fade-in" style={{ maxWidth: '800px' }}>
        <header style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{testName}</h3>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Question {currentIndex + 1} of {questions.length}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ 
                color: timeLeft <= 10 ? 'var(--error)' : 'var(--primary)', 
                fontWeight: 700,
                fontSize: '1.4rem',
                display: 'block'
              }}>
                ⏱️ {timeLeft}s
              </span>
            </div>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--accent))', borderRadius: '4px', transition: 'width 0.3s ease' }}></div>
          </div>
        </header>

        <div className="card">
          <h2 style={{ marginBottom: '2.5rem', lineHeight: 1.4 }}>{q.text}</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {q.options.map((opt, i) => (
              <button 
                key={i} 
                className={`btn ${answers[currentIndex] === i ? 'btn-primary' : 'btn-secondary'}`} 
                style={{ 
                  justifyContent: 'flex-start', 
                  padding: '1.5rem', 
                  fontSize: '1.1rem',
                  border: answers[currentIndex] === i ? '2px solid var(--accent)' : '2px solid transparent'
                }}
                onClick={() => handleAnswer(i)}
              >
                <span style={{ 
                  width: '30px', 
                  height: '30px', 
                  borderRadius: '50%', 
                  background: 'rgba(255,255,255,0.1)', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  marginRight: '1rem',
                  fontSize: '0.9rem'
                }}>
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
            <button className="btn btn-secondary" onClick={prevQuestion} disabled={currentIndex === 0}>
              Previous
            </button>
            {isLast ? (
              <button className="btn btn-primary" style={{ background: 'var(--success)' }} onClick={submitQuiz} disabled={answers[currentIndex] === undefined}>
                <Send size={18} /> Finish Quiz
              </button>
            ) : (
              <button className="btn btn-primary" onClick={nextQuestion} disabled={answers[currentIndex] === undefined}>
                Next Question
              </button>
            )}
          </div>
        </div>
        <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', justifyContent: 'center' }}>
          <ShieldAlert size={14} /> Security Active: Tab switching is being monitored.
        </div>
      </div>
    );
  }

  if (step === 'results') {
    const passed = finalScore / questions.length >= 0.5;
    return (
      <div className="container animate-fade-in" style={{ maxWidth: '600px', textAlign: 'center', marginTop: '5vh' }}>
        <div className="card">
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%', 
            background: passed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 2rem'
          }}>
            {passed ? <Award size={40} color="var(--success)" /> : <ShieldAlert size={40} color="var(--error)" />}
          </div>
          <h1>Assessment <span style={{ color: passed ? 'var(--success)' : 'var(--error)' }}>Submitted</span></h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Great job, {studentInfo.name}!</p>
          
          {/* Always show Tab Switches if any occurred, for transparency */}
          {(tabSwitches > 0 || showResults) && (
            <div style={{ margin: '2rem 0', padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '1rem' }}>
              {showResults && (
                <>
                  <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Your Final Score</p>
                  <h2 style={{ fontSize: '4rem', fontWeight: 700 }}>{finalScore} <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>/ {questions.length}</span></h2>
                </>
              )}
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: (tabSwitches > 0 ? 'var(--error)' : 'var(--success)'), fontSize: '0.9rem' }}>
                <Monitor size={16} /> Tab Switches Detected: {tabSwitches}
              </div>
              {!showResults && <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Detailed score is currently hidden by teacher.</p>}
            </div>
          )}

          {!showResults && tabSwitches === 0 && (
            <div style={{ margin: '3rem 0', padding: '2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '1rem' }}>
              <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>
                Your results have been securely sent to your teacher.
              </p>
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Teacher has disabled immediate result viewing.
              </p>
            </div>
          )}

          <p style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>
            You may now close this window or return to the home screen.
          </p>
          
          <button className="btn btn-secondary" onClick={onBack}>
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default StudentPortal;
