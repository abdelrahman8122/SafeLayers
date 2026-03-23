import { useState, useEffect } from 'react';

const STORAGE_KEY = 'safelayers_favorites';

const COLORS = ['#1D4ED8','#15803D','#7C3AED','#B91C1C','#0F766E','#D97706','#0369A1','#9D174D'];

export const useFavorites = () => {
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const addFavorite = (name, account) => {
    if (favorites.find(f => f.account === account)) return; // already exists
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const color = COLORS[favorites.length % COLORS.length];
    setFavorites(prev => [...prev, { name, account, initials, color }]);
  };

  const removeFavorite = (account) => {
    setFavorites(prev => prev.filter(f => f.account !== account));
  };

  const isFavorite = (account) => favorites.some(f => f.account === account);

  return { favorites, addFavorite, removeFavorite, isFavorite };
};
