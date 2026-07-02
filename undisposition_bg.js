var active = true;
if (typeof browser === 'undefined') {
  var browser = chrome;
}

function loadOptions(callback) {
  browser.storage.local.get('activeStatus', function (data) {
    if (data.activeStatus === undefined) {
      //at first install
      data.activeStatus = true;
      saveOptions();
    }
    active = data.activeStatus;
    if (callback != null) callback();
  });
}

function saveOptions() {
  browser.storage.local.set({ activeStatus: active });
}

function updateUI() {
  var str = active
    ? 'Undisposition active, click to deactivate'
    : 'Undisposition disabled, click to activate';
  browser.action.setTitle({ title: str });
  browser.action.setBadgeText({ text: active ? '⠀' : '⠀' });
  browser.action.setBadgeBackgroundColor({
    color: active ? '#5084ee' : '#e91e63',
  });

  if (active) {
    setDynamicRule();
  } else {
    removeDynamicRules();
  }
}

function ToggleActive() {
  active = !active;
  saveOptions();
  updateUI();
}

async function localGetSync(key) {
  return new Promise((resolve, reject) => {
    try {
      browser.storage.local.get(key, function (value) {
        resolve(value[key]);
      });
    } catch (ex) {
      reject(ex);
    }
  });
}

function removeDynamicRules() {
  // remove all rules
  browser.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1, 2],
  });
}

async function setDynamicRule() {
  const headerKey = 'content-disposition';
  let list = (await localGetSync('blacklist')) || [];
  let usePreview = await localGetSync('csvPreview');

  let newRules = [];

  newRules.push({
    id: 1,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      responseHeaders: [{ header: headerKey, operation: 'remove' }],
    },
    condition: {
      resourceTypes: ['main_frame', 'sub_frame', 'script'],
      excludedInitiatorDomains: list,
      excludedRequestDomains: list,
    },
  });

  if (usePreview) {
    const extensionPage = chrome.runtime.getURL('pages/viewer.html');

    newRules.push({
      id: 2,
      priority: 2,
      action: {
        type: 'redirect',
        redirect: {
          regexSubstitution: extensionPage + '?url=\\0',
        },
      },
      condition: {
        regexFilter: '^https?://.*\\.(csv|CSV)($|\\?.*)',
        resourceTypes: ['main_frame'],
        excludedInitiatorDomains: list,
        excludedRequestDomains: list,
      },
    });
  } else {
    newRules.push({
      id: 2,
      priority: 2,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [
          { header: headerKey, operation: 'remove' },
          { header: 'content-type', operation: 'set', value: 'text/plain' },
        ],
      },
      condition: {
        regexFilter: '\\.(csv|CSV)($|\\?)',
        resourceTypes: ['main_frame', 'sub_frame'],
        excludedInitiatorDomains: list,
        excludedRequestDomains: list,
      },
    });
  }

  browser.declarativeNetRequest.updateDynamicRules({
    addRules: newRules,
    removeRuleIds: [1, 2],
  });
}

// init everything
loadOptions(updateUI);
browser.action.onClicked.addListener(ToggleActive);

// set right click menu to extension icon
browser.contextMenus.create({
  id: 'settings',
  title: 'Settings',
  contexts: ['browser_action', 'action'],
});

//handle context menu actions
browser.contextMenus.onClicked.addListener(function (e) {
  if (e.menuItemId == 'settings') {
    browser.tabs.create({
      url: 'pages/settings.html',
    });
  }
});

// handle messages from content scripts
chrome.runtime.onMessage.addListener(function () {
  updateUI();
});
