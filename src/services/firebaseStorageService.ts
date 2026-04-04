import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';

export const uploadToFirebase = async (file: File, path: string): Promise<string> => {
  try {
    let fileToUpload = file;

    // Compress and convert to webp if it's an image
    if (file.type.startsWith('image/')) {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/webp'
      };
      try {
        const compressedFile = await imageCompression(file, options);
        // Rename to .webp
        fileToUpload = new File([compressedFile], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
          type: 'image/webp',
        });
      } catch (compressionError) {
        console.error("Compression error, uploading original:", compressionError);
      }
    }

    const storageRef = ref(storage, `${path}/${Date.now()}_${fileToUpload.name}`);
    const snapshot = await uploadBytes(storageRef, fileToUpload);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading to Firebase Storage:", error);
    throw error;
  }
};
