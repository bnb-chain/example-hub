<template>
  <div class="al-c pa-3">
    <q-btn
      class="mr-2"
      :class="{
        'bg-btn-on': isLeftOpen,
      }"
      flat
      dense
      @click="toggleMenu('left')"
    >
      <img src="/img/ic-menu.svg" width="22" />
      <q-tooltip>
        {{ isLeftOpen ? "Close sidebar" : "Open sidebar" }}
      </q-tooltip>
    </q-btn>
    <span class="fz-18 mr-auto line-1">{{ title }}</span>

    <div class="al-c mr-1 shrink-0" v-show="path == '/'">
      <chat-export v-if="asPC" />
      <q-btn
        class="ml-3"
        :class="{
          'bg-btn-on': isRightOpen && it.name == 'model',
        }"
        flat
        dense
        v-for="it in list"
        :key="it.icon"
        @click="onAct(it)"
      >
        <img :src="`/img/${it.icon}.svg`" width="22" />
        <b class="ml-1" v-if="it.txt">{{ it.txt }}</b>
        <q-tooltip>
          {{ it.tip }}
        </q-tooltip>
      </q-btn>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapState } from "vuex";

export default {
  computed: {
    ...mapState([
      "isLeftOpen",
      "isRightOpen",
      "chatLogs",
      "chatMenus",
      "checkModelIds",
      "asPC",
    ]),
    ...mapGetters(["chatMenu"]),
    path() {
      return this.$route.path;
    },
    modelLen() {
      return this.checkModelIds.length;
    },
    title() {
      if (this.path == "/" && !this.asPC) return "4EVERChat";
      // return this.chatMenu?.title;
      if (this.path == "/settings") return "Settings";
      return "";
    },
    list() {
      let txt = "";
      if (this.modelLen) {
        txt = "×" + this.modelLen;
      }
      return [
        {
          icon: "ic-robot",
          name: "model",
          txt,
          tip: this.isRightOpen ? "Close LLMs list" : "Open LLMs list",
        },
      ];
    },
  },
  data() {
    return {};
  },
  methods: {
    toggleMenu(side) {
      this.$bus.emit("toggleMenu", side);
    },
    onAct({ name }) {
      if (name == "model") {
        this.toggleMenu("right");
      }
    },
  },
};
</script>