// Common field patterns and their corresponding data types
const fieldPatterns = {
  // Personal Information
  firstName: {
    patterns: [
      /first[-_\s]?name/i,
      /fname/i,
      /given[-_\s]?name/i
    ],
    type: 'personal',
    key: 'firstName'
  },
  lastName: {
    patterns: [
      /last[-_\s]?name/i,
      /lname/i,
      /surname/i,
      /family[-_\s]?name/i
    ],
    type: 'personal',
    key: 'lastName'
  },
  email: {
    patterns: [
      /email/i,
      /e-mail/i,
      /mail/i
    ],
    type: 'personal',
    key: 'email'
  },
  phone: {
    patterns: [
      /phone/i,
      /telephone/i,
      /mobile/i,
      /cell/i
    ],
    type: 'personal',
    key: 'phone'
  },
  
  // Address Fields
  street: {
    patterns: [
      /street/i,
      /address/i,
      /addr/i
    ],
    type: 'address',
    key: 'street'
  },
  city: {
    patterns: [
      /city/i,
      /town/i
    ],
    type: 'address',
    key: 'city'
  },
  state: {
    patterns: [
      /state/i,
      /province/i,
      /region/i
    ],
    type: 'address',
    key: 'state'
  },
  zipCode: {
    patterns: [
      /zip/i,
      /postal/i,
      /post[-_\s]?code/i
    ],
    type: 'address',
    key: 'zipCode'
  },
  country: {
    patterns: [
      /country/i,
      /nation/i
    ],
    type: 'address',
    key: 'country'
  },
  
  // Payment Fields
  cardNumber: {
    patterns: [
      /card[-_\s]?number/i,
      /cc[-_\s]?number/i,
      /credit[-_\s]?card/i
    ],
    type: 'payment',
    key: 'cardNumber'
  },
  cardName: {
    patterns: [
      /card[-_\s]?name/i,
      /name[-_\s]?on[-_\s]?card/i
    ],
    type: 'payment',
    key: 'cardName'
  },
  expiryDate: {
    patterns: [
      /expir/i,
      /exp[-_\s]?date/i,
      /valid[-_\s]?until/i
    ],
    type: 'payment',
    key: 'expiryDate'
  },
  cvv: {
    patterns: [
      /cvv/i,
      /cvc/i,
      /security[-_\s]?code/i
    ],
    type: 'payment',
    key: 'cvv'
  }
};

// Function to identify field type based on various attributes
function identifyFieldType(field) {
  const fieldId = field.id?.toLowerCase() || '';
  const fieldName = field.name?.toLowerCase() || '';
  const fieldPlaceholder = field.placeholder?.toLowerCase() || '';
  const fieldLabel = field.labels?.[0]?.textContent?.toLowerCase() || '';
  const fieldType = field.type?.toLowerCase() || '';
  
  // Check all field patterns
  for (const [key, value] of Object.entries(fieldPatterns)) {
    for (const pattern of value.patterns) {
      if (
        pattern.test(fieldId) ||
        pattern.test(fieldName) ||
        pattern.test(fieldPlaceholder) ||
        pattern.test(fieldLabel)
      ) {
        return {
          type: value.type,
          key: value.key
        };
      }
    }
  }
  
  // Additional type-based checks
  if (fieldType === 'email') {
    return { type: 'personal', key: 'email' };
  }
  if (fieldType === 'tel') {
    return { type: 'personal', key: 'phone' };
  }
  
  return null;
}

// Create and manage suggestion popups
class AutofillSuggestion {
  constructor() {
    this.popup = null;
    this.currentField = null;
    this.suggestions = [];
    this.setupStyles();
  }

  setupStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .autofill-popup {
        position: absolute;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        z-index: 999999;
        max-width: 300px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .autofill-suggestion {
        padding: 8px 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: background-color 0.2s;
      }

      .autofill-suggestion:hover {
        background-color: #f0f0f0;
      }

      .autofill-suggestion .icon {
        color: #666;
        font-size: 16px;
      }

      .autofill-suggestion .label {
        font-size: 14px;
        color: #333;
      }

      .autofill-suggestion .preview {
        font-size: 12px;
        color: #666;
      }
    `;
    document.head.appendChild(style);
  }

  async showSuggestions(field) {
    const fieldInfo = identifyFieldType(field);
    if (!fieldInfo) return;

    const data = await chrome.storage.local.get([fieldInfo.type]);
    const storedData = data[fieldInfo.type];
    
    if (!storedData) return;

    this.currentField = field;
    this.suggestions = [];

    // Get field position
    const rect = field.getBoundingClientRect();
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    // Create or clear popup
    if (!this.popup) {
      this.popup = document.createElement('div');
      this.popup.className = 'autofill-popup';
      document.body.appendChild(this.popup);
    } else {
      this.popup.innerHTML = '';
    }

    // Add suggestions based on field type
    if (fieldInfo.type === 'personal') {
      if (storedData[fieldInfo.key]) {
        this.addSuggestion('👤', storedData[fieldInfo.key], 'Personal Info');
      }
    } else if (fieldInfo.type === 'address') {
      storedData.forEach((address, index) => {
        if (address[fieldInfo.key]) {
          this.addSuggestion('📍', address[fieldInfo.key], address.addressName || `Address ${index + 1}`);
        }
      });
    } else if (fieldInfo.type === 'payment') {
      storedData.forEach((payment, index) => {
        if (payment[fieldInfo.key]) {
          const value = fieldInfo.key === 'cardNumber' 
            ? `****${payment[fieldInfo.key].slice(-4)}`
            : payment[fieldInfo.key];
          this.addSuggestion('💳', value, payment.cardName || `Card ${index + 1}`);
        }
      });
    }

    // Position popup
    if (this.suggestions.length > 0) {
      this.popup.style.left = `${rect.left + scrollLeft}px`;
      this.popup.style.top = `${rect.bottom + scrollTop}px`;
      this.popup.style.minWidth = `${rect.width}px`;
      this.popup.style.display = 'block';
    } else {
      this.popup.style.display = 'none';
    }
  }

  addSuggestion(icon, value, label) {
    const suggestion = document.createElement('div');
    suggestion.className = 'autofill-suggestion';
    suggestion.innerHTML = `
      <span class="icon">${icon}</span>
      <div>
        <div class="label">${label}</div>
        <div class="preview">${value}</div>
      </div>
    `;

    suggestion.addEventListener('click', () => {
      if (this.currentField) {
        this.currentField.value = value;
        this.currentField.dispatchEvent(new Event('change', { bubbles: true }));
        this.currentField.dispatchEvent(new Event('input', { bubbles: true }));
        this.hide();
      }
    });

    this.popup.appendChild(suggestion);
    this.suggestions.push(suggestion);
  }

  hide() {
    if (this.popup) {
      this.popup.style.display = 'none';
    }
  }
}

// Initialize suggestion manager
const suggestionManager = new AutofillSuggestion();

// Add event listeners for showing/hiding suggestions
document.addEventListener('focusin', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    suggestionManager.showSuggestions(e.target);
  }
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.autofill-popup') && 
      !e.target.closest('input') && 
      !e.target.closest('textarea')) {
    suggestionManager.hide();
  }
});

// Modify the existing fillField function to work with the suggestion manager
async function fillField(field) {
  const fieldInfo = identifyFieldType(field);
  if (!fieldInfo) return;
  
  // Show suggestions instead of auto-filling
  suggestionManager.showSuggestions(field);
}

// Keep the existing scanAndFillForms function, but modify it to only show suggestions
// for fields that match stored data
async function scanAndFillForms() {
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    const fields = form.querySelectorAll('input, select, textarea');
    fields.forEach(field => {
      if (field.type === 'hidden') return;
      // Only show suggestions when the field is focused
      field.addEventListener('focus', () => fillField(field));
    });
  });
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillForms') {
    scanAndFillForms();
    sendResponse({ success: true });
  }
});

// Initial scan when the page loads
document.addEventListener('DOMContentLoaded', scanAndFillForms); 