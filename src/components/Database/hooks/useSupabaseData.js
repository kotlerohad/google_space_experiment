import { useState, useEffect, useCallback } from 'react';
import supabaseService from '../../../services/supabaseService';
import { TABLE_CONFIG } from '../config/tableConfig';

export const useSupabaseData = (tableName, isConfigLoaded, onMessageLog, searchFilter = '') => {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchData = useCallback(async (page = 1, append = false) => {
    if (!isConfigLoaded || !supabaseService.isConnected()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      onMessageLog?.(`Loading ${tableName} from Supabase (page ${page})...`, 'info');
      
      const config = TABLE_CONFIG[tableName];
      const limit = 50;
      const offset = (page - 1) * limit;
      
      let query;
      let countQuery;
      
      // Handle special queries for tables that need JOINs
      if (tableName === 'companies') {
        query = supabaseService.supabase
          .from('companies')
          .select(`
            id,
            name,
            company_type_id,
            country,
            source,
            priority,
            last_chat,
            status,
            comments,
            created_at,
            updated_at,
            contacts(id, name, email)
          `);
        
        countQuery = supabaseService.supabase
          .from('companies')
          .select('id', { count: 'exact', head: true });
      } else if (tableName === 'contacts') {
        query = supabaseService.supabase
          .from('contacts')
          .select(`
            id,
            name,
            email,
            title,
            contact_status,
            source,
            priority,
            last_chat,
            comments,
            created_at,
            updated_at,
            linkedin_url,
            linkedin_connection_status,
            companies!inner(name)
          `);
        
        countQuery = supabaseService.supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true });
        
        // Apply search filter if set
        if (searchFilter) {
          const filterCondition = `name.ilike.%${searchFilter}%,email.ilike.%${searchFilter}%`;
          query = query.or(filterCondition);
          countQuery = countQuery.or(filterCondition);
        }
      } else if (tableName === 'activities') {
        query = supabaseService.supabase
          .from('activities')
          .select(`
            id,
            name,
            status,
            priority,
            next_step,
            next_step_due_date,
            created_at,
            updated_at
          `);
        countQuery = supabaseService.supabase
          .from('activities')
          .select('id', { count: 'exact', head: true });
      } else if (tableName === 'triage_results') {
        query = supabaseService.supabase
          .from('triage_results')
          .select(`
            id,
            decision,
            confidence,
            action_reason,
            email_from,
            created_at,
            updated_at,
            contact_context
          `);
        countQuery = supabaseService.supabase
          .from('triage_results')
          .select('id', { count: 'exact', head: true });
      } else {
        query = supabaseService.supabase.from(tableName).select('*');
        countQuery = supabaseService.supabase
          .from(tableName)
          .select('id', { count: 'exact', head: true });
      }
      
      // Apply ordering
      if (config.orderBy) {
        query = query.order(config.orderBy, { ascending: config.orderDirection === 'asc' });
      }
      
      // Apply pagination
      query = query.range(offset, offset + limit - 1);
      
      // Execute both queries in parallel
      const [{ data, error }, { count, error: countError }] = await Promise.all([
        query,
        countQuery
      ]);
      
      if (error) throw error;
      if (countError) throw countError;
      
      // Transform data for tables with JOINs to flatten related names
      let transformedData = data || [];
      if (tableName === 'companies') {
        transformedData = data.map(company => ({
          ...company,
          contacts: company.contacts?.map(c => c.name).join(', ') || 'No contacts'
        }));
      } else if (tableName === 'contacts') {
        transformedData = data.map(contact => ({
          ...contact,
          company_name: contact.companies?.name || 'No Company'
        }));
      } else if (tableName === 'triage_results') {
        transformedData = data.map(triage => {
          let contactName = 'Unknown Contact';
          
          // Extract contact name from contact_context
          if (triage.contact_context && triage.contact_context.name) {
            contactName = triage.contact_context.name;
          } else if (triage.contact_context && triage.contact_context.email) {
            contactName = triage.contact_context.email;
          } else if (triage.email_from) {
            // Try to extract a readable name from the email_from field
            const emailMatch = triage.email_from.match(/^(.+?)\s*<(.+)>$/);
            if (emailMatch) {
              const [, name, email] = emailMatch;
              contactName = name.trim().replace(/['"]/g, '') || email;
            } else {
              contactName = triage.email_from;
            }
          } else {
            contactName = `Email ID: ${triage.id.substring(0, 8)}...`;
          }
          
          return {
            ...triage,
            contact_name: contactName
          };
        });
      }
      
      // Update pagination state
      setCurrentPage(page);
      setTotalRecords(count || 0);
      setHasNextPage((count || 0) > page * limit);
      
      // Either append to existing records or replace them
      if (append && page > 1) {
        setRecords(prev => [...prev, ...transformedData]);
      } else {
        setRecords(transformedData);
      }
      
      onMessageLog?.(`Loaded ${transformedData?.length || 0} records from ${tableName} (page ${page}, total: ${count || 0})`, 'success');
    } catch (err) {
      const errorMsg = `Failed to load ${tableName}: ${err.message}`;
      setError(errorMsg);
      onMessageLog?.(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [tableName, isConfigLoaded, onMessageLog, searchFilter]);

  // Load data when dependencies change
  useEffect(() => {
    if (isConfigLoaded) {
      setCurrentPage(1);
      setHasNextPage(false);
      setTotalRecords(0);
      fetchData(1);
    }
  }, [fetchData, isConfigLoaded]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isLoading) {
      fetchData(currentPage + 1, true);
    }
  }, [hasNextPage, isLoading, currentPage, fetchData]);

  const refresh = useCallback(() => {
    setCurrentPage(1);
    setHasNextPage(false);
    setTotalRecords(0);
    fetchData(1);
  }, [fetchData]);

  return {
    records,
    isLoading,
    error,
    currentPage,
    hasNextPage,
    totalRecords,
    loadMore,
    refresh
  };
};