const themePicker = document.getElementById('color-theme-selector');
const mobileThemePicker = document.getElementById('mobile-color-theme-selector');

document.addEventListener('DOMContentLoaded', () => {
  const selectedTheme = localStorage.getItem('theme');
  if (selectedTheme) {
    themePicker.value = selectedTheme;
    mobileThemePicker.value = selectedTheme;
  }
});

themePicker.addEventListener('change', (e) => changeTheme(e));
mobileThemePicker.addEventListener('change', (e) => changeTheme(e));

function changeTheme(e) {
  const val = e.target.value;
  localStorage.removeItem('theme');
  if (val !== 'system') {
    localStorage.setItem('theme', val);
  }
  themePicker.value = val;
  mobileThemePicker.value = val;
}
