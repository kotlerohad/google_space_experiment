import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, query, updateDoc } from 'firebase/firestore';

class FirebaseService {
  constructor() {
    this.app = null;
    this.db = null;
    this.auth = null;
    this.userId = null;
    this.isAuthReady = false;
    this.authCallbacks = [];
  }

  async initialize() {
    try {
      // Get Firebase config from global variables or environment
      const firebaseConfig = typeof window.__firebase_config !== 'undefined' 
        ? JSON.parse(window.__firebase_config) 
        : {
            apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
            authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
            storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.REACT_APP_FIREBASE_APP_ID
          };

      // Check if we have a valid config
      if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "your-api-key-here" || !firebaseConfig.projectId) {
        console.warn("⚠️ Firebase configuration missing or invalid.");
        console.log("🔧 To set up Firebase:");
        console.log("1. Create a Firebase project at https://console.firebase.google.com");
        console.log("2. Enable Firestore Database and Authentication");
        console.log("3. Run the setup script in browser console:");
        console.log("   Copy and paste the content from setup_local.js");
        console.log("4. Or create a .env file with your Firebase config");
        
        // Use demo configuration for development
        console.log("📝 Using demo configuration for now...");
        this.isAuthReady = true;
        this.userId = 'demo-user-' + Math.random().toString(36).substr(2, 9);
        this.authCallbacks.forEach(callback => callback(this.userId));
        return;
      }

      this.app = initializeApp(firebaseConfig);
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);

