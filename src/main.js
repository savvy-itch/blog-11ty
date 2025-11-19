const themePicker = document.getElementById('color-theme-selector');

document.addEventListener('DOMContentLoaded', () => {
  const selectedTheme = localStorage.getItem('theme');
  if (selectedTheme) {
    themePicker.value = selectedTheme;
  }
});

themePicker.addEventListener('change', () => {
  localStorage.removeItem('theme');
  if (themePicker.value !== 'system') {
    localStorage.setItem('theme', themePicker.value);
  }
});
