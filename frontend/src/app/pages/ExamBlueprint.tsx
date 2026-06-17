import { useApp } from '../context/AppContext';
import { CheckCircle, AlertCircle, Save } from 'lucide-react';
import { useState } from 'react';

const blueprintData = [
  { id: 1, lo: 'LO1.1', description: 'Fundamental programming concepts', easy: 5, medium: 3, hard: 2 },
  { id: 2, lo: 'LO1.2', description: 'Problem-solving techniques', easy: 3, medium: 5, hard: 2 },
  { id: 3, lo: 'LO2.1', description: 'Algorithm complexity analysis', easy: 2, medium: 4, hard: 4 },
  { id: 4, lo: 'LO2.2', description: 'Advanced data structures', easy: 3, medium: 3, hard: 3 },
  { id: 5, lo: 'LO3.1', description: 'Linear equation systems', easy: 4, medium: 4, hard: 2 },
];

export default function ExamBlueprint() {
  const { t } = useApp();
  const [matrix, setMatrix] = useState(blueprintData);
  const [isValidated, setIsValidated] = useState(false);

  const updateCell = (id: number, difficulty: 'easy' | 'medium' | 'hard', value: number) => {
    setMatrix(prev => prev.map(row => 
      row.id === id ? { ...row, [difficulty]: Math.max(0, value) } : row
    ));
    setIsValidated(false);
  };

  const totals = {
    easy: matrix.reduce((sum, row) => sum + row.easy, 0),
    medium: matrix.reduce((sum, row) => sum + row.medium, 0),
    hard: matrix.reduce((sum, row) => sum + row.hard, 0),
  };

  const grandTotal = totals.easy + totals.medium + totals.hard;

  const percentages = {
    easy: grandTotal > 0 ? Math.round((totals.easy / grandTotal) * 100) : 0,
    medium: grandTotal > 0 ? Math.round((totals.medium / grandTotal) * 100) : 0,
    hard: grandTotal > 0 ? Math.round((totals.hard / grandTotal) * 100) : 0,
  };

  const validateBlueprint = () => {
    setIsValidated(true);
  };

  const isBalanced = percentages.easy >= 30 && percentages.easy <= 50 &&
                     percentages.medium >= 30 && percentages.medium <= 50 &&
                     percentages.hard >= 10 && percentages.hard <= 30;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('blueprint.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Design your exam structure with optimal difficulty distribution</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={validateBlueprint}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            <CheckCircle className="w-5 h-5" />
            {t('blueprint.validate')}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            <Save className="w-5 h-5" />
            {t('blueprint.save')}
          </button>
        </div>
      </div>

      {/* Validation Alert */}
      {isValidated && (
        <div className={`p-4 rounded-lg border-2 flex items-start gap-3 ${
          isBalanced 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' 
            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
        }`}>
          {isBalanced ? (
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <div className={`font-semibold ${isBalanced ? 'text-green-900 dark:text-green-200' : 'text-amber-900 dark:text-amber-200'}`}>
              {isBalanced ? 'Blueprint is well-balanced!' : 'Blueprint needs adjustment'}
            </div>
            <div className={`text-sm mt-1 ${isBalanced ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'}`}>
              {isBalanced 
                ? 'Your difficulty distribution follows recommended guidelines (Easy: 30-50%, Medium: 30-50%, Hard: 10-30%)'
                : 'Recommended: Easy 30-50%, Medium 30-50%, Hard 10-30%. Adjust your distribution for optimal assessment.'
              }
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Questions</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{grandTotal}</div>
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">In blueprint</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-sm p-6 text-white">
          <div className="text-sm opacity-90">Easy Questions</div>
          <div className="text-3xl font-bold mt-2">{totals.easy}</div>
          <div className="text-sm mt-2 opacity-90">{percentages.easy}% of total</div>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-sm p-6 text-white">
          <div className="text-sm opacity-90">Medium Questions</div>
          <div className="text-3xl font-bold mt-2">{totals.medium}</div>
          <div className="text-sm mt-2 opacity-90">{percentages.medium}% of total</div>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-sm p-6 text-white">
          <div className="text-sm opacity-90">Hard Questions</div>
          <div className="text-3xl font-bold mt-2">{totals.hard}</div>
          <div className="text-sm mt-2 opacity-90">{percentages.hard}% of total</div>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">
                  {t('blueprint.learningOutcome')}
                </th>
                <th className="px-6 py-4 text-left font-semibold">Description</th>
                <th className="px-6 py-4 text-center font-semibold w-32">
                  <div className="flex flex-col items-center gap-1">
                    <span>{t('blueprint.easy')}</span>
                    <span className="text-xs opacity-75">(30-50%)</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-center font-semibold w-32">
                  <div className="flex flex-col items-center gap-1">
                    <span>{t('blueprint.medium')}</span>
                    <span className="text-xs opacity-75">(30-50%)</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-center font-semibold w-32">
                  <div className="flex flex-col items-center gap-1">
                    <span>{t('blueprint.hard')}</span>
                    <span className="text-xs opacity-75">(10-30%)</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-center font-semibold w-32">{t('blueprint.total')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {matrix.map((row) => {
                const rowTotal = row.easy + row.medium + row.hard;
                return (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <span className="font-mono font-semibold text-gray-900 dark:text-white">{row.lo}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{row.description}</td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        min="0"
                        value={row.easy}
                        onChange={(e) => updateCell(row.id, 'easy', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-center bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        min="0"
                        value={row.medium}
                        onChange={(e) => updateCell(row.id, 'medium', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-center bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        min="0"
                        value={row.hard}
                        onChange={(e) => updateCell(row.id, 'hard', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-center bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-semibold text-gray-900 dark:text-white">{rowTotal}</span>
                    </td>
                  </tr>
                );
              })}
              {/* Totals Row */}
              <tr className="bg-gray-100 dark:bg-gray-700 font-semibold">
                <td className="px-6 py-4 text-gray-900 dark:text-white" colSpan={2}>TOTALS</td>
                <td className="px-6 py-4 text-center">
                  <div className="text-gray-900 dark:text-white text-lg">{totals.easy}</div>
                  <div className="text-xs text-green-600 dark:text-green-400">{percentages.easy}%</div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="text-gray-900 dark:text-white text-lg">{totals.medium}</div>
                  <div className="text-xs text-amber-600 dark:text-amber-400">{percentages.medium}%</div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="text-gray-900 dark:text-white text-lg">{totals.hard}</div>
                  <div className="text-xs text-red-600 dark:text-red-400">{percentages.hard}%</div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="text-gray-900 dark:text-white text-xl">{grandTotal}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Difficulty Distribution Visualization</h2>
        <div className="flex items-center gap-2 h-12 rounded-lg overflow-hidden">
          <div 
            className="h-full bg-green-500 flex items-center justify-center text-white font-semibold transition-all"
            style={{ width: `${percentages.easy}%` }}
          >
            {percentages.easy > 10 && `${percentages.easy}%`}
          </div>
          <div 
            className="h-full bg-amber-500 flex items-center justify-center text-white font-semibold transition-all"
            style={{ width: `${percentages.medium}%` }}
          >
            {percentages.medium > 10 && `${percentages.medium}%`}
          </div>
          <div 
            className="h-full bg-red-500 flex items-center justify-center text-white font-semibold transition-all"
            style={{ width: `${percentages.hard}%` }}
          >
            {percentages.hard > 10 && `${percentages.hard}%`}
          </div>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Easy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-500 rounded"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Hard</span>
          </div>
        </div>
      </div>
    </div>
  );
}
