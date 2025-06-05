<script setup>
import ChatList from "./chat-list.vue";
import ChatInput from "./chat-input.vue";
// import ChatHeader from "./chat-header.vue";
</script>

<template>
  <div class="h-flex h100p m-auto" style="max-width: 900px">
    <!-- <chat-header /> -->

    <q-scroll-area
      ref="chatList"
      :thumb-style="thumbStyle"
      class="flex-1"
      @scroll="onScroll"
    >
      <div
        :class="{
          'op-0': !showList,
        }"
      >
        <chat-list />
      </div>
    </q-scroll-area>

    <chat-input />
  </div>
</template>

<script>
let listRef;

export default {
  data() {
    return {
      keyOpts: [
        {
          label: "test",
          value: "11",
        },
      ],
      thumbStyle: {
        right: "2px",
        width: "3px",
        opacity: 0.35,
      },
      showList: false,
    };
  },
  mounted() {
    listRef = this.$refs.chatList;
    setTimeout(() => {
      this.scrollToBtm(false);
      this.showList = true;
    }, 60);
    this.$bus.on("chat-to-btm", (anim) => {
      this.scrollToBtm(anim);
    });
  },
  methods: {
    getKeys() {
      // /rpc/ai/manager/keys
    },
    scrollToBtm(anim = true) {
      this.$nextTick(() => {
        const el = listRef.getScrollTarget();
        const maxH = el.scrollHeight - el.clientHeight;
        // listRef.getScroll().verticalSize
        listRef.setScrollPosition("vertical", maxH, anim ? 240 : 0);
      });
    },
    onScroll(e) {
      // console.log(e.verticalPosition);
    },
  },
};
</script>