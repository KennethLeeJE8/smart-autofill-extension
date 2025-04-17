document.addEventListener('DOMContentLoaded', async () => {
  // Tab switching functionality
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      
      // Update active states
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      button.classList.add('active');
      document.getElementById(tabName).classList.add('active');
    });
  });

  // Check if Shared Storage API is supported
  const isSharedStorageSupported = 'sharedStorage' in window;
  console.log('Shared Storage API supported:', isSharedStorageSupported);

  // Try to load data from shared storage first
  if (isSharedStorageSupported) {
    try {
      await loadFromSharedStorage();
    } catch (error) {
      console.error('Error loading from shared storage:', error);
      // Fall back to local storage
      await loadSavedData();
    }
  } else {
    // Fall back to local storage if shared storage is not supported
    await loadSavedData();
  }

  // LinkedIn import functionality
  const importButton = document.getElementById('importLinkedIn');
  const importStatus = document.getElementById('importStatus');
  
  importButton.addEventListener('click', async () => {
    const linkedinUrl = document.getElementById('linkedinUrl').value;
    
    if (!linkedinUrl) {
      showImportStatus('Please enter a LinkedIn profile URL', 'error');
      return;
    }

    if (!linkedinUrl.includes('linkedin.com/in/')) {
      showImportStatus('Please enter a valid LinkedIn profile URL', 'error');
      return;
    }

    showImportStatus('Importing profile data...', '');
    
    try {
      console.log('Sending scrape request for:', linkedinUrl);
      // Send message to background script to handle the API call
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'scrapeLinkedIn',
          url: linkedinUrl
        }, response => {
          if (chrome.runtime.lastError) {
            console.error('Runtime error:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
            return;
          }
          console.log('Received response:', response);
          resolve(response);
        });
      });

      if (response && response.success) {
        console.log('Processing API data:', response.data);
        // Update form fields with the API data
        const data = response.data;
        const fields = [
          'firstName',
          'lastName',
          'email',
          'occupation',
          'company',
          'location',
          'industry',
          'website',
          'connections',
          'followers',
          'about'
        ];

        // Update each field if data is available
        fields.forEach(field => {
          const input = document.getElementById(field);
          if (input && data[field]) {
            input.value = data[field];
          }
        });

        // Handle profile image if available
        if (data.profileImage) {
          const profileImg = document.getElementById('profileImage');
          if (profileImg) {
            profileImg.src = data.profileImage;
            profileImg.style.display = 'block';
          }
        }
        
        showImportStatus('Profile data imported successfully!', 'success');
        
        // Save the imported data
        const formData = new FormData(document.getElementById('personalForm'));
        const personalData = {};
        for (const [key, value] of formData.entries()) {
          personalData[key] = value;
        }
        // Add additional fields that might not be in the form
        personalData.profileImage = data.profileImage || '';
        personalData.website = data.website || '';
        personalData.connections = data.connections || '';
        personalData.followers = data.followers || '';
        personalData.about = data.about || '';
        
        await chrome.storage.local.set({ personal: personalData });
      } else {
        console.error('Import failed:', response?.error || 'Unknown error');
        showImportStatus(response?.error || 'Failed to import profile data', 'error');
      }
    } catch (error) {
      console.error('Import error:', error);
      showImportStatus(`Error importing profile data: ${error.message}`, 'error');
    }
  });

  function showImportStatus(message, type) {
    importStatus.textContent = message;
    importStatus.className = 'import-status';
    if (type) {
      importStatus.classList.add(type);
    }
  }

  // Form submissions
  document.getElementById('personalForm').addEventListener('submit', handlePersonalFormSubmit);
  document.getElementById('addressForm').addEventListener('submit', handleAddressFormSubmit);
  document.getElementById('paymentForm').addEventListener('submit', handlePaymentFormSubmit);

  // Add new item buttons
  document.getElementById('addAddress').addEventListener('click', () => {
    document.getElementById('addressForm').classList.remove('hidden');
  });

  document.getElementById('addPayment').addEventListener('click', () => {
    document.getElementById('paymentForm').classList.remove('hidden');
  });

  // Cancel buttons
  document.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.closest('form').classList.add('hidden');
    });
  });
});

// Load from shared storage if available
async function loadFromSharedStorage() {
  if (!('sharedStorage' in window)) {
    console.log('Shared Storage API not supported, skipping...');
    return;
  }

  try {
    console.log('Attempting to load data from shared storage...');
    
    // First check if we have shared storage data available
    const lastUpdated = await window.sharedStorage.get('profile-last-updated');
    if (!lastUpdated) {
      console.log('No shared storage data available');
      return;
    }
    
    // Create and run the worklet to retrieve profile data
    const worklet = await window.sharedStorage.createWorklet('shared-storage-worklet.js');
    const profileData = await worklet.run('retrieve-profile-data');
    
    console.log('Retrieved profile data from shared storage:', profileData);
    
    // Update form fields with shared storage data
    if (profileData) {
      const fields = [
        'firstName',
        'lastName',
        'email',
        'occupation',
        'company',
        'location',
        'industry',
        'website',
        'connections',
        'followers',
        'about'
      ];
      
      fields.forEach(field => {
        const input = document.getElementById(field);
        if (input && profileData[field]) {
          input.value = profileData[field];
        }
      });
      
      // Handle profile image
      if (profileData.profileImage) {
        const profileImg = document.getElementById('profileImage');
        if (profileImg) {
          profileImg.src = profileData.profileImage;
          profileImg.style.display = 'block';
        }
      }
      
      console.log('Form updated with shared storage data');
    }
  } catch (error) {
    console.error('Error accessing shared storage:', error);
    throw error;
  }
}

