
const IMGUR_CLIENT_ID = import.meta.env.VITE_IMGUR_CLIENT_ID;

export const uploadToImgur = async (file: File): Promise<string> => {
  if (!IMGUR_CLIENT_ID) {
    throw new Error("VITE_IMGUR_CLIENT_ID is not defined");
  }

  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await fetch("https://api.imgur.com/3/image", {
      method: "POST",
      headers: {
        Authorization: `Client-ID ${IMGUR_CLIENT_ID}`,
      },
      body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Imgur upload error details:", errorData);
        throw new Error(`Imgur upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.success) {
      return data.data.link;
    } else {
      throw new Error("Imgur upload failed: " + (data.data.error || "Unknown error"));
    }
  } catch (error) {
    console.error("Error uploading to Imgur:", error);
    throw error;
  }
};
