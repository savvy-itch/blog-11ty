const expPara = document.getElementById('years-of-exp');
const startDate = new Date('2022-05-01');

function calcYearsOfExperience() {
  const currYears = Math.round((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  expPara.textContent = currYears;
}

calcYearsOfExperience();
