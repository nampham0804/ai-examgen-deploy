export interface Course {
  id: number;
  code: string;
  name: string;
  credits: number;
  status: string;
  los: number;
  questions: number;
}

export const MOCK_COURSES: Course[] = [
  { id: 1, code: 'CS101', name: 'Introduction to Computer Science', credits: 3, status: 'active', los: 12, questions: 145 },
  { id: 2, code: 'CS201', name: 'Data Structures and Algorithms', credits: 4, status: 'active', los: 15, questions: 203 },
  { id: 3, code: 'MATH201', name: 'Linear Algebra', credits: 3, status: 'active', los: 10, questions: 89 },
  { id: 4, code: 'CS301', name: 'Database Systems', credits: 3, status: 'draft', los: 8, questions: 67 },
  { id: 5, code: 'CS401', name: 'Machine Learning', credits: 4, status: 'active', los: 18, questions: 178 },
  { id: 6, code: 'ENG101', name: 'Technical Writing', credits: 2, status: 'active', los: 6, questions: 45 },
  { id: 7, code: 'CS501', name: 'Advanced Algorithms', credits: 4, status: 'archived', los: 14, questions: 98 },
  { id: 8, code: 'STAT201', name: 'Probability and Statistics', credits: 3, status: 'active', los: 11, questions: 112 },
];
