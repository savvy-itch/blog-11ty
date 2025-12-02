const codeBlocks = document.querySelectorAll('.code-block');
const shareCopyLinkBtn = document.getElementById('share-copy-link');
const shareBtn = document.getElementById('share-btn');
const shareLinkList = document.getElementById('share-links-list');
const upBtn = document.getElementById('up-btn');
const contentSectionLinks = document.querySelectorAll('aside .content-table-list a');
const sectionHeadings = document.querySelectorAll('.article-subheading');
const windowHeight = window.innerHeight;

codeBlocks.forEach(blockElem => appendCodeCopyBtn(blockElem));

function appendCodeCopyBtn(blockElem) {
  if (blockElem) {
    const copyBtn = document.createElement('button');
    copyBtn.classList.add('copy-to-clipboard-btn');
    copyBtn.innerHTML = `
      <img class="copy-to-clipboard-icon show" src="/public/images/clipboard-icon.svg" alt="copy to clipboard icon" loading="lazy" decoding="async" />
      <img class="success-copy-icon" src="/public/images/check.svg" alt="successful copy to clipboard icon" loading="lazy" decoding="async" />
      <img class="fail-copy-icon" src="/public/images/x.svg" alt="failed copy to clipboard icon" loading="lazy" decoding="async" />
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

const observer = new IntersectionObserver(entries => {
  const visibleEntries = entries
    .filter(e => e.isIntersecting)
    .sort((a, b) => a.boundingClientRect.bottom - b.boundingClientRect.bottom);
  if (visibleEntries.length > 0) {
    setCurrentSectionHeading(visibleEntries[0]);
  }
}, { rootMargin: '0% 0% -50% 0%' });

function setCurrentSectionHeading(entry) {
  const link = [...contentSectionLinks].find(a => a.hash === `#${entry.target.id}`);
  contentSectionLinks.forEach(l => {
    if (l === link) {
      l.setAttribute('aria-current', 'true');
    } else {
      l.setAttribute('aria-current', 'false')
    }
  });
}

sectionHeadings.forEach(h => {
  observer.observe(h);
});

shareCopyLinkBtn.addEventListener('click', async (e) => {
  e.stopPropagation();
  const link = shareCopyLinkBtn.dataset.link;
  try {
    await navigator.clipboard.writeText(link);
    shareCopyLinkBtn.querySelector('span').textContent = 'Copied!';
  } catch (error) {
    console.error();
    shareCopyLinkBtn.querySelector('span').textContent = 'Error';
  }
});

shareBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  shareLinkList.classList.toggle('show');
  shareCopyLinkBtn.querySelector('span').textContent = 'Copy Link';
});

document.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!shareLinkList.contains(e.target)
    && e.target !== shareBtn
    && shareLinkList.classList.contains('show')) {
    shareLinkList.classList.remove('show');
    shareCopyLinkBtn.querySelector('span').textContent = 'Copy Link';
  }
});

upBtn.addEventListener('click', scrollToTop);

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

window.addEventListener('scroll', () => {
  handleUpBtnDisplay();
});

function handleUpBtnDisplay() {
  if (window.scrollY > windowHeight) {
    upBtn.classList.add('show-btn');
  } else {
    upBtn.classList.remove('show-btn');
  }
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

// function calcReadingTime() {
//   let words = 0;
//   for (const el of wrapper.children) {
//     words += el.textContent.split(' ').length;
//   }
// }
