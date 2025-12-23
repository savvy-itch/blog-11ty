---
title: Building site-blocking cross-browser extension
date: '2025-12-02'
tags: ['TypeScript']
time_to_read: 27
table_of_contents:
    - text: Preface
      href: "#preface"
    - text: Setting up the project
      href: "#set-up"
      children:
        - text: Creating the manifest
          href: "#create-manifest"
    - text: Creating main input form
      href: "#create-form"
    - text: Handling URL block
      href: "#url-block"
      children:
        - text: Handling SPA block
          href: "#spa"
    - text: Creating options page
      href: "#create-options-page"
      children:
        - text: Edit & delete functionality
          href: "#edit-delete"
    - text: Implementing strict mode
      href: "#implement-strict-mode"
    - text: Conclusion
      href: "#conclusion"
---

<h2 id="preface" class="article-subheading">Preface</h2>

Just like a lot of people, I struggle with focusing on different tasks, especially with the Internet being the omnipresent distractor. Luckily, as a programmer, I've developed great problem-creating skills, so I decided that, instead of looking for a better existing solution, I'd create my own browser extension that would block the websites users want to restrict access to. This isn't meant as a comprehensive tutorial, but rather a collection of thoughts, decisions and technical quirks I've stumbled across during development of this extension.

First, let's outline the requirements and main features. The extension must:
- be cross-browser.
- block websites from the blacklist.
- allow to choose a blocking option: either block the entire domain with its subdomains or block just one specific URL.
- provide ability to disable a blocked website without deleting it from the blacklist.
- provide an option to automatically restrict access if the user relapses or forgets to re-enable disabled URLs (helpful for people with ADHD).

<h2 id="set-up" class="article-subheading">Setting up the project</h2>

First, here's the stack I chose:
- **TypeScript**: I opted for TS over JS due to numerous unfamiliar APIs for extensions that would make hard to go without the autocomplete feature.
- **Webpack**: Easier to use in this context compared to **tsc** for TS compilation. Besides, I encountered problems generating browser-compliant JS with **tsc**.
- **CSS**: Vanilla CSS matched my goal for simplicity, smaller bundle size, and minimal dependencies. Also, I felt anything else would be an overkill for an extension with only a couple of pages. For those reasons I also decided against using tools like **React** or specific extension-building frameworks.
- **Playwright**: testing framework that proved to be one of the few ones capable of running content scripts, which is integral for the majority of features of this extension.  

The main distinction of extension development from regular web dev is that extensions rely on service workers, content scripts, and messaging between them.

<h3 id="create-manifest" class="article-subheading">Creating the Manifest</h3>

To support cross-browser functionality, I created two manifest files:
- **manifest.chrome.json**: for Chrome's **Manifest v3** requirement.
- **manifest.firefox.json**: for Firefox, which better supports **Manifest v2**.

Here's some differences between the 2 files:

**manifest.chrome.json**:
```json
{
  "action": {
    "default_title": "Show form"
  },
  "incognito": "split",
  "host_permissions": ["*://*/"], // get access to all URLs
  "background": {
    "service_worker": "background.js"
  },
}
```

**manifest.firefox.json**:
```json
{
  "browser_action": {
    "default_title": "Show form"
  },
  "background": {
    "scripts": [
      "background.js"
    ],
    "persistent": false
  },
}
```

Chrome required `"incognito": "split",` property to work properly in incognito mode while Firefox worked fine without it.

Here's the basic file structure of the extension:
```bash
dist/
node_modules/
src/
|-- background.tsc
|-- content.ts
static/
|-- manifest.chrome.json
|-- manifest.firefox.json
package.json
tsconfig.json
webpack.config.js
```

Now let's talk about how the extension is supposed to work. The user should be able to call some kind of a form to submit the URL he wants to block. When he accesses a URL, the extension will intercept the request to check whether it should be blocked or allowed. It also needs some sort of options page where a user could see the list of all blocked URLs and be able to add, edit, disable, or delete a URL from the list.

<h2 id="create-form" class="article-subheading">Creating main input form</h2>

