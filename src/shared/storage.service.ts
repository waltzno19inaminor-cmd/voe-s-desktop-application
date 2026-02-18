import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase.client";
import { v4 as uuidv4 } from 'uuid';

export const uploadImage = async (file: File, path: string = 'images'): Promise<string> => {
    const fileName = `${uuidv4()}_${file.name}`;
    const fileRef = storageRef(storage, `${path}/${fileName}`);
    
    try {
        const snapshot = await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading image:", error);
        throw error;
    }
};
