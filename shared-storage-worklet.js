// Worklet for retrieving LinkedIn profile data from shared storage

// Operation to retrieve profile data for rendering
class RetrieveProfileDataOperation {
  async run() {
    // Get profile data from shared storage
    const profileData = {};
    
    // Basic information
    profileData.name = await sharedStorage.get('profile-name') || '';
    profileData.firstName = await sharedStorage.get('profile-first-name') || '';
    profileData.lastName = await sharedStorage.get('profile-last-name') || '';
    profileData.location = await sharedStorage.get('profile-location') || '';
    profileData.about = await sharedStorage.get('profile-about') || '';
    
    // Professional information
    profileData.occupation = await sharedStorage.get('profile-occupation') || '';
    profileData.company = await sharedStorage.get('profile-company') || '';
    profileData.industry = await sharedStorage.get('profile-industry') || '';
    
    // Social metrics
    profileData.connections = await sharedStorage.get('profile-connections') || '';
    profileData.followers = await sharedStorage.get('profile-followers') || '';
    
    // Contact & additional info
    profileData.email = await sharedStorage.get('profile-email') || '';
    profileData.website = await sharedStorage.get('profile-website') || '';
    profileData.profileImage = await sharedStorage.get('profile-image') || '';

    return profileData;
  }
}

// Operation for A/B testing different autofill UIs
class SelectUIOperation {
  async run(urls) {
    // Get user's UI preference or assign a random one if not set
    let uiVariant = await sharedStorage.get('ui-variant');
    
    if (!uiVariant) {
      // Randomly assign a UI variant (0 or 1)
      uiVariant = Math.floor(Math.random() * 2).toString();
      await sharedStorage.set('ui-variant', uiVariant);
    }
    
    return parseInt(uiVariant);
  }
}

// Register the operations
register('retrieve-profile-data', RetrieveProfileDataOperation);
register('select-ui', SelectUIOperation); 