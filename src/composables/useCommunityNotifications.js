import { onMounted, onUnmounted, ref } from 'vue';
import echo from '@/libs/echo';
import { useAuthStore } from '@/stores/auth';
import { useToast } from 'vue-toastification';

export function useCommunityNotifications() {
  const authStore = useAuthStore();
  const toast = useToast();
  const newPostsCount = ref(0);
  
  let communityChannel = null;
  let userCommunityChannel = null;

  const subscribe = () => {
    // 1. Subscribe to public community channel for new posts
    communityChannel = echo.channel('community');
    communityChannel.listen('.community.post.created', (e) => {
      // Do not notify if we are the author
      if (authStore.user?.id === e.author?.id) return;
      
      newPostsCount.value++;
      toast.info(`Postingan baru di Komunitas: ${e.post_title}`, {
        timeout: 5000,
        position: 'top-right'
      });
    });

    // 2. Subscribe to private channel for comments/replies if logged in
    if (authStore.isAuthenticated && authStore.user?.id) {
      userCommunityChannel = echo.private(`users.${authStore.user.id}.community`);
      userCommunityChannel.listen('.community.comment.created', (e) => {
        const typeLabel = e.notif_type === 'reply_to_comment' ? 'membalas komentar Anda' : 'mengomentari postingan Anda';
        toast.success(`${e.author.name} ${typeLabel} di Komunitas!`, {
          timeout: 5000,
          position: 'top-right'
        });
      });
    }
  };

  const unsubscribe = () => {
    if (communityChannel) {
      echo.leave('community');
      communityChannel = null;
    }
    if (userCommunityChannel && authStore.user?.id) {
      echo.leave(`users.${authStore.user.id}.community`);
      userCommunityChannel = null;
    }
  };

  onMounted(() => {
    subscribe();
  });

  onUnmounted(() => {
    unsubscribe();
  });

  return {
    newPostsCount,
    subscribe,
    unsubscribe
  };
}
