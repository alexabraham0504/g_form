import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { nanoid } from 'nanoid';

// Forms collection reference
const getFormsCollection = (userId) => collection(db, 'users', userId, 'forms');

// Create a new form
export const createForm = async (userId, formData) => {
  try {
    const formsRef = getFormsCollection(userId);
    // Generate a unique publicId for sharing
    const publicId = nanoid(16);
    
    // Sanitize form data to ensure no undefined values
    const sanitizedFormData = {};
    Object.keys(formData).forEach(key => {
      if (formData[key] !== undefined) {
        sanitizedFormData[key] = formData[key];
      }
    });
    
    // Sanitize questions to ensure no undefined values
    if (sanitizedFormData.questions) {
      sanitizedFormData.questions = sanitizedFormData.questions.map(question => {
        const sanitizedQuestion = {};
        Object.keys(question).forEach(key => {
          if (question[key] !== undefined) {
            sanitizedQuestion[key] = question[key];
          }
        });
        return sanitizedQuestion;
      });
    }
    
    const newForm = {
      ...sanitizedFormData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      responses: 0,
      isPublished: false,
      publicId,
    };
    
    const docRef = await addDoc(formsRef, newForm);
    // Store mapping in global collection for public access
    const publicFormsRef = collection(db, 'publicForms');
    await addDoc(publicFormsRef, {
      publicId,
      userId,
      formId: docRef.id,
    });
    return { id: docRef.id, ...newForm };
  } catch (error) {
    console.error('Error creating form:', error);
    throw error;
  }
};

// Get all forms for a user
export const getUserForms = async (userId) => {
  try {
    const formsRef = getFormsCollection(userId);
    const q = query(formsRef, orderBy('updatedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const forms = [];
    querySnapshot.forEach((doc) => {
      forms.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return forms;
  } catch (error) {
    console.error('Error getting user forms:', error);
    throw error;
  }
};

// Get a specific form
export const getForm = async (userId, formId) => {
  try {
    const formRef = doc(db, 'users', userId, 'forms', formId);
    const formDoc = await getDoc(formRef);
    
    if (formDoc.exists()) {
      return { id: formDoc.id, ...formDoc.data() };
    } else {
      throw new Error('Form not found');
    }
  } catch (error) {
    console.error('Error getting form:', error);
    throw error;
  }
};

// Fetch a form by publicId (for public access)
export const getFormByPublicId = async (publicId) => {
  try {
    const publicFormsRef = collection(db, 'publicForms');
    const q = query(publicFormsRef, where('publicId', '==', publicId));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      throw new Error('Form not found');
    }
    const mapping = querySnapshot.docs[0].data();
    const { userId, formId } = mapping;
    // Fetch the actual form
    const formRef = doc(db, 'users', userId, 'forms', formId);
    const formDoc = await getDoc(formRef);
    if (!formDoc.exists()) {
      throw new Error('Form not found');
    }
    return { id: formDoc.id, ...formDoc.data() };
  } catch (error) {
    console.error('Error fetching form by publicId:', error);
    throw error;
  }
};

// Update a form
export const updateForm = async (userId, formId, formData) => {
  try {
    const formRef = doc(db, 'users', userId, 'forms', formId);
    
    // Sanitize form data to ensure no undefined values
    const sanitizedFormData = {};
    Object.keys(formData).forEach(key => {
      if (formData[key] !== undefined) {
        sanitizedFormData[key] = formData[key];
      }
    });
    
    // Sanitize questions to ensure no undefined values
    if (sanitizedFormData.questions) {
      sanitizedFormData.questions = sanitizedFormData.questions.map(question => {
        const sanitizedQuestion = {};
        Object.keys(question).forEach(key => {
          if (question[key] !== undefined) {
            sanitizedQuestion[key] = question[key];
          }
        });
        return sanitizedQuestion;
      });
    }
    
    const updateData = {
      ...sanitizedFormData,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(formRef, updateData);
    return { id: formId, ...updateData };
  } catch (error) {
    console.error('Error updating form:', error);
    throw error;
  }
};

// Delete a form
export const deleteForm = async (userId, formId) => {
  try {
    const formRef = doc(db, 'users', userId, 'forms', formId);
    await deleteDoc(formRef);
  } catch (error) {
    console.error('Error deleting form:', error);
    throw error;
  }
};

// Publish/Unpublish a form
export const toggleFormPublish = async (userId, formId, isPublished) => {
  try {
    const formRef = doc(db, 'users', userId, 'forms', formId);
    await updateDoc(formRef, {
      isPublished,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error toggling form publish:', error);
    throw error;
  }
}; 

// Save a public form response
export const savePublicFormResponse = async (publicId, responseData) => {
  try {
    // Find the mapping for this publicId
    const publicFormsRef = collection(db, 'publicForms');
    const q = query(publicFormsRef, where('publicId', '==', publicId));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      throw new Error('Form not found');
    }
    const mapping = querySnapshot.docs[0].data();
    const { userId, formId } = mapping;
    
    // Sanitize response data to ensure no undefined values
    const sanitizedResponseData = {};
    Object.keys(responseData).forEach(key => {
      if (responseData[key] !== undefined) {
        sanitizedResponseData[key] = responseData[key];
      }
    });
    
    // Save the response in a subcollection
    const responsesRef = collection(db, 'users', userId, 'forms', formId, 'responses');
    const responseId = nanoid(12);
    await addDoc(responsesRef, {
      ...sanitizedResponseData,
      submittedAt: serverTimestamp(),
      responseId,
    });
    return responseId;
  } catch (error) {
    console.error('Error saving public form response:', error);
    throw error;
  }
}; 

// Fetch all responses for a form
export const getFormResponses = async (userId, formId) => {
  try {
    const responsesRef = collection(db, 'users', userId, 'forms', formId, 'responses');
    const querySnapshot = await getDocs(responsesRef);
    const responses = [];
    querySnapshot.forEach((doc) => {
      responses.push({ id: doc.id, ...doc.data() });
    });
    return responses;
  } catch (error) {
    console.error('Error fetching form responses:', error);
    throw error;
  }
};