The form appears by injecting HTML/CSS into the current page when the user clicks on the extension icon or types the keyboard shortcut. There are different ways to display a form, like calling a pop-up, but it has limited customization options for my taste. The background script looks like this:

**background.ts**:
```ts
import browser, { DeclarativeNetRequest } from 'webextension-polyfill';

// on icon click
const action = chrome.action ?? browser.browserAction; // Manifest v2 only has browserAction method
action.onClicked.addListener(tab => {
  triggerPopup(tab as browser.Tabs.Tab);
});

// on shortcut key press 
browser.commands.onCommand.addListener(command => {
  if (command === 'trigger_form') {
    browser.tabs.query({ active: true, currentWindow: true })
      .then((tabs) => {
        const tab = tabs[0];
        if (tab) {
          triggerPopup(tab);
        }
      })
      .catch(error => console.error(error));
  }
});

function triggerPopup(tab: browser.Tabs.Tab) {
  if (tab.id) {
    const tabId = tab.id;
    browser.scripting.insertCSS(({
      target: { tabId },
      files: ['global.css', './popup.css'],
    }))
      .then(() => {
        // execute the content script
      })
      .catch(error => console.error(error));
  }
}
```

**Note:** Injecting HTML into every page can lead to unpredictable results because it is hard to predict how different styles of web pages are going to affect the form. A better alternative seems to be [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM) as it creates its own scope for styles. Definitely a potential improvement I'd like to work on in the future.

