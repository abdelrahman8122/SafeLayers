export const sanitizeTextInput = (value = '') => value.replace(/[<>]/g, '');
