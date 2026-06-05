<template>
  <section
    class="relative group"
    @mouseenter="pauseAuto"
    @mouseleave="resumeAuto"
  >
    <!-- tombol kiri -->
    <button
      @click="scroll(-1)"
      class="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/85 shadow items-center justify-center opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
      aria-label="Prev"
    >
      ‹
    </button>

    <!-- scroller -->
    <div
      ref="scroller"
      :class="[
        'grid grid-flow-col gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory px-1',
        gridAutoColsClass,
      ]"
      style="scroll-behavior: smooth"
    >
      <div
        v-for="(item, i) in renderItems"
        :key="i"
        class="rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition snap-start bg-white w-full aspect-17/8 sm:w-[510px] sm:h-60 sm:aspect-auto"
      >
        <slot name="item" :item="item" :index="i">
          <img
            :src="item.image"
            alt="Promo"
            class="w-full h-full object-cover"
          />
        </slot>
      </div>
    </div>

    <!-- tombol kanan -->
    <button
      @click="scroll(1)"
      class="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/85 shadow items-center justify-center opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
      aria-label="Next"
    >
      ›
    </button>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";

const props = defineProps({
  items: { type: Array, default: () => [] },
  autoIntervalMs: { type: Number, default: 4000 },
  gap: { type: Number, default: 16 },
});

// Mobile: 100% kolom; sm+: 510px
const gridAutoColsClass = computed(
  () => "[grid-auto-columns:100%] sm:[grid-auto-columns:510px]"
);

const scroller = ref(null);

const renderItems = computed(() => {
  const src = props.items || [];
  return src.length ? [...src, ...src] : [];
});

const scroll = (dir = 1) => {
  const el = scroller.value;
  if (!el) return;

  // Hitung step dinamis: ambil lebar kartu pertama
  const card = el.querySelector(":scope > *");
  const cardWidth = card?.clientWidth || el.clientWidth;
  const step = cardWidth + props.gap;

  el.scrollBy({ left: dir * step, behavior: "smooth" });

  window.setTimeout(() => {
    const nearStart = el.scrollLeft <= 0;
    const nearEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
    if (dir > 0 && nearEnd) el.scrollTo({ left: 0, behavior: "auto" });
    if (dir < 0 && nearStart)
      el.scrollTo({
        left: el.scrollWidth - el.clientWidth - step,
        behavior: "auto",
      });
  }, 350);
};

let timer = null;
const startAuto = () => {
  stopAuto();
  if (props.items?.length)
    timer = window.setInterval(() => scroll(1), props.autoIntervalMs);
};
const stopAuto = () => {
  if (timer) {
    window.clearInterval(timer);
    timer = null;
  }
};
const pauseAuto = () => stopAuto();
const resumeAuto = () => startAuto();

onMounted(() => startAuto());
onBeforeUnmount(() => stopAuto());
</script>

<style scoped>
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
