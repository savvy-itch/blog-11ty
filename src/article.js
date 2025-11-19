const codeBlocks = document.querySelectorAll('.code-block');
const shareCopyLinkBtn = document.getElementById('share-copy-link');
const shareBtn = document.getElementById('share-btn');
const shareLinkList = document.getElementById('share-links-list');
const upBtn = document.getElementById('up-btn');
const contentSectionLinks = document.querySelectorAll('.content-table a');
const sectionHeadings = document.querySelectorAll('.article-subheading');
const windowHeight = window.innerHeight;

codeBlocks.forEach(blockElem => {
  const copyBtn = document.createElement('button');
  copyBtn.classList.add('copy-to-clipboard-btn');
  copyBtn.innerHTML = `
    <img class="copy-to-clipboard-icon show" src="/public/images/clipboard-icon.svg" alt="copy to clipboard icon">
    <img class="success-copy-icon" src="/public/images/check.svg" alt="successful copy to clipboard icon">
    <img class="fail-copy-icon" src="/public/images/x.svg" alt="failed copy to clipboard icon">
    `;
  blockElem.appendChild(copyBtn);
  copyBtn.addEventListener('click', (e) => {
    getCodeContent(e.currentTarget);
  });
});

async function getCodeContent(copyBtn) {
  const codeBlockElem = copyBtn.parentElement.querySelector('code');
  const copyIcon = copyBtn.querySelector('.copy-to-clipboard-icon');
  try {
    await navigator.clipboard.writeText(codeBlockElem.innerText);
    const successIcon = copyBtn.querySelector('.success-copy-icon');
    animateCopyBtn(copyBtn, copyIcon, successIcon);
  } catch (error) {
    console.error(error.message);
    const xIcon = copyBtn.querySelector('.fail-copy-icon');
    animateCopyBtn(copyBtn, copyIcon, xIcon);
  }
}

function animateCopyBtn(copyBtn, copyIcon, statusIcon) {
  copyIcon.classList.toggle('show');
  statusIcon.classList.toggle('show');
  copyBtn.setAttribute('disabled', 'true');
  setTimeout(() => {
    copyIcon.classList.toggle('show');
    statusIcon.classList.toggle('show');
    copyBtn.removeAttribute('disabled');
  }, 1000);
}