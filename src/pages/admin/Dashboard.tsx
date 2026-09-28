import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase/client';

type OrganizerProfile = {
  id: string;
  email: string;
  full_name: string;
  status: 'pending' | 'active';
  created_at: string;
};

export default function AdminDashboard() {
  const [records, setRecords] = useState<OrganizerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'active'>('pending');

  useEffect(() => {
    fetchRecords();
  }, []);

  async function fetchRecords() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('organizer_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (err: any) {
      console.error('Failed to fetch organizer profiles:', err);
      setError(err.message || 'Failed to load administrative records.');
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, newStatus: 'pending' | 'active') {
    try {
      const { error } = await supabase
        .from('organizer_profiles')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      // Update local state
      setRecords(records.map(record => 
        record.id === id ? { ...record, status: newStatus } : record
      ));
    } catch (err: any) {
      console.error('Failed to update status:', err);
      alert('Failed to update record status.');
    }
  }

  const filteredRecords = records.filter(record => record.status === activeTab);

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={fetchRecords} className="text-sm font-semibold hover:underline">Try Again</button>
        </div>
      )}

      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('pending')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pending'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pending Records
            {records.filter(r => r.status === 'pending').length > 0 && (
              <span className="ml-2 bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs">
                {records.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'active'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Active Records
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex space-x-4 bg-gray-100 h-16 rounded-md"></div>
          ))}
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <h3 className="mt-2 text-sm font-medium text-gray-900">No {activeTab} records</h3>
          <p className="mt-1 text-sm text-gray-500">
            {activeTab === 'pending' 
              ? 'There are no pending organizer requests to review at this time.' 
              : 'There are no active organizers.'}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
          <ul className="divide-y divide-gray-200">
            {filteredRecords.map((record) => (
              <li key={record.id}>
                <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 truncate">{record.full_name}</p>
                    <p className="mt-1 text-sm text-gray-500">{record.email}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      record.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </span>
                    {record.status === 'pending' ? (
                      <button
                        onClick={() => updateStatus(record.id, 'active')}
                        className="text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded shadow-sm"
                      >
                        Approve
                      </button>
                    ) : (
                      <button
                        onClick={() => updateStatus(record.id, 'pending')}
                        className="text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded shadow-sm border border-gray-300"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
