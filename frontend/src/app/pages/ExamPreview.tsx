import React from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '../components/ui/button';

export default function ExamPreview() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Exam Preview</h1>
        <Button variant="outline" onClick={() => navigate('/exam-generator')}>
          Back to Generator
        </Button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <p className="text-slate-600 mb-4">Previewing exam ID: <span className="font-semibold text-slate-900">{id}</span></p>
        
        <div className="space-y-4">
          {/* Placeholder for actual exam content */}
          <div className="p-4 border rounded bg-slate-50">
            <h3 className="font-medium text-lg">Question 1</h3>
            <p className="mt-2 text-slate-700">Sample question text would appear here.</p>
            <div className="mt-4 space-y-2">
              {['Option A', 'Option B', 'Option C', 'Option D'].map((opt, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <input type="radio" id={`q1-${i}`} name="q1" className="w-4 h-4 text-blue-600" />
                  <label htmlFor={`q1-${i}`}>{opt}</label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-4">
          <Button variant="outline">Edit Exam</Button>
          <Button>Publish Exam</Button>
        </div>
      </div>
    </div>
  );
}
