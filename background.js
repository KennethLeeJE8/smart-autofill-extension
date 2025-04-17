// Initialize context menu
function initializeContextMenu() {
  chrome.contextMenus.create({
    id: 'fillForms',
    title: 'Fill Forms',
    contexts: ['page']
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Context menu creation error:', chrome.runtime.lastError);
    }
  });
}

// Check for shared storage API support
function isSharedStorageSupported() {
  return 'sharedStorage' in window;
}

// Store data in shared storage
async function storeProfileInSharedStorage(data) {
  if (!isSharedStorageSupported()) {
    console.warn('Shared Storage API is not supported');
    return false;
  }
  
  try {
    console.log('Storing profile data in shared storage...');
    
    // Store basic information
    await window.sharedStorage.set('profile-name', data.name || `${data.firstName} ${data.lastName}`);
    await window.sharedStorage.set('profile-first-name', data.firstName);
    await window.sharedStorage.set('profile-last-name', data.lastName);
    await window.sharedStorage.set('profile-location', data.location);
    await window.sharedStorage.set('profile-about', data.about);
    
    // Store professional information
    await window.sharedStorage.set('profile-occupation', data.occupation);
    await window.sharedStorage.set('profile-company', data.company);
    await window.sharedStorage.set('profile-industry', data.industry);
    
    // Store social metrics
    await window.sharedStorage.set('profile-connections', data.connections);
    await window.sharedStorage.set('profile-followers', data.followers);
    
    // Store contact & additional info
    await window.sharedStorage.set('profile-email', data.email);
    await window.sharedStorage.set('profile-website', data.website);
    await window.sharedStorage.set('profile-image', data.profileImage);
    
    // Store timestamp for cache management
    await window.sharedStorage.set('profile-last-updated', new Date().toISOString());
    
    console.log('Profile data stored in shared storage successfully');
    return true;
  } catch (error) {
    console.error('Error storing profile in shared storage:', error);
    return false;
  }
}

// Initialize extension
chrome.runtime.onInstalled.addListener((details) => {
  // Create context menu
  initializeContextMenu();

  if (details.reason === 'install') {
    // Open options page on install
    chrome.tabs.create({
      url: 'popup.html'
    });
  }
  
  // Initialize shared storage worklet if supported
  if (isSharedStorageSupported()) {
    try {
      window.sharedStorage.createWorklet('shared-storage-worklet.js')
        .then(() => console.log('Shared storage worklet created successfully'))
        .catch(error => console.error('Error creating shared storage worklet:', error));
    } catch (error) {
      console.error('Error initializing shared storage:', error);
    }
  }
});

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  console.log('Command received:', command);
  if (command === 'fill-forms') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'fillForms' });
      }
    });
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('Context menu clicked:', info.menuItemId);
  if (info.menuItemId === 'fillForms' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'fillForms' });
  }
});

// Handle LinkedIn profile scraping
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  
  if (request.action === 'scrapeLinkedIn') {
    console.log('Received scraping request for:', request.url);
    
    // Execute the fetch and handle response immediately
    (async () => {
      try {
        const data = await fetchLinkedInData(request.url);
        console.log('API fetch successful:', data);
        
        // Store data in shared storage if supported
        if (isSharedStorageSupported()) {
          const sharedStorageResult = await storeProfileInSharedStorage(data);
          console.log('Shared storage result:', sharedStorageResult ? 'Success' : 'Failed');
        }
        
        sendResponse({ success: true, data });
      } catch (error) {
        console.error('API fetch failed:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    
    return true; // Required for async response
  }
});

// Function to fetch LinkedIn profile data using Kadoa API
async function fetchLinkedInData(profileUrl) {
  const API_KEY = '5c285625-b999-4a37-b755-f0ed044db857';
  const WORKFLOW_ID = '67f2e621cc85b52e080157b5';
  const API_ENDPOINT = `https://api.kadoa.com/v4/workflows/${WORKFLOW_ID}/data?url=${encodeURIComponent(profileUrl)}`;

  try {
    console.log('Fetching data from Kadoa API...');
    const options = {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY
      }
    };

    const response = await fetch(API_ENDPOINT, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log('Raw API response:', data.data[0]);

    // Split the full name into first and last name
    const nameParts = (data.data[0].name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    console.log('First name:', firstName);
    console.log('Last name:', lastName);

    // Transform the API response into our expected format
    return {
      firstName: firstName,
      lastName: lastName,
      name: data.data[0].name || '',
      occupation: data.data[0].about || '',  // Using about as occupation since it might contain role info
      company: '',  // Company information not directly available in the response
      email: '',    // Email not available in the response
      location: data.data[0].location || '',
      industry: '',  // Industry not directly available in the response
      website: data.data[0].link || '',
      connections: data.data[0].connections || '',
      followers: data.data[0].followers?.toString() || '',
      profileImage: data.data[0].profileImage || '',
      about: data.data[0].about || ''
    };
  } catch (error) {
    console.error('API Error:', error);
    throw new Error(`Failed to fetch LinkedIn data: ${error.message}`);
  }
} 