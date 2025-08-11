# 🚀 Deployment Setup Guide

## 🔧 Fix Firebase Domain Authorization Error

### **Step 1: Add Domains to Firebase Console**

1. **Go to [Firebase Console](https://console.firebase.google.com/)**
2. **Select your project**: `forms-98efd`
3. **Navigate to**: Authentication → Settings → Authorized domains
4. **Add these domains**:
   ```
   localhost
   forms-phi-three.vercel.app
   forms-b7v6p6bt5-alexys-projects-09a52426.vercel.app
   forms-chi-sand.vercel.app
   ```

### **Step 2: Set Environment Variables in Vercel**

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Select your project**: `g-form`
3. **Go to Settings → Environment Variables**
4. **Add these variables**:

```env
VITE_FIREBASE_API_KEY=AIzaSyBA84feVaHbpH6wGD4LjNiG0ENMBrsBtiw
VITE_FIREBASE_AUTH_DOMAIN=forms-98efd.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=forms-98efd
VITE_FIREBASE_STORAGE_BUCKET=forms-98efd.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=992114138614
VITE_FIREBASE_APP_ID=1:992114138614:web:a211832b729804bc54bbd7
VITE_FIREBASE_MEASUREMENT_ID=G-HM6WH706MC
```

### **Step 3: Redeploy Your Application**

1. **In Vercel Dashboard**, go to your project
2. **Click "Redeploy"** to apply the new environment variables
3. **Wait for deployment** to complete

### **Step 4: Test Authentication**

1. **Visit your deployed app**
2. **Try signing in with Google**
3. **Check browser console** for any remaining errors

## 🐛 Troubleshooting

### **If you still get domain errors:**

1. **Check the exact domain** in your browser's address bar
2. **Add that specific domain** to Firebase Console
3. **Wait 5-10 minutes** for changes to propagate
4. **Clear browser cache** and try again

### **If environment variables aren't working:**

1. **Verify variables** are set correctly in Vercel
2. **Redeploy** the application
3. **Check browser console** for configuration logs

### **Common Issues:**

- **Domain mismatch**: Make sure the domain in your browser matches exactly what's in Firebase
- **New deployments**: If you deploy to a new URL (like forms-chi-sand.vercel.app), add it to Firebase authorized domains
- **Caching**: Clear browser cache and cookies
- **Timing**: Firebase changes can take a few minutes to propagate

## 📞 Support

If you continue to have issues:
1. Check the browser console for specific error messages
2. Verify all domains are added to Firebase Console
3. Ensure environment variables are set correctly in Vercel
4. Try redeploying the application

---

**Last updated**: December 2024
