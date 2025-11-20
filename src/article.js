const codeBlocks = document.querySelectorAll('.code-block');
const shareCopyLinkBtn = document.getElementById('share-copy-link');
const shareBtn = document.getElementById('share-btn');
const shareLinkList = document.getElementById('share-links-list');
const upBtn = document.getElementById('up-btn');
const contentSectionLinks = document.querySelectorAll('.content-table a');
const sectionHeadings = document.querySelectorAll('.article-subheading');
const windowHeight = window.innerHeight;
const datePara = document.getElementById("pub-date");

document.addEventListener("DOMContentLoaded", () => {
  // if (datePara) {
  //   const date = datePara.textContent;
  //   date.to
  //   if (textContent) {

  //   }
  // }
});

codeBlocks.forEach(blockElem => appendCodeCopyBtn(blockElem));

function appendCodeCopyBtn(blockElem) {
  if (blockElem) {
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
  }
}

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

contentSectionLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    for (const heading of sectionHeadings) {
      if (heading.id === link.hash.slice(1)) {
        heading.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  });
});

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => setCurrentSectionHeading(entry));
}, { rootMargin: '0% 0% -50% 0%' });

function setCurrentSectionHeading(entry) {
  const link = document.querySelector(`a[href="#${entry.target.id}"]`);
  if (entry.isIntersecting) {
    contentSectionLinks.forEach(link => link.setAttribute('aria-current', 'false'));
    link.setAttribute('aria-current', 'true');
  } else {
    link.setAttribute('aria-current', 'false');
  }
}

sectionHeadings.forEach(h => {
  observer.observe(h);
});
