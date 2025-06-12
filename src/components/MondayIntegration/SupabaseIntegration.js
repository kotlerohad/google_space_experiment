import React, { useState, useEffect, useCallback } from 'react';
import supabaseService from '../../services/supabaseService';

const SupabaseIntegration = ({ onMessageLog, config }) => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyContacts, setCompanyContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadCompanyContacts = useCallback(async (companyId) => {
    setIsLoading(true);
    setError(null);
    try {
      onMessageLog?.(`Loading contacts for company ${companyId}...`, 'info');
      const contacts = await supabaseService.getContacts({ company_id: companyId });
      setCompanyContacts(contacts);
      onMessageLog?.(`Loaded ${contacts.length} contacts`, 'success');
    } catch (err) {
      setError(err.message);
      onMessageLog?.(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [onMessageLog]);

  const loadCompanies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      onMessageLog?.('Loading companies from Supabase...', 'info');
      const companiesData = await supabaseService.getCompanies();
      setCompanies(companiesData);
      onMessageLog?.(`Loaded ${companiesData.length} companies`, 'success');
    } catch (err) {
      const errorMsg = `Failed to load companies: ${err.message}`;
      setError(errorMsg);
      onMessageLog?.(errorMsg, 'error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [onMessageLog]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const handleCompanySelect = (company) => {
    setSelectedCompany(company);
    loadCompanyContacts(company.id);
  };

  const createTestContact = async () => {
    if (!selectedCompany) {
      onMessageLog?.('Please select a company first.', 'error');
      return;
    }
    try {
      setIsLoading(true);
      const contactData = {
        name: `Test Contact - ${new Date().toLocaleString()}`,
        company_id: selectedCompany.id,
      };
      const newContact = await supabaseService.createContact(contactData);
      onMessageLog?.(`Created test contact: ${newContact[0].name}`, 'success');
      loadCompanyContacts(selectedCompany.id);
    } catch (err) {
      onMessageLog?.(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Supabase Integration</h3>
          <p className="text-sm text-gray-500">Manage your companies and contacts</p>
        </div>
        <button
          onClick={loadCompanies}
          disabled={isLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-2"
        >
          {isLoading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : '🔄'}
          Refresh
        </button>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium mb-3">Available Companies ({companies.length})</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {companies.map((company) => (
            <button
              key={company.id}
              onClick={() => handleCompanySelect(company)}
              className={`p-3 rounded-lg border text-left transition-colors ${selectedCompany?.id === company.id ? 'bg-blue-100 border-blue-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
            >
              <div className="font-medium">{company.name}</div>
              <div className="text-sm text-gray-500">ID: {company.id}</div>
            </button>
          ))}
        </div>
      </div>

      {selectedCompany && (
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Company: {selectedCompany.name} ({companyContacts.length} contacts)</h4>
            <button
              onClick={createTestContact}
              disabled={isLoading}
              className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:bg-green-300 text-sm"
            >
              + Create Test Contact
            </button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {companyContacts.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div>
                  <div className="font-medium text-sm">{item.name}</div>
                  <div className="text-xs text-gray-500">ID: {item.id}</div>
                </div>
              </div>
            ))}
            {companyContacts.length === 0 && !isLoading && <div className="text-center py-4 text-gray-500">No contacts in this company</div>}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      )}
    </div>
  );
};

export default SupabaseIntegration; 