      onAuthStateChanged(this.auth, async (user) => {
        if (user) {
          this.userId = user.uid;
        } else {
          // Try to sign in with custom token or anonymously
          if (typeof window.__initial_auth_token !== 'undefined' && window.__initial_auth_token) {
            await signInWithCustomToken(this.auth, window.__initial_auth_token);
          } else {
            await signInAnonymously(this.auth);
          }
        }
        this.isAuthReady = true;
        this.authCallbacks.forEach(callback => callback(this.userId));
      });

    } catch (error) {
      console.error("Firebase initialization failed:", error);
      console.log("🔧 Falling back to demo mode...");
      
      // Fallback to demo mode
      this.isAuthReady = true;
      this.userId = 'demo-user-' + Math.random().toString(36).substr(2, 9);
      this.authCallbacks.forEach(callback => callback(this.userId));
    }
  }

  onAuthReady(callback) {
    if (this.isAuthReady) {
      callback(this.userId);
    } else {
      this.authCallbacks.push(callback);
    }
  }

  getAppId() {
    return typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';
  }

  // Email Triage related methods
  async saveTriageLogic(logic) {
    if (!this.db) {
      console.log("📝 Demo mode: Triage logic saved to localStorage");
      localStorage.setItem('demo_triage_logic', logic);
      return true;
    }
    
    if (!this.userId) return;
    const appId = this.getAppId();
    const triageLogicDocRef = doc(this.db, `/artifacts/${appId}/users/${this.userId}/triageLogic/main`);
    try {
      await setDoc(triageLogicDocRef, { logic });
      return true;
    } catch (error) {
      console.error("Error saving triage logic:", error);
      throw new Error("Failed to save triage logic.");
    }
  }

  async getTriageLogic() {
    if (!this.db) {
      console.log("📝 Demo mode: Loading triage logic from localStorage");
      return localStorage.getItem('demo_triage_logic');
    }
    
    if (!this.userId) return null;
    const appId = this.getAppId();
    const triageLogicDocRef = doc(this.db, `/artifacts/${appId}/users/${this.userId}/triageLogic/main`);
    try {
      const docSnap = await getDoc(triageLogicDocRef);
      return docSnap.exists() ? docSnap.data().logic : null;
    } catch (error) {
      console.error("Error loading triage logic:", error);
      return null;
    }
  }

  subscribeToTriageResults(callback) {
    if (!this.db) {
      console.log("📝 Demo mode: Using mock triage results subscription");
      
      // Load existing results from localStorage and call callback
      const loadDemoResults = () => {
        const results = JSON.parse(localStorage.getItem('demo_triage_results') || '{}');
        const memory = Object.entries(results)
          .filter(([_, data]) => data.feedback)
          .map(([id, data]) => ({ id, ...data }))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        callback(results, memory);
      };
      
      // Load immediately
      setTimeout(loadDemoResults, 100);
      
      return () => {}; // No-op unsubscriber
    }
    
    if (!this.userId) return () => {};
    const appId = this.getAppId();
    const resultsCollectionRef = collection(this.db, `/artifacts/${appId}/users/${this.userId}/triageResults`);
    const q = query(resultsCollectionRef);

    return onSnapshot(q, (snapshot) => {
      const results = {};
      const memory = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        results[doc.id] = data;
        if (data.feedback) {
          memory.push({ id: doc.id, ...data });
        }
      });
      memory.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
      callback(results, memory);
    });
  }

  async saveTriageResult(emailId, resultData) {
    if (!this.db) {
      console.log("📝 Demo mode: Triage result saved to localStorage");
      const results = JSON.parse(localStorage.getItem('demo_triage_results') || '{}');
      results[emailId] = resultData;
      localStorage.setItem('demo_triage_results', JSON.stringify(results));
      return;
    }
    
    if (!this.userId) return;
    const appId = this.getAppId();
    const triageResultDocRef = doc(this.db, `/artifacts/${appId}/users/${this.userId}/triageResults/${emailId}`);
    await setDoc(triageResultDocRef, resultData);
  }

  async updateTriageResult(emailId, updates) {
    if (!this.db) {
      console.log("📝 Demo mode: Triage result updated in localStorage");
      const results = JSON.parse(localStorage.getItem('demo_triage_results') || '{}');
      results[emailId] = { ...results[emailId], ...updates };
      localStorage.setItem('demo_triage_results', JSON.stringify(results));
      return;
    }
    
    if (!this.userId) return;
    const appId = this.getAppId();
    const triageResultDocRef = doc(this.db, `/artifacts/${appId}/users/${this.userId}/triageResults/${emailId}`);
    await updateDoc(triageResultDocRef, updates);
  }

  // Monday.com Integration related methods
  async saveMondayConfig(config) {
    if (!this.db) {
      console.log("📝 Demo mode: Monday config saved to localStorage");
      localStorage.setItem('demo_monday_config', JSON.stringify(config));
      return true;
    }
    
    if (!this.userId) return;
    const appId = this.getAppId();
    const configRef = doc(this.db, `/artifacts/${appId}/users/${this.userId}/mondayConfigs/mondayConfig`);
    try {
      await setDoc(configRef, config);
      return true;
    } catch (error) {
      console.error("Error saving Monday.com configuration:", error);
      throw new Error("Failed to save Monday.com configuration.");
    }
  }

  async getMondayConfig() {
    if (!this.db) {
      console.log("📝 Demo mode: Loading Monday config from localStorage");
      const stored = localStorage.getItem('demo_monday_config');
      return stored ? JSON.parse(stored) : null;
    }
    
    if (!this.userId) return null;
    const appId = this.getAppId();
    const configRef = doc(this.db, `/artifacts/${appId}/users/${this.userId}/mondayConfigs/mondayConfig`);
    try {
      const docSnap = await getDoc(configRef);
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      console.error("Error loading Monday.com configuration:", error);
      return null;
    }
  }

  // Unified action tracking
  async saveAction(action) {
    if (!this.db) {
      console.log("📝 Demo mode: Action saved to localStorage");
      const actions = JSON.parse(localStorage.getItem('demo_actions') || '[]');
      actions.push({
        ...action,
        timestamp: new Date(),
        userId: this.userId
      });
      localStorage.setItem('demo_actions', JSON.stringify(actions));
      return;
    }
    
    if (!this.userId) return;
    const appId = this.getAppId();
    const actionRef = doc(this.db, `/artifacts/${appId}/users/${this.userId}/actions/${action.id}`);
    await setDoc(actionRef, {
      ...action,
      timestamp: new Date(),
      userId: this.userId
    });
  }
}

const firebaseServiceInstance = new FirebaseService();
export default firebaseServiceInstance; 