<template>
  <div
    :class="['ext-swipe-to-close', { '--swiping': swiping }]"
    :style="style"
    v-touch-pan.vertical.mouse.mightPrevent.mouseMightPrevent="handlePan"
  >
    <div ref="topLine" class="ext-swipe-to-close__swipe-disable-line"></div>
    <slot />
  </div>
</template>

<script>
import { TouchPan } from "quasar";

function isElementInViewport(el) {
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

export default {
  directives: {
    TouchPan,
  },
  props: {
    modelValue: Boolean,
    direction: String, // not yet supported
  },
  data() {
    return {
      swiping: false,
      translateY: 0,
    };
  },
  computed: {
    style() {
      return { transform: `translateY(${this.translateY}px)` };
    },
  },
  mounted() {
    this.$topLine = this.$refs.topLine;
  },
  methods: {
    handlePan(details) {
      // if the modal is longer than the screen & content is scrolled, disable swipe to close
      const topVisible = isElementInViewport(this.$topLine);
      if (details.direction === "up" || !topVisible) return;
      details.evt.preventDefault();
      details.evt.stopPropagation();
      // enable `swiping` to disable transitions while touching the element
      if (details.isFirst) this.swiping = true;
      this.translateY = details.offset.y;
      if (details.isFinal) {
        // disable `swiping` to enable transitions
        this.swiping = false;
        const relativeSwipeDistance = this.translateY / this.$el.clientHeight;
        // if swiped < 25% distance reset the modal
        if (relativeSwipeDistance < 0.25) {
          this.translateY = 0;
          return;
        }
        // bring the modal all the way down
        this.translateY = this.$q.screen.height;
        setTimeout((_) => {
          this.$emit("update:modelValue", false);
        }, 100);
        // reset modal position after transition
        setTimeout((_) => (this.translateY = 0), 300);
      }
    },
  },
};
</script>


<style lang="scss">
.ext-swipe-to-close {
  transition: all 300ms;
  position: relative;

  > div:not(.ext-swipe-to-close__swipe-disable-line) {
    height: inherit;
    min-height: fit-content;
  }

  &.--swiping {
    transition: all 0ms;
  }

  &__swipe-disable-line {
    width: 100%;
    position: absolute;
    height: 1px;
    background: transparent;
    top: -15px;
  }
}

.q-dialog__inner--maximized {
  .ext-swipe-to-close {
    &__swipe-disable-line {
      top: 1px !important;
    }
  }
}
</style>
