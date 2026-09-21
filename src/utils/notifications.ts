export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (typeof window === 'undefined' || !("Notification" in window)) {
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
  } catch (error) {
    console.warn("Could not request notification permission in this environment:", error);
  }

  return false;
};

export const sendPushNotification = (title: string, options?: NotificationOptions) => {
  try {
    if (typeof window === 'undefined' || !("Notification" in window)) return;

    if (Notification.permission === "granted") {
      new Notification(title, options);
    }
  } catch (error) {
    console.warn("Could not display push notification:", error);
  }
};
