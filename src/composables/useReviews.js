import { ref, computed } from "vue";
import axios from "@/libs/axios";

const reviews = ref([]);
const loading = ref(false);
const error = ref(null);
const totalReviews = ref(0);
const currentPage = ref(1);
const itemsPerPage = ref(10);

export const useReviews = (merchantSlug) => {
  // Fetch reviews untuk merchant
  const fetchReviews = async (page = 1, filters = {}) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await axios.get(
        `/api/public/merchants/${merchantSlug}/ratings`,
        {
          params: {
            page,
            ...filters,
          },
        }
      );

      // Handle Laravel paginated response
      reviews.value = response.data.data || [];
      totalReviews.value = response.data.total || 0;
      currentPage.value = page;
    } catch (err) {
      const errorMessage = 
        err?.response?.data?.message || 
        err?.message ||
        "Gagal memuat reviews";
      error.value = errorMessage;
      console.error("Error fetching reviews:", err.response || err);
    } finally {
      loading.value = false;
    }
  };

  // Get reviews berdasarkan rating tertentu
  const getReviewsByRating = (rating) => {
    return reviews.value.filter((r) => r.rating === rating);
  };

  // Get count reviews berdasarkan rating
  const getReviewCountByRating = (rating) => {
    return reviews.value.filter((r) => r.rating === rating).length;
  };

  // Format date
  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString("id-ID", options);
  };

  // Calculate average rating
  const averageRating = computed(() => {
    if (reviews.value.length === 0) return 0;
    const sum = reviews.value.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.value.length).toFixed(1);
  });

  // Get distribution of ratings
  const ratingDistribution = computed(() => {
    return {
      "5": reviews.value.filter((r) => r.rating === 5).length,
      "4": reviews.value.filter((r) => r.rating === 4).length,
      "3": reviews.value.filter((r) => r.rating === 3).length,
      "2": reviews.value.filter((r) => r.rating === 2).length,
      "1": reviews.value.filter((r) => r.rating === 1).length,
    };
  });

  // Reply to review (belum diimplementasikan di backend)
  const replyToReview = async (reviewId, replyMessage) => {
    try {
      const response = await axios.post(
        `/api/ratings/${reviewId}/reply`,
        { reply: replyMessage }
      );
      return response.data;
    } catch (err) {
      console.error("Error replying to review:", err);
      throw err;
    }
  };

  // Delete review (jika admin merchant)
  const deleteReview = async (reviewId) => {
    try {
      const response = await axios.delete(`/api/ratings/${reviewId}`);
      // Remove from local state
      reviews.value = reviews.value.filter((r) => r.id !== reviewId);
      totalReviews.value -= 1;
      return response.data;
    } catch (err) {
      console.error("Error deleting review:", err);
      throw err;
    }
  };

  return {
    reviews,
    loading,
    error,
    totalReviews,
    currentPage,
    itemsPerPage,
    averageRating,
    ratingDistribution,
    fetchReviews,
    getReviewsByRating,
    getReviewCountByRating,
    formatDate,
    replyToReview,
    deleteReview,
  };
};
