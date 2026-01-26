import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
}

// Validate Firebase configuration
const validateFirebaseConfig = () => {
  const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'messagingSenderId', 'appId']
  const missingKeys = requiredKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig])
  
  if (missingKeys.length > 0) {
    console.warn('Firebase configuration is missing:', missingKeys)
    console.warn('Please ensure all EXPO_PUBLIC_FIREBASE_* environment variables are set')
  }
}

validateFirebaseConfig()

let app: FirebaseApp | null = null
let auth: Auth | null = null

try {
  // Only initialize if we have required config
  const hasRequiredConfig = firebaseConfig.apiKey && 
                            firebaseConfig.authDomain && 
                            firebaseConfig.projectId &&
                            firebaseConfig.appId

  if (hasRequiredConfig) {
if (!getApps().length) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
      console.log('Firebase initialized successfully')
} else {
  app = getApps()[0]
  auth = getAuth(app)
      console.log('Using existing Firebase app instance')
    }
  } else {
    console.warn('Firebase not initialized - missing required configuration')
  }
} catch (error) {
  console.error('Error initializing Firebase:', error)
  // Don't throw - allow app to run without Firebase for non-Firebase features
  app = null
  auth = null
}

export { auth }
export default app
