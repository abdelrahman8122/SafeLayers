import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '../utils/api';

const BalanceContext = createContext(null);

export const BalanceProvider = ({ children }) => {
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const refreshAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      const { data } = await api.get('/accounts');
      setAccounts(data.accounts || []);
    } catch (_) {}
    finally { setLoadingAccounts(false); }
  }, []);

  const getChecking = () => accounts.find(a => a.type === 'checking');
  const getSavings  = () => accounts.find(a => a.type === 'savings');
  const getLoan     = () => accounts.find(a => a.type === 'loan');

  const fmt = (n) => 'EGP ' + Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

  return (
    <BalanceContext.Provider value={{ accounts, loadingAccounts, refreshAccounts, getChecking, getSavings, getLoan, fmt }}>
      {children}
    </BalanceContext.Provider>
  );
};

export const useBalance = () => useContext(BalanceContext);