// Load all saved data when popup opens
async function loadSavedData() {
  const data = await chrome.storage.local.get(['personal', 'addresses', 'payments']);
  
  if (data.personal) {
    Object.entries(data.personal).forEach(([key, value]) => {
      const input = document.getElementById(key);
      if (input) input.value = value;
    });
  }

  if (data.addresses) {
    renderAddressList(data.addresses);
  }

  if (data.payments) {
    renderPaymentList(data.payments);
  }
}

// Handle personal information form submission
async function handlePersonalFormSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const personalData = {};
  
  for (const [key, value] of formData.entries()) {
    personalData[key] = value;
  }

  await chrome.storage.local.set({ personal: personalData });
  
  // Also update shared storage if available
  if ('sharedStorage' in window) {
    try {
      // Store in shared storage
      await window.sharedStorage.set('profile-first-name', personalData.firstName || '');
      await window.sharedStorage.set('profile-last-name', personalData.lastName || '');
      await window.sharedStorage.set('profile-name', `${personalData.firstName || ''} ${personalData.lastName || ''}`);
      await window.sharedStorage.set('profile-email', personalData.email || '');
      await window.sharedStorage.set('profile-occupation', personalData.occupation || '');
      await window.sharedStorage.set('profile-company', personalData.company || '');
      await window.sharedStorage.set('profile-location', personalData.location || '');
      await window.sharedStorage.set('profile-industry', personalData.industry || '');
      await window.sharedStorage.set('profile-website', personalData.website || '');
      await window.sharedStorage.set('profile-connections', personalData.connections || '');
      await window.sharedStorage.set('profile-followers', personalData.followers || '');
      await window.sharedStorage.set('profile-about', personalData.about || '');
      await window.sharedStorage.set('profile-image', personalData.profileImage || '');
      await window.sharedStorage.set('profile-last-updated', new Date().toISOString());
      
      console.log('Personal data updated in shared storage');
    } catch (error) {
      console.error('Error updating shared storage:', error);
    }
  }
  
  showSaveConfirmation();
}

// Handle address form submission
async function handleAddressFormSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const addressData = {};
  
  for (const [key, value] of formData.entries()) {
    addressData[key] = value;
  }

  const { addresses = [] } = await chrome.storage.local.get('addresses');
  addresses.push(addressData);
  
  await chrome.storage.local.set({ addresses });
  renderAddressList(addresses);
  e.target.classList.add('hidden');
  showSaveConfirmation();
}

// Handle payment form submission
async function handlePaymentFormSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const paymentData = {};
  
  for (const [key, value] of formData.entries()) {
    paymentData[key] = value;
  }

  const { payments = [] } = await chrome.storage.local.get('payments');
  payments.push(paymentData);
  
  await chrome.storage.local.set({ payments });
  renderPaymentList(payments);
  e.target.classList.add('hidden');
  showSaveConfirmation();
}

// Render the list of saved addresses
function renderAddressList(addresses) {
  const addressList = document.getElementById('addressList');
  addressList.innerHTML = addresses.map((address, index) => `
    <div class="saved-item">
      <button class="delete-btn" data-type="address" data-index="${index}">×</button>
      <h3>${address.addressName}</h3>
      <p>${address.street}</p>
      <p>${address.city}, ${address.state} ${address.zipCode}</p>
      <p>${address.country}</p>
    </div>
  `).join('');

  // Add delete handlers
  addressList.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', handleDelete);
  });
}

// Render the list of saved payment methods
function renderPaymentList(payments) {
  const paymentList = document.getElementById('paymentList');
  paymentList.innerHTML = payments.map((payment, index) => `
    <div class="saved-item">
      <button class="delete-btn" data-type="payment" data-index="${index}">×</button>
      <h3>${payment.cardName}</h3>
      <p>**** **** **** ${payment.cardNumber.slice(-4)}</p>
      <p>Expires: ${payment.expiryDate}</p>
    </div>
  `).join('');

  // Add delete handlers
  paymentList.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', handleDelete);
  });
}

// Handle deletion of saved items
async function handleDelete(e) {
  const type = e.target.getAttribute('data-type');
  const index = parseInt(e.target.getAttribute('data-index'));
  
  const data = await chrome.storage.local.get(type === 'address' ? 'addresses' : 'payments');
  const items = data[type === 'address' ? 'addresses' : 'payments'];
  
  items.splice(index, 1);
  await chrome.storage.local.set({ [type === 'address' ? 'addresses' : 'payments']: items });
  
  if (type === 'address') {
    renderAddressList(items);
  } else {
    renderPaymentList(items);
  }
}

// Show a temporary save confirmation message
function showSaveConfirmation() {
  const confirmation = document.createElement('div');
  confirmation.textContent = 'Saved successfully!';
  confirmation.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: var(--success-color);
    color: white;
    padding: 10px 20px;
    border-radius: 4px;
    z-index: 1000;
  `;
  
  document.body.appendChild(confirmation);
  setTimeout(() => confirmation.remove(), 2000);
} 