import React, { useState, useEffect } from 'react';
import { supabase, type Subcontractor } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

const SPECIALTIES = [
  'General Contractor',
  'Demolition Contractor',
  'Drywall Contractor', 
  'Painting Contractor',
  'Flooring Contractor',
  'Plumbing Contractor',
  'Electrical Contractor',
  'HVAC Contractor',
  'Roofing Contractor',
  'Carpentry/Finish Contractor',
  'Tile Contractor',
  'Insulation Contractor',
  'Windows & Doors Contractor',
  'Landscaping Contractor',
  'Other'
];

export const SubcontractorList: React.FC = () => {
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchSubcontractors();
    }
  }, [user]);

  const fetchSubcontractors = async () => {
    try {
      const { data, error } = await supabase
        .from('subcontractors')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setSubcontractors(data || []);
    } catch (error) {
      console.error('Error fetching subcontractors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubcontractor = async (subcontractorData: Partial<Subcontractor>) => {
    try {
      const { error } = await supabase
        .from('subcontractors')
        .insert([{ ...subcontractorData, user_id: user!.id }]);
      
      if (error) throw error;
      fetchSubcontractors();
      setShowForm(false);
    } catch (error) {
      console.error('Error adding subcontractor:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading subcontractors...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Subcontractors</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Add Subcontractor
        </button>
      </div>

      {showForm && (
        <SubcontractorForm
          onSubmit={handleAddSubcontractor}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subcontractors.map((subcontractor) => (
          <div key={subcontractor.id} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-slate-900">{subcontractor.name}</h3>
              {subcontractor.is_preferred && (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  Preferred
                </span>
              )}
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <p><strong>Company:</strong> {subcontractor.company_name}</p>
              <p><strong>Specialty:</strong> {subcontractor.specialty}</p>
              <p><strong>Email:</strong> {subcontractor.email}</p>
              <p><strong>Phone:</strong> {subcontractor.phone}</p>
              {subcontractor.license_number && (
                <p><strong>License:</strong> {subcontractor.license_number}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface SubcontractorFormProps {
  onSubmit: (data: Partial<Subcontractor>) => void;
  onCancel: () => void;
}

const SubcontractorForm: React.FC<SubcontractorFormProps> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    email: '',
    phone: '',
    specialty: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    license_number: '',
    insurance_info: '',
    notes: '',
    is_preferred: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium text-slate-900 mb-4">Add New Subcontractor</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
          <input
            type="text"
            value={formData.company_name}
            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Specialty *</label>
          <select
            required
            value={formData.specialty}
            onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Select specialty...</option>
            {SPECIALTIES.map(specialty => (
              <option key={specialty} value={specialty}>{specialty}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">License Number</label>
          <input
            type="text"
            value={formData.license_number}
            onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="md:col-span-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_preferred}
              onChange={(e) => setFormData({ ...formData, is_preferred: e.target.checked })}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-slate-700">Mark as preferred subcontractor</span>
          </label>
        </div>
        <div className="md:col-span-2 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Add Subcontractor
          </button>
        </div>
      </form>
    </div>
  );
};