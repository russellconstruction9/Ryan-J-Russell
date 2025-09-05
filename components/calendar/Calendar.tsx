import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase, type Customer, type Subcontractor } from '../../lib/supabase';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'estimate' | 'work_order' | 'meeting' | 'inspection';
  description?: string;
  customer?: string;
  customerId?: string;
  subcontractorId?: string;
  subcontractor?: string;
}

export const Calendar: React.FC = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    time: '',
    type: 'meeting' as CalendarEvent['type'],
    description: '',
    customerId: '',
    subcontractorId: ''
  });

  // Sample events - in a real app, these would come from the database
  useEffect(() => {
    const sampleEvents: CalendarEvent[] = [
      {
        id: '1',
        title: 'Site Inspection',
        date: '2025-01-15',
        time: '10:00 AM',
        type: 'inspection',
        description: 'Initial damage assessment',
        customer: 'John Smith'
      },
      {
        id: '2',
        title: 'Contractor Meeting',
        date: '2025-01-16',
        time: '2:00 PM',
        type: 'meeting',
        description: 'Discuss roofing work order',
        customer: 'Jane Doe'
      },
      {
        id: '3',
        title: 'Estimate Review',
        date: '2025-01-18',
        time: '11:00 AM',
        type: 'estimate',
        description: 'Final budget review with customer',
        customer: 'Mike Johnson'
      }
    ];
    setEvents(sampleEvents);
  }, []);

  // Fetch customers and subcontractors
  useEffect(() => {
    if (user) {
      fetchCustomersAndSubcontractors();
    }
  }, [user]);

  const fetchCustomersAndSubcontractors = async () => {
    try {
      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user!.id)
        .order('name');
      
      if (customersError) throw customersError;
      setCustomers(customersData || []);

      // Fetch subcontractors
      const { data: subcontractorsData, error: subcontractorsError } = await supabase
        .from('subcontractors')
        .select('*')
        .eq('user_id', user!.id)
        .order('name');
      
      if (subcontractorsError) throw subcontractorsError;
      setSubcontractors(subcontractorsData || []);
    } catch (error) {
      console.error('Error fetching customers and subcontractors:', error);
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  };

  const formatDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getEventsForDate = (year: number, month: number, day: number) => {
    const dateKey = formatDateKey(year, month, day);
    return events.filter(event => event.date === dateKey);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(clickedDate);
    
    // Set default date for new event
    const dateString = clickedDate.toISOString().split('T')[0];
    setNewEvent(prev => ({ ...prev, date: dateString }));
    
    const dayEvents = getEventsForDate(currentDate.getFullYear(), currentDate.getMonth(), day);
    if (dayEvents.length > 0) {
      setSelectedEvent(dayEvents[0]);
      setShowEventModal(true);
    } else {
      // Open new event modal if no events on this date
      setSelectedEvent(null);
      setShowEventModal(true);
    }
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setNewEvent({
      title: '',
      date: new Date().toISOString().split('T')[0],
      time: '',
      type: 'meeting',
      description: '',
      customerId: '',
      subcontractorId: ''
    });
    setShowEventModal(true);
  };

  const handleSaveEvent = () => {
    if (!newEvent.title || !newEvent.date || !newEvent.time) {
      alert('Please fill in all required fields');
      return;
    }

    const selectedCustomer = customers.find(c => c.id === newEvent.customerId);
    const selectedSubcontractor = subcontractors.find(s => s.id === newEvent.subcontractorId);

    const eventToAdd: CalendarEvent = {
      id: `event-${Date.now()}`,
      title: newEvent.title,
      date: newEvent.date,
      time: newEvent.time,
      type: newEvent.type,
      description: newEvent.description,
      customer: selectedCustomer?.name,
      customerId: newEvent.customerId,
      subcontractor: selectedSubcontractor?.name,
      subcontractorId: newEvent.subcontractorId
    };

    setEvents(prev => [...prev, eventToAdd]);
    setShowEventModal(false);
    
    // Reset form
    setNewEvent({
      title: '',
      date: '',
      time: '',
      type: 'meeting',
      description: '',
      customerId: '',
      subcontractorId: ''
    });
  };

  const getEventTypeColor = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'estimate': return 'bg-blue-500';
      case 'work_order': return 'bg-green-500';
      case 'meeting': return 'bg-purple-500';
      case 'inspection': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getEventTypeIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'estimate': return '📄';
      case 'work_order': return '🔨';
      case 'meeting': return '👥';
      case 'inspection': return '🔍';
      default: return '📅';
    }
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-32 border border-slate-200"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDate(currentDate.getFullYear(), currentDate.getMonth(), day);
      const isToday = isCurrentMonth && today.getDate() === day;
      const isSelected = selectedDate && 
        selectedDate.getDate() === day && 
        selectedDate.getMonth() === currentDate.getMonth() &&
        selectedDate.getFullYear() === currentDate.getFullYear();

      days.push(
        <div
          key={day}
          onClick={() => handleDateClick(day)}
          className={`h-32 border border-slate-200 p-2 cursor-pointer hover:bg-slate-50 transition-colors ${
            isToday ? 'bg-indigo-50 border-indigo-300' : ''
          } ${isSelected ? 'bg-indigo-100 border-indigo-400' : ''}`}
        >
          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-indigo-700' : 'text-slate-900'}`}>
            {day}
          </div>
          <div className="space-y-1">
            {dayEvents.slice(0, 3).map((event, index) => (
              <div
                key={event.id}
                className={`text-xs px-2 py-1 rounded text-white truncate ${getEventTypeColor(event.type)}`}
                title={`${event.time} - ${event.title}`}
              >
                <span className="mr-1">{getEventTypeIcon(event.type)}</span>
                {event.title}
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="text-xs text-slate-500 px-2">
                +{dayEvents.length - 3} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Calendar</h1>
          <p className="text-slate-600">Schedule and manage your appointments</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Today
          </button>
          <button
            onClick={handleCreateEvent}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            + New Event
          </button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-slate-100 rounded-md transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <h2 className="text-2xl font-bold text-slate-900">
            {formatDate(currentDate)}
          </h2>
          
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-slate-100 rounded-md transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-0 border border-slate-200 rounded-lg overflow-hidden">
          {/* Day Headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="bg-slate-100 p-3 text-center font-medium text-slate-700 border-b border-slate-200">
              {day}
            </div>
          ))}
          
          {/* Calendar Days */}
          {renderCalendarDays()}
        </div>
      </div>

      {/* Event Legend */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Event Types</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm text-slate-700">📄 Estimates</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm text-slate-700">🔨 Work Orders</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500 rounded"></div>
            <span className="text-sm text-slate-700">👥 Meetings</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span className="text-sm text-slate-700">🔍 Inspections</span>
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Events</h3>
        <div className="space-y-3">
          {events.slice(0, 5).map(event => (
            <div key={event.id} className="flex items-center gap-4 p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
              <div className={`w-3 h-3 rounded-full ${getEventTypeColor(event.type)}`}></div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getEventTypeIcon(event.type)}</span>
                  <h4 className="font-medium text-slate-900">{event.title}</h4>
                </div>
                <p className="text-sm text-slate-600">
                  {new Date(event.date).toLocaleDateString()} at {event.time}
                  {event.customer && ` • ${event.customer}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {selectedEvent ? 'Event Details' : 'New Event'}
            </h3>
            
            {selectedEvent ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getEventTypeIcon(selectedEvent.type)}</span>
                  <h4 className="font-medium text-slate-900">{selectedEvent.title}</h4>
                </div>
                <p className="text-slate-600">
                  <strong>Date:</strong> {new Date(selectedEvent.date).toLocaleDateString()}
                </p>
                <p className="text-slate-600">
                  <strong>Time:</strong> {selectedEvent.time}
                </p>
                {selectedEvent.customer && (
                  <p className="text-slate-600">
                    <strong>Customer:</strong> {selectedEvent.customer}
                  </p>
                )}
                {selectedEvent.description && (
                  <p className="text-slate-600">
                    <strong>Description:</strong> {selectedEvent.description}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter event title..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Time *
                    </label>
                    <input
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, time: e.target.value }))}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Event Type *
                  </label>
                  <select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, type: e.target.value as CalendarEvent['type'] }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="meeting">👥 Meeting</option>
                    <option value="inspection">🔍 Inspection</option>
                    <option value="estimate">📄 Estimate Review</option>
                    <option value="work_order">🔨 Work Order</option>
                  </select>
                </div>
                    />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Customer
                  </label>
                  <select
                    value={newEvent.customerId}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, customerId: e.target.value }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select a customer...</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>
                  </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Subcontractor
                  </label>
                  <select
                    value={newEvent.subcontractorId}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, subcontractorId: e.target.value }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select a subcontractor...</option>
                    {subcontractors.map(subcontractor => (
                      <option key={subcontractor.id} value={subcontractor.id}>
                        {subcontractor.name} - {subcontractor.company_name} ({subcontractor.specialty})
                      </option>
                    ))}
                  </select>
                </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter event description..."
                  />
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEventModal(false);
                  setSelectedEvent(null);
                }}
                className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              {!selectedEvent && (
                <button 
                  onClick={handleSaveEvent}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Create Event
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};