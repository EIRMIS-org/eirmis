import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase/client';

export function ProtectedRoute({ requireAdmin = false }: { requireAdmin?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (!session) {
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        setIsAuthenticated(true);

        if (requireAdmin) {
          // Check if user is in admin_profiles
          const { data, error: adminError } = await supabase
            .from('admin_profiles')
            .select('id')
            .eq('id', session.user.id)
            .single();

          if (adminError && adminError.code !== 'PGRST116') {
            throw adminError;
          }
          
          setIsAdmin(!!data);
        }
      } catch (err: any) {
        console.error('Auth error:', err);
        setError('Failed to verify authorization.');
      } finally {
        setLoading(false);
      }
    }

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (!session) setIsAdmin(false);
    });

    return () => subscription.unsubscribe();
  }, [requireAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Usually redirect to login, but since we don't have one, just show unauthorized
    return <Navigate to="/unauthorized" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
