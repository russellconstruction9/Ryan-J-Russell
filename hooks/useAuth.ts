import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, type Company, type CompanyUser } from '../lib/supabase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [userCompanies, setUserCompanies] = useState<CompanyUser[]>([]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserCompanies(session.user.id);
      } else {
        setCurrentCompany(null);
        setUserCompanies([]);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserCompanies = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('company_users')
        .select(`
          *,
          companies(*)
        `)
        .eq('user_id', userId)
        .eq('is_active', true);
      
      if (error) throw error;
      
      setUserCompanies(data || []);
      
      // Set current company to the first one if none is set
      if (data && data.length > 0 && !currentCompany) {
        setCurrentCompany(data[0].companies);
        
        // Update user's current_company_id in profile
        await supabase
          .from('profiles')
          .update({ current_company_id: data[0].companies.id })
          .eq('id', userId);
      }
    } catch (error) {
      console.error('Error fetching user companies:', error);
    }
  };

  const switchCompany = async (company: Company) => {
    setCurrentCompany(company);
    
    // Update user's current_company_id in profile
    if (user) {
      await supabase
        .from('profiles')
        .update({ current_company_id: company.id })
        .eq('id', user.id);
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    session,
    loading,
    currentCompany,
    userCompanies,
    switchCompany,
    signUp,
    signIn,
    signOut,
  };
};