import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface AuthFormProps {
  mode: 'signin' | 'signup';
  onToggleMode: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ mode, onToggleMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [companyState, setCompanyState] = useState('');
  const [companyZip, setCompanyZip] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [industry, setIndustry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn, signUp } = useAuth();

  const generateCompanySlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        if (!companyName.trim()) {
          throw new Error('Company name is required');
        }
        
        // Create the user account first
        const { data: authData, error: authError } = await signUp(email, password, fullName);
        if (authError) throw authError;
        
        if (authData.user) {
          // Create the company
          const companySlug = generateCompanySlug(companyName);
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .insert([{
              name: companyName,
              slug: companySlug,
              address: companyAddress || null,
              city: companyCity || null,
              state: companyState || null,
              zip_code: companyZip || null,
              phone: companyPhone || null,
              industry: industry || null,
              subscription_status: 'trial',
              subscription_plan: 'starter'
            }])
            .select()
            .single();
          
          if (companyError) throw companyError;
          
          // Add user as company owner
          const { error: memberError } = await supabase
            .from('company_users')
            .insert([{
              company_id: companyData.id,
              user_id: authData.user.id,
              role: 'owner'
            }]);
          
          if (memberError) throw memberError;
          
          // Update user profile with company info
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              company_name: companyName,
              company_id: companyData.id,
              current_company_id: companyData.id
            })
            .eq('id', authData.user.id);
          
          if (profileError) throw profileError;
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-center text-slate-900 mb-6">
        {mode === 'signin' ? 'Sign In to Project ManageAI' : 'Create Your Project ManageAI Account'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
        )}
        
        {mode === 'signup' && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
                placeholder="Your company name"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Industry
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select industry...</option>
                  <option value="construction">Construction</option>
                  <option value="roofing">Roofing</option>
                  <option value="restoration">Restoration</option>
                  <option value="general_contractor">General Contractor</option>
                  <option value="insurance">Insurance</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Company Phone
                </label>
                <input
                  type="tel"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Company Address
              </label>
              <input
                type="text"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Street address"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={companyCity}
                  onChange={(e) => setCompanyCity(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={companyState}
                  onChange={(e) => setCompanyState(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="State"
                  maxLength={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={companyZip}
                  onChange={(e) => setCompanyZip(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="12345"
                  maxLength={10}
                />
              </div>
            </div>
          </>
        )}
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
            minLength={6}
          />
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-700 text-sm">
              {error.includes('Invalid login credentials') 
                ? 'Invalid email or password. Please check your credentials and try again.'
                : error.includes('Database error saving new user')
                ? 'There was an issue creating your account. Please try again or contact support.'
                : error
              }
            </p>
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white rounded-md py-3 px-4 font-medium hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating Account...' : mode === 'signin' ? 'Sign In' : 'Create Company Account'}
        </button>
      </form>
      
      <div className="mt-4 text-center">
        <button
          onClick={onToggleMode}
          className="text-indigo-600 hover:text-indigo-800 text-sm"
        >
          {mode === 'signin' 
            ? "Don't have a company account? Create one" 
            : "Already have a company account? Sign in"
          }
        </button>
      </div>
    </div>
  );
};