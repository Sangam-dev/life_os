// Use localStorage-based storage instead of Firestore for complete offline functionality
// and to avoid cloud database quota limits. Keep Firebase Auth, discard Firestore.
export { dbService } from './localStorage';
