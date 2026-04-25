import axios from 'axios';

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? `http://${window.location.hostname}:8000/api` 
  : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const teacherApi = {
  getSetupStatus: () => api.get('/teacher/setup-status'),
  login: (username, password) => api.post('/teacher/login', { username, password }),
  register: (data) => api.post('/teacher/register', data),
  getSecurityQuestion: (username) => api.post('/teacher/get-question', { username }),
  resetPassword: (data) => api.post('/teacher/reset-password', data),
  getQuestions: (teacher_id, test_name) => api.get('/questions', { params: { teacher_id, test_name } }),
  createQuestion: (data) => api.post('/questions', data),
  updateQuestion: (id, data) => api.put(`/questions/${id}`, data),
  deleteQuestion: (id) => api.delete(`/questions/${id}`),
  getSubmissions: (teacher_id) => api.get('/submissions', { params: { teacher_id } }),
  startExam: (teacher_id, test_name) => api.post('/teacher/start-exam', { teacher_id, test_name }),
  endExam: (teacher_id) => api.post('/teacher/end-exam', { teacher_id }),
  getJoinedStudents: (teacher_id) => api.get('/teacher/joined-students', { params: { teacher_id } }),
  toggleResults: (teacher_id, show_results) => api.post('/teacher/toggle-results', { teacher_id, show_results }),
  getSettings: (teacher_id) => api.get(`/teacher/settings/${teacher_id}`),
  getTests: (teacher_id) => api.get('/teacher/tests', { params: { teacher_id } }),
  createTest: (teacher_id, name) => api.post('/teacher/tests', { teacher_id, name }),
  deleteTest: (id) => api.delete(`/teacher/tests/${id}`),
  generateAIQuestions: (data) => api.post('/ai/generate', data),
};

export const studentApi = {
  getQuestions: (teacher_id, test_name) => api.get('/questions', { params: { teacher_id, test_name } }),
  submitQuiz: (data) => api.post('/submissions', data),
  getExamStatus: (username) => api.get(`/exam-status/${username}`),
  joinExam: (data) => api.post('/student/join', data),
  reportTabSwitch: (data) => api.post('/student/report-switch', data),
};

export default api;