For browser compatibility I used [webextension-polyfill](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Build_a_cross_browser_extension#api_asynchronous_event_handling) so that I didn't have to write separate extensions for different versions of manifest.

The process of injecting the form is a straightforward DOM manipulation, but note that each element must be created individually as opposed to applying one template literal to an element. Although more verbose and tedious, this method avoids `Unsafe HTML injection` warnings I'd get otherwise.

**content.ts:**
```ts
async function showPopup() {
  const body = document.body;
  const formExists = document.getElementById('extension-popup-form');
  if (!formExists) {
    const msg: GetCurrentUrl = { action: 'getCurrentUrl' };

    try {
      const res: ResToSend = await browser.runtime.sendMessage(msg);

      if (res.success && res.url) {
        const popupForm = document.createElement('form');
        popupForm.classList.add('extension-popup-form');
        popupForm.id = 'extension-popup-form';
        body.appendChild(popupForm);
        /* Create every child element the same way as above */

        popupForm.addEventListener('submit', (e) => {
          e.preventDefault();
          handleFormSubmission(popupForm, handleSuccessfulSubmission);
        });
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            if (popupForm && popupForm.parentNode === body) {
              body.removeChild(popupForm);
            }
          }
        });
      }
    } catch (error) {
      console.error(error);
    }
  }
}

function handleSuccessfulSubmission() {
  hidePopup();
  setTimeout(() => {
    window.location.reload();
  }, 100); // wait a little bit in order to see the changes
}

function hidePopup() {
  const popup = document.getElementById('extension-popup-form');
  popup && document.body.removeChild(popup);
}
```

This will display the form in the browser that looks like this:

<figure>
  <img src="/public/images/2025-11-25/1.1.webp" alt="Main form display" title="Main form display" loading="lazy" decoding="async" />
</figure> 

At this point it worth taking a look at my Webpack configuration since configuration is usually the most annoying step:

**webpack.config.ts:**
```ts
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const targetBrowser = process.env.TARGET_BROWSER || 'chrome';

module.exports = {
  mode: "development",
  entry: {
    background: './src/background.ts',
    content: './src/content.ts'
    /* other scripts */
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    clean: true // Clean the output directory before emit.
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  devtool: 'cheap-module-source-map', // Avoids eval in source maps
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: `static/manifest.${targetBrowser}.json`,
          to: 'manifest.json'
        },
        {
          from: 'static',
          globOptions: { ignore: ['**/manifest.*.json'] }
        },
        {
          from: 'node_modules/webextension-polyfill/dist/browser-polyfill.js'
        }
      ],
    })
  ]
};
```

Basically, it takes the browser name from the environment variable of the command I run to choose between 2 of the manifest files and compiles the right version of TypeScript code into `dist/` directory.

My build commands in `package.json` are:

```json
{
"scripts": {
    "build:chrome": "cross-env TARGET_BROWSER=chrome webpack --config webpack.config.js",
    "build:firefox": "cross-env TARGET_BROWSER=firefox webpack --config webpack.config.js",
  },
}
```

<h2 id="url-block" class="article-subheading">Handling URL block</h2>

Now that the main form is ready, time to submit it. To implement blocking functionality, I leveraged [declarativeNetRequest API](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest) and [dynamic rules](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest#dynamic-and-session-rules). The rules are going to be stored in the extension's storage. Manipulating dynamic rules is only possible in the service worker file, so to exchange data between the service worker and the content scripts, I send messages between them with necessary data. Since there are quite a few types of operations needed for this extension, I created types for every action. For example:

**types.ts**:
```ts
export interface AddAction {
  action: "blockUrl",
  url: string,
  blockDomain: boolean
}
// other actions look very similar

export type Action = AddAction | DeleteAction | DeleteAllAction | GetAllAction | GetCurrentUrl | UpdateAction
```

Since it's reasonable to be able to add new URLs both from the main form and from the options page, I made a reusable function for that:

**helpers.ts**:
```ts
import browser from 'webextension-polyfill';
import { AddAction, ResToSend } from "./types";
import { forbiddenUrls, maxUrlLength, minUrlLength } from './globals';

export async function handleFormSubmission(urlForm: HTMLFormElement, successFn: Function) {
  if (urlForm && successFn) {
    const formData = new FormData(urlForm);
    const urlToBlock = formData.get('url') as string;
    const blockDomain = (document.getElementById('block-domain') as HTMLInputElement).checked;

    if (!urlToBlock || forbiddenUrls.some(url => url.test(urlToBlock))) { // forbiddenUrls includes browser-specific pages like chrome://, etc.
      console.error(`Invalid URL: ${urlToBlock}`);
      return;
    } else if (urlToBlock.length < minUrlLength) {
      console.error(`URL is too short`);
      return;
    } else if (urlToBlock.length > maxUrlLength) {
      console.error(`URL is too long`);
      return;
    }

    const msg: AddAction = { action: "blockUrl", url: urlToBlock, blockDomain };

    try {
      const res: ResToSend = await browser.runtime.sendMessage(msg);
      if (res.success) {
        if (res.status === 'added') {
          successFn();
        } else if (res.status === 'duplicate') {
          alert('URL is already blocked');
        }
      }
    } catch (error) {
      console.error(error);
    }
  }
}
```

I'm calling `handleFormSubmission()` to validate the provided URL and send it to the service worker to add it to the blacklist.

**Note:** Dynamic rules have set max size that needs to be taken into account. Passing an overly long URL string will lead to unexpected behaviour when trying to save the dynamic rule for it. I found that for my purposes a 75-character-long URL was a good max length for a rule.

Here's how the service worker processes the received message:

**background.ts**:
```ts
import { Action, NewRule, ResToSend, Site } from "./types";

browser.runtime.onMessage.addListener(async (msg, sender) => {
  if (msg.action === 'blockUrl') {
    const blackList = await getRules();
    const normalizedUrl = msg.url?.replace(/^https?:\/\//, '').replace(/\/$/, ''); // remove the protocol and the last slash
    const urlToBlock = `^https?:\/\/${normalizedUrl}\/?${msg.blockDomain ? '.*' : '$'}`;

    if (blackList.some(site => site.url === urlToBlock)) {
      return { success: true, status: "duplicate", msg: 'URL is already blocked' };
    }

    let newId = Number(nanoid());
    let isUnique = !blackList.some(rule => rule.id === newId);
    while (isUnique === false) {
      newId = Number(nanoid());
      isUnique = !blackList.some(rule => rule.id === newId);
    }

    const newRule: NewRule = {
      id: newId,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: {
          regexSubstitution: `${browser.runtime.getURL("blocked.html")}?id=${newId}`
        }
      },
      condition: {
        regexFilter: urlToBlock,
        resourceTypes: ["main_frame" as DeclarativeNetRequest.ResourceType]
      }
    };

    try {
      browser.declarativeNetRequest.updateDynamicRules({
        addRules: [newRule],
        removeRuleIds: []
      });
      const res: ResToSend = { success: true, status: "added", msg: 'URL has been saved' };
      return res;
    } catch (error) {
      console.error('Error updating rules:', error);
      return { success: false, error };
    }
  } else {
    // will throw error if type doesn't match any existing actions
    const exhaustiveCheck: never = msg;
    throw new Error('Unhandled action');
  }
});
```

For submission I create a new rule object and update the dynamic rules to include it. A simple conditional regex allows me to choose between blocking the entire domain or just the specified URL.

After finishing, I send back the response message to the content script. Note on IDs: the amount of dynamic rules is [limited](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest#session-rules) - 5000 for older browsers and 30000 for newer ones. Unable to enforce IDs to be less than 4999, I restricted them to 3-digit numbers (0-999). This reduced the extension’s rule capacity from 5000 to 1000, which is a significant cut, but on the other hand - acceptable given the low likelihood of a user needing to block over a thousand websites.

Now the user is able to add new URLs to the blacklist and choose the block mode he wants to assign to them. Accessing a blocked resource redirects to the block page:

<figure>
  <img src="/public/images/2025-11-25/1.2.webp" alt="Block page" title="Block page" loading="lazy" decoding="async" />
</figure>

<h3 id="spa" class="article-subheading">Handling SPA block</h3>

However, there's still one edge case left that needs to be addressed. The extension blocks any unwanted URLs if the user accesses it directly. But if the website is an SPA with client-side redirection, the extension won't catch the forbidden URLs there. To handle this case, I updated my `background.ts` to listen the current tab and see if the URL has changed. When it happens, I manually check whether the URL is in the blacklist, and if it is, I redirect the user.

**background.ts**:
```ts
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || changeInfo.url) { 
    if (changeInfo.url) {
      const blackList = await getRules();
      blackList.forEach(rule => {
        const regex = new RegExp(rule.url);
        if (regex.test(changeInfo.url) && rule.isActive) {
          browser.tabs.update(tabId, { url: browser.runtime.getURL('blocked.html') });
          return;
        }
      })
    }
    return true;
  }
});
```

Now the extension correctly blocks URLs accessed directly and through SPAs.

<h2 id="create-options-page" class="article-subheading">Creating options page</h2>

The options page has a simple interface, as shown below:

<figure>
  <img src="/public/images/2025-11-25/1.3.webp" alt="Options page" title="Options page" loading="lazy" decoding="async" />
</figure>

This is the page with the main bulk of features like editing, deleting, disabling, and applying strict mode. Here's how I wired it.

<h3 id="edit-delete" class="article-subheading">Edit & delete functionality</h3>

Editing was probably the most complex task. When editing, I collect the IDs of the edited URLs into an array. Upon saving, I create the updated dynamic rules that I pass to the service worker to apply changes. After every saved change or reload, I re-fetch the dynamic rules and render them in the table. Below is the simplified version of it:

**options.ts**:
```ts
async function saveChanges() {
  let updatedRules: NewRule[] = [];

  if (editedRulesIds.size === 0) {
    await displayUrlList();
    alert('No changes were made');
    return;
  }

  const rulesToStore: RuleInStorage[] = [];
  for (const elem of editedRulesIds) {
    /*
    1. (...) Get the HTML element (table row) of an updated URL
    2. (...) Gather the data required for a dynamic rule creation
    3. Store the new rules in an updatedRules array
    */

    const updatedRule: NewRule = {
      id: rowId,
      priority: 1,
      action: {
        type: 'allow'
      },
      condition: {
        regexFilter: urlToBlock,
        resourceTypes: ["main_frame" as DeclarativeNetRequest.ResourceType]
      }
    };

    updatedRules.push(updatedRule);
  }

  const msg: UpdateAction = { action: 'updateRules', updatedRules };
  const res: ResToSend = await browser.runtime.sendMessage(msg);
  const updatedLimit = limitVal - disabledRules;
  submitChanges(res, rulesToStore, updatedLimit, strictModeOn);
}
```

Updating the rules and retrieving the rules - those are 2 more operation to add to the background listener:

**background.ts:**
```ts
browser.runtime.onMessage.addListener(async (message, sender) => {
  const msg = message as Action;
  if (msg.action === 'blockUrl') {
    // logic for adding URL to blacklist
  } else if (msg.action === 'getRules') {
    const blackList = await getRules();
    return { success: true, status: "getRules", rules: blackList };
  } else if (msg.action === 'updateRules') {
    const uniqueFilters = new Map<string, number>(); // <url, id>
    const filteredRules: NewRule[] = [];
    const blackList = await getRules();

    // remove the rules if their updated versions became duplicates
    const rulesToRemove: number[] = [];
    msg.updatedRules.forEach(rule => {
      if (uniqueFilters.has(rule.condition.regexFilter)) {
        // if a duplicate occurs
        if (uniqueFilters.get(rule.condition.regexFilter) === rule.id) {
          // remove the new duplicate rule
          filteredRules.push(rule);
        }
      } else {
        filteredRules.push(rule);
      }
      rulesToRemove.push(rule.id);
    });

    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: rulesToRemove,
      addRules: filteredRules
    });
    const storedRules = await getRules();
    return { success: true, status: "updated", msg: 'Rules updated', rules: storedRules };
  } else {
    const exhaustiveCheck: never = msg;
    throw new Error('Unhandled action');
  }
});
```

The updating functionality was a bit tricky to get right because there's an edge case when an edited URL becomes a duplicate of an existing rule. Other than that, it's the same spiel - update the dynamic rules and send the appropriate message upon completion.

Deleting URLs was the easiest task. There are 2 types of deletion in this extension: deletion of a specific rule and deletion of all rules. 

**options.ts:**
```ts
async function deleteRule(id: number) {
  const msg: DeleteAction = { action: "deleteRule", deleteRuleId: id };
  const res: ResToSend = await browser.runtime.sendMessage(msg);
  try {
    if (res.success) {
      await displayUrlList(); // Re-fetch rules
    }
  } catch (error) {
    console.error(res.error);
    alert('Could not delete the URL.')
  }
}

async function deleteRules() {
  const msg: DeleteAllAction = { action: 'deleteAll' };
  try {
    const res: ResToSend = await browser.runtime.sendMessage(msg);
    if (res.success) {
      alert('All rules have been deleted');
    }
  } catch (error) {
    console.error(error);
    alert('Could not delete the URLs.');
  }
}
```

And, just like before, I added 2 more actions to the service worker listener:

**background.ts:**
```ts
browser.runtime.onMessage.addListener(async (message, sender) => {
  const msg = message as Action;
  if (msg.action === 'blockUrl') {
    // (...) logic for adding URL to blacklist
  } else if (msg.action === 'getRules') {
    // (...) logic for retrieving all rules
  } else if (msg.action === 'deleteRule') {
    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [msg.deleteRuleId],
      addRules: []
    })
    return { success: true, status: "deletedRule", msg: `Rule ${msg.deleteRuleId} has been deleted` };
  } else if (msg.action === 'deleteAll') {
    const existingRules = await browser.declarativeNetRequest.getDynamicRules();
    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRules.map(rule => rule.id),
      addRules: []
    });
    return { success: true, status: "deleted", msg: 'All rules have been deleted' };
  } else if (msg.action === 'updateRules') {
    // (...) logic for updating edited rules
  } else {
    const exhaustiveCheck: never = msg;
    throw new Error('Unhandled action');
  }
});
```

<h2 id="implement-strict-mode" class="article-subheading">Implementing strict mode</h2>

The main feature of the extension is the ability to enforce disabled (allowed for access) rules blockage automatically for people who need more rigid control over their browsing habits. In strict mode, any disabled URL is re-enabled automatically after 1 hour. When strict mode is off, disabled URLs stay disabled until the user manually changes them.

To implement this feature, I used the extension's local storage to store an array of objects representing each disabled rule. Every object includes a rule ID, unblock date, and the URL itself. Any time a user accesses a new resource or refreshes the blacklist, the extension will first check the storage for expired rules and update them accordingly.

**options.ts:**
```ts
async function handleInactiveRules(isStrictModeOn: boolean) {
  if (!isStrictModeOn) {
    browser.storage.local.set({ inactiveRules: [] });
  } else {
    const msg: GetAllAction = { action: 'getRules' };
    const res: ResToSend = await browser.runtime.sendMessage(msg);
    try {
      if (res.success && res.rules) {
        const inactiveRulesToStore: RuleInStorage[] = [];
        const date = new Date();
        const unblockDate = new Date(date.getTime() + strictModeBlockPeriod).getTime();
        res.rules.forEach(rule => {
          if (!rule.isActive) {
            const urlToBlock = getUrlToBlock(rule.strippedUrl, rule.blockDomain);
            inactiveRulesToStore.push({ id: rule.id, unblockDate: unblockDate, urlToBlock })
          }
        });
        browser.storage.local.set({ inactiveRules: inactiveRulesToStore });
      }
    } catch (error) {
      console.error(error);
    }
  }
}
```

`isStrictModeOn` boolean is being stored in the storage as well. If it's true, I loop over all the rules and add to the storage those that are disabled with a newly created unblock time for them. Then on every response, I check the storage for any disabled rules, remove the expired ones if they exist, and update them:

**background.ts:**
```ts
async function checkInactiveRules() {
  const result = await browser.storage.local.get([storageRulesKey]);
  const inactiveRules = result.inactiveRules as RuleInStorage[];
  const allRules = await getRules();
  const rulesToUpdate: NewRule[] = [];

  // if there's no inactive rules
  if (!inactiveRules || inactiveRules.length === 0 || Object.keys(inactiveRules).length === 0) {
    return;
  };

  for (const rule of allRules) {
    if (!rule.isActive && !inactiveRules.some(r => r.id === rule.id)) {
      const updatedRule: NewRule = {
        id: rule.id,
        priority: 1,
        action: {
          type: 'redirect',
          redirect: {
            regexSubstitution: `${browser.runtime.getURL("blocked.html")}?id=${rule.id}`
          }
        },
        condition: {
          regexFilter: getUrlToBlock(rule.strippedUrl, rule.blockDomain),
          resourceTypes: ["main_frame" as DeclarativeNetRequest.ResourceType]
        }
      };
      rulesToUpdate.push(updatedRule);
    }
  }

  const currTime = new Date().getTime();
  const expiredRulesSet = new Set<number>();
  inactiveRules.forEach(rule => {
    if (rule.unblockDate < currTime) {
      const updatedRule: NewRule = {
        id: rule.id,
        priority: 1,
        action: {
          type: 'redirect',
          redirect: {
            regexSubstitution: `${browser.runtime.getURL("blocked.html")}?id=${rule.id}`
          }
        },
        condition: {
          regexFilter: rule.urlToBlock,
          resourceTypes: ["main_frame" as DeclarativeNetRequest.ResourceType]
        }
      };
      rulesToUpdate.push(updatedRule);
      expiredRulesSet.add(rule.id);
    }
  });

  browser.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: rulesToUpdate.map(rule => rule.id),
    addRules: rulesToUpdate
  })
    .then(() => {
      // remove rules with expired block time from the storage 
      const updatedRules = inactiveRules.filter(rule => !expiredRulesSet.has(rule.id));
      browser.storage.local.set({ inactiveRules: updatedRules });
    })
    .catch(error => console.error(error));
}
```

With that done, the website-blocking extension is completed. Users can add, edit, delete, and disable any URLs they want, apply partial or entire domain blocks, and use strict mode to help them maintain more discipline in their browsing.

<h2 id="conclusion" class="article-subheading">Conclusion</h2>

That's the basic overview of my site-blocking extension. It's my first extension, and it was an interesting experience, especially given how the world of web dev can become mundane sometimes. There's definitely room for improvement and new features. Some of those are:
- use Shadow DOM for the main form;
- blacklist export;
- custom time duration for strict mode, 
- more block modes (e.g. permanent, scheduled, usage time limit)
- dark mode

These are just a few things on my mind that I'd like to add some day to this project. Thank you for reading.

[The source code](https://github.com/savvy-itch/site-block-extension)

[The live version](https://chromewebstore.google.com/detail/on-pace/kpniallfjagbbjigjigdlkoambcipoea)