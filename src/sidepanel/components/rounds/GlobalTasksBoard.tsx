import React, { useMemo, useState } from 'react';
import { CheckCircle2, Search } from 'lucide-react';
import Button from '../buttons/Button';
import { useRounds } from '@/contexts/RoundsContext';

interface GlobalTasksBoardProps {
  onSelectPatient?: () => void;
}

export const GlobalTasksBoard: React.FC<GlobalTasksBoardProps> = ({ onSelectPatient }) => {
  const { patients, updatePatient, setSelectedPatientId } = useRounds();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [showDischarged, setShowDischarged] = useState(false);

  const tasks = useMemo(() => {
    const filteredPatients = patients.filter(p => showDischarged ? true : p.status === 'active');
    const grouped: Record<string, { patient: typeof patients[number]; tasks: typeof patients[number]['tasks'] }> = {};
    filteredPatients.forEach(patient => {
      const patientTasks = patient.tasks
        .filter(task => task.status === 'open')
        .filter(task => !query || task.text.toLowerCase().includes(query.toLowerCase()))
        .filter(task => category === 'all' || task.category === category);
      if (patientTasks.length) {
        grouped[patient.id] = { patient, tasks: patientTasks };
      }
    });
    return grouped;
  }, [patients, query, category, showDischarged]);

  const handleToggle = async (taskId: string, patientId: string) => {
    updatePatient(patientId, (p) => ({
      ...p,
      tasks: p.tasks.map(t => t.id === taskId ? { ...t, status: t.status === 'open' ? 'done' : 'open', completedAt: new Date().toISOString() } : t)
    }));
  };

  const handleGo = (patientId: string) => {
    setSelectedPatientId(patientId);
    onSelectPatient?.();
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Global tasks</h3>
          <p className="text-xs text-gray-500">Open tasks across all patients</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600 flex items-center gap-1">
            <input type="checkbox" checked={showDischarged} onChange={(e) => setShowDischarged(e.target.checked)} />
            Include discharged
          </label>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
          <input
            className="w-full rounded-md border px-3 py-2 text-sm pl-8"
            placeholder="Search tasks"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="rounded-md border px-2 py-2 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">All categories</option>
          <option value="imaging">Imaging</option>
          <option value="lab">Lab</option>
          <option value="discharge">Discharge</option>
          <option value="followup">Follow-up</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="space-y-4">
        {Object.values(tasks).map(group => (
          <div key={group.patient.id} className="space-y-2">
            <div className="text-sm font-semibold text-gray-900">
              {group.patient.name} {group.patient.bed ? `– Bed ${group.patient.bed}` : ''}
            </div>
            {group.tasks.map(task => (
              <div key={task.id} className="border border-gray-200 rounded-lg p-3 bg-white shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={task.status === 'done'} onChange={() => handleToggle(task.id, group.patient.id)} />
                    <div>
                      <div className="text-sm text-gray-900">{task.text}</div>
                      {task.category && <div className="text-xs text-gray-500">{task.category}</div>}
                    </div>
                  </div>
                  <Button size="xs" variant="ghost" startIcon={CheckCircle2} onClick={() => handleGo(group.patient.id)}>
                    Go to patient
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ))}
        {Object.values(tasks).length === 0 && <p className="text-sm text-gray-500">No open tasks.</p>}
      </div>
    </div>
  );
};
