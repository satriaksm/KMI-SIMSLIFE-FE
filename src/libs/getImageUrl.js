const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const resolveApiImageUrl = (imageIdOrPath) => {
  if (!imageIdOrPath) return "";

  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  const backendBase = apiBase.replace(/\/api\/?$/, "");

  if (typeof imageIdOrPath === "string") {
    let path = imageIdOrPath.trim();

    if (path.startsWith("http")) {
      try {
        const parsedUrl = new URL(path);
        const pathname = parsedUrl.pathname || "";

        // If already /api/images/{id}, return as-is
        if (pathname.startsWith("/api/images/")) {
          return path;
        }

        // If full URL points to /storage/ (public files), use it directly
        // This handles: http://localhost:8000/storage/jasa/1/photo.jpg
        // Stored files should be served directly via /storage/ path
        if (pathname.includes("/storage/")) {
          return path;
        }
      } catch {
        return path;
      }

      // Other http URLs — return as-is
      return path;
    }

    path = path.replace(/\\/g, "/");

    if (path.startsWith("/api/images/")) {
      return `${backendBase}${path}`;
    }

    if (path.startsWith("/storage/")) {
      // Serve directly: /storage/xxx -> full URL
      return `${backendBase}/storage/${path.replace(/^\/storage\//, "")}`;
    }

    if (path.startsWith("storage/")) {
      return `${backendBase}/storage/${path.replace(/^storage\//, "")}`;
    }

    if (path.startsWith("/jasa/")) {
      return `${apiBase}/api/images/${encodeURIComponent(path.replace(/^\//, ""))}`;
    }

    if (path.startsWith("jasa/")) {
      return `${apiBase}/api/images/${encodeURIComponent(path)}`;
    }

    if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(path)) {
      return `${apiBase}/api/images/${encodeURIComponent(path)}`;
    }
  }

  // Numeric ID → proxy through /api/images/{id}
  return `${apiBase}/api/images/${encodeURIComponent(imageIdOrPath)}`;
};

export const getImageUrl = (imageIdOrPath) => {
  return resolveApiImageUrl(imageIdOrPath);
};

export const getImageUrlJasa = (imageIdOrPath) => {
  return resolveApiImageUrl(imageIdOrPath);
};

/**
 * Get event banner URL via streaming API
 * @param {Object} event - Event object with id
 * @returns {string} Event banner URL
 */
export function getEventBannerUrl(event, size = 'original') {
  if (!event?.id) {
    return null;
  }

  // Support both banner_img_path (raw) and banner_url (transformed by API)
  if (!event.banner_img_path && !event.banner_url) {
    return null;
  }

  const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  // ✅ Cache-busting with updated_at timestamp
  const timestamp = event.updated_at
    ? new Date(event.updated_at).getTime()
    : Date.now();

  return `${apiUrl}/api/event-banners/${event.id}?size=${size}&t=${timestamp}`;
}

/**
 * Get merchant logo URL via streaming API
 * Konsisten dengan event banner dan user profile picture
 */
export function getMerchantLogoUrl(merchant, size = 'original') {
  if (!merchant?.id) {
    return '/placeholder.png';
  }

  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const timestamp = merchant.updated_at
    ? new Date(merchant.updated_at).getTime()
    : Date.now();

  return `${apiUrl}/api/merchant-logo/${merchant.id}?size=${size}&t=${timestamp}`;
}

/**
 * Get user profile picture URL via streaming API
 * Konsisten dengan event banner dan merchant logo
 */
export function getUserProfileUrl(user, size = 'original') {
  if (!user?.id) {
    console.warn('getUserProfileUrl: user.id is missing', user);
    return '/placeholder.png';
  }

  if (!user?.profile_picture_path) {
    console.warn('getUserProfileUrl: user.profile_picture_path is missing', user);
    return '/placeholder.png';
  }

  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  // ✅ Cache-busting with updated_at timestamp
  const timestamp = user.updated_at
    ? new Date(user.updated_at).getTime()
    : Date.now();

  return `${apiUrl}/api/user-profile/${user.id}?size=${size}&t=${timestamp}`;
}

/**
 * Get merchant banner URL via streaming API
 */
export function getMerchantBannerUrl(merchant, size = 'original') {
  if (!merchant?.id) return "/placeholder.png";
  return `${API_BASE_URL}/api/merchant-banner/${merchant.id}?size=${size}`;
}

/**
 * Get community post image URL via streaming API
 * Konsisten dengan event banner, merchant logo, dan user profile picture
 */
export function getCommunityImageUrl(imageId, size = 'original') {
  if (!imageId) {
    return '/placeholder.png';
  }

  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  // ✅ Cache-busting dengan timestamp
  const timestamp = Date.now();

  return `${apiUrl}/api/community-images/${imageId}?size=${size}&t=${timestamp}`;
}
