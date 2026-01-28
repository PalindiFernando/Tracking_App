import { useState } from 'react';
import { Bus, Route, Users, Settings } from 'lucide-react';
import BusManagement from '../components/admin/BusManagement';
import RouteManagement from '../components/admin/RouteManagement';
import UserManagement from '../components/admin/UserManagement';

type Tab = 'buses' | 'routes' | 'users';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('buses');

  const tabs = [
    { id: 'buses' as Tab, label: 'Bus Management', icon: Bus },
    { id: 'routes' as Tab, label: 'Route Management', icon: Route },
    { id: 'users' as Tab, label: 'User Management', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
          
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'buses' && <BusManagement />}
        {activeTab === 'routes' && <RouteManagement />}
        {activeTab === 'users' && <UserManagement />}
      </div>
    </div>
  );
}

