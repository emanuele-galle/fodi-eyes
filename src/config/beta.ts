export const BETA_MODE = typeof window !== 'undefined'
  && localStorage.getItem('fodi-eyes-beta-mode') === 'true';
