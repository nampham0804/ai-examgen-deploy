import { createBrowserRouter, Navigate } from 'react-router';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import LearningOutcomes from './pages/LearningOutcomes';
import ExamBlueprint from './pages/ExamBlueprint';
import AIGeneration from './pages/AIGeneration';
import QuestionBank from './pages/QuestionBank';
import ExamGenerator from './pages/ExamGenerator';
import ExamPreview from './pages/ExamPreview';
import ExamEditor from './pages/ExamEditor';
import ExamList from './pages/ExamList';
import Review from './pages/Review';
import Analytics from './pages/Analytics';
import NotFound from './pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'courses', element: <Courses /> },
      { path: 'learning-outcomes', element: <LearningOutcomes /> },
      { path: 'exam-blueprint', element: <ExamBlueprint /> },
      { path: 'ai-generation', element: <AIGeneration /> },
      { path: 'question-bank', element: <QuestionBank /> },
      { path: 'exam-generator', element: <ExamGenerator /> },
      { path: 'exam-list', element: <ExamList /> },
      { path: 'exam/:id/preview', element: <ExamPreview /> },
      { path: 'exam/:id/edit', element: <ExamEditor /> },
      { path: 'review', element: <Review /> },
      { path: 'analytics', element: <Analytics /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);